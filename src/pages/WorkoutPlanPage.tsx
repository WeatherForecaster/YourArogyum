import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Dumbbell,
  Heart,
  Sun,
  Wind,
  Activity,
  Info,
  RotateCcw,
} from "lucide-react";

interface WorkoutPlanPageProps {
  onBack: () => void;
}

type Exercise = {
  name: string;
  duration: string;
  detail: string;
};

type WorkoutSection = {
  title: string;
  subtitle: string;
  icon: typeof Sun;
  exercises: Exercise[];
};

const workoutSections: WorkoutSection[] = [
  {
    title: "Warm-up",
    subtitle: "5 minutes",
    icon: Sun,
    exercises: [
      {
        name: "Marching in place",
        duration: "2 min",
        detail: "March gently at a comfortable pace.",
      },
      {
        name: "Shoulder rolls",
        duration: "1 min",
        detail: "Roll your shoulders slowly in both directions.",
      },
      {
        name: "Gentle side steps",
        duration: "2 min",
        detail: "Step side to side while maintaining your balance.",
      },
    ],
  },
  {
    title: "Main Workout",
    subtitle: "20 minutes",
    icon: Dumbbell,
    exercises: [
      {
        name: "Brisk walking",
        duration: "8 min",
        detail: "Walk at a pace where you can still hold a conversation.",
      },
      {
        name: "Chair sit-to-stands",
        duration: "4 min",
        detail: "Use a stable chair and your hands for support if needed.",
      },
      {
        name: "Wall push-ups",
        duration: "4 min",
        detail: "Keep your body aligned and move slowly.",
      },
      {
        name: "Standing calf raises",
        duration: "4 min",
        detail: "Hold a stable support and raise your heels gently.",
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
        detail: "Gradually slow your pace and relax your breathing.",
      },
      {
        name: "Gentle stretching",
        duration: "3 min",
        detail: "Stretch your calves, shoulders and back without bouncing.",
      },
    ],
  },
];

const filters = ["Warm-up", "Main Workout", "Cool-down"] as const;

type WorkoutFilter = (typeof filters)[number];

