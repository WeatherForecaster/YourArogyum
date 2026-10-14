/**
 * Goal-progress state classification utility.
 *
 * The backend clamps its `progressPercent` to [0, 100], so a value of 100
 * could mean the goal is reached OR that the user has exceeded the target.
 * This module uses the raw starting/target/current weights returned by the
 * backend to determine the true state without relying on the clamped percent.
 */

export type GoalState =
  | "in-progress"   // moving toward target, not yet reached
  | "reached"       // current === target (within ±0.1 kg tolerance)
  | "exceeded"      // current has passed beyond the target
  | "moving-away"   // current has moved in the wrong direction (below start for gain, above start for loss)
  | "unavailable";  // missing data

export interface GoalClassification {
  state: GoalState;
  /** Direction of the goal: true = gain, false = loss */
  isGain: boolean;
  /** Raw (unclamped) progress percentage. May be >100 if exceeded. */
  rawPercent: number;
  /** Display-safe progress bar fill, clamped to [0, 100]. */
  clampedPercent: number;
  /** Friendly label for the state. */
  stateLabel: string;
  /** Friendly detail message. */
  detailText: string;
}

const REACHED_TOLERANCE_KG = 0.15;

/**
 * Classifies the goal-progress state from raw backend values.
 *
 * @param startingWeight - Assessment starting weight (kg)
 * @param targetWeight   - Saved target weight (kg)
 * @param currentWeight  - Latest recorded weight (kg)
 */
export function classifyGoalProgress(
  startingWeight: number | null | undefined,
  targetWeight: number | null | undefined,
  currentWeight: number | null | undefined
): GoalClassification {
  const unavailable: GoalClassification = {
    state: "unavailable",
    isGain: false,
    rawPercent: 0,
    clampedPercent: 0,
    stateLabel: "Not available",
    detailText: "Missing weight data",
  };

  if (
    startingWeight == null ||
    !Number.isFinite(startingWeight) ||
    targetWeight == null ||
    !Number.isFinite(targetWeight) ||
    currentWeight == null ||
    !Number.isFinite(currentWeight)
  ) {
    return unavailable;
  }

  const totalChange = Math.abs(targetWeight - startingWeight);

  // If start === target there is nothing to track.
  if (totalChange < 0.01) {
    return unavailable;
  }

  const isGain = targetWeight > startingWeight;

  // Raw (unclamped) progress: how far the user has moved toward the target
  // relative to the full required change.
  let rawPercent: number;
  if (isGain) {
    rawPercent = ((currentWeight - startingWeight) / totalChange) * 100;
  } else {
    rawPercent = ((startingWeight - currentWeight) / totalChange) * 100;
  }

  const clampedPercent = Math.max(0, Math.min(100, rawPercent));

  // Determine state -------------------------------------------------------
  // "Reached" — within tolerance of the target.
  const atTarget = Math.abs(currentWeight - targetWeight) <= REACHED_TOLERANCE_KG;
  if (atTarget) {
    return {
      state: "reached",
      isGain,
      rawPercent,
      clampedPercent: 100,
      stateLabel: "Target reached! 🎉",
      detailText: `You've reached your ${isGain ? "weight-gain" : "weight-loss"} target of ${targetWeight} kg.`,
    };
  }

  // "Exceeded" — current has gone past the target in the goal direction.
  const exceeded = isGain
    ? currentWeight > targetWeight + REACHED_TOLERANCE_KG
    : currentWeight < targetWeight - REACHED_TOLERANCE_KG;

  if (exceeded) {
    const over = Math.abs(currentWeight - targetWeight).toFixed(1);
    return {
      state: "exceeded",
      isGain,
      rawPercent,
      clampedPercent: 100, // show full bar, but label clarifies it's exceeded
      stateLabel: "Target exceeded",
      detailText: isGain
        ? `${over} kg past your gain target of ${targetWeight} kg`
        : `${over} kg past your loss target of ${targetWeight} kg`,
    };
  }

  // "Moving away" — current has moved away from target beyond the starting point.
  const movingAway = rawPercent < 0;
  if (movingAway) {
    return {
      state: "moving-away",
      isGain,
      rawPercent,
      clampedPercent: 0,
      stateLabel: "Moving away from target",
      detailText: isGain
        ? `Weight is below your starting point`
        : `Weight is above your starting point`,
    };
  }

  // "In progress" — between starting point and target.
  const remaining = Math.abs(targetWeight - currentWeight).toFixed(1);
  return {
    state: "in-progress",
    isGain,
    rawPercent,
    clampedPercent,
    stateLabel: `${Math.round(clampedPercent)}% complete`,
    detailText: `${remaining} kg to your ${isGain ? "gain" : "loss"} target`,
  };
}
