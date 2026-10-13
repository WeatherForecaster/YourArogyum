
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Salad,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";

export type HomeSection =
  | "dashboard"
  | "ai-assistant"
  | "diet-plan"
  | "workout-plan"
  | "progress"
  | "assessment"
  | "profile";

interface HomePageProps {
  onNavigate: (page: HomeSection) => void;
  onReviewDetails: () => void;
  userName?: string;
  assessmentCompleted?: boolean;
}

const mainFeatures = [
  {
    id: "dashboard" as const,
    title: "Health overview",
    description: "View your saved health details.",
    icon: HeartPulse,
  },
  {
    id: "diet-plan" as const,
    title: "Diet plan",
    description: "Get food guidance based on your preferences.",
    icon: Salad,
  },
  {
    id: "workout-plan" as const,
    title: "Workout plan",
    description: "Explore activity ideas for your goals.",
    icon: Dumbbell,
  },
  {
    id: "ai-assistant" as const,
    title: "AI assistant",
    description: "Ask questions about diet and daily wellness.",
    icon: Brain,
  },
];

export default function HomePage({
  onNavigate,
  onReviewDetails,
  userName = "there",
  assessmentCompleted = false,
}: HomePageProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  return (
    <main className="min-h-screen bg-[#F6F2E9] text-[#344C3D]">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome, {firstName}
            </h1>
            <p className="mt-1 text-sm text-[#77796E]">
              Your health and wellness at a glance.
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-[#DCE3D5] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCE3D5]">
                {assessmentCompleted ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <ClipboardList size={22} />
                )}
              </div>

              <div>
                <h2 className="font-semibold">
                  {assessmentCompleted
                    ? "Health assessment completed"
                    : "Complete your health assessment"}
                </h2>

                <p className="mt-1 max-w-xl text-sm leading-5 text-[#77796E]">
                  {assessmentCompleted
                    ? "Your saved details help personalize your wellness guidance. Review them whenever they change."
                    : "Share your health background, daily habits, and food preferences to get more relevant guidance."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (assessmentCompleted) {
                  onReviewDetails();
                } else {
                  onNavigate("assessment");
                }
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#344C3D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#263A2E]"
            >
              {assessmentCompleted ? "Review details" : "Start assessment"}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your wellness tools</h2>
          <p className="mt-1 text-sm text-[#77796E]">
            Choose what you need today.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mainFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => onNavigate(feature.id)}
                  className="group flex min-h-44 flex-col rounded-2xl border border-[#E5E5DA] bg-white p-5 text-left transition hover:border-[#A87945]/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A87945] focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCE3D5]">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>

                    <ArrowRight
                      size={18}
                      className="text-[#A87945] transition-transform group-hover:translate-x-1"
                    />
                  </div>

                  <h3 className="mt-4 font-semibold">{feature.title}</h3>

                  <p className="mt-1 text-sm leading-5 text-[#77796E]">
                    {feature.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="flex items-center gap-3 rounded-xl border border-[#E5E5DA] bg-white p-4 text-left transition hover:bg-[#EDF0E7]"
          >
            <TrendingUp size={21} className="shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">
                Your progress
              </span>
              <span className="mt-1 block text-xs text-[#77796E]">
                Review your recorded progress.
              </span>
            </span>
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="flex items-center gap-3 rounded-xl border border-[#E5E5DA] bg-white p-4 text-left transition hover:bg-[#EDF0E7]"
          >
            <UserRound size={21} className="shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">
                Your profile
              </span>
              <span className="mt-1 block text-xs text-[#77796E]">
                View your account and saved details.
              </span>
            </span>
            <ArrowRight size={17} />
          </button>
        </section>

        <footer className="mt-8 flex items-start gap-2 border-t border-[#DCE3D5] pt-5">
          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-[#77796E]"
          />
          <p className="text-xs leading-5 text-[#77796E]">
            YourArogyum provides general preventive wellness guidance. It does
            not diagnose or treat medical conditions or replace professional
            medical advice.
          </p>
        </footer>
      </div>
    </main>
  );
}
