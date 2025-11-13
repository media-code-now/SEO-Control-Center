export const TECH_SNAPSHOT_LABELS: Record<string, string> = {
  CWV: "Core Web Vitals",
  INDEXATION: "Indexation",
  STATUS: "Status Codes",
};

export const AUDIT_STATUS_VALUES = ["QUEUED", "RUNNING", "PASSED", "FAILED"] as const;
export type AuditStatusValue = (typeof AUDIT_STATUS_VALUES)[number];

export const DEFAULT_AUDIT_TYPES = ["cwv-weekly", "indexation", "status-code", "lighthouse", "accessibility"] as const;
