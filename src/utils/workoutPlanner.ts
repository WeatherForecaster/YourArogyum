import { Sun, Dumbbell, Wind, type LucideIcon } from "lucide-react";
import type { AssessmentData } from "../services/assessment";

export interface Exercise {
  name: string;
  duration: string;
  detail: string;
}

export interface WorkoutSection {
  title: "Warm-up" | "Main Workout" | "Cool-down";
  subtitle: string;
  icon: LucideIcon;
  exercises: Exercise[];
}

export interface PersonalizedWorkout {
  sections: WorkoutSection[];
  totalDurationMin: number;
  totalExercises: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Gentle";
  focusTitle: string;
  focusDescription: string;
  safetyNotice: string;
  hasHealthCondition: boolean;
  adaptedFactors: string[];
}

// Fallback conservative routine when assessment is missing or incomplete
const DEFAULT_WORKOUT: PersonalizedWorkout = {
  sections: [
    {
      title: "Warm-up",
      subtitle: "5 minutes",
      icon: Sun,
      exercises: [
        {
          name: "Marching in place",
          duration: "2 min",
          detail: "March gently at a comfortable pace with relaxed breathing.",
        },
        {
          name: "Shoulder rolls",
          duration: "1 min",
          detail: "Roll shoulders slowly up, back, and down to release tension.",
        },
        {
          name: "Gentle side steps",
          duration: "2 min",
          detail: "Step side to side comfortably while maintaining balance.",
        },
      ],
    },
    {
      title: "Main Workout",
      subtitle: "20 minutes",
      icon: Dumbbell,
      exercises: [
        {
          name: "Brisk walking in place",
          duration: "8 min",
          detail: "Walk at a pace where you can easily hold a conversation.",
        },
        {
          name: "Chair sit-to-stands",
          duration: "4 min",
          detail: "Stand up from a sturdy chair and sit down slowly with control.",
        },
        {
          name: "Wall push-ups",
          duration: "4 min",
          detail: "Keep your body aligned and press away from the wall smoothly.",
        },
        {
          name: "Standing calf raises",
          duration: "4 min",
          detail: "Hold a wall or chair for balance and raise heels gently.",
        },
      ],
    },
    {
      title: "Cool-down",
      subtitle: "5 minutes",
      icon: Wind,
      exercises: [
        {
          name: "Slow walking",
          duration: "2 min",
          detail: "Gradually slow down your movement to lower heart rate.",
        },
        {
          name: "Gentle full-body stretch",
          duration: "3 min",
          detail: "Gently stretch calves, chest, and lower back without bouncing.",
        },
      ],
    },
  ],
  totalDurationMin: 30,
  totalExercises: 9,
  difficulty: "Beginner",
  focusTitle: "Foundational Movement",
  focusDescription: "A balanced, joint-friendly daily routine for general activity and wellbeing.",
  safetyNotice: "General guidance, consult a doctor before starting. Listen to your body and rest whenever needed.",
  hasHealthCondition: false,
  adaptedFactors: ["Default conservative baseline"],
};

function extractString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) {
    return val.map((item) => extractString(item)).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return String(val).trim();
}

function extractNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = typeof val === "number" ? val : parseFloat(String(val).trim());
  return Number.isFinite(num) && num > 0 ? num : null;
}

function isNoneOrEmpty(text: string): boolean {
  if (!text) return true;
  const cleaned = text.trim().toLowerCase();
  return (
    cleaned === "" ||
    cleaned === "none" ||
    cleaned === "no" ||
    cleaned === "nil" ||
    cleaned === "n/a" ||
    cleaned === "na" ||
    cleaned === "none." ||
    cleaned === "no conditions" ||
    cleaned === "nothing" ||
    cleaned === "healthy" ||
    cleaned === "normal"
  );
}

