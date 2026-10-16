
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Beef,
  CheckCircle2,
  Coffee,
  Droplets,
  Flame,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

import { apiRequest } from "../api/client";
import {
  getMyAssessment,
  type AssessmentData,
} from "../services/assessment";
import {
  availableNutritionFoodNames,
  calculateNutrition,
  type IngredientAmount,
  type NutritionResult,
} from "../services/nutrition";
import {
  getMyDietPlanState,
  saveMyDietPlanState,
  type DietPlanStatePayload,
  type RecommendationMetadata,
  type SavedRecommendation,
  type TrackerInputSnapshot,
  type WellnessMode,
} from "../services/dietPlan";
import HydrationReminderCard from "../components/HydrationReminderCard";
import { getDailyWaterTargetMl } from "../utils/hydrationReminder";
import {
  getWearableDemoPromptContext,
  isWearableDemoEnabled,
  WEARABLE_DEMO_DATA,
} from "../services/wearableDemo";

interface DietPlanPageProps {
  onBack: () => void;
}

interface NutritionTargets {
  calories: number | null;
  protein: number | null;
  bmi: number | null;
  note: string;
}

interface MealNutritionSummary {
  name: string;
  result: NutritionResult;
}

interface ParsedNutritionPlan {
  visibleText: string;
  meals: MealNutritionSummary[];
  daily: NutritionResult | null;
  error: string | null;
}

interface SavedDietPlanState {
  waterGlasses: number;
  completedMeals: string[];
  dietPlan: string;
  nutritionBreakdown: ParsedNutritionPlan | null;
  recentPlans: string[];
  generationIndex: number;
  recommendationMetadata: RecommendationMetadata | null;
  recommendationHistory: SavedRecommendation[];
}

interface ChatResponse {
  reply: string;
}

interface GeneratedMeal {
  name: string;
  ingredients: IngredientAmount[];
}

const dietPlanStyles = [
  "Maharashtrian and Western Indian home-style meals with varied seasonal ingredients.",
  "South Indian-inspired meals with different grains, vegetables, and suitable protein sources.",
  "North Indian home-style cooking with varied dishes rather than repeating dal-based meals.",
  "Affordable student-friendly meals that are practical to prepare.",
  "Seasonal vegetable-focused meals with varied grains, textures, and cooking methods.",
  "A mix of Indian and familiar international meals where suitable.",
  "Protein-diverse meals that do not rely on the same protein source at every meal.",
];

const mealTrackers = [
  { name: "Breakfast", time: "8:00 AM", icon: Coffee },
  { name: "Lunch", time: "1:30 PM", icon: Sun },
  { name: "Dinner", time: "8:00 PM", icon: Moon },
];

const DIET_PLAN_STORAGE_KEY = "yourarogyum:diet-plan:v1";

