"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceFormSchema, type WorkspaceFormValues } from "@/lib/validations/forms";
import { createWorkspaceAction } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function WorkspaceForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createWorkspaceAction(values);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Something went wrong");
        return;
      }
      form.reset();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" placeholder="Growth Team" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" placeholder="growth-team" {...form.register("slug")} />
        {form.formState.errors.slug && (
          <p className="mt-1 text-xs text-red-500">{form.formState.errors.slug.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create workspace"}
      </Button>
    </form>
  );
}
