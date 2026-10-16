
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  CheckCircle2,
  Heart,
  Activity,
  Info,
  RotateCcw,
} from "lucide-react";

import { apiRequest } from "../api/client";
import {
  getMyAssessment,
  type AssessmentData,
} from "../services/assessment";
import {
  generatePersonalizedWorkout,
  type WorkoutSection,
} from "../utils/workoutPlanner";
import {
  getWearableDemoWorkoutInsight,
} from "../services/wearableDemo";

interface WorkoutPlanPageProps {
  onBack: () => void;
  assessmentData?: AssessmentData | null;
}

interface WorkoutProgressResponse {
  date: string;
  saved: boolean;
  completedExercises: string[];
}

const filters = ["Warm-up", "Main Workout", "Cool-down"] as const;

type WorkoutFilter = (typeof filters)[number];

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function WorkoutPlanPage({
                                          onBack: _onBack,
                                          assessmentData,
                                        }: WorkoutPlanPageProps) {
  const [assessment, setAssessment] = useState<AssessmentData | null>(
      assessmentData ?? null,
  );

  const [completed, setCompleted] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] =
      useState<WorkoutFilter | null>(null);

  const [progressReady, setProgressReady] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState("");

  // The date is based on the user's local calendar day.
  const [workoutDate] = useState(() => getLocalDateKey());

  // Serialize writes so older requests cannot overwrite newer changes.
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Always fetch the latest saved health assessment.
  useEffect(() => {
    let cancelled = false;

    getMyAssessment()
        .then((result) => {
          if (!cancelled && result.completed && result.assessment) {
            setAssessment(result.assessment);
          }
        })
        .catch((error) => {
          console.warn(
              "[WorkoutPlanPage] Could not load fresh assessment:",
              error,
          );
        });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync when the parent supplies updated assessment data.
  useEffect(() => {
    if (assessmentData !== undefined && assessmentData !== null) {
      setAssessment(assessmentData);
    }
  }, [assessmentData]);

  const workoutPlan = useMemo(
      () => generatePersonalizedWorkout(assessment),
      [assessment],
  );

  const wearableInsight = getWearableDemoWorkoutInsight();

  const workoutSections: WorkoutSection[] = workoutPlan.sections;
  const totalExercises = workoutPlan.totalExercises;

  // Restore today's completed exercises from the authenticated account.
  useEffect(() => {
    let cancelled = false;

    setProgressLoading(true);
    setProgressError("");
    setProgressReady(false);

    apiRequest<WorkoutProgressResponse>(
        `/api/workout-progress/me?date=${workoutDate}`,
        {
          method: "GET",
        },
    )
        .then((response) => {
          if (cancelled) return;

          const savedExercises = Array.isArray(
              response.completedExercises,
          )
              ? response.completedExercises.filter(
                  (name): name is string => typeof name === "string",
              )
              : [];

          setCompleted(savedExercises);
          setProgressReady(true);
        })
        .catch((error: unknown) => {
          if (cancelled) return;

          setProgressError(
              error instanceof Error
                  ? `Could not load saved workout progress: ${error.message}. Your checklist may still be used in this session, but changes cannot be saved until loading succeeds.`
                  : "Could not load saved workout progress. Your changes may not persist.",
          );
        })
        .finally(() => {
          if (!cancelled) {
            setProgressLoading(false);
          }
        });

    return () => {
      cancelled = true;
    };
  }, [workoutDate]);

  // Save each checklist change once the initial account data has loaded.
  useEffect(() => {
    if (!progressReady) return;

    const completedExercises = [...completed];

    saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
            apiRequest<WorkoutProgressResponse>(
                `/api/workout-progress/me?date=${workoutDate}`,
                {
                  method: "PUT",
                  body: {
                    completedExercises,
                  },
                },
            ),
        )
        .then(() => {
          setProgressError("");
        })
        .catch((error: unknown) => {
          setProgressError(
              error instanceof Error
                  ? `Your workout progress could not be saved: ${error.message}`
                  : "Your workout progress could not be saved. Check your connection.",
          );
        });
  }, [completed, progressReady, workoutDate]);

  const completedCount = workoutSections.reduce(
      (count, section) =>
          count +
          section.exercises.filter((exercise) =>
              completed.includes(exercise.name),
          ).length,
      0,
  );

  const progress =
      totalExercises === 0
          ? 0
          : Math.round((completedCount / totalExercises) * 100);

  const visibleSections = activeFilter
      ? workoutSections.filter(
          (section) => section.title === activeFilter,
      )
      : workoutSections;

  const toggleExercise = (name: string) => {
    setCompleted((previous) =>
        previous.includes(name)
            ? previous.filter((item) => item !== name)
            : [...previous, name],
    );
  };

  const resetProgress = () => {
    setCompleted([]);
  };

  return (
      <main className="h-full min-h-0 overflow-y-auto bg-[#F6F2E9] p-4 text-[#30382F] sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <h1 className="font-serif text-3xl text-[#344C3D] sm:text-4xl">
              Today's Workout
            </h1>

            <p className="mt-2 text-sm text-[#77796E]">
              {workoutPlan.focusTitle} — {workoutPlan.focusDescription}
            </p>

            {workoutPlan.adaptedFactors.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-[#526451]">
                  {workoutPlan.adaptedFactors.map((factor: string) => (
                      <span
                          key={factor}
                          className="rounded-full bg-[#EAECE3] px-3 py-1 font-medium"
                      >
                  {factor}
                </span>
                  ))}
                </div>
            )}
          </header>

          {progressLoading && (
              <div
                  role="status"
                  className="rounded-xl border border-[#E1E2D7] bg-[#FCFAF5] p-4 text-sm text-[#526451]"
              >
                Loading your saved workout progress...
              </div>
          )}

          {progressError && (
              <div
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                {progressError}
              </div>
          )}

          {wearableInsight && (
              <section className="rounded-2xl border border-[#C7D5C2] bg-[#EAF0E5] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-xl bg-white p-3 text-[#526B50]">
                    <Activity size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-xl text-[#344C3D]">
                        Tracker-based Activity Insight
                      </h2>

                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#526451]">
                    Demo data
                  </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#526451]">
                      {wearableInsight}
                    </p>

                    <p className="mt-3 text-xs leading-5 text-[#687466]">
                      These values are simulated sample data, not live measurements
                      from a watch. They are intended for general wellness context,
                      not to determine medical fitness or exercise readiness.
                    </p>
                  </div>
                </div>
              </section>
          )}

          {/* Summary cards */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <article className="rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5">
              <Clock size={21} className="text-[#71846A]" />
              <p className="mt-4 text-xs text-[#77796E]">Total Duration</p>
              <p className="mt-1 font-serif text-2xl text-[#344C3D]">
                {workoutPlan.totalDurationMin} min
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
                {workoutPlan.difficulty}
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

            {completedCount === totalExercises && totalExercises > 0 && (
                <p className="mt-3 text-sm text-[#526451]">
                  All exercises completed.
                </p>
            )}

            <button
                type="button"
                onClick={resetProgress}
                disabled={progressLoading}
                aria-label="Reset all workout progress"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#526451] transition hover:bg-[#EAECE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71846A] disabled:cursor-not-allowed disabled:opacity-50"
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
                              current === filter ? null : filter,
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
                  completed.includes(exercise.name),
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
                                  disabled={progressLoading}
                                  aria-label={
                                    isDone
                                        ? `Mark ${exercise.name} incomplete`
                                        : `Mark ${exercise.name} complete`
                                  }
                                  aria-pressed={isDone}
                                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71846A] disabled:cursor-not-allowed disabled:opacity-50 ${
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
                  {workoutPlan.safetyNotice} Start at a comfortable pace and
                  use stable support when needed. Stop if you experience pain,
                  dizziness, chest discomfort or unusual breathlessness. If you
                  have a health condition, balance concerns or concerns about
                  bone strength, consult a qualified healthcare professional
                  before starting new exercises.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
  );
}
