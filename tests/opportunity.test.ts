import assert from "node:assert/strict";
import { calculateOpportunityScore, logisticPositionWeight } from "../lib/opportunity";

function testLogisticCurve() {
  const best = logisticPositionWeight(2);
  const mid = logisticPositionWeight(8);
  const poor = logisticPositionWeight(20);

  assert(best > mid, "Better positions should receive higher weights");
  assert(mid > poor, "Mid positions should outrank poor positions");
}

function testOpportunityScoreWeights() {
  const strong = calculateOpportunityScore({
    scoreCurrent: 30,
    scorePotential: 95,
    priority: "CRITICAL",
    type: "ONPAGE",
    averagePosition: 4,
    conversionRate: 0.08,
  });
  const weaker = calculateOpportunityScore({
    scoreCurrent: 60,
    scorePotential: 70,
    priority: "LOW",
    type: "TECH",
    averagePosition: 18,
    conversionRate: 0.01,
  });

  assert(
    strong > weaker,
    `Expected higher growth task (${strong}) to outscore lower growth task (${weaker})`,
  );
}

function testEffortPenalty() {
  const lowEffort = calculateOpportunityScore({
    scoreCurrent: 20,
    scorePotential: 80,
    priority: "HIGH",
    type: "LOCAL",
    effortOverride: 1,
  });
  const highEffort = calculateOpportunityScore({
    scoreCurrent: 20,
    scorePotential: 80,
    priority: "HIGH",
    type: "LOCAL",
    effortOverride: 8,
  });

  assert(lowEffort > highEffort, "Higher effort should reduce the resulting opportunity score");
}

function run() {
  testLogisticCurve();
  testOpportunityScoreWeights();
  testEffortPenalty();
  // eslint-disable-next-line no-console -- useful feedback for CLI users
  console.log("✓ Opportunity score tests passed");
}

run();
