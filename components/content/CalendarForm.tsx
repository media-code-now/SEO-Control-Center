"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contentCalendarFormSchema, type ContentCalendarFormValues } from "@/lib/validations/content";
import { CONTENT_STATUS, STATUS_LABELS } from "@/lib/content/constants";
import { createContentCalendarItemAction } from "@/app/(dashboard)/content/actions";

type BriefOption = { id: string; title: string };

interface CalendarFormProps {
  projectId: string;
  briefs: BriefOption[];
}

export function CalendarForm({ projectId, briefs }: CalendarFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContentCalendarFormValues>({
    resolver: zodResolver(contentCalendarFormSchema),
    defaultValues: {
      projectId,
      title: "",
      status: "IDEATION",
      owner: "",
      publishDate: new Date().toISOString().slice(0, 10),
      draftLink: "",
      briefId: undefined,
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createContentCalendarItemAction({
        ...values,
        draftLink: values.draftLink || undefined,
        briefId: values.briefId || undefined,
      });
      if (!result?.success) {
        setServerError(result?.error ?? "Unable to schedule content.");
        return;
      }
      form.reset({
        projectId,
        title: "",
        status: values.status,
        owner: "",
        publishDate: values.publishDate,
        draftLink: "",
        notes: "",
      });
    });
  });

  return (
    <form className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl" onSubmit={onSubmit}>
      <div>
        <Label>Title</Label>
        <Input {...form.register("title")} placeholder="ex. Keyword Tracking Guide" />
        {form.formState.errors.title ? <p className="text-xs text-red-500">{form.formState.errors.title.message}</p> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Status</Label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...form.register("status")}>
            {CONTENT_STATUS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Owner</Label>
          <Input {...form.register("owner")} placeholder="Content, Growth, etc." />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Publish date</Label>
          <Input type="date" {...form.register("publishDate")} />
          {form.formState.errors.publishDate ? (
            <p className="text-xs text-red-500">{form.formState.errors.publishDate.message}</p>
          ) : null}
        </div>
        <div>
          <Label>Draft link</Label>
          <Input {...form.register("draftLink")} placeholder="https://docs..." />
          {form.formState.errors.draftLink ? (
            <p className="text-xs text-red-500">{form.formState.errors.draftLink.message}</p>
          ) : null}
        </div>
      </div>
      <div>
        <Label>Brief</Label>
        <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...form.register("briefId")}>
          <option value="">No brief</option>
          {briefs.map((brief) => (
            <option key={brief.id} value={brief.id}>
              {brief.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea {...form.register("notes")} rows={2} placeholder="Optional context" />
      </div>
      {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Add to calendar"}
        </Button>
      </div>
    </form>
  );
}
