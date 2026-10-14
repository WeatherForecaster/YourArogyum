
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Scale,
  Target,
  TrendingUp,
  Trash2,
  Pencil,
  X,
  Loader2,
} from "lucide-react";

import {
  getDailyLog,
  saveDailyLog,
  getWeightHistory,
  getGoalProgress,
  type DailyLogResponse,
  type GoalProgressResponse,
  archiveAndClearLegacyStorage,
} from "../services/healthTracking";
import {
  saveMyAssessment,
  type AssessmentData,
} from "../services/assessment";
import { classifyGoalProgress } from "../utils/goalProgress";

type WeightEntry = {
  id: string;
  date: string;
  weight: number;
};

type ActivityEntry = {
  id: string;
  date: string;
  type: string;
  minutes: number;
};

type ProgressPageProps = {
  assessmentData: Record<string, string> | null;
  onAssessmentUpdate?: (updated: AssessmentData) => void;
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

const inputClass =
  "w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 text-sm text-[#34483b] outline-none transition focus:border-[#78947a] focus:ring-2 focus:ring-[#78947a]/15";

export default function ProgressPage({
  assessmentData,
  onAssessmentUpdate,
}: ProgressPageProps) {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [sessionActivities, setSessionActivities] = useState<ActivityEntry[]>([]);
  const [target, setTarget] = useState<string>("");
  const [goalData, setGoalData] = useState<GoalProgressResponse | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLogResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [range, setRange] = useState("30");
  const [metric, setMetric] = useState<"weight" | "bmi">("weight");

  const [showWeightForm, setShowWeightForm] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [weightDate, setWeightDate] = useState(today());
  const [weightValue, setWeightValue] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityDate, setActivityDate] = useState(today());
  const [activityType, setActivityType] = useState("Walking");
  const [activityMinutes, setActivityMinutes] = useState("30");
  const [savingActivity, setSavingActivity] = useState(false);

  const [savingTarget, setSavingTarget] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error" | "info">("info");

  // Load authenticated backend health-tracking data
  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError("");

    try {
      // Archive any legacy unscoped localStorage data once to prevent leakage
      archiveAndClearLegacyStorage();

      const [history, goal, todayLogRes] = await Promise.all([
        getWeightHistory("1900-01-01", today()).catch((err) => {
          console.warn("[YourArogyum] Failed to fetch weight history:", err);
          return [];
        }),
        getGoalProgress().catch((err) => {
          console.warn("[YourArogyum] Failed to fetch goal progress:", err);
          return null;
        }),
        getDailyLog(today()).catch((err) => {
          console.warn("[YourArogyum] Failed to fetch today's log:", err);
          return null;
        }),
      ]);

      const mappedWeights: WeightEntry[] = Array.isArray(history)
        ? history
            .filter((h) => h && h.date && Number.isFinite(Number(h.weightKg)))
            .map((h) => ({
              id: h.date,
              date: h.date,
              weight: Number(h.weightKg),
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];

      setWeights(mappedWeights);
      setGoalData(goal);
      setTodayLog(todayLogRes);

      if (goal?.targetWeightKg != null) {
        setTarget(String(goal.targetWeightKg));
      } else if (assessmentData?.targetWeight) {
        setTarget(assessmentData.targetWeight);
      }
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Unable to load health progress records."
      );
    } finally {
      setLoading(false);
    }
  }, [assessmentData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Keep target updated if parent assessmentData updates
  useEffect(() => {
    if (assessmentData?.targetWeight) {
      setTarget(assessmentData.targetWeight);
    }
  }, [assessmentData?.targetWeight]);

  const assessmentWeight = Number(assessmentData?.weight);
  const hasAssessmentWeight =
    Boolean(assessmentData?.weight?.trim()) &&
    Number.isFinite(assessmentWeight) &&
    assessmentWeight > 0;


  const sortedWeights = useMemo(
    () => [...weights].sort((a, b) => a.date.localeCompare(b.date)),
    [weights]
  );

  const first = sortedWeights[0];
  const latest = sortedWeights[sortedWeights.length - 1];
  const previous = sortedWeights[sortedWeights.length - 2];

  // Derive weights from backend records or assessment fallback
  const currentWeight =
    goalData?.currentWeightKg != null && Number.isFinite(Number(goalData.currentWeightKg))
      ? Number(goalData.currentWeightKg)
      : latest?.weight ?? (hasAssessmentWeight ? assessmentWeight : null);

  const startingWeight =
    goalData?.startingWeightKg != null && Number.isFinite(Number(goalData.startingWeightKg))
      ? Number(goalData.startingWeightKg)
      : first?.weight ?? (hasAssessmentWeight ? assessmentWeight : null);

  const numericTarget = Number(target);
  const validTarget =
    target.trim() !== "" &&
    Number.isFinite(numericTarget) &&
    numericTarget >= 2 &&
    numericTarget <= 500;

  const weightChange =
    latest && previous
      ? Number((latest.weight - previous.weight).toFixed(1))
      : null;

  // Classify the goal-progress state from raw weights, bypassing the backend's
  // clamped progressPercent which cannot distinguish "reached" from "exceeded".
  const goalClassification = useMemo(() => {
    const sw =
      goalData?.startingWeightKg != null && Number.isFinite(Number(goalData.startingWeightKg))
        ? Number(goalData.startingWeightKg)
        : startingWeight;
    const tw = validTarget ? numericTarget : null;
    const cw =
      goalData?.currentWeightKg != null && Number.isFinite(Number(goalData.currentWeightKg))
        ? Number(goalData.currentWeightKg)
        : currentWeight;

    return classifyGoalProgress(sw, tw, cw);
  }, [goalData, startingWeight, currentWeight, validTarget, numericTarget]);

  const cutoff = useMemo(() => {
    if (range === "all") return null;

    const date = new Date();
    date.setDate(date.getDate() - Number(range));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, [range]);

  const visibleWeights = sortedWeights.filter(
    (entry) => !cutoff || entry.date >= cutoff
  );

  const chartData = visibleWeights.map((entry) => ({
    date: shortDate(entry.date),
    fullDate: entry.date,
    weight: entry.weight,
  }));

  const closeWeightForm = () => {
    setShowWeightForm(false);
    setEditingWeightId(null);
    setWeightValue("");
    setWeightDate(today());
  };

  const openEditWeight = (entry: WeightEntry) => {
    setEditingWeightId(entry.id);
    setWeightDate(entry.date);
    setWeightValue(String(entry.weight));
    setShowWeightForm(true);
  };

  const submitWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const value = Number(weightValue);

    if (
      !weightDate ||
      weightDate > today() ||
      !Number.isFinite(value) ||
      value < 2 ||
      value > 500
    ) {
      setNotice("Enter a valid record date (up to today) and weight between 2 and 500 kg.");
      setNoticeType("error");
      return;
    }

    setSavingWeight(true);
    try {
      await saveDailyLog(weightDate, { weightKg: value });
      setNotice("Weight record saved successfully to your account.");
      setNoticeType("success");
      closeWeightForm();
      await loadData();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Failed to save weight record."
      );
      setNoticeType("error");
    } finally {
      setSavingWeight(false);
    }
  };

  const deleteWeight = () => {
    setNotice(
      "Removing past weight logs is not supported by the health tracking service. You can use 'Edit' to correct the weight for that date."
    );
    setNoticeType("info");
  };

  const handleSaveTarget = async () => {
    setNotice("");
    const numeric = Number(target);

    if (!target.trim() || !Number.isFinite(numeric) || numeric < 2 || numeric > 500) {
      setNotice("Enter a valid target weight between 2 and 500 kg.");
      setNoticeType("error");
      return;
    }

    if (!assessmentData) {
      setNotice("Please complete your health assessment first before setting a target weight.");
      setNoticeType("error");
      return;
    }

    setSavingTarget(true);
    try {
      const response = await saveMyAssessment({
        ...assessmentData,
        targetWeight: String(numeric),
      });

      setNotice("Target weight updated successfully.");
      setNoticeType("success");

      if (onAssessmentUpdate && response.assessment) {
        onAssessmentUpdate(response.assessment);
      }

      await loadData();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Failed to update target weight."
      );
      setNoticeType("error");
    } finally {
      setSavingTarget(false);
    }
  };

  const submitActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const minutes = Number(activityMinutes);

    if (
      !activityDate ||
      activityDate > today() ||
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      setNotice("Enter a valid date and duration between 1 and 1440 minutes.");
      setNoticeType("error");
      return;
    }

    setSavingActivity(true);
    try {
      await saveDailyLog(activityDate, { activityMinutes: minutes });

      const newEntry: ActivityEntry = {
        id: `${activityDate}-${Date.now()}`,
        date: activityDate,
        type: activityType,
        minutes,
      };

      setSessionActivities((prev) => [
        newEntry,
        ...prev.filter((a) => a.date !== activityDate),
      ]);

      setNotice("Activity saved successfully to your account.");
      setNoticeType("success");
      setShowActivityForm(false);
      setActivityMinutes("30");
      await loadData();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Failed to save activity."
      );
      setNoticeType("error");
    } finally {
      setSavingActivity(false);
    }
  };

  // Combine persisted today's activity with any logged this session
  const totalMinutes = useMemo(() => {
    let sum = sessionActivities.reduce((acc, item) => acc + item.minutes, 0);
    if (
      todayLog?.activityMinutes != null &&
      !sessionActivities.some((a) => a.date === todayLog.logDate)
    ) {
      sum += todayLog.activityMinutes;
    }
    return sum;
  }, [sessionActivities, todayLog]);

  const activeDaysCount = useMemo(() => {
    const dates = new Set(sessionActivities.map((a) => a.date));
    if (todayLog?.activityMinutes != null && todayLog.activityMinutes > 0) {
      dates.add(todayLog.logDate);
    }
    return dates.size;
  }, [sessionActivities, todayLog]);

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-4 py-6 text-[#304438] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Progress tracking
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718075]">
              Explore your health records, follow your goals, and see how your
              journey changes over time.
            </p>
          </div>

          <button
            onClick={() => {
              setNotice("");
              setShowWeightForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#526e58] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#405945]"
          >
            <Plus size={17} />
            Log weight
          </button>
        </header>

        {notice && (
          <div
            role={noticeType === "error" ? "alert" : "status"}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              noticeType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : noticeType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
              className="text-current opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {fetchError && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {fetchError}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#e6e9df] bg-white p-4 text-sm text-[#708071]">
            <Loader2 className="animate-spin text-[#66816b]" size={16} />
            <span>Loading your authenticated health records...</span>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Scale size={19} />}
            label="Latest weight"
            value={
              currentWeight !== null
                ? `${currentWeight} kg`
                : "No record yet"
            }
            detail={
              latest
                ? `Recorded ${formatDate(latest.date)}`
                : hasAssessmentWeight
                  ? "From your saved assessment"
                  : "Complete your health assessment or log a weight"
            }
          />

          <SummaryCard
            icon={<Activity size={19} />}
            label="Change since previous"
            value={
              weightChange === null
                ? "Not enough data"
                : `${weightChange > 0 ? "+" : ""}${weightChange} kg`
            }
            detail={
              weightChange === null
                ? "Log at least two dated records"
                : weightChange < 0
                  ? "Weight decreased"
                  : weightChange > 0
                    ? "Weight increased"
                    : "No change recorded"
            }
            trend={
              weightChange === null
                ? undefined
                : weightChange <= 0
                  ? "down"
                  : "up"
            }
          />

          <SummaryCard
            icon={<Target size={19} />}
            label="Goal progress"
            value={
              goalClassification.state === "unavailable"
                ? "Not available"
                : goalClassification.state === "exceeded"
                ? "Target exceeded"
                : goalClassification.state === "reached"
                ? "Target reached!"
                : `${Math.round(goalClassification.clampedPercent)}%`
            }
            detail={
              !validTarget
                ? "No target weight set"
                : goalClassification.state === "unavailable"
                ? "Add a valid starting and current weight"
                : goalClassification.detailText
            }
          />

          <SummaryCard
            icon={<CalendarDays size={19} />}
            label="Activity days"
            value={String(activeDaysCount)}
            detail={`${totalMinutes} total minutes logged`}
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <div className="rounded-3xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.035)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Health trends</h2>
                <p className="mt-1 text-sm text-[#819084]">
                  Your recorded measurements over time
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={metric}
                  onChange={(e) =>
                    setMetric(e.target.value as "weight" | "bmi")
                  }
                  className="rounded-full border border-[#e0e7dc] bg-[#f8faf6] px-3 py-2 text-sm outline-none"
                  aria-label="Select chart metric"
                >
                  <option value="weight">Weight (kg)</option>
                  <option value="bmi" disabled>
                    BMI (needs height integration)
                  </option>
                </select>

                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="rounded-full border border-[#e0e7dc] bg-[#f8faf6] px-3 py-2 text-sm outline-none"
                  aria-label="Select chart date range"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            {chartData.length >= 2 ? (
              <div className="mt-7 h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="#edf0e9"
                      strokeDasharray="4 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#8a968a", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fill: "#8a968a", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullDate
                          ? formatDate(payload[0].payload.fullDate)
                          : ""
                      }
                      formatter={(value) => [`${value} kg`, "Weight"]}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid #e3e9df",
                        fontSize: 13,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#69866b"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#69866b",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-6 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce5d8] bg-[#fafbf8] px-6 text-center">
                <div className="mb-3 rounded-2xl bg-[#edf3e9] p-3 text-[#66816b]">
                  <TrendingUp size={24} />
                </div>

                <h3 className="font-medium">
                  {chartData.length === 0
                    ? "Your trend starts here"
                    : "Add another record to see a trend"}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-[#839084]">
                  {chartData.length === 0
                    ? "Log your weight with a date. Your chart will use your real records, never sample data."
                    : "A trend needs at least two dated weight records to compare changes."}
                </p>

                <button
                  onClick={() => setShowWeightForm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cbd9c7] px-4 py-2 text-sm font-medium text-[#526e58] hover:bg-[#f1f5ed]"
                >
                  <Plus size={16} />
                  Add weight record
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-4 text-xs text-[#899589]">
              <span>{visibleWeights.length} records in this period</span>
              <span>Based on your authenticated health records</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.035)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#edf3e9] p-2.5 text-[#66816b]">
                <Target size={19} />
              </div>
              <div>
                <h2 className="font-semibold">Your weight goal</h2>
                <p className="text-xs text-[#839084]">
                  Track your chosen target
                </p>
              </div>
            </div>

            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="targetWeight"
            >
              Target weight (kg)
            </label>

            <div className="flex gap-2">
              <input
                id="targetWeight"
                type="number"
                min="2"
                max="500"
                step="0.1"
                placeholder="Enter target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleSaveTarget}
                disabled={savingTarget}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#526e58] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#405945] disabled:opacity-50"
              >
                {savingTarget ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  "Save"
                )}
              </button>
              <span className="flex items-center rounded-xl bg-[#f1f4ed] px-3 text-sm text-[#708271]">
                kg
              </span>
            </div>

            <div className="my-6 space-y-4">
              <GoalRow
                label="Starting weight"
                value={
                  startingWeight !== null
                    ? `${startingWeight} kg`
                    : "No record"
                }
              />
              <GoalRow
                label="Latest weight"
                value={
                  currentWeight !== null
                    ? `${currentWeight} kg`
                    : "No record"
                }
              />
              <GoalRow
                label="Target"
                value={validTarget ? `${numericTarget} kg` : "Not set"}
              />
            </div>

            {goalClassification.state !== "unavailable" ? (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#738174]">
                    {goalClassification.state === "exceeded"
                      ? "Target exceeded"
                      : goalClassification.state === "reached"
                      ? "Target reached"
                      : goalClassification.state === "moving-away"
                      ? "Moving away from target"
                      : "Progress toward target"}
                  </span>
                  <strong
                    className={
                      goalClassification.state === "exceeded"
                        ? "text-amber-600"
                        : goalClassification.state === "reached"
                        ? "text-emerald-600"
                        : goalClassification.state === "moving-away"
                        ? "text-red-500"
                        : undefined
                    }
                  >
                    {goalClassification.state === "exceeded"
                      ? "Exceeded"
                      : goalClassification.state === "reached"
                      ? "100%"
                      : `${Math.round(goalClassification.clampedPercent)}%`}
                  </strong>
                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-full bg-[#edf1e9]"
                  role="progressbar"
                  aria-valuenow={goalClassification.clampedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Goal progress"
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      goalClassification.state === "exceeded"
                        ? "bg-amber-400"
                        : goalClassification.state === "reached"
                        ? "bg-emerald-500"
                        : goalClassification.state === "moving-away"
                        ? "bg-red-400"
                        : "bg-[#779576]"
                    }`}
                    style={{ width: `${goalClassification.clampedPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#879286]">
                  {goalClassification.detailText}
                </p>
              </>
            ) : (
              <div className="rounded-2xl bg-[#f8faf6] p-4 text-sm leading-6 text-[#7d897e]">
                {!validTarget
                  ? "No target weight set. Add a target if you want to track one."
                  : "A starting weight is needed to calculate goal progress."}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.035)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Lifestyle activity</h2>
                <p className="mt-1 text-sm text-[#819084]">
                  Record the movement you complete
                </p>
              </div>

              <button
                onClick={() => setShowActivityForm((current) => !current)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dce5d8] px-3 py-2 text-sm font-medium text-[#526e58] hover:bg-[#f5f8f2]"
              >
                <Plus size={15} />
                Add
              </button>
            </div>

            {showActivityForm && (
              <form
                onSubmit={submitActivity}
                className="mt-5 space-y-3 rounded-2xl bg-[#f8faf6] p-4"
              >
                <div>
                  <label
                    className="mb-1.5 block text-xs font-medium"
                    htmlFor="activityType"
                  >
                    Activity
                  </label>
                  <select
                    id="activityType"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className={inputClass}
                  >
                    <option>Walking</option>
                    <option>Workout</option>
                    <option>Yoga</option>
                    <option>Cycling</option>
                    <option>Dancing</option>
                    <option>Other activity</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-medium"
                      htmlFor="activityDate"
                    >
                      Date
                    </label>
                    <input
                      id="activityDate"
                      type="date"
                      max={today()}
                      value={activityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block text-xs font-medium"
                      htmlFor="activityMinutes"
                    >
                      Minutes
                    </label>
                    <input
                      id="activityMinutes"
                      type="number"
                      min="1"
                      max="1440"
                      value={activityMinutes}
                      onChange={(e) => setActivityMinutes(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowActivityForm(false)}
                    className="rounded-full px-4 py-2 text-sm text-[#748174]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingActivity}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#526e58] px-4 py-2 text-sm font-medium text-white hover:bg-[#405945] disabled:opacity-50"
                  >
                    {savingActivity ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : null}
                    Save activity
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#f5f7f1] p-4">
              <div>
                <p className="text-xs text-[#829082]">
                  Total logged movement
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {totalMinutes}{" "}
                  <span className="text-sm font-normal text-[#839084]">
                    minutes
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 text-[#69866b]">
                <Activity size={21} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {sessionActivities.length === 0 && (todayLog?.activityMinutes == null || todayLog.activityMinutes === 0) ? (
                <p className="rounded-xl border border-dashed border-[#dce5d8] p-5 text-center text-sm leading-6 text-[#879286]">
                  No activities logged yet for this session. Add an activity to record your movement.
                </p>
              ) : (
                <>
                  {todayLog?.activityMinutes != null && todayLog.activityMinutes > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#edf0e9] bg-[#fcfdfa] px-3 py-3">
                      <div className="rounded-lg bg-[#edf3e9] p-2 text-[#66816b]">
                        <Activity size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Today's Total Activity</p>
                        <p className="mt-0.5 text-xs text-[#879286]">
                          {formatDate(todayLog.logDate)} (Synced with Account)
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {todayLog.activityMinutes} min
                      </span>
                    </div>
                  )}

                  {sessionActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-xl border border-[#edf0e9] px-3 py-3"
                    >
                      <div className="rounded-lg bg-[#edf3e9] p-2 text-[#66816b]">
                        <Activity size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{activity.type}</p>
                        <p className="mt-0.5 text-xs text-[#879286]">
                          {formatDate(activity.date)}
                        </p>
                      </div>

                      <span className="text-sm font-medium">
                        {activity.minutes} min
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.035)] sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Weight history</h2>
              <p className="mt-1 text-sm text-[#819084]">
                Review or correct a record from your account
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              {sortedWeights.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dce5d8] p-8 text-center">
                  <Scale
                    className="mx-auto mb-3 text-[#829b80]"
                    size={25}
                  />
                  <p className="text-sm font-medium">No weight history yet</p>
                  <p className="mt-1 text-xs text-[#879286]">
                    Your authenticated records will appear here once saved.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#edf0e9] text-xs text-[#899589]">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Weight</th>
                      <th className="pb-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...sortedWeights].reverse().map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-[#f0f2ed] last:border-0"
                      >
                        <td className="py-3.5 text-[#67776a]">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3.5 font-medium">
                          {entry.weight} kg
                        </td>
                        <td className="py-3.5">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEditWeight(entry)}
                              aria-label="Edit weight record"
                              className="rounded-lg p-2 text-[#839084] hover:bg-[#f1f5ed] hover:text-[#526e58]"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={deleteWeight}
                              aria-label="Delete weight record"
                              className="rounded-lg p-2 text-[#a0aaa0] hover:bg-[#f8eeee] hover:text-[#9b5b5b]"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e6e9df] bg-[#eef3e9] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/80 p-2.5 text-[#66816b]">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Health assessment history</h2>
              <p className="mt-1 text-sm leading-6 text-[#708071]">
                Historical risk comparisons will appear here when previous
                assessments are available from your saved health records. This
                page does not generate replacement assessments or invent past
                results.
              </p>
            </div>
          </div>
        </section>

        <p className="pb-4 text-center text-xs leading-5 text-[#97a095]">
          YourArogyum is a preventive wellness support tool and does not
          replace professional medical advice.
        </p>
      </div>

      {showWeightForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#26372b]/35 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWeightForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weightModalTitle"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 id="weightModalTitle" className="text-xl font-semibold">
                  {editingWeightId ? "Edit weight record" : "Log your weight"}
                </h2>
                <p className="mt-1 text-sm text-[#839084]">
                  Add a dated measurement to your account's health history.
                </p>
              </div>

              <button
                onClick={closeWeightForm}
                aria-label="Close"
                className="rounded-full p-2 text-[#879286] hover:bg-[#f3f5f0]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitWeight} className="space-y-4">
              <div>
                <label
                  htmlFor="weightDate"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Record date
                </label>
                <input
                  id="weightDate"
                  type="date"
                  max={today()}
                  value={weightDate}
                  onChange={(e) => setWeightDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="weightValue"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Weight (kg)
                </label>
                <input
                  id="weightValue"
                  type="number"
                  min="2"
                  max="500"
                  step="0.1"
                  placeholder="e.g. 62.5"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeWeightForm}
                  className="rounded-full px-4 py-2.5 text-sm text-[#748174] hover:bg-[#f4f6f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWeight}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#526e58] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#405945] disabled:opacity-50"
                >
                  {savingWeight ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : null}
                  {editingWeightId ? "Save changes" : "Save record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  trend,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.025)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[#7e8b7f]">{label}</span>
        <span className="rounded-xl bg-[#eff4eb] p-2 text-[#69866b]">
          {icon}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {trend && (
          <span
            className={
              trend === "down" ? "text-[#6f916f]" : "text-[#b17d65]"
            }
          >
            {trend === "down" ? (
              <ArrowDownRight size={17} />
            ) : (
              <ArrowUpRight size={17} />
            )}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs leading-5 text-[#8a968a]">{detail}</p>
    </div>
  );
}

function GoalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#7e8b7f]">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
