"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auditFormSchema, type AuditFormValues } from "@/lib/validations/forms";
import { AUDIT_STATUS_VALUES, DEFAULT_AUDIT_TYPES } from "@/lib/tech/constants";
import { createAuditAction } from "@/app/(dashboard)/tech/actions";

interface AuditDialogProps {
  projectId: string;
  suggestedTypes?: string[];
}

export function AuditDialog({ projectId, suggestedTypes = [] }: AuditDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const typeOptions = useMemo(() => {
    const merged = new Set<string>([...DEFAULT_AUDIT_TYPES, ...suggestedTypes]);
    return Array.from(merged);
  }, [suggestedTypes]);

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      projectId,
      title: "",
      type: typeOptions[0] ?? "cwv-weekly",
      status: AUDIT_STATUS_VALUES[0],
      score: 80,
      impact: "",
      recommendation: "",
      notes: "",
      detectedAt: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createAuditAction(values);
      if (!result?.success) {
        setServerError("error" in result ? String(result.error) : "Unable to log audit.");
        return;
      }
      form.reset({
        ...values,
        title: "",
        impact: "",
        recommendation: "",
        notes: "",
        detectedAt: "",
      });
      setOpen(false);
    });
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Log manual finding
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log tech audit</DialogTitle>
            <DialogDescription>Document indexation, CWV, or infrastructure findings.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <input type="hidden" {...form.register("projectId")} value={projectId} />
            <div>
              <Label htmlFor="audit-title">Title</Label>
              <Input id="audit-title" {...form.register("title")} placeholder="ex. Weekly CWV review" />
              {form.formState.errors.title ? (
                <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="audit-type">Type</Label>
                <Input
                  id="audit-type"
                  list="audit-type-options"
                  {...form.register("type")}
                  placeholder="cwv-weekly"
                />
                <datalist id="audit-type-options">
                  {typeOptions.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
                {form.formState.errors.type ? (
                  <p className="text-xs text-red-500">{form.formState.errors.type.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="audit-status">Status</Label>
                <select
                  id="audit-status"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  {...form.register("status")}
                >
                  {AUDIT_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="audit-score">Score</Label>
                <Input
                  id="audit-score"
                  type="number"
                  min={0}
                  max={100}
                  {...form.register("score", { valueAsNumber: true })}
                />
                {form.formState.errors.score ? (
                  <p className="text-xs text-red-500">{form.formState.errors.score.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="audit-detected">Detected date</Label>
                <Input id="audit-detected" type="date" {...form.register("detectedAt")} />
              </div>
            </div>
            <div>
              <Label>Impact</Label>
              <Textarea rows={3} {...form.register("impact")} placeholder="ex. LCP regressed on homepage." />
              {form.formState.errors.impact ? (
                <p className="text-xs text-red-500">{form.formState.errors.impact.message}</p>
              ) : null}
            </div>
            <div>
              <Label>Recommendation</Label>
              <Textarea
                rows={3}
                {...form.register("recommendation")}
                placeholder="ex. Replace hero video or lazy load below the fold."
              />
              {form.formState.errors.recommendation ? (
                <p className="text-xs text-red-500">{form.formState.errors.recommendation.message}</p>
              ) : null}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} {...form.register("notes")} placeholder="Optional context" />
            </div>
            {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save audit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