function loadSavedDietPlanState(): SavedDietPlanState {
  const emptyState: SavedDietPlanState = {
    waterGlasses: 0,
    completedMeals: [],
    dietPlan: "",
    nutritionBreakdown: null,
    recentPlans: [],
    generationIndex: 0,
    recommendationMetadata: null,
    recommendationHistory: [],
  };

  try {
    const saved = sessionStorage.getItem(DIET_PLAN_STORAGE_KEY);
    if (!saved) return emptyState;

    const parsed = JSON.parse(saved) as Partial<SavedDietPlanState>;

    const recommendationHistory = Array.isArray(
        parsed.recommendationHistory,
    )
        ? parsed.recommendationHistory
            .filter(
                (item): item is SavedRecommendation =>
                    Boolean(
                        item &&
                        typeof item === "object" &&
                        typeof item.id === "string" &&
                        typeof item.plan === "string" &&
                        item.metadata &&
                        typeof item.metadata === "object" &&
                        (item.metadata.mode === "manual" ||
                            item.metadata.mode === "tracker") &&
                        typeof item.metadata.generatedAt === "string" &&
                        item.metadata.profileSnapshot &&
                        typeof item.metadata.profileSnapshot === "object",
                    ),
            )
            .slice(0, 10)
        : [];

    const rawMetadata = parsed.recommendationMetadata;

    const recommendationMetadata: RecommendationMetadata | null =
        rawMetadata &&
        typeof rawMetadata === "object" &&
        (rawMetadata.mode === "manual" || rawMetadata.mode === "tracker") &&
        typeof rawMetadata.generatedAt === "string" &&
        rawMetadata.profileSnapshot &&
        typeof rawMetadata.profileSnapshot === "object"
            ? rawMetadata
            : null;

    return {
      waterGlasses:
          typeof parsed.waterGlasses === "number" &&
          Number.isFinite(parsed.waterGlasses)
              ? Math.min(20, Math.max(0, Math.trunc(parsed.waterGlasses)))
              : 0,
      completedMeals: Array.isArray(parsed.completedMeals)
          ? parsed.completedMeals.filter(
              (item): item is string => typeof item === "string",
          )
          : [],
      dietPlan:
          typeof parsed.dietPlan === "string" ? parsed.dietPlan : "",
      nutritionBreakdown:
          parsed.nutritionBreakdown &&
          typeof parsed.nutritionBreakdown === "object"
              ? parsed.nutritionBreakdown
              : null,
      recentPlans: Array.isArray(parsed.recentPlans)
          ? parsed.recentPlans
              .filter((item): item is string => typeof item === "string")
              .slice(0, 2)
          : [],
      generationIndex:
          typeof parsed.generationIndex === "number" &&
          Number.isFinite(parsed.generationIndex)
              ? Math.max(0, Math.trunc(parsed.generationIndex))
              : 0,
      recommendationMetadata,
      recommendationHistory,
    };
  } catch {
    return emptyState;
  }
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function calculateNutritionTargets(
    profile: AssessmentData | null,
): NutritionTargets {
  const empty: NutritionTargets = {
    calories: null,
    protein: null,
    bmi: null,
    note: "Complete the required health-assessment fields to see estimates.",
  };

  if (!profile) return empty;

  const age = Number(profile.age);
  const heightCm = Number(profile.height);
  const weightKg = Number(profile.weight);

  if (
      !Number.isFinite(age) ||
      !Number.isFinite(heightCm) ||
      !Number.isFinite(weightKg) ||
      age <= 0 ||
      heightCm <= 0 ||
      weightKg <= 0
  ) {
    return empty;
  }

  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  const medicalText = [
    profile.conditions,
    profile.healthConcerns,
    profile.medications,
  ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const requiresProfessionalTargets =
      /kidney|renal|dialysis|pregnan|eating disorder/.test(medicalText);

  if (age < 19 || age > 78 || requiresProfessionalTargets) {
    return {
      calories: null,
      protein: null,
      bmi: Math.round(bmi * 10) / 10,
      note:
          "Automated calorie and protein estimates are not shown for this profile. " +
          "Please ask a qualified healthcare professional for individual guidance.",
    };
  }

  const sex = normalizeText(profile.sex);
  const sexConstant =
      sex === "male" ? 5 : sex === "female" ? -161 : null;

  const activityText = normalizeText(
      profile.activity || profile.daily_activity || profile.dailyActivity,
  );

  let activityFactor = 1.2;

  if (/very active|highly active|heavy|intense/.test(activityText)) {
    activityFactor = 1.725;
  } else if (/moderate|medium/.test(activityText)) {
    activityFactor = 1.55;
  } else if (/light/.test(activityText)) {
    activityFactor = 1.375;
  }

  let calories: number | null = null;

  if (sexConstant !== null) {
    const restingEnergy =
        10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;

    let estimate = Math.round(restingEnergy * activityFactor);
    const targetWeightKg = Number(profile.targetWeight);

    const targetBmi =
        Number.isFinite(targetWeightKg) && targetWeightKg > 0
            ? targetWeightKg / Math.pow(heightCm / 100, 2)
            : null;

    const wantsWeightLoss =
        /weight loss|lose weight|weight management|fat loss/.test(
            normalizeText(profile.goal),
        );

    if (
        wantsWeightLoss &&
        Number.isFinite(targetWeightKg) &&
        targetWeightKg < weightKg &&
        bmi >= 18.5 &&
        targetBmi !== null &&
        targetBmi >= 18.5
    ) {
      estimate = Math.round(estimate * 0.9);
    }

    calories = estimate > 0 ? estimate : null;
  }

  let protein: number | null = Math.round(weightKg * 0.8);

  if (
      /build muscle|build strength|strength and fitness|muscle gain/.test(
          normalizeText(profile.goal),
      )
  ) {
    protein = Math.round(weightKg * 1.2);
  }

  const notes = [
    "Targets are rough adult estimates, not medical prescriptions.",
    "The calorie estimate uses an adult energy equation and an activity multiplier.",
  ];

  if (sexConstant === null) {
    notes.push(
        "Calories are not estimated because the sex value is not Male or Female.",
    );
  }

  if (!activityText) {
    notes.push(
        "Activity was not specified, so a sedentary activity level is assumed.",
    );
  }

  if (bmi < 18.5) {
    notes.push(
        "No weight-loss calorie reduction was applied because BMI is below the usual adult screening threshold.",
    );
  }

  if (
      /diabetes|hypertension|high cholesterol|heart disease|thyroid|pcos|asthma/.test(
          medicalText,
      )
  ) {
    notes.push(
        "Check whether these estimates suit your health conditions with a qualified healthcare professional.",
    );
  }

  return {
    calories,
    protein,
    bmi: Math.round(bmi * 10) / 10,
    note: notes.join(" "),
  };
}

function parseNutritionPlanReply(rawReply: string): ParsedNutritionPlan {
  const markerPattern =
      /NUTRITION_DATA_JSON_START\s*([\s\S]*?)\s*NUTRITION_DATA_JSON_END/i;

  const match = rawReply.match(markerPattern);

  const visibleText = match
      ? rawReply.replace(match[0], "").trim()
      : rawReply.trim();

  const failure = (message: string): ParsedNutritionPlan => ({
    visibleText,
    meals: [],
    daily: null,
    error: message,
  });

  if (!match) {
    return failure(
        "The AI did not return structured ingredient quantities. Generate the plan again to request a nutrition breakdown.",
    );
  }

  try {
    const jsonText = match[1]
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

    const parsed: unknown = JSON.parse(jsonText);

    if (!parsed || typeof parsed !== "object" || !("meals" in parsed)) {
      return failure("The AI returned an invalid nutrition-data structure.");
    }

    const rawMeals = (parsed as { meals: unknown }).meals;

    if (!Array.isArray(rawMeals) || rawMeals.length !== 5) {
      return failure("The nutrition data must include all five main meals.");
    }

    const meals: GeneratedMeal[] = rawMeals.map((rawMeal: unknown) => {
      if (!rawMeal || typeof rawMeal !== "object") {
        throw new Error("A meal entry was invalid.");
      }

      const meal = rawMeal as {
        name?: unknown;
        ingredients?: unknown;
      };

      if (
          typeof meal.name !== "string" ||
          !Array.isArray(meal.ingredients) ||
          meal.ingredients.length === 0
      ) {
        throw new Error("A meal is missing its name or ingredients.");
      }

      const ingredients: IngredientAmount[] = meal.ingredients.map(
          (rawIngredient: unknown) => {
            if (!rawIngredient || typeof rawIngredient !== "object") {
              throw new Error("An ingredient entry was invalid.");
            }

            const ingredient = rawIngredient as {
              food?: unknown;
              grams?: unknown;
            };

            const grams = Number(ingredient.grams);

            if (
                typeof ingredient.food !== "string" ||
                !ingredient.food.trim() ||
                !Number.isFinite(grams) ||
                grams <= 0 ||
                grams > 10000
            ) {
              throw new Error("An ingredient has an invalid name or quantity.");
            }

            return {
              food: ingredient.food.trim(),
              grams,
            };
          },
      );

      return {
        name: meal.name.trim(),
        ingredients,
      };
    });

    const mealSummaries: MealNutritionSummary[] = meals.map((meal) => ({
      name: meal.name,
      result: calculateNutrition(meal.ingredients),
    }));

    const allIngredients = meals.flatMap((meal) => meal.ingredients);

    return {
      visibleText,
      meals: mealSummaries,
      daily: calculateNutrition(allIngredients),
      error: null,
    };
  } catch {
    return failure(
        "The AI returned invalid ingredient JSON. Generate the plan again; no nutrition values have been guessed.",
    );
  }
}

function isRecommendationMetadata(
    value: unknown,
): value is RecommendationMetadata {
  if (!value || typeof value !== "object") return false;

  const metadata = value as RecommendationMetadata;

  return (
      (metadata.mode === "manual" || metadata.mode === "tracker") &&
      typeof metadata.generatedAt === "string" &&
      Boolean(metadata.profileSnapshot) &&
      typeof metadata.profileSnapshot === "object"
  );
}

function isSavedRecommendation(value: unknown): value is SavedRecommendation {
  if (!value || typeof value !== "object") return false;

  const record = value as SavedRecommendation;

  return (
      typeof record.id === "string" &&
      typeof record.plan === "string" &&
      isRecommendationMetadata(record.metadata)
  );
}

export default function DietPlanPage({ onBack }: DietPlanPageProps) {
  // Read the shared mode and demo readings.
  // These are simulated values, not live wearable measurements.
  const wearableDemoEnabled = isWearableDemoEnabled();
  const wearablePromptContext = getWearableDemoPromptContext();

  const [savedPageState] = useState<SavedDietPlanState>(
      () => loadSavedDietPlanState(),
  );

  const [waterGlasses, setWaterGlasses] = useState(
      savedPageState.waterGlasses,
  );

  const [completedMeals, setCompletedMeals] = useState<string[]>(
      savedPageState.completedMeals,
  );

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [assessmentError, setAssessmentError] = useState("");
  const [dietPlan, setDietPlan] = useState(savedPageState.dietPlan);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  const [nutritionBreakdown, setNutritionBreakdown] =
      useState<ParsedNutritionPlan | null>(
          savedPageState.nutritionBreakdown,
      );

  const [recentPlans, setRecentPlans] = useState<string[]>(
      savedPageState.recentPlans,
  );

  const [generationIndex, setGenerationIndex] = useState(
      savedPageState.generationIndex,
  );

  const [recommendationMetadata, setRecommendationMetadata] =
      useState<RecommendationMetadata | null>(
          savedPageState.recommendationMetadata,
      );

  const [recommendationHistory, setRecommendationHistory] =
      useState<SavedRecommendation[]>(
          savedPageState.recommendationHistory,
      );

  const [remoteStateReady, setRemoteStateReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState("");

  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Load account-specific state from the backend.
  useEffect(() => {
    let cancelled = false;

    getMyDietPlanState()
        .then((result) => {
          if (cancelled) return;

          if (result.saved) {
            const saved = result.state;

            setWaterGlasses(
                typeof saved.waterGlasses === "number" &&
                Number.isFinite(saved.waterGlasses)
                    ? Math.min(20, Math.max(0, Math.trunc(saved.waterGlasses)))
                    : 0,
            );

            setCompletedMeals(
                Array.isArray(saved.completedMeals)
                    ? saved.completedMeals.filter(
                        (item): item is string => typeof item === "string",
                    )
                    : [],
            );

            setDietPlan(
                typeof saved.dietPlan === "string" ? saved.dietPlan : "",
            );

            setNutritionBreakdown(
                saved.nutritionBreakdown &&
                typeof saved.nutritionBreakdown === "object"
                    ? (saved.nutritionBreakdown as ParsedNutritionPlan)
                    : null,
            );

            setRecentPlans(
                Array.isArray(saved.recentPlans)
                    ? saved.recentPlans
                        .filter(
                            (item): item is string => typeof item === "string",
                        )
                        .slice(0, 2)
                    : [],
            );

            setGenerationIndex(
                typeof saved.generationIndex === "number" &&
                Number.isFinite(saved.generationIndex)
                    ? Math.max(0, Math.trunc(saved.generationIndex))
                    : 0,
            );

            setRecommendationMetadata(
                isRecommendationMetadata(saved.recommendationMetadata)
                    ? saved.recommendationMetadata
                    : null,
            );

            setRecommendationHistory(
                Array.isArray(saved.recommendationHistory)
                    ? saved.recommendationHistory
                        .filter(isSavedRecommendation)
                        .slice(0, 10)
                    : [],
            );
          }

          setRemoteStateReady(true);
          setPersistenceError("");
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setPersistenceError(
                error instanceof Error
                    ? `Your plan is still available in this tab, but account saving could not start: ${error.message}`
                    : "Your plan is still available in this tab, but account saving could not start.",
            );
          }
        });

    return () => {
      cancelled = true;
    };
  }, []);

  // Serialize saves so a slower, earlier request cannot overwrite a newer state.
  useEffect(() => {
    if (!remoteStateReady) return;

    const payload: DietPlanStatePayload = {
      waterGlasses,
      completedMeals,
      dietPlan,
      nutritionBreakdown,
      recentPlans,
      generationIndex,
      recommendationMetadata,
      recommendationHistory,
    };

    saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => saveMyDietPlanState(payload))
        .then(() => setPersistenceError(""))
        .catch((error: unknown) => {
          setPersistenceError(
              error instanceof Error
                  ? `Could not save your diet plan to your account: ${error.message}`
                  : "Could not save your diet plan to your account. Check your connection and try again.",
          );
        });
  }, [
    waterGlasses,
    completedMeals,
    dietPlan,
    nutritionBreakdown,
    recentPlans,
    generationIndex,
    recommendationMetadata,
    recommendationHistory,
    remoteStateReady,
  ]);

  // Keep the browser's temporary tab state synchronized as well.
  useEffect(() => {
    try {
      sessionStorage.setItem(
          DIET_PLAN_STORAGE_KEY,
          JSON.stringify({
            waterGlasses,
            completedMeals,
            dietPlan,
            nutritionBreakdown,
            recentPlans,
            generationIndex,
            recommendationMetadata,
            recommendationHistory,
          }),
      );
    } catch {
      // The page can still work if browser storage is unavailable.
    }
  }, [
    waterGlasses,
    completedMeals,
    dietPlan,
    nutritionBreakdown,
    recentPlans,
    generationIndex,
    recommendationMetadata,
    recommendationHistory,
  ]);

  // Load the user's saved health assessment.
  useEffect(() => {
    let cancelled = false;

    getMyAssessment()
        .then((result) => {
          if (!cancelled) {
            setAssessment(result.completed ? result.assessment : null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAssessmentError(
                "Could not load your health assessment. Check your login and try again.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setAssessmentLoading(false);
        });

    return () => {
      cancelled = true;
    };
  }, []);

  const targets = useMemo(
      () => calculateNutritionTargets(assessment),
      [assessment],
  );

  const dietWaterTargetMl = useMemo(
      () => getDailyWaterTargetMl(),
      [],
  );

  const profileDetails = [
    { label: "Diet preference", value: assessment?.diet },
    { label: "Health goal", value: assessment?.goal },
    {
      label: "Current weight",
      value: assessment?.weight ? `${assessment.weight} kg` : "",
    },
    {
      label: "Target weight",
      value: assessment?.targetWeight
          ? `${assessment.targetWeight} kg`
          : "",
    },
    { label: "Food preferences", value: assessment?.foodPreferences },
    { label: "Food allergies", value: assessment?.foodAllergies },
    { label: "Other allergies", value: assessment?.allergies },
    { label: "Foods to avoid", value: assessment?.foodsToAvoid },
    { label: "Health conditions", value: assessment?.conditions },
    { label: "Health concerns", value: assessment?.healthConcerns },
  ].filter((item) => Boolean(item.value?.trim()));

  const dailyTargets = [
    {
      label: "Estimated Daily Calories",
      value: targets.calories
          ? targets.calories.toLocaleString("en-IN")
          : "Not calculated",
      unit: targets.calories ? "kcal per day · estimate" : "",
      icon: Flame,
    },
    {
      label: "General Protein Guide",
      value: targets.protein ? `${targets.protein} g` : "Not calculated",
      unit: targets.protein ? "per day · general guide" : "",
      icon: Beef,
    },
    {
      label: "BMI Screening Estimate",
      value:
          targets.bmi !== null ? targets.bmi.toFixed(1) : "Not calculated",
      unit: targets.bmi !== null ? "not a diagnosis" : "",
      icon: Activity,
    },
  ];

  const generateDietPlan = async () => {
    if (!assessment) {
      setPlanError(
          "Complete and save your health assessment before generating a plan.",
      );
      return;
    }

    setGeneratingPlan(true);
    setPlanError("");

    const profileValue = (key: string) => {
      const value = assessment[key];

      return typeof value === "string" && value.trim()
          ? value.trim()
          : "Not provided";
    };

    const currentStyle =
        dietPlanStyles[generationIndex % dietPlanStyles.length];

    const recentPlanContext = recentPlans.length
        ? recentPlans
            .map(
                (plan, index) =>
                    `Previous plan ${index + 1}:\n${plan.slice(0, 1200)}`,
            )
            .join("\n\n")
        : "No previous generated plans are available in this page session.";

    const calorieGuidance = targets.calories
        ? `Approximately ${targets.calories} kcal/day as a rough target estimate; not measured nutrition.`
        : "Not calculated. Do not invent a calorie target.";

    const proteinGuidance = targets.protein
        ? `Approximately ${targets.protein} g/day as a general reference only.`
        : "Not calculated. Do not invent a numeric protein target.";

    const activityAndSleepContext =
        wearablePromptContext ??
        "Manual Mode is active. Use only the activity and sleep information in the saved assessment. Do not invent wearable measurements.";

    const prompt = `
You are the meal-planning assistant inside YourArogyum, a preventive wellness project. Create one concise, varied, practical one-day meal plan. Do not diagnose or claim that foods treat or prevent disease.

USER PROFILE
Age: ${profileValue("age")}
Sex: ${profileValue("sex")}
Height: ${profileValue("height")} cm
Current weight: ${profileValue("weight")} kg
Target weight: ${profileValue("targetWeight")} kg
Goal: ${profileValue("goal")}
Diet preference: ${profileValue("diet")}
Food preferences: ${profileValue("foodPreferences")}
Food allergies: ${profileValue("foodAllergies")}
Other allergies: ${profileValue("allergies")}
Foods to avoid: ${profileValue("foodsToAvoid")}
Health conditions: ${profileValue("conditions")}
Health concerns: ${profileValue("healthConcerns")}
Medications: ${profileValue("medications")}
Activity level from assessment: ${profileValue("activity")}
Daily activity from assessment: ${profileValue("daily_activity")}
Fitness level: ${profileValue("fitnessLevel")}
Sleep duration from manually entered assessment: ${profileValue("sleep")}
Usual water intake: ${profileValue("water")}

ACTIVITY AND SLEEP CONTEXT FOR THIS GENERATION
${activityAndSleepContext}

When this context is marked simulated, treat it only as illustrative context for general wellness suggestions. Clearly identify it as sample data when relevant. Do not claim it came from a real device. Do not use simulated heart rate or active calories to prescribe calorie intake, diagnose a condition, or assess exercise readiness. Do not present sample values as verified measurements. Personal safety, allergies, health conditions and explicit dietary restrictions always take priority.

ESTIMATED TARGET GUIDANCE
Calories: ${calorieGuidance}
Protein: ${proteinGuidance}

VARIETY STYLE FOR THIS GENERATION
${currentStyle}

RECENT PLANS TO AVOID REPEATING
${recentPlanContext}

MEAL PLAN RULES
1. Respect the user's diet preference. Vegetarian means no meat or fish; vegan means no animal products.
2. Treat every listed allergy and food to avoid as a hard exclusion. Never include it in meals, ingredients, garnishes or alternatives.
3. Vary the five main dishes, ingredients, protein sources, grains, vegetables and preparation methods. Do not default to moong dal, chana, generic dal and khichdi across every plan.
4. Prefer practical and reasonably affordable Indian meals. Avoid repeating recent main dishes when suitable alternatives exist.
5. Use these headings in order: BREAKFAST, MID-MORNING, LUNCH, EVENING SNACK, DINNER, WHY THIS PLAN FITS, PRACTICAL NOTES, SAFETY NOTE.
6. Give portion sizes and no more than one practical alternative per meal. Keep the readable plan concise.
7. Do not invent nutrition totals. The application calculates nutrients from the database and estimated ingredient weights.
8. For medical conditions, advise users to confirm disease-specific dietary changes with a qualified professional. Never recommend medication changes.
9. For kidney/renal disease, dialysis, pregnancy, eating disorders, or age outside the supported adult range, avoid precise calorie or protein prescriptions.
10. Do not invent references. Retrieved source references may be appended by the application.

COMPLETENESS
Finish every section and sentence. Include this safety sentence exactly:
"This is general wellness information, not a diagnosis or treatment plan. Confirm disease-specific dietary changes and allergy safety with a qualified healthcare professional."

STRUCTURED NUTRITION DATA
After the readable plan, append valid JSON between the exact markers below. Do not wrap JSON in a Markdown code fence.
NUTRITION_DATA_JSON_START
{
  "meals": [
    { "name": "BREAKFAST", "ingredients": [{ "food": "Rice flakes", "grams": 60 }] },
    { "name": "MID-MORNING", "ingredients": [{ "food": "Papaya", "grams": 150 }] },
    { "name": "LUNCH", "ingredients": [{ "food": "Wheat flour, atta", "grams": 60 }] },
    { "name": "EVENING SNACK", "ingredients": [{ "food": "Oats", "grams": 30 }] },
    { "name": "DINNER", "ingredients": [{ "food": "Paneer", "grams": 100 }] }
  ]
}
NUTRITION_DATA_JSON_END

The JSON above is a FORMAT EXAMPLE ONLY. Do not reuse its foods or quantities for the actual plan. Return exactly five objects matching the five actual main meals. Include significant ingredients in a serving, including grains, dairy, vegetables, oils, ghee, seeds and sauces. Give estimated edible weights in grams. Match raw/dry quantities to raw/dry database entries. Do not include alternatives in the nutrition calculations. Use the exact database name when an appropriate match exists. Never substitute a different food simply to create a database match; use the real food name if no appropriate entry exists so the app can flag it. Respect every dietary preference and allergy exclusion. Ensure valid JSON, exactly five meals and no extra prose between the markers.

AVAILABLE FOOD NAMES IN THE NUTRITION DATABASE
${availableNutritionFoodNames.join(" | ")}
`;

    try {
      const response = await apiRequest<ChatResponse>("/api/chat", {
        method: "POST",
        body: {
          messages: [{ role: "user", content: prompt }],
        },
      });

      if (
          !response ||
          typeof response.reply !== "string" ||
          !response.reply.trim()
      ) {
        throw new Error("The AI returned an empty response. Please try again.");
      }

      const parsedReply = parseNutritionPlanReply(response.reply);
      const generatedText = parsedReply.visibleText || response.reply;

      const mode: WellnessMode = wearableDemoEnabled
          ? "tracker"
          : "manual";

      const profileSnapshot: Record<string, string> = {
        age: profileValue("age"),
        sex: profileValue("sex"),
        height: profileValue("height"),
        weight: profileValue("weight"),
        targetWeight: profileValue("targetWeight"),
        goal: profileValue("goal"),
        diet: profileValue("diet"),
        foodPreferences: profileValue("foodPreferences"),
        foodAllergies: profileValue("foodAllergies"),
        allergies: profileValue("allergies"),
        foodsToAvoid: profileValue("foodsToAvoid"),
        conditions: profileValue("conditions"),
        healthConcerns: profileValue("healthConcerns"),
        medications: profileValue("medications"),
        activity: profileValue("activity"),
        dailyActivity: profileValue("daily_activity"),
        fitnessLevel: profileValue("fitnessLevel"),
        sleep: profileValue("sleep"),
      };

      const trackerSnapshot: TrackerInputSnapshot | null =
          wearableDemoEnabled
              ? {
                source: "simulated-demo",
                steps: WEARABLE_DEMO_DATA.steps,
                dailyStepGoal: WEARABLE_DEMO_DATA.dailyStepGoal,
                heartRateBpm: WEARABLE_DEMO_DATA.heartRateBpm,
                sleepHours: WEARABLE_DEMO_DATA.sleepHours,
                sleepLabel: WEARABLE_DEMO_DATA.sleepLabel,
                activeCalories: WEARABLE_DEMO_DATA.activeCalories,
              }
              : null;

      const sourceNote = wearableDemoEnabled
          ? [
            "DATA SOURCE: Tracker Mode — simulated demonstration values, not live wearable readings.",
            `Example inputs: ${WEARABLE_DEMO_DATA.steps.toLocaleString("en-IN")} steps, ${WEARABLE_DEMO_DATA.sleepLabel} example sleep, ${WEARABLE_DEMO_DATA.heartRateBpm} BPM example heart rate, and ${WEARABLE_DEMO_DATA.activeCalories} illustrative active kcal.`,
          ].join("\n")
          : "DATA SOURCE: Manual Mode — saved assessment and manually provided profile details.";

      const displayReply = `${sourceNote}\n\n${generatedText}`;

      const metadata: RecommendationMetadata = {
        mode,
        generatedAt: new Date().toISOString(),
        profileSnapshot,
        trackerSnapshot,
      };

      const newRecord: SavedRecommendation = {
        id: `${Date.now()}-${generationIndex}`,
        plan: displayReply,
        metadata,
      };

      setDietPlan(displayReply);
      setNutritionBreakdown(parsedReply);
      setRecentPlans((previous) => [displayReply, ...previous].slice(0, 2));
      setGenerationIndex((previous) => previous + 1);
      setRecommendationMetadata(metadata);

      setRecommendationHistory((previous) =>
          [newRecord, ...previous]
              .filter(
                  (record, index, allRecords) =>
                      allRecords.findIndex(
                          (candidate) => candidate.id === record.id,
                      ) === index,
              )
              .slice(0, 10),
      );
    } catch (error) {
      setPlanError(
          error instanceof Error
              ? error.message
              : "Could not generate a diet plan. Please try again.",
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const toggleMeal = (mealName: string) => {
    setCompletedMeals((previous) =>
        previous.includes(mealName)
            ? previous.filter((meal) => meal !== mealName)
            : [...previous, mealName],
    );
  };

  const unmatchedIngredients = Array.from(
      new Set(nutritionBreakdown?.daily?.unmatchedIngredients ?? []),
  );

  return (
      <main className="h-full min-h-0 overflow-y-auto bg-[#F6F2E9] p-4 text-[#30382F] sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex items-start gap-3">
            <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="mt-1 rounded-xl border border-[#D9DED2] bg-[#FCFAF5] p-2 text-[#344C3D] transition hover:bg-[#DCE3D5]"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="font-serif text-3xl text-[#344C3D] sm:text-4xl">
                Your Personalized Diet Plan
              </h1>

              <p className="mt-2 text-sm text-[#77796E]">
                Nutrition estimates and meal guidance based on your saved
                assessment
                {wearableDemoEnabled
                    ? " plus simulated Tracker Mode context."
                    : "."}
              </p>
            </div>
          </header>

          {persistenceError && (
              <div
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                {persistenceError}
              </div>
          )}

          {wearableDemoEnabled && (
              <section className="rounded-2xl border border-[#C7D5C2] bg-[#EAF0E5] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white p-3 text-[#526B50]">
                    <Activity size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-xl text-[#344C3D]">
                        Tracker Mode context
                      </h2>

                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#526451]">
                    Simulated sample data
                  </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#526451]">
                      {WEARABLE_DEMO_DATA.steps.toLocaleString("en-IN")} steps
                      today · example heart rate{" "}
                      {WEARABLE_DEMO_DATA.heartRateBpm} BPM · example sleep{" "}
                      {WEARABLE_DEMO_DATA.sleepLabel} · illustrative active
                      calories {WEARABLE_DEMO_DATA.activeCalories} kcal.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#687466]">
                      These values are simulated, not readings from a real
                      device. The AI uses them only as limited general-wellness
                      context.
                    </p>
                  </div>
                </div>
              </section>
          )}

          <section className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:p-6">
            <h2 className="font-serif text-2xl text-[#344C3D]">
              Your Health Profile
            </h2>

            <p className="mt-2 text-sm text-[#77796E]">
              Your saved assessment guides the AI-generated recommendations.
            </p>

            {assessmentLoading ? (
                <p className="mt-4 text-sm text-[#626B5E]">
                  Loading your health assessment...
                </p>
            ) : assessmentError ? (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {assessmentError}
                </p>
            ) : !assessment ? (
                <p className="mt-4 text-sm text-[#626B5E]">
                  No saved assessment found. Complete your health assessment first.
                </p>
            ) : profileDetails.length === 0 ? (
                <p className="mt-4 text-sm text-[#626B5E]">
                  Your assessment was found, but profile details are not available yet.
                </p>
            ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profileDetails.map((item) => (
                      <div
                          key={item.label}
                          className="rounded-xl border border-[#E1E2D7] bg-[#F6F2E9] p-4"
                      >
                        <p className="text-xs font-medium text-[#77796E]">
                          {item.label}
                        </p>

                        <p className="mt-2 break-words text-sm font-medium text-[#344C3D]">
                          {item.value}
                        </p>
                      </div>
                  ))}
                </div>
            )}

            {assessment &&
                (assessment.foodAllergies?.trim() ||
                    assessment.allergies?.trim() ||
                    assessment.foodsToAvoid?.trim()) && (
                    <p className="mt-4 rounded-xl bg-[#F5E9D7] p-3 text-sm text-[#73532C]">
                      Review your listed allergies and foods to avoid. Always verify
                      ingredients before eating; AI-generated suggestions do not
                      guarantee allergen safety.
                    </p>
                )}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dailyTargets.map((target) => {
              const Icon = target.icon;

              return (
                  <article
                      key={target.label}
                      className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[#626B5E]">
                        {target.label}
                      </p>

                      <div className="rounded-xl bg-[#DCE3D5] p-2.5 text-[#344C3D]">
                        <Icon size={20} />
                      </div>
                    </div>

                    <p className="mt-5 font-serif text-2xl text-[#344C3D]">
                      {target.value}
                    </p>

                    {target.unit && (
                        <p className="mt-1 text-xs text-[#77796E]">
                          {target.unit}
                        </p>
                    )}
                  </article>
              );
            })}
          </section>

          <p className="text-xs leading-5 text-[#77796E]">
            {targets.note} BMI is a screening measure, not a diagnosis. Nutrition
            needs vary between individuals.
          </p>

          <section className="flex flex-col gap-5 rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#DCE3D5] p-3 text-[#344C3D]">
                <Droplets size={25} />
              </div>

              <div>
                <h2 className="font-serif text-xl text-[#344C3D]">
                  Water Intake
                </h2>

                <p className="mt-1 text-sm text-[#77796E]">
                  {waterGlasses * 250} ml tracked · 250 ml per glass
                </p>

                <p className="mt-1 text-xs text-[#77796E]">
                  This is a tracker, not a personalized hydration prescription.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-20">
                <p className="text-xl font-semibold text-[#344C3D]">
                  {waterGlasses}
                </p>
                <p className="text-xs text-[#77796E]">Glasses</p>
              </div>

              <button
                  type="button"
                  onClick={() =>
                      setWaterGlasses((count) => Math.max(0, count - 1))
                  }
                  disabled={waterGlasses === 0}
                  aria-label="Remove one glass"
                  className="h-10 w-10 rounded-xl border border-[#D9DED2] text-lg disabled:opacity-40"
              >
                −
              </button>

              <button
                  type="button"
                  onClick={() =>
                      setWaterGlasses((count) => Math.min(20, count + 1))
                  }
                  disabled={waterGlasses === 20}
                  className="h-10 rounded-xl bg-[#344C3D] px-4 text-sm text-white transition hover:bg-[#263A2E] disabled:opacity-40"
              >
                + Add glass
              </button>
            </div>
          </section>

          <HydrationReminderCard
              currentWaterMl={waterGlasses * 250}
              targetWaterMl={dietWaterTargetMl}
              onAddWater={(ml) =>
                  setWaterGlasses((count) =>
                      Math.min(20, count + Math.max(1, Math.round(ml / 250))),
                  )
              }
          />

          <section className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#DCE3D5] p-3 text-[#344C3D]">
                  <Sparkles size={23} />
                </div>

                <div>
                  <h2 className="font-serif text-2xl text-[#344C3D]">
                    AI Meal Recommendations
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77796E]">
                    Generate a varied plan using your saved goal, food preferences,
                    allergies, and health profile.
                    {wearableDemoEnabled
                        ? " Tracker Mode also supplies simulated activity and sleep context."
                        : " Manual Mode uses the activity and sleep information in your saved assessment."}{" "}
                    Ingredient quantities are checked against the local nutrition database.
                  </p>
                </div>
              </div>

              <button
                  type="button"
                  onClick={generateDietPlan}
                  disabled={!assessment || assessmentLoading || generatingPlan}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#344C3D] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#263A2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPlan ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Generating...
                    </>
                ) : (
                    <>
                      <Sparkles size={17} />
                      {dietPlan ? "Generate Again" : "Generate My Diet Plan"}
                    </>
                )}
              </button>
            </div>

            {planError && (
                <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  {planError}
                </div>
            )}

            {generatingPlan && (
                <div
                    role="status"
                    className="mt-5 rounded-xl bg-[#F0F3EB] p-5 text-sm text-[#526451]"
                >
                  Generating your plan and checking ingredient quantities. Please
                  keep this page open.
                </div>
            )}

            {!dietPlan && !generatingPlan && !planError && (
                <div className="mt-5 rounded-xl border border-dashed border-[#CDD4C6] p-5 text-sm leading-6 text-[#77796E]">
                  <p className="font-medium text-[#344C3D]">
                    Your generated plan will appear here.
                  </p>
                  <p className="mt-1">
                    Check ingredient names and portion sizes and verify allergy safety
                    before following any recommendation.
                  </p>
                </div>
            )}

            {dietPlan && !generatingPlan && (
                <div className="mt-6">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#526B50]">
                    <CheckCircle2 size={18} />
                    Your generated plan
                  </div>

                  <div className="whitespace-pre-wrap break-words rounded-xl border border-[#E1E2D7] bg-[#F6F2E9] p-5 text-sm leading-7 text-[#30382F]">
                    {dietPlan}
                  </div>

                  {nutritionBreakdown && (
                      <section className="mt-5 rounded-xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
                        <h3 className="font-serif text-xl text-[#344C3D]">
                          Ingredient-Based Nutrition Estimate
                        </h3>

                        {nutritionBreakdown.error ? (
                            <p className="mt-3 text-sm leading-6 text-[#77796E]">
                              {nutritionBreakdown.error}
                            </p>
                        ) : nutritionBreakdown.daily?.isComplete ? (
                            <>
                              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                  {
                                    label: "Calories",
                                    value: `${nutritionBreakdown.daily.calories} kcal`,
                                  },
                                  {
                                    label: "Protein",
                                    value: `${nutritionBreakdown.daily.protein} g`,
                                  },
                                  {
                                    label: "Carbohydrates",
                                    value: `${nutritionBreakdown.daily.carbohydrates} g`,
                                  },
                                  {
                                    label: "Fat",
                                    value: `${nutritionBreakdown.daily.fat} g`,
                                  },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl bg-[#F0F3EB] p-3"
                                    >
                                      <p className="text-xs text-[#77796E]">
                                        {item.label}
                                      </p>
                                      <p className="mt-2 font-semibold text-[#344C3D]">
                                        {item.value}
                                      </p>
                                    </div>
                                ))}
                              </div>

                              <p className="mt-3 text-xs text-[#77796E]">
                                Fibre: {nutritionBreakdown.daily.fiber} g.
                              </p>
                            </>
                        ) : (
                            <div className="mt-3 text-sm leading-6 text-[#77796E]">
                              <p>
                                Complete totals are withheld because some ingredients
                                could not be matched to a database entry. The app does
                                not invent values for unmatched foods.
                              </p>

                              {unmatchedIngredients.length > 0 && (
                                  <p className="mt-2">
                                    Unmatched ingredients: {unmatchedIngredients.join(", ")}
                                  </p>
                              )}
                            </div>
                        )}

                        {nutritionBreakdown.meals.length > 0 && (
                            <div className="mt-5 space-y-3">
                              <h4 className="font-medium text-[#344C3D]">
                                Per-meal breakdown
                              </h4>

                              {nutritionBreakdown.meals.map((meal) => (
                                  <div
                                      key={meal.name}
                                      className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E2D7] pt-3 text-sm"
                                  >
                          <span className="font-medium text-[#344C3D]">
                            {meal.name}
                          </span>

                                    <span className="text-[#626B5E]">
                            {meal.result.isComplete
                                ? `${meal.result.calories} kcal · ${meal.result.protein} g protein`
                                : `Incomplete; ${meal.result.unmatchedIngredients.length} unmatched ingredient(s)`}
                          </span>
                                  </div>
                              ))}
                            </div>
                        )}

                        <p className="mt-4 text-xs leading-5 text-[#77796E]">
                          Values are estimates from database-matched foods and
                          AI-estimated ingredient weights. Actual nutrition varies by
                          food form, brand, preparation, substitutions and serving size.
                          This is not a clinically validated measurement.
                        </p>
                      </section>
                  )}
                </div>
            )}
          </section>

          {/* Saved recommendation history */}
          {recommendationHistory.length > 0 && (
              <section className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:p-6">
                <h2 className="font-serif text-2xl text-[#344C3D]">
                  Saved Recommendation History
                </h2>

                <p className="mt-2 text-sm text-[#77796E]">
                  Review past recommendations and the inputs used to create them.
                </p>

                <div className="mt-5 space-y-4">
                  {recommendationHistory.map((record) => (
                      <article
                          key={record.id}
                          className="rounded-xl border border-[#E1E2D7] bg-[#F6F2E9] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-[#344C3D]">
                              {record.metadata.mode === "tracker"
                                  ? "Wearable Tracker Mode"
                                  : "Manual Mode"}
                            </h3>

                            <p className="mt-1 text-xs text-[#77796E]">
                              Generated{" "}
                              {new Date(record.metadata.generatedAt).toLocaleString()}
                            </p>
                          </div>

                          {record.metadata.trackerSnapshot && (
                              <span className="rounded-full bg-[#EAF0E5] px-3 py-1 text-xs font-medium text-[#526451]">
                        Simulated tracker data
                      </span>
                          )}
                        </div>

                        {record.metadata.trackerSnapshot && (
                            <p className="mt-3 text-sm leading-6 text-[#526451]">
                              Steps:{" "}
                              {record.metadata.trackerSnapshot.steps.toLocaleString("en-IN")}
                              {" · "}Sleep: {record.metadata.trackerSnapshot.sleepLabel}
                              {" · "}Example heart rate:{" "}
                              {record.metadata.trackerSnapshot.heartRateBpm} BPM
                            </p>
                        )}

                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium text-[#526B50]">
                            View saved plan and input snapshot
                          </summary>

                          <div className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white p-4 text-sm leading-6 text-[#424A40]">
                            {record.plan}
                          </div>

                          <h4 className="mt-4 text-sm font-medium text-[#344C3D]">
                            Profile snapshot
                          </h4>

                          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                            {Object.entries(record.metadata.profileSnapshot).map(
                                ([key, value]) => (
                                    <div key={key} className="rounded-lg bg-white p-3">
                                      <dt className="text-xs text-[#77796E]">{key}</dt>
                                      <dd className="mt-1 break-words text-sm text-[#344C3D]">
                                        {value}
                                      </dd>
                                    </div>
                                ),
                            )}
                          </dl>
                        </details>
                      </article>
                  ))}
                </div>
              </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl text-[#344C3D]">
                Meal Adherence
              </h2>

              <p className="text-xs text-[#77796E]">
                {completedMeals.length}/{mealTrackers.length} completed
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {mealTrackers.map((meal) => {
                const Icon = meal.icon;
                const isComplete = completedMeals.includes(meal.name);

                return (
                    <article
                        key={meal.name}
                        className={`rounded-2xl border p-5 transition ${
                            isComplete
                                ? "border-[#BFCDB7] bg-[#F0F3EB]"
                                : "border-[#E1E2D7] bg-[#FCFAF5]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-[#DCE3D5] p-3 text-[#344C3D]">
                          <Icon size={22} />
                        </div>

                        <span className="text-xs text-[#77796E]">
                      {meal.time}
                    </span>
                      </div>

                      <h3 className="mt-4 font-serif text-xl text-[#344C3D]">
                        {meal.name}
                      </h3>

                      <p className="mt-2 text-sm text-[#77796E]">
                        Mark this meal when you have eaten it.
                      </p>

                      <button
                          type="button"
                          onClick={() => toggleMeal(meal.name)}
                          aria-pressed={isComplete}
                          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition ${
                              isComplete
                                  ? "bg-[#DCE3D5] text-[#344C3D]"
                                  : "bg-[#344C3D] text-white hover:bg-[#263A2E]"
                          }`}
                      >
                        <CheckCircle2 size={17} />
                        {isComplete ? "Completed" : "Mark as eaten"}
                      </button>
                    </article>
                );
              })}
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-xl border border-[#E1E2D7] bg-[#FCFAF5] p-4 text-xs leading-5 text-[#77796E]">
            <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#71846A]"
            />
            <p>
              YourArogyum provides general preventive wellness guidance.
              AI-generated meals and ingredient weights can contain errors and
              are not clinically validated. Verify allergy safety and consult a
              qualified healthcare professional for disease-specific dietary advice.
            </p>
          </div>
        </div>
      </main>
  );
}
