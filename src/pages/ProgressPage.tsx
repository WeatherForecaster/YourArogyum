
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

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
};

const STORAGE_KEYS = {
  weights: "yourarogyum_progress_weights",
  activities: "yourarogyum_progress_activities",
  target: "yourarogyum_progress_target",
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
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
}: ProgressPageProps) {
  const [weights, setWeights] = useState<WeightEntry[]>(() =>
    readStorage(STORAGE_KEYS.weights, [])
  );

  const [activities, setActivities] = useState<ActivityEntry[]>(() =>
    readStorage(STORAGE_KEYS.activities, [])
  );

  const [target, setTarget] = useState<string>(() =>
    assessmentData?.targetWeight || readStorage(STORAGE_KEYS.target, "")
  );

  const [range, setRange] = useState("30");
  const [metric, setMetric] = useState<"weight" | "bmi">("weight");
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [weightDate, setWeightDate] = useState(today());
  const [weightValue, setWeightValue] = useState("");
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityDate, setActivityDate] = useState(today());
  const [activityType, setActivityType] = useState("Walking");
  const [activityMinutes, setActivityMinutes] = useState("30");
  const [notice, setNotice] = useState("");

  // Keep the target synchronized with the saved health assessment.
  useEffect(() => {
    if (assessmentData?.targetWeight) {
      setTarget(assessmentData.targetWeight);
    } else {
      setTarget(readStorage(STORAGE_KEYS.target, ""));
    }
  }, [assessmentData?.targetWeight]);

  const assessmentWeight = Number(assessmentData?.weight);

  const hasAssessmentWeight =
    Boolean(assessmentData?.weight?.trim()) &&
    Number.isFinite(assessmentWeight) &&
    assessmentWeight > 0;

  const persistWeights = (next: WeightEntry[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setWeights(sorted);
    localStorage.setItem(STORAGE_KEYS.weights, JSON.stringify(sorted));
  };

  const persistActivities = (next: ActivityEntry[]) => {
    const sorted = [...next].sort((a, b) => b.date.localeCompare(a.date));
    setActivities(sorted);
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(sorted));
  };

  const saveTarget = (value: string) => {
    setTarget(value);
    localStorage.setItem(STORAGE_KEYS.target, JSON.stringify(value));
  };

  const sortedWeights = useMemo(
    () => [...weights].sort((a, b) => a.date.localeCompare(b.date)),
    [weights]
  );

  const first = sortedWeights[0];
  const latest = sortedWeights[sortedWeights.length - 1];
  const previous = sortedWeights[sortedWeights.length - 2];

  // Use real dated entries when available. Otherwise use the saved assessment.
  const currentWeight =
    latest?.weight ?? (hasAssessmentWeight ? assessmentWeight : null);

  const startingWeight =
    first?.weight ?? (hasAssessmentWeight ? assessmentWeight : null);

  const numericTarget = Number(target);

  const validTarget =
    target.trim() !== "" &&
    Number.isFinite(numericTarget) &&
    numericTarget > 0 &&
    numericTarget <= 500;

  const weightChange =
    latest && previous
      ? Number((latest.weight - previous.weight).toFixed(1))
      : null;

  // Works for both weight-loss and weight-gain goals.
  const goalProgress = (() => {
    if (
      startingWeight === null ||
      currentWeight === null ||
      !validTarget
    ) {
      return null;
    }

    if (startingWeight === numericTarget) {
      return currentWeight === numericTarget ? 100 : null;
    }

    const totalChange = numericTarget - startingWeight;
    const actualChange = currentWeight - startingWeight;
    const progress = (actualChange / totalChange) * 100;

    return Math.round(Math.min(100, Math.max(0, progress)));
  })();

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

  const submitWeight = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = Number(weightValue);

    if (
      !weightDate ||
      weightDate > today() ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 500
    ) {
      setNotice("Enter a valid date and weight.");
      return;
    }

    const duplicate = weights.some(
      (entry) =>
        entry.date === weightDate && entry.id !== editingWeightId
    );

    if (duplicate) {
      setNotice(
        "A weight entry already exists for this date. Edit that entry instead."
      );
      return;
    }

    const entry: WeightEntry = {
      id: editingWeightId ?? crypto.randomUUID(),
      date: weightDate,
      weight: value,
    };

    persistWeights(
      editingWeightId
        ? weights.map((item) =>
            item.id === editingWeightId ? entry : item
          )
        : [...weights, entry]
    );

    setNotice("Weight record saved on this device.");
    closeWeightForm();
  };

  const deleteWeight = (id: string) => {
    if (!window.confirm("Delete this weight record?")) return;

    persistWeights(weights.filter((entry) => entry.id !== id));
    setNotice("Weight record deleted.");
  };

  const submitActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const minutes = Number(activityMinutes);

    if (
      !activityDate ||
      activityDate > today() ||
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      setNotice("Enter a valid date and duration.");
      return;
    }

    persistActivities([
      {
        id: crypto.randomUUID(),
        date: activityDate,
        type: activityType,
        minutes,
      },
      ...activities,
    ]);

    setNotice("Activity saved on this device.");
    setShowActivityForm(false);
    setActivityMinutes("30");
  };

  const totalMinutes = activities.reduce(
    (sum, item) => sum + item.minutes,
    0
  );

  const activeDays = new Set(activities.map((item) => item.date)).size;

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
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-[#dce5d7] bg-white px-4 py-3 text-sm text-[#536d57]"
          >
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
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
              goalProgress === null
                ? "Not available"
                : `${goalProgress}%`
            }
            detail={
              !validTarget
                ? "No target weight set"
                : goalProgress === null
                  ? "Add a valid starting and current weight"
                  : `${Math.abs(
                      numericTarget - (currentWeight ?? numericTarget)
                    ).toFixed(1)} kg from target`
            }
          />

          <SummaryCard
            icon={<CalendarDays size={19} />}
            label="Activity days"
            value={String(activeDays)}
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
              <span>Based on manually recorded measurements</span>
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
                min="1"
                max="500"
                step="0.1"
                placeholder="Enter target"
                value={target}
                onChange={(e) => saveTarget(e.target.value)}
                className={inputClass}
              />
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

            {goalProgress !== null ? (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#738174]">
                    Progress toward target
                  </span>
                  <strong>{goalProgress}%</strong>
                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-full bg-[#edf1e9]"
                  role="progressbar"
                  aria-valuenow={goalProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Goal progress"
                >
                  <div
                    className="h-full rounded-full bg-[#779576] transition-all"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#879286]">
                  Progress is calculated from your earliest dated weight
                  record, or your saved assessment weight when no dated
                  records exist. Future progress depends on recording updated
                  measurements. This is a tracking metric, not a medical
                  assessment.
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
                    className="rounded-full bg-[#526e58] px-4 py-2 text-sm font-medium text-white"
                  >
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
              {activities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#dce5d8] p-5 text-center text-sm leading-6 text-[#879286]">
                  No activities logged yet. Add an activity to start building
                  your history.
                </p>
              ) : (
                [...activities]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((activity) => (
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

                      <button
                        onClick={() => {
                          if (
                            window.confirm("Delete this activity record?")
                          ) {
                            persistActivities(
                              activities.filter(
                                (item) => item.id !== activity.id
                              )
                            );
                          }
                        }}
                        aria-label={`Delete ${activity.type} record`}
                        className="rounded-lg p-2 text-[#a0aaa0] hover:bg-[#f8eeee] hover:text-[#9b5b5b]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e6e9df] bg-white p-5 shadow-[0_4px_24px_rgba(54,75,56,0.035)] sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Weight history</h2>
              <p className="mt-1 text-sm text-[#819084]">
                Review, correct, or remove a record
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
                    Your dated records will appear here.
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
                              onClick={() => deleteWeight(entry.id)}
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
                  Add a dated measurement to your health history.
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
                  min="1"
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
                  className="rounded-full bg-[#526e58] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#405945]"
                >
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
