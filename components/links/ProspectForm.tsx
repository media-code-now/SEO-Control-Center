"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROSPECT_STAGE_LABELS, PROSPECT_STAGES } from "@/lib/outreach/constants";
import { prospectFormSchema, type ProspectFormValues } from "@/lib/validations/prospect";
import { createProspectAction } from "@/app/(dashboard)/links/actions";

type TemplateOption = { id: string; name: string };

export function ProspectForm({ projectId, templates }: { projectId: string; templates: TemplateOption[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      projectId,
      domain: "",
      contact: "",
      email: "",
      stage: "PROSPECT",
      authority: 40,
      notes: "",
      templateId: undefined,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createProspectAction({
        ...values,
        email: values.email || undefined,
        templateId: values.templateId || undefined,
      });
      if (!result?.success) {
        setServerError(result?.error ?? "Unable to save prospect");
        return;
      }
      form.reset({
        projectId,
        domain: "",
        contact: "",
        email: "",
        stage: values.stage,
        authority: values.authority,
        notes: "",
        templateId: undefined,
      });
    });
  });

  return (
    <form className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Domain</Label>
          <Input {...form.register("domain")} placeholder="example.com" />
          {form.formState.errors.domain ? <p className="text-xs text-red-500">{form.formState.errors.domain.message}</p> : null}
        </div>
        <div>
          <Label>Contact name</Label>
          <Input {...form.register("contact")} placeholder="Jane Doe" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Email</Label>
          <Input {...form.register("email")} placeholder="jane@example.com" />
          {form.formState.errors.email ? <p className="text-xs text-red-500">{form.formState.errors.email.message}</p> : null}
        </div>
        <div>
          <Label>Stage</Label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...form.register("stage")}>
            {PROSPECT_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {PROSPECT_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Authority</Label>
          <Input type="number" min={0} max={100} {...form.register("authority", { valueAsNumber: true })} />
          {form.formState.errors.authority ? (
            <p className="text-xs text-red-500">{form.formState.errors.authority.message}</p>
          ) : null}
        </div>
        <div>
          <Label>Template</Label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...form.register("templateId")}>
            <option value="">None</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea rows={2} {...form.register("notes")} placeholder="Pain points, last touchpoint, etc." />
      </div>
      {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Add prospect"}
        </Button>
      </div>
    </form>
  );
}
