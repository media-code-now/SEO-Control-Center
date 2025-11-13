import { z } from "zod";

const stages = ["PROSPECT", "PITCHED", "WON", "LOST"] as const;

export const prospectFormSchema = z.object({
  projectId: z.string().cuid(),
  domain: z.string().min(3, "Domain is required"),
  contact: z.string().optional(),
  email: z.string().email("Provide a valid email").optional().or(z.literal("")),
  stage: z.enum(stages).default("PROSPECT"),
  authority: z.coerce.number().int().min(0).max(100),
  notes: z.string().optional(),
  templateId: z.string().cuid().optional().nullable(),
});

export type ProspectFormValues = z.infer<typeof prospectFormSchema>;

export const emailTemplateSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(2),
  subject: z.string().min(2),
  body: z.string().min(10),
});

export type EmailTemplateValues = z.infer<typeof emailTemplateSchema>;

export const mailMergeSchema = z.object({
  projectId: z.string().cuid(),
  stage: z.enum(stages).optional(),
});

export type MailMergeValues = z.infer<typeof mailMergeSchema>;
