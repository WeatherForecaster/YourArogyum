
export const WEARABLE_DEMO_STORAGE_KEY =
    "yourarogyum:wearable-demo:enabled";

export const WEARABLE_DEMO_DATA = {
    steps: 6842,
    dailyStepGoal: 10000,
    heartRateBpm: 74,
    sleepHours: 7 + 32 / 60,
    sleepLabel: "7h 32m",
    activeCalories: 386,

    weeklyActivity: [
        { day: "Mon", steps: 5240 },
        { day: "Tue", steps: 6810 },
        { day: "Wed", steps: 4320 },
        { day: "Thu", steps: 7950 },
        { day: "Fri", steps: 6100 },
        { day: "Sat", steps: 8420 },
        { day: "Sun", steps: 6842 },
    ],
};

export function isWearableDemoEnabled(): boolean {
    try {
        return (
            typeof window !== "undefined" &&
            window.localStorage.getItem(WEARABLE_DEMO_STORAGE_KEY) === "true"
        );
    } catch {
        return false;
    }
}

export function setWearableDemoEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(
            WEARABLE_DEMO_STORAGE_KEY,
            String(enabled)
        );
    } catch {
        // Keep the UI usable if browser storage is unavailable.
    }
}

export function getWearableDemoPromptContext(): string | null {
    if (!isWearableDemoEnabled()) {
        return null;
    }

    const data = WEARABLE_DEMO_DATA;

    return [
        "SIMULATED WEARABLE CONTEXT — these are demonstration values, not actual user measurements:",
        `Steps today: ${data.steps.toLocaleString()} (illustrative goal: ${data.dailyStepGoal.toLocaleString()}).`,
        `Example heart-rate reading: ${data.heartRateBpm} BPM.`,
        `Example sleep duration: ${data.sleepLabel}.`,
        `Illustrative active-calorie estimate: ${data.activeCalories} kcal.`,
        "Use this only as simulated context for general wellness suggestions. Clearly identify it as sample data when relevant. Do not claim it was measured from a real device, infer a medical condition, diagnose the user, or treat the values as evidence of physical readiness.",
    ].join("\n");
}

export function getWearableDemoWorkoutInsight(): string | null {
    if (!isWearableDemoEnabled()) {
        return null;
    }

    const data = WEARABLE_DEMO_DATA;
    const stepsRemaining = Math.max(
        0,
        data.dailyStepGoal - data.steps
    );

    const stepGuidance =
        stepsRemaining > 0
            ? `The simulated count is ${data.steps.toLocaleString()} steps, which is ${stepsRemaining.toLocaleString()} below the illustrative daily goal. If appropriate for the user's existing plan, suggest a comfortable short walk rather than abruptly increasing exercise.`
            : "The simulated step count has reached the illustrative daily goal; avoid assuming this proves the user is ready for more intense exercise.";

    return [
        "Demo-based workout guidance:",
        stepGuidance,
        `The example sleep duration is ${data.sleepLabel}. It is not a measurement of recovery or readiness.`,
        "These values are simulated. Follow the user's existing health and safety considerations rather than using sample heart rate or calorie values to prescribe exercise intensity.",
    ].join(" ");
}
