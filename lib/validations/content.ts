import { z } from "zod";
import { CONTENT_STATUS } from "@/lib/content/constants";

export const contentCalendarFormSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(3, "Title is required"),
  status: z.enum(CONTENT_STATUS),
  owner: z.string().optional(),
  publishDate: z.string().min(1, "Publish date required"),
  draftLink: z.string().url("Provide a valid URL").optional().or(z.literal("")),
  briefId: z.string().cuid().optional().nullable(),
  notes: z.string().optional(),
});

export type ContentCalendarFormValues = z.infer<typeof contentCalendarFormSchema>;

export const briefGeneratorSchema = z.object({
  projectId: z.string().cuid(),
  keyword: z.string().min(3, "Keyword must be at least 3 characters"),
  intent: z.string().optional(),
  audience: z.string().optional(),
  voice: z.string().optional(),
});

export type BriefGeneratorValues = z.infer<typeof briefGeneratorSchema>;
