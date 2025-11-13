export const PROSPECT_STAGES = ["PROSPECT", "PITCHED", "WON", "LOST"] as const;

export const PROSPECT_STAGE_LABELS: Record<(typeof PROSPECT_STAGES)[number], string> = {
  PROSPECT: "Prospect",
  PITCHED: "Pitched",
  WON: "Won",
  LOST: "Lost",
};