export function generatePersonalizedWorkout(
  assessment: AssessmentData | null | undefined
): PersonalizedWorkout {
  if (!assessment || typeof assessment !== "object" || Object.keys(assessment).length === 0) {
    return DEFAULT_WORKOUT;
  }

  const rawRecord = assessment as Record<string, unknown>;

  const age = extractNumber(rawRecord.age);
  const weight = extractNumber(rawRecord.weight ?? rawRecord.weightKg ?? rawRecord.weight_kg);
  const targetWeight = extractNumber(rawRecord.targetWeight ?? rawRecord.target_weight ?? rawRecord.targetWeightKg);

  const rawGoal = extractString(rawRecord.goal ?? rawRecord.healthGoal ?? rawRecord.fitnessGoal ?? rawRecord.health_goal).toLowerCase();
  const rawFitness = extractString(rawRecord.fitnessLevel ?? rawRecord.fitness_level ?? rawRecord.fitness).toLowerCase();
  const rawActivity = extractString(rawRecord.activity ?? rawRecord.activityLevel ?? rawRecord.activity_level ?? rawRecord.dailyActivity ?? rawRecord.daily_activity).toLowerCase();

  const condText = extractString(rawRecord.conditions ?? rawRecord.healthConditions ?? rawRecord.health_conditions);
  const concernText = extractString(rawRecord.healthConcerns ?? rawRecord.health_concerns ?? rawRecord.concerns);

  const combinedHealthText = `${condText} ${concernText}`.toLowerCase();

  let hasCardiacOrBP = false;
  let hasDiabetes = false;
  let hasAsthma = false;
  let hasJointOrOther = false;
  let hasHealthCondition = false;

  if (!isNoneOrEmpty(condText) || !isNoneOrEmpty(concernText)) {
    hasCardiacOrBP = /\b(hypertension|high blood pressure|blood pressure|bp|heart|cardiac|coronary|angina)\b/i.test(combinedHealthText);
    hasDiabetes = /\b(diabetes|diabetic|type 1|type 2|high blood sugar)\b/i.test(combinedHealthText);
    hasAsthma = /\b(asthma|respiratory|breathing difficulty|copd|bronchitis|wheez)\b/i.test(combinedHealthText);
    hasJointOrOther = /\b(arthritis|joint pain|knee pain|osteoporosis|kidney stones|kidney disease|renal|thyroid|pcos|pcod|high cholesterol|cholesterol)\b/i.test(combinedHealthText);

    const hasExplicitOther = !isNoneOrEmpty(condText) && /\b(other)\b/i.test(condText);

    hasHealthCondition = hasCardiacOrBP || hasDiabetes || hasAsthma || hasJointOrOther || hasExplicitOther;
  }

  // Goal classification: weight-gain, weight-loss, maintain, strength, stamina
  let goalType: "weight-gain" | "weight-loss" | "strength" | "stamina" | "maintain" = "maintain";

  if (
    rawGoal.includes("gain") ||
    rawGoal.includes("build strength") ||
    rawGoal.includes("build muscle") ||
    (weight !== null && targetWeight !== null && targetWeight > weight)
  ) {
    goalType = rawGoal.includes("strength") || rawGoal.includes("muscle") ? "strength" : "weight-gain";
  } else if (
    rawGoal.includes("lose") ||
    rawGoal.includes("loss") ||
    rawGoal.includes("weight management") ||
    (weight !== null && targetWeight !== null && targetWeight < weight)
  ) {
    goalType = "weight-loss";
  } else if (rawGoal.includes("stamina") || rawGoal.includes("endurance")) {
    goalType = "stamina";
  }

  // Fitness level classification
  let fitnessLevel: "Beginner" | "Intermediate" | "Advanced" = "Beginner";
  if (rawFitness.includes("advanced") || rawActivity.includes("very active")) {
    fitnessLevel = "Advanced";
  } else if (rawFitness.includes("intermediate") || rawActivity.includes("moderately active")) {
    fitnessLevel = "Intermediate";
  } else {
    fitnessLevel = "Beginner"; // Conservative default for "currently not exercising", "beginner", or missing
  }

  // Safety cap: If user has significant health condition or is elderly (>= 65), cap intensity
  const isSenior = age !== null && age >= 65;
  if (hasHealthCondition || isSenior) {
    if (fitnessLevel === "Advanced") {
      fitnessLevel = "Intermediate";
    }
  }

  const adaptedFactors: string[] = [];
  if (fitnessLevel !== "Beginner") adaptedFactors.push(`Fitness level: ${fitnessLevel}`);
  if (goalType !== "maintain") adaptedFactors.push(`Goal: ${goalType.replace("-", " ")}`);
  if (age !== null) adaptedFactors.push(`Age: ${age}`);
  if (hasHealthCondition) adaptedFactors.push("Condition-adapted pacing");

  // Determine durations based on profile and conditions
  let warmUpMin = 5;
  let coolDownMin = 5;
  let mainMin = 20;

  // Conditions like Asthma, Heart/BP, or Senior need longer gradual warm-up and cool-down
  if (hasAsthma || hasCardiacOrBP || isSenior) {
    warmUpMin = 8;
    coolDownMin = 7;
    mainMin = 18;
  } else if (hasHealthCondition) {
    warmUpMin = 7;
    coolDownMin = 6;
    mainMin = 18;
  } else if (fitnessLevel === "Advanced") {
    warmUpMin = 5;
    coolDownMin = 5;
    mainMin = 25;
  } else if (fitnessLevel === "Intermediate") {
    warmUpMin = 5;
    coolDownMin = 5;
    mainMin = 22;
  }

  // Build Sections based on Profile
  const warmUpExercises: Exercise[] = [];
  const mainExercises: Exercise[] = [];
  const coolDownExercises: Exercise[] = [];

  // 1. Warm-up generation
  if (hasAsthma || hasCardiacOrBP || isSenior) {
    warmUpExercises.push(
      {
        name: "Slow seated or standing marches",
        duration: "3 min",
        detail: "Gradual rhythmic stepping with continuous, comfortable breathing.",
      },
      {
        name: "Arm circles & chest openers",
        duration: "2 min",
        detail: "Gentle shoulder rotations to loosen upper body tension.",
      },
      {
        name: "Ankle & wrist rotations",
        duration: "3 min",
        detail: "Controlled circular motions to prepare joints without elevating heart rate suddenly.",
      }
    );
  } else if (fitnessLevel === "Advanced" || fitnessLevel === "Intermediate") {
    warmUpExercises.push(
      {
        name: "Dynamic arm swings & torso twists",
        duration: "2 min",
        detail: "Active upper-body mobility with a steady, controlled rhythm.",
      },
      {
        name: "Brisk marching with high knees",
        duration: "2 min",
        detail: "Drive knees upward smoothly to activate the hip flexors and core.",
      },
      {
        name: "Light bodyweight hip openers",
        duration: "1 min",
        detail: "Gentle lateral side steps and half-squat mobility pulses.",
      }
    );
  } else {
    // Beginner default
    warmUpExercises.push(
      {
        name: "Marching in place",
        duration: "2 min",
        detail: "March gently at a comfortable pace with relaxed arm swings.",
      },
      {
        name: "Shoulder rolls",
        duration: "1 min",
        detail: "Roll shoulders backward and forward in slow, controlled circles.",
      },
      {
        name: "Gentle side steps",
        duration: "2 min",
        detail: "Step side to side while keeping weight centred and balanced.",
      }
    );
  }

  // 2. Main Workout generation
  if (hasHealthCondition || isSenior) {
    // Low-impact, safe cardiovascular and light resistance
    mainExercises.push(
      {
        name: "Stable chair sit-to-stands",
        duration: "4 min",
        detail: "Use a sturdy chair with arms for support if needed. Stand with continuous exhalation.",
      },
      {
        name: "Low-impact level walking",
        duration: "6 min",
        detail: "Maintain a steady, conversational pace. Stop immediately if breathless or lightheaded.",
      },
      {
        name: "Wall push-ups (low resistance)",
        duration: "4 min",
        detail: "Hands shoulder-width on the wall. Avoid breath-holding or straining.",
      },
      {
        name: "Seated or supported calf raises",
        duration: "4 min",
        detail: "Hold onto a stable surface and gently raise heels to stimulate circulation.",
      }
    );
  } else if (goalType === "weight-gain" || goalType === "strength") {
    if (fitnessLevel === "Advanced") {
      mainExercises.push(
        {
          name: "Deep bodyweight squats with 2-sec pause",
          duration: "6 min",
          detail: "Full range of motion, pausing at the bottom to maximize muscle tension and hypertrophy.",
        },
        {
          name: "Standard push-ups / decline variations",
          duration: "5 min",
          detail: "Controlled 3-second lowering tempo, explosive push up to stimulate chest and triceps.",
        },
        {
          name: "Walking lunges",
          duration: "5 min",
          detail: "Alternate legs with upright posture for quadriceps and glute strength.",
        },
        {
          name: "Doorway or towel bodyweight rows",
          duration: "5 min",
          detail: "Target upper back and biceps using a secure anchor or door frame.",
        },
        {
          name: "Extended forearm plank hold",
          duration: "4 min",
          detail: "Keep core, glutes, and quadriceps braced in sets of 45-60 seconds.",
        }
      );
    } else if (fitnessLevel === "Intermediate") {
      mainExercises.push(
        {
          name: "Controlled bodyweight squats",
          duration: "5 min",
          detail: "Lower down over 3 seconds, drive through heels to build leg strength.",
        },
        {
          name: "Standard or incline push-ups",
          duration: "4 min",
          detail: "Keep elbows at a 45-degree angle to build chest, shoulder, and tricep strength.",
        },
        {
          name: "Alternating reverse lunges",
          duration: "5 min",
          detail: "Step backward with control to build unilateral leg strength without knee strain.",
        },
        {
          name: "Glute bridges with pause",
          duration: "4 min",
          detail: "Squeeze glutes at top for 2 seconds to stimulate posterior chain muscle development.",
        },
        {
          name: "Forearm plank holds",
          duration: "4 min",
          detail: "Focus on rigid core engagement in 30-40 second intervals.",
        }
      );
    } else {
      // Beginner weight gain / strength
      mainExercises.push(
        {
          name: "Chair-assisted squats",
          duration: "5 min",
          detail: "Focus on controlled descent to build foundational quadriceps and hip strength.",
        },
        {
          name: "Incline table or wall push-ups",
          duration: "4 min",
          detail: "Build chest and upper-body pressing strength with safe progressive resistance.",
        },
        {
          name: "Glute bridge holds",
          duration: "4 min",
          detail: "Lie on back and lift hips, engaging glutes and core to strengthen posterior muscles.",
        },
        {
          name: "Standing calf raises with hold",
          duration: "4 min",
          detail: "Pause at top of calf raise for 2 seconds to build lower leg muscle tone.",
        },
        {
          name: "Wall sit hold",
          duration: "3 min",
          detail: "Hold thighs parallel to floor in 20-30 second intervals for isometric leg endurance.",
        }
      );
    }
  } else if (goalType === "weight-loss") {
    if (fitnessLevel === "Advanced") {
      mainExercises.push(
        {
          name: "High-tempo bodyweight squats",
          duration: "5 min",
          detail: "Continuous rhythmic squats to elevate heart rate and burn calories.",
        },
        {
          name: "Mountain climbers",
          duration: "5 min",
          detail: "Drive knees toward chest in rhythmic intervals for intense metabolic conditioning.",
        },
        {
          name: "Push-ups into mountain climber sets",
          duration: "5 min",
          detail: "Compound upper body and core combination to maximize energy expenditure.",
        },
        {
          name: "Jumping jacks or step-out jacks",
          duration: "5 min",
          detail: "Dynamic full-body cardio intervals with minimal rest periods.",
        },
        {
          name: "Walking lunges with knee lift",
          duration: "5 min",
          detail: "Large muscle group recruitment for continuous caloric expenditure.",
        }
      );
    } else if (fitnessLevel === "Intermediate") {
      mainExercises.push(
        {
          name: "Brisk pace interval walking / jogging in place",
          duration: "6 min",
          detail: "Alternate 1 minute brisk pace with 30 seconds moderate recovery.",
        },
        {
          name: "Bodyweight air squats",
          duration: "4 min",
          detail: "Steady continuous pace to recruit large lower-body muscle groups.",
        },
        {
          name: "Low-impact step jacks",
          duration: "4 min",
          detail: "Quick side-to-side arm and leg extensions to elevate cardiovascular output.",
        },
        {
          name: "Incline push-ups",
          duration: "4 min",
          detail: "Elevated surface push-ups to sustain metabolic output without early fatigue.",
        },
        {
          name: "Plank shoulder taps",
          duration: "4 min",
          detail: "Core stabilization combined with gentle continuous upper body movement.",
        }
      );
    } else {
      // Beginner weight loss
      mainExercises.push(
        {
          name: "Brisk walking in place with arm pumps",
          duration: "7 min",
          detail: "Maintain a steady rhythm to support cardiovascular calorie burning.",
        },
        {
          name: "Chair sit-to-stands",
          duration: "4 min",
          detail: "Continuous controlled sit-to-stand movements to activate large leg muscles.",
        },
        {
          name: "Low-impact side step taps",
          duration: "5 min",
          detail: "Continuous side-to-side stepping to keep heart rate in the active fat-burning zone.",
        },
        {
          name: "Standing wall push-ups",
          duration: "4 min",
          detail: "Keep a smooth, uninterrupted tempo to maintain cardiovascular engagement.",
        }
      );
    }
  } else if (goalType === "stamina") {
    mainExercises.push(
      {
        name: "Continuous cadence walking in place",
        duration: "7 min",
        detail: "Focus on steady rhythmic breathing and constant foot speed to build aerobic capacity.",
      },
      {
        name: "Low-to-moderate step jacks",
        duration: "4 min",
        detail: "Rhythmic full-body movement to train cardiovascular endurance.",
      },
      {
        name: "Rhythmic bodyweight squats",
        duration: "5 min",
        detail: "Steady continuous repetitions to improve muscular endurance in legs.",
      },
      {
        name: "Standing high knee taps",
        duration: "4 min",
        detail: "Lift knees comfortably to hip level with deep, rhythmic respiration.",
      }
    );
  } else {
    // General wellbeing & maintenance
    mainExercises.push(
      {
        name: "Moderate brisk walking",
        duration: "8 min",
        detail: "Comfortable continuous pace supporting aerobic health and mobility.",
      },
      {
        name: "Chair sit-to-stands",
        duration: "4 min",
        detail: "Functional lower body movement for everyday strength and balance.",
      },
      {
        name: "Wall or counter push-ups",
        duration: "4 min",
        detail: "Build upper body posture and back integrity without excessive strain.",
      },
      {
        name: "Standing calf & balance holds",
        duration: "4 min",
        detail: "Enhances ankle mobility, lower leg circulation, and balance stability.",
      }
    );
  }

  // 3. Cool-down generation
  if (hasHealthCondition || isSenior) {
    coolDownExercises.push(
      {
        name: "Gradual slow walking & deep diaphragmatic breathing",
        duration: "3 min",
        detail: "Pace yourself gently until breathing returns completely to resting level.",
      },
      {
        name: "Seated hamstring & calf stretch",
        duration: "2 min",
        detail: "Reach gently without straining your back or knees. Breathe slowly.",
      },
      {
        name: "Gentle neck and shoulder release",
        duration: "2 min",
        detail: "Slow head turns and chest opening to relieve residual upper body tension.",
      }
    );
  } else {
    coolDownExercises.push(
      {
        name: "Slow walking recovery",
        duration: "2 min",
        detail: "Step gently to allow blood flow and heart rate to normalize.",
      },
      {
        name: "Standing quad and hamstring stretch",
        duration: "2 min",
        detail: "Hold each stretch for 20-30 seconds without bouncing.",
      },
      {
        name: "Chest & upper back stretch",
        duration: "1 min",
        detail: "Interlace fingers behind or reach forward to release upper body muscles.",
      }
    );
  }

  const sections: WorkoutSection[] = [
    {
      title: "Warm-up",
      subtitle: `${warmUpMin} minutes`,
      icon: Sun,
      exercises: warmUpExercises,
    },
    {
      title: "Main Workout",
      subtitle: `${mainMin} minutes`,
      icon: Dumbbell,
      exercises: mainExercises,
    },
    {
      title: "Cool-down",
      subtitle: `${coolDownMin} minutes`,
      icon: Wind,
      exercises: coolDownExercises,
    },
  ];

  const totalExercises = sections.reduce(
    (total, section) => total + section.exercises.length,
    0
  );

  const totalDurationMin = warmUpMin + mainMin + coolDownMin;

  // Set difficulty badge and titles
  let difficulty: "Beginner" | "Intermediate" | "Advanced" | "Gentle" = "Beginner";
  if (hasHealthCondition || isSenior) {
    difficulty = "Gentle";
  } else {
    difficulty = fitnessLevel;
  }

  let focusTitle = "Balanced Movement";
  let focusDescription = "A tailored daily movement routine aligned with your health assessment.";

  if (hasHealthCondition) {
    focusTitle = "Low-Impact Health Support";
    focusDescription = "Adapted with extended warm-up and gentle pacing to protect cardiovascular and joint comfort.";
  } else if (goalType === "weight-gain" || goalType === "strength") {
    focusTitle = "Strength & Muscle Progression";
    focusDescription = "Progressive resistance movements designed to stimulate muscle engagement and physical strength.";
  } else if (goalType === "weight-loss") {
    focusTitle = "Cardio & Metabolic Conditioning";
    focusDescription = "Continuous active movements to elevate daily caloric expenditure and cardiovascular health.";
  } else if (goalType === "stamina") {
    focusTitle = "Stamina & Aerobic Endurance";
    focusDescription = "Rhythmic pacing designed to build sustained respiratory and cardiovascular endurance.";
  }

  const safetyNotice = hasHealthCondition
    ? "General guidance, consult a doctor before starting. Stop immediately if you experience pain, dizziness, shortness of breath, or discomfort."
    : "General guidance, consult a doctor before starting. Listen to your body and rest whenever needed.";

  return {
    sections,
    totalDurationMin,
    totalExercises,
    difficulty,
    focusTitle,
    focusDescription,
    safetyNotice,
    hasHealthCondition,
    adaptedFactors,
  };
}
