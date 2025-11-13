import { TASK_TYPES, type TaskPriority, type TaskType } from "./tasks/constants";

export const OPPORTUNITY_WEIGHTS = {
  trafficGap: 0.35,
  intent: 0.2,
  position: 0.2,
  conversion: 0.15,
  effort: 0.15,
} as const;

export const POSITION_CURVE = {
  midpoint: 5,
  steepness: 0.45,
} as const;

const PRIORITY_INTENT_WEIGHT: Record<TaskPriority, number> = {
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  CRITICAL: 1,
};

export const TASK_TYPE_EFFORT: Record<TaskType, number> = {
  ONPAGE: 3,
  CONTENT: 4,
  TECH: 5,
  LINK: 4,
  LOCAL: 2,
};

const DEFAULT_POSITION = 12;
const MAX_TRAFFIC_GAP = 100;
const MAX_CONVERSION_RATE = 0.2;
const MAX_EFFORT_SCALE = Math.max(...Object.values(TASK_TYPE_EFFORT));

export type OpportunityInput = {
  scoreCurrent: number;
  scorePotential: number;
  priority?: TaskPriority;
  type?: TaskType;
  averagePosition?: number | null;
  conversionRate?: number | null;
  intentScore?: number | null;
  trafficGap?: number | null;
  effortOverride?: number | null;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function normalizeTrafficGap(gap: number) {
  if (!Number.isFinite(gap)) {
    return 0;
  }
  return clamp(gap / MAX_TRAFFIC_GAP);
}

function normalizeIntentScore(intentScore: number | null | undefined, priority?: TaskPriority) {
  if (typeof intentScore === "number" && Number.isFinite(intentScore)) {
    return clamp(intentScore);
  }
  if (priority && PRIORITY_INTENT_WEIGHT[priority]) {
    return PRIORITY_INTENT_WEIGHT[priority];
  }
  return PRIORITY_INTENT_WEIGHT.MEDIUM;
}

function normalizeConversionRate(rate: number | null | undefined) {
  if (typeof rate !== "number" || rate <= 0) {
    return 0;
  }
  return clamp(rate / MAX_CONVERSION_RATE);
}

function normalizeEffort(effort: number) {
  if (!Number.isFinite(effort) || effort <= 0) {
    return TASK_TYPE_EFFORT.CONTENT / MAX_EFFORT_SCALE;
  }
  return clamp(effort / MAX_EFFORT_SCALE);
}

export function logisticPositionWeight(
  position: number | null | undefined,
  midpoint = POSITION_CURVE.midpoint,
  steepness = POSITION_CURVE.steepness,
) {
  if (position === null || position === undefined || !Number.isFinite(position)) {
    position = DEFAULT_POSITION;
  }
  const sanitized = Math.max(0.1, position);
  const weight = 1 / (1 + Math.exp(steepness * (sanitized - midpoint)));
  return clamp(Number(weight.toFixed(4)));
}

export function calculateOpportunityScore({
  scoreCurrent,
  scorePotential,
  priority,
  type,
  averagePosition,
  conversionRate,
  intentScore,
  trafficGap,
  effortOverride,
}: OpportunityInput) {
  const gapValue = normalizeTrafficGap(trafficGap ?? Math.max(0, scorePotential - scoreCurrent));
  const intentValue = normalizeIntentScore(intentScore, priority);
  const positionValue = logisticPositionWeight(averagePosition);
  const conversionValue = normalizeConversionRate(conversionRate);
  const effortValue = normalizeEffort(effortOverride ?? TASK_TYPE_EFFORT[type ?? TASK_TYPES[0]]);

  const weighted =
    OPPORTUNITY_WEIGHTS.trafficGap * gapValue +
    OPPORTUNITY_WEIGHTS.intent * intentValue +
    OPPORTUNITY_WEIGHTS.position * positionValue +
    OPPORTUNITY_WEIGHTS.conversion * conversionValue -
    OPPORTUNITY_WEIGHTS.effort * effortValue;

  const normalized = clamp(weighted);
  return Number((normalized * 100).toFixed(1));
}