export default function WorkoutPlanPage({
  onBack: _onBack,
}: WorkoutPlanPageProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<WorkoutFilter | null>(null);

  const totalExercises = workoutSections.reduce(
    (total, section) => total + section.exercises.length,
    0
  );

  const completedCount = completed.length;
  const progress =
    totalExercises === 0
      ? 0
      : Math.round((completedCount / totalExercises) * 100);

  // Initially show every section. Clicking a filter shows only that section.
  const visibleSections = activeFilter
    ? workoutSections.filter((section) => section.title === activeFilter)
    : workoutSections;

  const toggleExercise = (name: string) => {
    setCompleted((previous) =>
      previous.includes(name)
        ? previous.filter((item) => item !== name)
        : [...previous, name]
    );
  };

  const resetProgress = () => {
    setCompleted([]);
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[#F6F2E9] p-4 text-[#30382F] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Heading */}
        <header>
          <h1 className="font-serif text-3xl text-[#344C3D] sm:text-4xl">
            Today's Workout
          </h1>
          <p className="mt-2 text-sm text-[#77796E]">
            Your daily movement routine.
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
            <Clock size={21} className="text-[#71846A]" />
            <p className="mt-4 text-xs text-[#77796E]">Total Duration</p>
            <p className="mt-1 font-serif text-2xl text-[#344C3D]">
              30 min
            </p>
          </article>

          <article className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
            <Activity size={21} className="text-[#71846A]" />
            <p className="mt-4 text-xs text-[#77796E]">Exercises</p>
            <p className="mt-1 font-serif text-2xl text-[#344C3D]">
              {totalExercises}
            </p>
          </article>

          <article className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
            <Heart size={21} className="text-[#71846A]" />
            <p className="mt-4 text-xs text-[#77796E]">Difficulty</p>
            <p className="mt-1 font-serif text-2xl text-[#344C3D]">
              Beginner
            </p>
          </article>

          <article className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
            <CheckCircle2 size={21} className="text-[#71846A]" />
            <p className="mt-4 text-xs text-[#77796E]">Completed</p>
            <p className="mt-1 font-serif text-2xl text-[#344C3D]">
              {completedCount}/{totalExercises}
            </p>
          </article>
        </section>

        {/* Progress */}
        <section className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-[#344C3D]">
              Workout Progress
            </h2>
            <span className="text-sm font-medium text-[#526B50]">
              {progress}%
            </span>
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E6DD]"
            role="progressbar"
            aria-label="Workout completion"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[#71846A] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {completedCount === totalExercises && (
            <p className="mt-3 text-sm text-[#526451]">
              All exercises completed.
            </p>
          )}

          <button
            type="button"
            onClick={resetProgress}
            aria-label="Reset all workout progress"
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#526451] transition hover:bg-[#EAECE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71846A]"
          >
            <RotateCcw size={15} />
            Reset progress
          </button>
        </section>

        {/* Workout filters */}
        <nav
          aria-label="Filter workout sections"
          className="flex flex-wrap gap-2"
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setActiveFilter((current) =>
                    current === filter ? null : filter
                  )
                }
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71846A] ${
                  isActive
                    ? "border-[#526B50] bg-[#526B50] text-white"
                    : "border-[#DDE0D5] bg-[#FCFAF5] text-[#526451] hover:border-[#71846A] hover:bg-[#EAECE3]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </nav>

        {/* Workout sections */}
        <div className="space-y-5">
          {visibleSections.map((section) => {
            const SectionIcon = section.icon;

            const sectionCompleted = section.exercises.filter((exercise) =>
              completed.includes(exercise.name)
            ).length;

            return (
              <section
                key={section.title}
                className="overflow-hidden rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5]"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#E8E6DC] px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#DCE3D5] p-3 text-[#344C3D]">
                      <SectionIcon size={22} />
                    </div>

                    <div>
                      <h2 className="font-serif text-xl text-[#344C3D]">
                        {section.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#77796E]">
                        {sectionCompleted}/{section.exercises.length}{" "}
                        completed
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#EAECE3] px-3 py-2 text-xs font-medium text-[#526451]">
                    {section.subtitle}
                  </span>
                </div>

                <div className="divide-y divide-[#E8E6DC]">
                  {section.exercises.map((exercise) => {
                    const isDone = completed.includes(exercise.name);

                    return (
                      <article
                        key={exercise.name}
                        className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExercise(exercise.name)}
                          aria-label={
                            isDone
                              ? `Mark ${exercise.name} incomplete`
                              : `Mark ${exercise.name} complete`
                          }
                          aria-pressed={isDone}
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71846A] ${
                            isDone
                              ? "border-[#71846A] bg-[#71846A] text-white"
                              : "border-[#C8CEC0] text-transparent hover:border-[#71846A]"
                          }`}
                        >
                          <CheckCircle2 size={15} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-sm font-medium ${
                              isDone
                                ? "text-[#71846A] line-through"
                                : "text-[#344C3D]"
                            }`}
                          >
                            {exercise.name}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-[#77796E] sm:text-sm">
                            {exercise.detail}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-medium text-[#526451]">
                          {exercise.duration}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Safety notice */}
        <section className="rounded-2xl border border-[#D9DED2] bg-[#EAECE3] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info
              size={20}
              className="mt-0.5 shrink-0 text-[#526451]"
            />
            <div>
              <h2 className="font-medium text-[#344C3D]">
                Safety Notice
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#626B5E]">
                Start at a comfortable pace and use stable support when
                needed. Stop if you experience pain, dizziness, chest
                discomfort or unusual breathlessness. If you have a health
                condition, balance concerns or concerns about bone strength,
                consult a qualified healthcare professional before starting
                new exercises.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
