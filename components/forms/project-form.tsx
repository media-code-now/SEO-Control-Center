"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectFormSchema, type ProjectFormValues } from "@/lib/validations/forms";
import { createProjectAction } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProjectFormProps {
  workspaceOptions: Array<{ id: string; name: string }>;
}

export function ProjectForm({ workspaceOptions }: ProjectFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      workspaceId: workspaceOptions[0]?.id ?? "",
      name: "",
      domain: "",
      gscSiteUrl: "",
      ga4PropertyId: "",
      targetMarket: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createProjectAction(values);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Unable to create project");
        return;
      }
      // Redirect to dashboard after successful creation
      router.push("/");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <Label htmlFor="workspaceId">Workspace</Label>
        <select
          id="workspaceId"
          className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          disabled={workspaceOptions.length === 0}
          {...form.register("workspaceId")}
        >
          {workspaceOptions.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        {form.formState.errors.workspaceId && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.workspaceId.message}</p>
        )}
        {workspaceOptions.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Create a workspace first.</p>
        )}
      </div>
      <div>
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" placeholder="Example.com" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" placeholder="example.com" {...form.register("domain")} />
        {form.formState.errors.domain && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.domain.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="gscSiteUrl">GSC site URL</Label>
        <Input id="gscSiteUrl" placeholder="https://example.com/" {...form.register("gscSiteUrl")} />
        {form.formState.errors.gscSiteUrl && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.gscSiteUrl.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="ga4PropertyId">GA4 property ID</Label>
        <Input id="ga4PropertyId" placeholder="properties/123456789" {...form.register("ga4PropertyId")} />
        {form.formState.errors.ga4PropertyId && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.ga4PropertyId.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="targetMarket">Target market (optional)</Label>
        <Input id="targetMarket" placeholder="US" {...form.register("targetMarket")} />
        {form.formState.errors.targetMarket && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.targetMarket.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" disabled={isPending || workspaceOptions.length === 0}>
        {isPending ? "Creating..." : "Create project"}
      </Button>
    </form>
  );
}
