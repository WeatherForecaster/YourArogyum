import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Droplets,
  Flame,
  Leaf,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import type { AssessmentData } from "../services/assessment";
import type { HomeSection } from "../types/navigation";
import { classifyGoalProgress } from "../utils/goalProgress";

interface DashboardPageProps {
  assessmentData: AssessmentData | null;
  assessmentCompleted: boolean;
  onNavigate: (page: HomeSection) => void;
}

interface MlFactor {
  feature: string;
  value: string | number;
  impact: number;
}

interface MlRiskResult {
  risk_level: string;
  probabilities: Record<string, number>;
  top_factors: MlFactor[];
}

interface MlResult {
  bmi: number;
  diabetes: MlRiskResult;
  heart: MlRiskResult;
  model: string;
  explainability: string;
  data_notice: string;
}

interface DashboardData {
  userName?: string;
  assessmentCompleted: boolean;
  bmi: number | null;
  bmiCategory: string | null;
  dailyCalories: number | null;
  proteinTargetGrams: number | null;
  calorieEstimateNote?: string;
  profile: Record<string, string | null> | null;
  mlPrediction?: {
    available: boolean;
    message?: string;
    result?: MlResult;
  };
}

interface DailyLog {
  logDate: string;
  logged: boolean;
  proteinGrams: number | null;
  waterMl: number | null;
  sleepHours: number | null;
  activityMinutes: number | null;
  weightKg: number | null;
}

interface WeightRecord {
  date: string;
  weightKg: number;
}


interface GoalProgress {
  available: boolean;
  goal?: string;
  startingWeightKg?: string | number | null;
  targetWeightKg?: string | number | null;
  currentWeightKg?: number | string | null;
  progressPercent?: number | null;
  remainingKg?: number | null;
  message?: string;
}


const API_BASE = "http://localhost:8080";

const EMPTY_DASHBOARD: DashboardData = {
  assessmentCompleted: false,
  bmi: null,
  bmiCategory: null,
  dailyCalories: null,
  proteinTargetGrams: null,
  profile: null,
};

const EMPTY_LOG: DailyLog = {
  logDate: "",
  logged: false,
  proteinGrams: null,
  waterMl: null,
  sleepHours: null,
  activityMinutes: null,
  weightKg: null,
};

