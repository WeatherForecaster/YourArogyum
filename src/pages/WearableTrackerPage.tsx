
import { useState, type ReactNode } from "react";
import {
    Activity,
    CalendarDays,
    Flame,
    Footprints,
    HeartPulse,
    Info,
    Moon,
    ShieldCheck,
    Watch,
} from "lucide-react";

import {
    WEARABLE_DEMO_DATA,
    isWearableDemoEnabled,
    setWearableDemoEnabled,
} from "../services/wearableDemo";

export default function WearableTrackerPage() {
    const [enabled, setEnabled] = useState(isWearableDemoEnabled);

    const data = WEARABLE_DEMO_DATA;

    const stepProgress = Math.min(
        100,
        Math.round((data.steps / data.dailyStepGoal) * 100)
    );

    const stepsRemaining = Math.max(
        0,
        data.dailyStepGoal - data.steps
    );

    const setTrackerEnabled = (value: boolean) => {
        setEnabled(value);
        setWearableDemoEnabled(value);
    };

    return (
        <section className="min-h-full px-5 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A87945]">
                            OPTIONAL FEATURE
                        </p>

                        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#344C3D] sm:text-4xl">
                            Wearable Tracker
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-[#77796F]">
                            Explore activity, sleep and heart-rate insights in one place.
                            Enable the tracker to include the sample readings in relevant
                            wellness recommendations.
                        </p>
                    </div>

                    {enabled && (
                        <button
                            type="button"
                            onClick={() => setTrackerEnabled(false)}
                            className="w-fit rounded-xl border border-[#344C3D]/15 px-4 py-2.5 text-sm font-medium text-[#596458] transition hover:bg-[#EBEEE5]"
                        >
                            Turn off tracker
                        </button>
                    )}
                </div>

                {!enabled ? (
                    <div className="mt-8 rounded-3xl border border-[#344C3D]/10 bg-white p-6 shadow-sm sm:p-10">
                        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="max-w-xl">
                                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#DCE3D5]">
                                    <Watch size={28} className="text-[#344C3D]" />
                                </div>

                                <h2 className="mt-5 font-serif text-2xl font-semibold text-[#344C3D]">
                                    Your activity, at a glance
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-[#77796F]">
                                    Enable this optional demo to see illustrative health
                                    readings and use their activity context in relevant
                                    recommendations. No smartwatch or phone connection is
                                    required.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setTrackerEnabled(true)}
                                    className="mt-6 rounded-xl bg-[#344C3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263A2E]"
                                >
                                    Enable demo tracker
                                </button>

                                <p className="mt-3 text-xs text-[#77796F]">
                                    You can turn it off whenever you like.
                                </p>
                            </div>

                            <div className="hidden h-44 w-44 place-items-center rounded-full bg-[#EBEEE5] md:grid">
                                <div className="grid h-32 w-32 place-items-center rounded-full border border-[#344C3D]/15 bg-white">
                                    <Activity
                                        size={56}
                                        strokeWidth={1.4}
                                        className="text-[#81947B]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#A87945]/20 bg-[#F4EADD]/50 p-4">
                            <Info
                                size={19}
                                className="mt-0.5 shrink-0 text-[#A87945]"
                            />

                            <div>
                                <p className="text-sm font-semibold text-[#344C3D]">
                                    Demo mode — no device connected
                                </p>

                                <p className="mt-1 text-xs leading-5 text-[#77796F]">
                                    These readings are simulated examples, not actual
                                    measurements from you or a smartwatch. Recommendations
                                    using them are demonstrations, not medical advice.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Heart rate"
                                value={String(data.heartRateBpm)}
                                unit="BPM"
                                detail="Illustrative reading"
                                icon={<HeartPulse size={21} />}
                                iconStyle="bg-rose-50 text-rose-600"
                            />

                            <MetricCard
                                title="Daily steps"
                                value={data.steps.toLocaleString()}
                                unit="steps"
                                detail={`${stepProgress}% of ${data.dailyStepGoal.toLocaleString()}-step goal`}
                                icon={<Footprints size={21} />}
                                iconStyle="bg-blue-50 text-blue-600"
                            />

                            <MetricCard
                                title="Sleep duration"
                                value={data.sleepLabel}
                                unit=""
                                detail="Illustrative duration"
                                icon={<Moon size={21} />}
                                iconStyle="bg-violet-50 text-violet-600"
                            />

                            <MetricCard
                                title="Active calories"
                                value={String(data.activeCalories)}
                                unit="kcal"
                                detail="Sample activity estimate"
                                icon={<Flame size={21} />}
                                iconStyle="bg-orange-50 text-orange-600"
                            />
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                            <div className="rounded-3xl border border-[#344C3D]/10 bg-white p-5 sm:p-7">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="font-serif text-xl font-semibold text-[#344C3D]">
                                            Weekly activity
                                        </h2>

                                        <p className="mt-1 text-xs text-[#77796F]">
                                            Example daily step counts
                                        </p>
                                    </div>

                                    <CalendarDays
                                        size={21}
                                        className="text-[#81947B]"
                                    />
                                </div>

                                <div className="mt-8 flex h-44 items-end justify-between gap-2">
                                    {data.weeklyActivity.map((item) => (
                                        <div
                                            key={item.day}
                                            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                                        >
                      <span className="text-[10px] text-[#77796F] sm:text-xs">
                        {(item.steps / 1000).toFixed(1)}k
                      </span>

                                            <div className="flex h-32 w-full items-end justify-center">
                                                <div
                                                    title={`${item.steps.toLocaleString()} sample steps`}
                                                    className={`w-full max-w-10 rounded-t-lg ${
                                                        item.day === "Sun"
                                                            ? "bg-[#344C3D]"
                                                            : "bg-[#DCE3D5]"
                                                    }`}
                                                    style={{
                                                        height: `${Math.min(
                                                            100,
                                                            (item.steps / data.dailyStepGoal) * 100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <span className="text-[11px] text-[#77796F]">
                        {item.day}
                      </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-xl bg-[#F6F2E9] p-3 text-xs leading-5 text-[#77796F]">
                                    All chart values are illustrative sample data.
                                </div>
                            </div>

                            <div className="rounded-3xl border border-[#344C3D]/10 bg-white p-5 sm:p-7">
                                <h2 className="font-serif text-xl font-semibold text-[#344C3D]">
                                    Daily activity goal
                                </h2>

                                <p className="mt-1 text-xs text-[#77796F]">
                                    Illustrative progress toward{" "}
                                    {data.dailyStepGoal.toLocaleString()} steps
                                </p>

                                <div className="mt-8">
                                    <div className="flex items-end justify-between gap-2">
                    <span className="font-serif text-3xl font-semibold text-[#344C3D]">
                      {data.steps.toLocaleString()}
                    </span>

                                        <span className="text-sm text-[#77796F]">
                      / {data.dailyStepGoal.toLocaleString()} steps
                    </span>
                                    </div>

                                    <div
                                        className="mt-4 h-3 overflow-hidden rounded-full bg-[#EBEEE5]"
                                        role="progressbar"
                                        aria-label="Illustrative daily steps goal"
                                        aria-valuenow={stepProgress}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    >
                                        <div
                                            className="h-full rounded-full bg-[#81947B]"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (data.steps / data.dailyStepGoal) * 100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="mt-3 text-xs text-[#77796F]">
                                        {stepsRemaining.toLocaleString()} sample steps remaining
                                        to the illustrative goal.
                                    </p>
                                </div>

                                <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#EBEEE5]/70 p-4">
                                    <ShieldCheck
                                        size={20}
                                        className="mt-0.5 shrink-0 text-[#81947B]"
                                    />

                                    <p className="text-xs leading-5 text-[#596458]">
                                        No wearable measurements are collected or sent to the
                                        backend. This demo stores its enable/disable preference
                                        in this browser. The shared sample data can be used by
                                        the frontend recommendation logic.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

function MetricCard({
                        title,
                        value,
                        unit,
                        detail,
                        icon,
                        iconStyle,
                    }: {
    title: string;
    value: string;
    unit: string;
    detail: string;
    icon: ReactNode;
    iconStyle: string;
}) {
    return (
        <div className="rounded-2xl border border-[#344C3D]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#77796F]">{title}</p>

                <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${iconStyle}`}
                >
                    {icon}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-2">
        <span className="font-serif text-3xl font-semibold text-[#344C3D]">
          {value}
        </span>

                {unit && (
                    <span className="text-xs text-[#77796F]">{unit}</span>
                )}
            </div>

            <p className="mt-2 text-xs text-[#77796F]">{detail}</p>
        </div>
    );
}
