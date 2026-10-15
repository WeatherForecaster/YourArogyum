// Canonical navigation page type used across AppLayout, DashboardPage, and App.
// Previously exported from HomePage.tsx; extracted here so HomePage can be removed.
export type HomeSection =
    | "dashboard"
    | "ai-assistant"
    | "diet-plan"
    | "workout-plan"
    | "progress"
    | "wearable-tracker"
    | "assessment"
    | "profile";