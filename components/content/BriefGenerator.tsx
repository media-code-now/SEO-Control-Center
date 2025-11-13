"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { briefGeneratorSchema, type BriefGeneratorValues } from "@/lib/validations/content";
import { generateBriefAction } from "@/app/(dashboard)/content/actions";

interface BriefGeneratorProps {
  projectId: string;
}

export function BriefGenerator({ projectId }: BriefGeneratorProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<BriefGeneratorValues>({
    resolver: zodResolver(briefGeneratorSchema),
    defaultValues: {
      projectId,
      keyword: "",
      intent: "",
      audience: "",
      voice: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const response = await generateBriefAction(values);
      if (!response?.success) {
        setServerError(response?.error ?? "Unable to generate brief.");
        return;
      }
      setResult(response.brief);
      form.reset({ ...values, keyword: "", intent: "", audience: "", voice: "" });
    });
  });

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl"
        onSubmit={onSubmit}
      >
        <div>
          <Label>Keyword</Label>
          <Input {...form.register("keyword")} placeholder="ex. seo dashboard" />
          {form.formState.errors.keyword ? (
            <p className="text-xs text-red-500">{form.formState.errors.keyword.message}</p>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Intent</Label>
            <Input {...form.register("intent")} placeholder="Product signup, demand gen..." />
          </div>
          <div>
            <Label>Audience</Label>
            <Input {...form.register("audience")} placeholder="Growth leads, marketing ops..." />
          </div>
        </div>
        <div>
          <Label>Voice / Notes</Label>
          <Textarea rows={2} {...form.register("voice")} placeholder="Optional creative direction" />
        </div>
        {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Generating..." : "Generate brief"}
          </Button>
        </div>
      </form>
      {result ? <BriefPreview brief={result} /> : null}
    </div>
  );
}

function BriefPreview({ brief }: { brief: any }) {
  const outline = typeof brief.outline === "object" ? brief.outline : null;
  const internalLinks = Array.isArray(brief.internalLinks) ? brief.internalLinks : [];
  const competitorOutlines = Array.isArray(brief.competitorOutlines) ? brief.competitorOutlines : [];
  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-white/10 p-4">
      <div>
        <p className="text-sm font-semibold">{brief.title}</p>
        <p className="text-xs text-muted-foreground">Saved to briefs list. Attach from Tasks → Content.</p>
      </div>
      {outline ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Outline</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Array.isArray(outline.h2)
              ? outline.h2.map((section: any) => (
                  <li key={section.title}>
                    <span className="font-semibold">{section.title}</span>
                    {Array.isArray(section.h3) ? (
                      <ul className="ml-4 list-disc text-xs text-muted-foreground">
                        {section.h3.map((child: string) => (
                          <li key={child}>{child}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))
              : null}
          </ul>
        </div>
      ) : null}
      {Array.isArray(brief.questions) ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Questions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {brief.questions.map((question: string) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {Array.isArray(brief.entities) ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Entities</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {brief.entities.map((entity: string) => (
              <span key={entity} className="rounded-full border border-white/10 px-2 py-0.5">
                {entity}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {internalLinks.length ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal links</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {internalLinks.map((link: any) => (
              <li key={link.url}>
                <a href={link.url} className="text-emerald-300 hover:underline" target="_blank" rel="noreferrer">
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {competitorOutlines.length ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Competitor outlines</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {competitorOutlines.map((competitor: any) => (
              <div key={competitor.name} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
                <p className="font-semibold">{competitor.name}</p>
                <p>Headline: {competitor.headline ?? competitor.angle}</p>
                <p>Angle: {competitor.angle}</p>
                <p>CTA: {competitor.cta}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
