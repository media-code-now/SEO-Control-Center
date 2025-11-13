"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  workspaceUpdateSchema,
  type WorkspaceUpdateValues,
} from "@/lib/validations/forms";
import {
  deleteWorkspaceAction,
  updateWorkspaceAction,
} from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface WorkspaceItemFormProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export function WorkspaceItemForm({ workspace }: WorkspaceItemFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<WorkspaceUpdateValues>({
    resolver: zodResolver(workspaceUpdateSchema),
    defaultValues: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateWorkspaceAction(values);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Unable to update workspace");
        return;
      }
    });
  });

  const handleDelete = () => {
    setServerError(null);
    startTransition(async () => {
      const result = await deleteWorkspaceAction(workspace.id);
      if (!result?.success) {
        setServerError("error" in result ? result.error : "Unable to delete workspace");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card/80 p-4">
      <input type="hidden" {...form.register("id")} />
      <div className="flex items-start justify-between gap-4">
        <div className="w-full space-y-3">
          <div>
            <Label htmlFor={`workspace-name-${workspace.id}`}>Name</Label>
            <Input id={`workspace-name-${workspace.id}`} {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor={`workspace-slug-${workspace.id}`}>Slug</Label>
            <Input id={`workspace-slug-${workspace.id}`} {...form.register("slug")} />
            {form.formState.errors.slug && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.slug.message}</p>
            )}
          </div>
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{workspace.plan}</div>
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </form>
  );
}