function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: string): string {
  if (!date) return "Unknown date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numericValue(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function DashboardPage({
  assessmentData,
  assessmentCompleted,
  onNavigate,
}: DashboardPageProps) {
  const [dashboard, setDashboard] =
    useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [todayLog, setTodayLog] = useState<DailyLog>(EMPTY_LOG);
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [goalData, setGoalData] = useState<GoalProgress>({
    available: false,
  });

  const [proteinInput, setProteinInput] = useState("");
  const [waterInput, setWaterInput] = useState("");
  const [sleepInput, setSleepInput] = useState("");
  const [activityInput, setActivityInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  const [trackingLoading, setTrackingLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("");

  async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session may have expired. Please sign in again.");
      }

      const message = await response.text();
      throw new Error(
        message || `Request failed with status ${response.status}.`
      );
    }

    return response.json() as Promise<T>;
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<DashboardData>("/api/dashboard/me");
      setDashboard(data);
    } catch (err) {
      setDashboard(EMPTY_DASHBOARD);
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the dashboard service."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTracking() {
    setTrackingLoading(true);
    setTrackingError("");

    try {
      const [daily, history, goal] = await Promise.all([
        apiRequest<DailyLog>(
          `/api/health-tracking/me?date=${getToday()}`
        ),
        apiRequest<WeightRecord[]>(
          "/api/health-tracking/weight-history"
        ),
        apiRequest<GoalProgress>(
          "/api/health-tracking/goal-progress"
        ),
      ]);

      setTodayLog(daily);
      setWeightHistory(
        Array.isArray(history)
          ? history.filter(
              (item) =>
                Number.isFinite(Number(item.weightKg)) &&
                Boolean(item.date)
            )
          : []
      );
      setGoalData(goal);

      setProteinInput(
        daily.proteinGrams == null ? "" : String(daily.proteinGrams)
      );
      setWaterInput(
        daily.waterMl == null ? "" : String(daily.waterMl)
      );
      setSleepInput(
        daily.sleepHours == null ? "" : String(daily.sleepHours)
      );
      setActivityInput(
        daily.activityMinutes == null
          ? ""
          : String(daily.activityMinutes)
      );
      setWeightInput(
        daily.weightKg == null ? "" : String(daily.weightKg)
      );
    } catch (err) {
      setTrackingError(
        err instanceof Error
          ? err.message
          : "Could not load daily tracking."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    void loadTracking();
  }, []);

  async function saveDailyTracking(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setTrackingError("");
    setTrackingMessage("");

    const fields = [
      proteinInput,
      waterInput,
      sleepInput,
      activityInput,
      weightInput,
    ];

    if (fields.every((value) => value.trim() === "")) {
      setTrackingError("Enter at least one value before saving.");
      setSaving(false);
      return;
    }

    const payload: Record<string, number> = {};

    const inputs = [
      { key: "proteinGrams", value: proteinInput, label: "Protein", min: 0, max: 500 },
      { key: "waterMl", value: waterInput, label: "Water", min: 0, max: 15000 },
      { key: "sleepHours", value: sleepInput, label: "Sleep", min: 0, max: 24 },
      { key: "activityMinutes", value: activityInput, label: "Activity", min: 0, max: 1440 },
      { key: "weightKg", value: weightInput, label: "Weight", min: 2, max: 500 },
    ];

    for (const input of inputs) {
      if (input.value.trim() === "") continue;

      const number = Number(input.value);

      if (
        !Number.isFinite(number) ||
        number < input.min ||
        number > input.max
      ) {
        setTrackingError(
          `${input.label} must be between ${input.min} and ${input.max}.`
        );
        setSaving(false);
        return;
      }

      payload[input.key] = number;
    }

    try {
      const saved = await apiRequest<DailyLog>(
        `/api/health-tracking/me?date=${getToday()}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setTodayLog(saved);
      setTrackingMessage("Today's health log saved successfully.");
      await loadTracking();
    } catch (err) {
      setTrackingError(
        err instanceof Error
          ? err.message
          : "Could not save your health log."
      );
    } finally {
      setSaving(false);
    }
  }

  const profile = dashboard.profile;
  const hasProfile = Boolean(profile);
  const hasCompletedAssessment =
    dashboard.assessmentCompleted && hasProfile;

  const heightCm = Number(profile?.heightCm ?? assessmentData?.height);
  const weightKg = Number(profile?.weightKg ?? assessmentData?.weight);
  const age = Number(profile?.age ?? assessmentData?.age);

  const fallbackBmi =
    Number.isFinite(heightCm) &&
    Number.isFinite(weightKg) &&
    heightCm > 0 &&
    weightKg > 0
      ? weightKg / Math.pow(heightCm / 100, 2)
      : null;

  const bmi = dashboard.bmi ?? fallbackBmi;

  const bmiCategory =
    dashboard.bmiCategory ??
    (bmi === null
      ? "Not available"
      : age > 0 && age < 18
        ? "Adult categories do not apply"
        : bmi < 18.5
          ? "Below standard range"
          : bmi < 25
            ? "Healthy weight range"
            : bmi < 30
              ? "Above standard range"
              : "Obesity range");

  const riskResults = dashboard.mlPrediction?.result;
  const proteinTarget = dashboard.proteinTargetGrams;
  const proteinConsumed = todayLog.proteinGrams;

  const proteinProgress =
    proteinTarget != null &&
    proteinTarget > 0 &&
    proteinConsumed != null
      ? Math.min(100, Math.max(0, (proteinConsumed / proteinTarget) * 100))
      : null;

  const latestWeightRecord =
    weightHistory.length > 0
      ? weightHistory[weightHistory.length - 1]
      : null;

  const startingWeight = numericValue(goalData.startingWeightKg);
  const targetWeight = numericValue(goalData.targetWeightKg);
  const currentWeightForGoal = numericValue(goalData.currentWeightKg);

  // Classify goal state from raw weights — the backend's progressPercent is
  // clamped to [0,100] and cannot distinguish "reached" from "exceeded".
  const goalClassification = classifyGoalProgress(
    startingWeight,
    targetWeight,
    currentWeightForGoal
  );

  const chartWeights = weightHistory.slice(-10);
  const weightValues = chartWeights.map((item) => item.weightKg);
  const minWeight =
    weightValues.length > 0 ? Math.min(...weightValues) : 0;
  const maxWeight =
    weightValues.length > 0 ? Math.max(...weightValues) : 0;
  const weightRange = maxWeight - minWeight || 1;

  const chartPoints = chartWeights
    .map((item, index) => {
      const x =
        chartWeights.length === 1
          ? 150
          : 12 + (index / (chartWeights.length - 1)) * 276;
      const y = 95 - ((item.weightKg - minWeight) / weightRange) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <main className="min-h-screen bg-[#F6F2E9] px-4 py-6 text-[#30382F] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#81947B]">
            YOURAROGYUM / OVERVIEW
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[#344C3D] sm:text-4xl">
            Your health overview
          </h1>
          <p className="mt-2 text-sm text-[#77796F]">
            {hasProfile
              ? `Welcome back, ${dashboard.userName || "there"}.`
              : "Your personal health dashboard"}
          </p>
        </header>

        {!loading && !error && !hasCompletedAssessment && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#A87945]/30 bg-[#F4EBDD] p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-medium text-[#604B32]">
                {hasProfile
                  ? "Complete your assessment"
                  : "Start your health assessment"}
              </h2>
              <p className="mt-1 text-sm text-[#77705F]">
                Save your health details to view personalized information
                and risk estimates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("assessment")}
              className="inline-flex items-center gap-2 self-start text-sm font-medium text-[#344C3D]"
            >
              {assessmentCompleted || dashboard.assessmentCompleted
                ? "Review assessment"
                : "Start assessment"}
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-col justify-between gap-3 rounded-xl border border-[#344C3D]/10 bg-white/70 p-4 text-sm text-[#596458] sm:flex-row sm:items-center"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center gap-2 self-start font-medium text-[#344C3D]"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {loading && (
          <p role="status" className="text-sm text-[#77796F]">
            Loading your health data...
          </p>
        )}

        <section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              icon={Scale}
              title="BMI"
              value={bmi === null ? "N/A" : bmi.toFixed(1)}
              detail={bmiCategory}
            />
            <MetricCard
              icon={Flame}
              title="Daily calories"
              value={
                dashboard.dailyCalories != null
                  ? `${dashboard.dailyCalories.toLocaleString()} kcal`
                  : "Unavailable"
              }
              detail={
                dashboard.calorieEstimateNote ??
                "Estimated daily energy needs"
              }
            />
            <MetricCard
              icon={Activity}
              title="Protein reference"
              value={
                proteinTarget != null
                  ? `${proteinTarget} g/day`
                  : "Unavailable"
              }
              detail="General reference, not actual intake"
            />
            <MetricCard
              icon={Target}
              title="Goal progress"
              value={
                goalClassification.state === "unavailable"
                  ? "Not calculated"
                  : goalClassification.state === "exceeded"
                  ? "Target exceeded"
                  : goalClassification.state === "reached"
                  ? "Target reached!"
                  : `${Math.round(goalClassification.clampedPercent)}%`
              }
              detail={
                goalClassification.state === "unavailable"
                  ? "Log your weight to calculate progress"
                  : goalClassification.detailText
              }
              action={() => onNavigate("progress")}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#77796F]">
            BMI uses adult reference ranges. Calorie and protein values are
            estimates, not medical prescriptions.
          </p>
        </section>

        <section>
          <SectionHeading
            title="Daily Health Tracking"
            subtitle="Record today's intake and habits. Your entries are saved to your account."
          />

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-3xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5 shadow-[0_8px_30px_rgba(52,76,61,0.04)] sm:p-7">
              <CardHeading
                icon={CalendarDays}
                title="Today's log"
                subtitle={formatDate(getToday())}
              />

              {trackingError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {trackingError}
                </p>
              )}

              {trackingMessage && (
                <p
                  role="status"
                  className="mt-4 rounded-xl bg-[#DCE3D5] p-3 text-sm text-[#344C3D]"
                >
                  {trackingMessage}
                </p>
              )}

              <form onSubmit={saveDailyTracking} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TrackingInput
                    label="Protein consumed"
                    unit="grams"
                    value={proteinInput}
                    onChange={setProteinInput}
                    min={0}
                    max={500}
                    step={0.1}
                    placeholder="e.g. 45"
                  />
                  <TrackingInput
                    label="Water consumed"
                    unit="millilitres"
                    value={waterInput}
                    onChange={setWaterInput}
                    min={0}
                    max={15000}
                    step={50}
                    placeholder="e.g. 1800"
                  />
                  <TrackingInput
                    label="Sleep"
                    unit="hours"
                    value={sleepInput}
                    onChange={setSleepInput}
                    min={0}
                    max={24}
                    step={0.5}
                    placeholder="e.g. 7.5"
                  />
                  <TrackingInput
                    label="Physical activity"
                    unit="minutes"
                    value={activityInput}
                    onChange={setActivityInput}
                    min={0}
                    max={1440}
                    step={5}
                    placeholder="e.g. 30"
                  />
                  <TrackingInput
                    label="Today's weight"
                    unit="kg"
                    value={weightInput}
                    onChange={setWeightInput}
                    min={2}
                    max={500}
                    step={0.1}
                    placeholder="e.g. 54.2"
                  />
                </div>

                <p className="text-xs leading-5 text-[#77796F]">
                  Leave fields blank if you do not have a value to record.
                  Previously saved fields remain unchanged when omitted.
                </p>

                <button
                  type="submit"
                  disabled={saving || trackingLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#344C3D] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#283D31] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save daily log"}
                </button>
              </form>
            </article>

            <div className="space-y-5">
              <article className="rounded-3xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5 shadow-[0_8px_30px_rgba(52,76,61,0.04)]">
                <CardHeading
                  icon={Activity}
                  title="Protein Intake"
                  subtitle="Consumed versus general reference"
                />

                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#77796F]">Consumed today</p>
                      <p className="mt-1 font-serif text-3xl text-[#344C3D]">
                        {proteinConsumed == null
                          ? "Not logged"
                          : `${proteinConsumed} g`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#77796F]">Reference</p>
                      <p className="mt-1 text-lg font-medium text-[#344C3D]">
                        {proteinTarget == null
                          ? "Unavailable"
                          : `${proteinTarget} g`}
                      </p>
                    </div>
                  </div>

                  {proteinProgress != null && (
                    <>
                      <div
                        className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#E8E7DE]"
                        role="progressbar"
                        aria-label="Protein reference comparison"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(proteinProgress)}
                      >
                        <div
                          className="h-full rounded-full bg-[#81947B]"
                          style={{ width: `${proteinProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#77796F]">
                        {proteinConsumed! >= proteinTarget!
                          ? "Reference amount reached or exceeded."
                          : `${Math.round(proteinTarget! - proteinConsumed!)} g below the reference amount.`}
                      </p>
                    </>
                  )}

                  <p className="mt-3 text-xs leading-5 text-[#77796F]">
                    {proteinConsumed == null
                      ? "Enter your total protein intake in today's log."
                      : "Based on the amount you entered, not individual foods."}
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5 shadow-[0_8px_30px_rgba(52,76,61,0.04)]">
                <CardHeading
                  icon={Droplets}
                  title="Today's Snapshot"
                  subtitle="Your saved daily habits"
                />

                {trackingLoading ? (
                  <p className="mt-4 text-sm text-[#77796F]">
                    Loading your daily log...
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <InfoRow
                      label="Water"
                      value={
                        todayLog.waterMl == null
                          ? "Not logged"
                          : `${todayLog.waterMl} ml`
                      }
                    />
                    <InfoRow
                      label="Sleep"
                      value={
                        todayLog.sleepHours == null
                          ? "Not logged"
                          : `${todayLog.sleepHours} hours`
                      }
                    />
                    <InfoRow
                      label="Physical activity"
                      value={
                        todayLog.activityMinutes == null
                          ? "Not logged"
                          : `${todayLog.activityMinutes} minutes`
                      }
                    />
                    <InfoRow
                      label="Today's weight"
                      value={
                        todayLog.weightKg == null
                          ? "Not logged"
                          : `${todayLog.weightKg} kg`
                      }
                    />
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardHeading
                icon={TrendingUp}
                title="Weight Trend"
                subtitle="A quick view of your saved measurements"
              />
              <button
                type="button"
                onClick={() => onNavigate("progress")}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#344C3D]"
              >
                History <ArrowRight size={14} />
              </button>
            </div>

            {trackingLoading ? (
              <p className="mt-5 text-sm text-[#77796F]">
                Loading weight history...
              </p>
            ) : weightHistory.length === 0 ? (
              <div className="mt-5 rounded-xl bg-[#F1F0E8] p-4">
                <p className="text-sm leading-6 text-[#596458]">
                  No weight records yet. Record your weight in today's log to
                  start building your trend.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-[#F1F0E8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#77796F]">
                      Latest recorded weight
                    </p>
                    <p className="mt-1 font-serif text-3xl text-[#344C3D]">
                      {latestWeightRecord?.weightKg ?? "Not available"} kg
                    </p>
                  </div>
                  <span className="rounded-full bg-[#DCE3D5] px-3 py-1 text-xs text-[#344C3D]">
                    {weightHistory.length} record
                    {weightHistory.length === 1 ? "" : "s"}
                  </span>
                </div>

                {chartWeights.length >= 2 ? (
                  <div className="mt-4">
                    <svg
                      viewBox="0 0 300 110"
                      className="h-36 w-full overflow-visible"
                      role="img"
                      aria-label="Weight history line chart"
                    >
                      <line
                        x1="12"
                        y1="95"
                        x2="288"
                        y2="95"
                        stroke="#D5D8CC"
                        strokeWidth="1"
                      />
                      <polyline
                        points={chartPoints}
                        fill="none"
                        stroke="#81947B"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {chartWeights.map((item, index) => {
                        const x =
                          12 + (index / (chartWeights.length - 1)) * 276;
                        const y =
                          95 -
                          ((item.weightKg - minWeight) / weightRange) * 70;

                        return (
                          <circle
                            key={item.date}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#344C3D"
                          />
                        );
                      })}
                    </svg>
                    <div className="flex justify-between gap-2 text-xs text-[#77796F]">
                      <span>{formatDate(chartWeights[0].date)}</span>
                      <span>
                        {formatDate(chartWeights[chartWeights.length - 1].date)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#596458]">
                    Save another measurement on a different date to see a trend
                    line.
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-[#344C3D]/10 pt-3">
                  {weightHistory.slice(-3).reverse().map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-[#77796F]">
                        {formatDate(item.date)}
                      </span>
                      <span className="font-medium text-[#344C3D]">
                        {item.weightKg} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5 sm:p-6">
            <CardHeading
              icon={Target}
              title="Goal Progress"
              subtitle="A quick view of your saved weight target"
            />

            <div className="mt-5 rounded-xl bg-[#F1F0E8] p-4">
              <p className="text-xs text-[#77796F]">Selected health goal</p>
              <p className="mt-1 font-medium text-[#344C3D]">
                {goalData.goal || profile?.goal || "Not provided"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <ProfileValue
                  label="Starting weight"
                  value={startingWeight == null ? null : String(startingWeight)}
                  unit="kg"
                />
                <ProfileValue
                  label="Target weight"
                  value={targetWeight == null ? null : String(targetWeight)}
                  unit="kg"
                />
              </div>

              {goalClassification.state !== "unavailable" ? (
                <div className="mt-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#596458]">
                      {goalClassification.state === "exceeded"
                        ? "Target exceeded"
                        : goalClassification.state === "reached"
                        ? "Target reached"
                        : goalClassification.state === "moving-away"
                        ? "Moving away from target"
                        : "Weight goal progress"}
                    </span>
                    <span
                      className={`font-medium ${
                        goalClassification.state === "exceeded"
                          ? "text-amber-600"
                          : goalClassification.state === "reached"
                          ? "text-emerald-600"
                          : goalClassification.state === "moving-away"
                          ? "text-red-500"
                          : "text-[#344C3D]"
                      }`}
                    >
                      {goalClassification.state === "exceeded"
                        ? "Exceeded"
                        : goalClassification.state === "reached"
                        ? "100%"
                        : `${Math.round(goalClassification.clampedPercent)}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E8E7DE]">
                    <div
                      className={`h-full rounded-full ${
                        goalClassification.state === "exceeded"
                          ? "bg-amber-400"
                          : goalClassification.state === "reached"
                          ? "bg-emerald-500"
                          : goalClassification.state === "moving-away"
                          ? "bg-red-400"
                          : "bg-[#81947B]"
                      }`}
                      style={{ width: `${goalClassification.clampedPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#77796F]">
                    {goalClassification.detailText}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#596458]">
                  {goalData.message ||
                    "Save a target weight in your assessment and log your weight to calculate progress."}
                </p>
              )}

              <button
                type="button"
                onClick={() => onNavigate("progress")}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#344C3D]"
              >
                View full progress <ArrowRight size={14} />
              </button>
            </div>
          </article>
        </section>

        <section>
          <SectionHeading
            title="AI-assisted health insights"
            subtitle="Experimental estimates based on your saved assessment"
          />

          {loading ? (
            <StatusPanel message="Checking for model results..." />
          ) : error ? (
            <StatusPanel
              message="Health insights could not be loaded because the dashboard request failed."
              action={() => void loadDashboard()}
              actionLabel="Retry"
            />
          ) : !hasCompletedAssessment ? (
            <StatusPanel
              message="Complete and save your assessment to request health risk estimates."
              action={() => onNavigate("assessment")}
              actionLabel="Open assessment"
            />
          ) : dashboard.mlPrediction?.available && riskResults ? (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {(
                  [
                    ["Diabetes risk", riskResults.diabetes],
                    ["Heart disease risk", riskResults.heart],
                  ] as const
                ).map(([title, risk]) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-xl text-[#344C3D]">
                        {title}
                      </h3>
                      <span className="rounded-full bg-[#DCE3D5] px-3 py-1.5 text-sm font-medium text-[#344C3D]">
                        {risk.risk_level}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {Object.entries(risk.probabilities).map(
                        ([category, probability]) => {
                          const safeProbability = Math.min(
                            100,
                            Math.max(0, Number(probability) || 0)
                          );

                          return (
                            <div key={category}>
                              <div className="flex justify-between gap-3 text-sm">
                                <span className="text-[#596458]">
                                  {category}
                                </span>
                                <span className="font-medium text-[#344C3D]">
                                  {safeProbability.toFixed(1)}%
                                </span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8E7DE]">
                                <div
                                  className="h-full rounded-full bg-[#81947B]"
                                  style={{ width: `${safeProbability}%` }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="mt-5 border-t border-[#344C3D]/10 pt-4">
                      <h4 className="text-sm font-medium text-[#344C3D]">
                        Contributing factors
                      </h4>
                      {risk.top_factors?.length ? (
                        <ul className="mt-3 space-y-3">
                          {risk.top_factors.map((factor, index) => (
                            <li
                              key={`${factor.feature}-${index}`}
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <span className="text-[#596458]">
                                {formatFeatureName(factor.feature)}
                              </span>
                              <span className="shrink-0 text-right text-[#77796F]">
                                Value: {String(factor.value)}
                                <span className="block text-xs">
                                  SHAP impact:{" "}
                                  {Number(factor.impact).toFixed(3)}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#77796F]">
                          No contributing factors available.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-[#DCE3D5]/60 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-[#344C3D]"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-[#344C3D]">
                      Model information
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-[#596458]">
                      {riskResults.data_notice}
                    </p>
                    <p className="mt-2 text-xs text-[#77796F]">
                      Model: {riskResults.model} · Explainability:{" "}
                      {riskResults.explainability}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <StatusPanel
              message={
                dashboard.mlPrediction?.message ??
                "No prediction is available. Check whether the ML service is running and the assessment data is valid."
              }
              action={() => void loadDashboard()}
              actionLabel="Retry"
            />
          )}
        </section>

        <section className="flex items-start gap-3 rounded-2xl bg-[#DCE3D5]/60 p-4">
          <Leaf size={20} className="mt-0.5 shrink-0 text-[#344C3D]" />
          <div>
            <h3 className="text-sm font-medium text-[#344C3D]">
              Wellness note
            </h3>
            <p className="mt-1 text-sm leading-5 text-[#596458]">
              Calorie and protein estimates may vary based on your activity,
              health profile and individual nutritional needs.
            </p>
          </div>
        </section>

        <footer className="flex items-start gap-2 border-t border-[#344C3D]/10 pt-4 text-xs leading-5 text-[#77796F]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          YourArogyum provides preventive wellness information and AI-generated
          estimates for informational purposes only. It is not a substitute
          for professional medical advice, diagnosis, or treatment.
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl leading-tight tracking-tight text-[#344C3D] sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm leading-5 text-[#77796F]">{subtitle}</p>
      )}
    </div>
  );
}

function CardHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#DCE3D5] text-[#344C3D]">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <h3 className="font-serif text-lg leading-6 text-[#344C3D]">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[#77796F]">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  action,
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  detail: string;
  action?: () => void;
}) {
  return (
    <article className="flex min-h-40 min-w-0 flex-col rounded-2xl border border-[#344C3D]/10 bg-[#FDFCFA] p-4 transition-colors duration-200 hover:border-[#81947B]/50 sm:min-h-44 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#DCE3D5] text-[#344C3D]">
          <Icon size={17} />
        </div>
        <h3 className="text-xs font-medium leading-4 text-[#77796F] sm:text-sm">
          {title}
        </h3>
      </div>
      <p className="mt-4 break-words font-serif text-2xl leading-tight text-[#344C3D] sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-[#77796F]">
        {detail}
      </p>
      {action && (
        <button
          type="button"
          onClick={action}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#344C3D]"
        >
          View details <ArrowRight size={13} />
        </button>
      )}
    </article>
  );
}

function TrackingInput({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#344C3D]">{label}</span>
      <span className="mt-1 block text-xs text-[#77796F]">{unit}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#344C3D]/15 bg-[#FDFCFA] px-3 py-2.5 text-sm text-[#344C3D] outline-none transition placeholder:text-[#AAA99E] focus:border-[#81947B] focus:ring-2 focus:ring-[#DCE3D5]"
      />
    </label>
  );
}

function ProfileValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  const shownValue =
    value === null || value === undefined || String(value).trim() === ""
      ? "Not provided"
      : String(value);

  return (
    <div className="min-w-0 rounded-xl bg-[#F1F0E8] p-3">
      <p className="text-xs text-[#77796F]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#344C3D]">
        {shownValue}
        {unit && shownValue !== "Not provided" ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const shownValue =
    value === null || value === undefined || String(value).trim() === ""
      ? "Not provided"
      : String(value);

  return (
    <div className="flex flex-col gap-1 border-b border-[#344C3D]/10 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-[#77796F]">{label}</span>
      <span className="break-words text-sm text-[#344C3D]">{shownValue}</span>
    </div>
  );
}

function StatusPanel({
  message,
  action,
  actionLabel = "Retry",
}: {
  message: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[#344C3D]/10 bg-[#FDFCFA] p-5">
      <p className="text-sm leading-5 text-[#596458]">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#344C3D]"
        >
          <RefreshCw size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default DashboardPage;
