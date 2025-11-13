"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emailTemplateSchema, type EmailTemplateValues } from "@/lib/validations/prospect";
import { createEmailTemplateAction } from "@/app/(dashboard)/links/actions";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export function TemplateManager({ projectId, templates }: { projectId: string; templates: Template[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<EmailTemplateValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      projectId,
      name: "",
      subject: "",
      body: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createEmailTemplateAction(values);
      if (!result?.success) {
        setServerError(result?.error ?? "Unable to save template.");
        return;
      }
      form.reset({
        projectId,
        name: "",
        subject: "",
        body: "",
      });
    });
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h3 className="text-sm font-semibold">Saved templates</h3>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No templates yet.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            {templates.map((template) => (
              <div key={template.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-semibold">{template.name}</p>
                <p className="text-xs text-muted-foreground">Subject: {template.subject}</p>
                <pre className="mt-2 whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-xs">
                  {template.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
      <form className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4" onSubmit={onSubmit}>
        <h3 className="text-sm font-semibold">Create template</h3>
        <div>
          <Label>Name</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-xs text-red-500">{form.formState.errors.name.message}</p> : null}
        </div>
        <div>
          <Label>Subject</Label>
          <Input {...form.register("subject")} />
          {form.formState.errors.subject ? (
            <p className="text-xs text-red-500">{form.formState.errors.subject.message}</p>
          ) : null}
        </div>
        <div>
          <Label>Body</Label>
          <Textarea rows={4} {...form.register("body")} placeholder="Hi {{contact}}, ..." />
          {form.formState.errors.body ? <p className="text-xs text-red-500">{form.formState.errors.body.message}</p> : null}
        </div>
        {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
