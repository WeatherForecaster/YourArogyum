
import { apiRequest } from "../api/client";

export type WellnessMode = "manual" | "tracker";

export interface TrackerInputSnapshot {
  source: "simulated-demo";
  steps: number;
  dailyStepGoal: number;
  heartRateBpm: number;
  sleepHours: number;
  sleepLabel: string;
  activeCalories: number;
}

export interface RecommendationMetadata {
  mode: WellnessMode;
  generatedAt: string;

  // Copies of the profile fields used to generate the recommendation.
  // These remain a historical snapshot if the profile changes later.
  profileSnapshot: Record<string, string>;

  // Present only when the recommendation used Tracker Mode.
  trackerSnapshot: TrackerInputSnapshot | null;
}

export interface SavedRecommendation {
  id: string;
  plan: string;
  metadata: RecommendationMetadata;
}

export interface DietPlanStatePayload {
  waterGlasses: number;
  completedMeals: string[];
  dietPlan: string;
  nutritionBreakdown: unknown | null;
  recentPlans: string[];
  generationIndex: number;

  // Optional for compatibility with existing saved plans.
  recommendationMetadata?: RecommendationMetadata | null;

  // Optional history of recommendations and the inputs used to create them.
  recommendationHistory?: SavedRecommendation[];
}

interface DietPlanStateApiResponse {
  saved: boolean;
  stateJson?: string;
}

export interface DietPlanStateResponse {
  saved: boolean;
  state: Partial<DietPlanStatePayload>;
}

export async function getMyDietPlanState(): Promise<DietPlanStateResponse> {
  const response = await apiRequest<DietPlanStateApiResponse>(
      "/api/diet-plan/me",
      {
        method: "GET",
      },
  );

  let state: Partial<DietPlanStatePayload> = {};

  if (response.saved && response.stateJson) {
    try {
      const parsed: unknown = JSON.parse(response.stateJson);

      if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
      ) {
        state = parsed as Partial<DietPlanStatePayload>;
      }
    } catch {
      throw new Error(
          "The saved diet plan data could not be read. Generate a new plan to replace it.",
      );
    }
  }

  return {
    saved: response.saved,
    state,
  };
}

export function saveMyDietPlanState(
    state: DietPlanStatePayload,
): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>("/api/diet-plan/me", {
    method: "PUT",
    body: state,
  });
}
