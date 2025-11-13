import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/tasks/constants";
import { AUDIT_STATUS_VALUES } from "@/lib/tech/constants";

const keywordPageRoles = ["PRIMARY", "SECONDARY"] as const;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const workspaceFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(slugRegex, "Use lowercase letters, numbers, and dashes"),
});

export const workspaceUpdateSchema = workspaceFormSchema.extend({
  id: z.string().cuid(),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
export type WorkspaceUpdateValues = z.infer<typeof workspaceUpdateSchema>;

export const projectFormSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  domain: z.string().min(2, "Domain is required"),
  gscSiteUrl: z.string().url("Provide a valid URL"),
  ga4PropertyId: z.string().min(3, "Provide a GA4 property id"),
  targetMarket: z.string().optional(),
});

export const projectUpdateSchema = projectFormSchema
  .omit({ workspaceId: true })
  .extend({ id: z.string().cuid() });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
export type ProjectUpdateValues = z.infer<typeof projectUpdateSchema>;

export const keywordFormSchema = z.object({
  projectId: z.string().cuid(),
  phrase: z.string().min(2, "Keyword must be at least 2 characters"),
  intent: z.string().min(2, "Intent is required"),
  cluster: z.string().min(2, "Cluster is required"),
  searchVolume: z.coerce.number().int().min(0, "Volume must be positive"),
  difficulty: z.coerce.number().int().min(0).max(100, "Difficulty 0-100"),
});

export const keywordUpdateSchema = keywordFormSchema
  .omit({ projectId: true })
  .extend({ id: z.string().cuid() });

export type KeywordFormValues = z.infer<typeof keywordFormSchema>;
export type KeywordUpdateValues = z.infer<typeof keywordUpdateSchema>;

export const pageFormSchema = z.object({
  projectId: z.string().cuid(),
  url: z.string().url("Enter a valid URL"),
  pageType: z.string().min(2, "Type is required"),
  status: z.string().min(2, "Status is required"),
  owner: z.string().optional(),
  lastCrawl: z.string().optional(),
});

export const pageUpdateSchema = pageFormSchema
  .omit({ projectId: true })
  .extend({ id: z.string().cuid() });

export type PageFormValues = z.infer<typeof pageFormSchema>;
export type PageUpdateValues = z.infer<typeof pageUpdateSchema>;

export const keywordMappingSchema = z.object({
  keywordId: z.string().cuid(),
  pageId: z.string().cuid(),
  role: z.enum(keywordPageRoles),
});

export type KeywordMappingValues = z.infer<typeof keywordMappingSchema>;

export const taskFormSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  type: z.enum(TASK_TYPES),
  scoreCurrent: z.coerce.number().min(0).max(100),
  scorePotential: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
  contentBriefId: z.string().cuid().optional().nullable(),
});

export const taskUpdateSchema = taskFormSchema.omit({ projectId: true }).extend({ id: z.string().cuid() });

export const taskStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(TASK_STATUSES),
  order: z.number().int().min(0),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type TaskUpdateValues = z.infer<typeof taskUpdateSchema>;
export type TaskStatusValues = z.infer<typeof taskStatusSchema>;

export const auditFormSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(2, "Title is required"),
  type: z.string().min(2, "Provide an audit type"),
  status: z.enum(AUDIT_STATUS_VALUES),
  score: z.coerce.number().min(0).max(100).optional(),
  impact: z.string().min(2, "Explain the impact"),
  recommendation: z.string().min(2, "Add at least one recommendation"),
  notes: z.string().optional(),
  detectedAt: z.string().optional(),
});

export type AuditFormValues = z.infer<typeof auditFormSchema>;
