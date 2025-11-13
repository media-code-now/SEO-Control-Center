"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectUpdateSchema, type ProjectUpdateValues } from "@/lib/validations/forms";
import { deleteProjectAction, updateProjectAction } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProjectItemFormProps {
  project: {
    id: string;
    name: string;
    domain: string;
    gscSiteUrl: string;
    ga4PropertyId: string;
    targetMarket?: string | null;
    workspaceName: string;
  };
}

export function ProjectItemForm({ project }: ProjectItemFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectUpdateValues>({
    resolver: zodResolver(projectUpdateSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      domain: project.domain,
      gscSiteUrl: project.gscSiteUrl,
      ga4PropertyId: project.ga4PropertyId,
      targetMarket: project.targetMarket ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateProjectAction(values);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Unable to update project");
      }
    });
  });

  const handleDelete = () => {
    setServerError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(project.id);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Unable to delete project");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card/80 p-4">
      <input type="hidden" {...form.register("id")} />
      <div>
        <p className="text-sm font-medium">{project.name}</p>
        <p className="text-xs text-muted-foreground">{project.workspaceName}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <Label>Domain</Label>
          <Input {...form.register("domain")} />
          {form.formState.errors.domain && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.domain.message}</p>
          )}
        </div>
        <div>
          <Label>GSC site URL</Label>
          <Input {...form.register("gscSiteUrl")} />
          {form.formState.errors.gscSiteUrl && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.gscSiteUrl.message}</p>
          )}
        </div>
        <div>
          <Label>GA4 property ID</Label>
          <Input {...form.register("ga4PropertyId")} />
          {form.formState.errors.ga4PropertyId && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.ga4PropertyId.message}</p>
          )}
        </div>
        <div>
          <Label>Target market</Label>
          <Input {...form.register("targetMarket")} />
          {form.formState.errors.targetMarket && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.targetMarket.message}</p>
          )}
        </div>
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
          Delete
        </Button>
      </div>
    </form>
  );
}
