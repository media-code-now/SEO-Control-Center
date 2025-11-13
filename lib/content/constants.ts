export const CONTENT_STATUS = ["IDEATION", "BRIEFING", "DRAFTING", "EDITING", "APPROVED", "PUBLISHED"] as const;
export type ContentStatusValue = (typeof CONTENT_STATUS)[number];

export const STATUS_LABELS: Record<ContentStatusValue, string> = {
  IDEATION: "Ideation",
  BRIEFING: "Briefing",
  DRAFTING: "Drafting",
  EDITING: "Editing",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};
