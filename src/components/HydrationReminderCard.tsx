import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Droplets,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import {
  DEFAULT_SCHEDULE,
  HYDRATION_LAST_REMINDER_KEY,
  HYDRATION_REMINDER_STORAGE_KEY,
  type HydrationSchedule,
  dispatchHydrationAlert,
  isReminderWindowActive,
  loadSchedule,
  requestNotificationPermission,
  saveSchedule,
  shouldSendHydrationReminder,
} from "../utils/hydrationReminder";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Formats an integer hour as "HH:00" for <input type="time">. */
function hourToTimeValue(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Parses "HH:MM" from <input type="time"> to an integer hour. */
function timeValueToHour(value: string): number {
  const h = parseInt(value.split(":")[0], 10);
  return Number.isFinite(h) ? h : 0;
}

/** Formats a 24-hour integer as a friendly AM/PM label. */
function friendlyHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface HydrationReminderCardProps {
  currentWaterMl: number;
  targetWaterMl: number;
  onAddWater?: (amountMl: number) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function HydrationReminderCard({
  currentWaterMl,
  targetWaterMl,
  onAddWater,
  className = "",
}: HydrationReminderCardProps) {
  // ── Toggle ──
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(HYDRATION_REMINDER_STORAGE_KEY) === "true";
  });

  // ── Schedule settings (loaded from localStorage, shared across pages) ──
  const [schedule, setSchedule] = useState<HydrationSchedule>(() => {
    if (typeof window === "undefined") return DEFAULT_SCHEDULE;
    return loadSchedule();
  });

  // Validation: end must be strictly after start
  const scheduleInvalid = schedule.endHour <= schedule.startHour;

  // ── Notification permission ──
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  });

  // ── Toast / in-page banner ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Settings panel open state ──
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Cross-tab sync for toggle ──
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HYDRATION_REMINDER_STORAGE_KEY) {
        setEnabled(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ── Periodic reminder checker (every 30 s while tab is active) ──
  useEffect(() => {
    if (!enabled || scheduleInvalid) return;

    const checkAndTrigger = () => {
      const lastReminder = Number(
        localStorage.getItem(HYDRATION_LAST_REMINDER_KEY) || 0,
      );
      if (
        shouldSendHydrationReminder(
          currentWaterMl,
          targetWaterMl,
          lastReminder,
          schedule,
        )
      ) {
        dispatchHydrationAlert({
          currentWaterMl,
          targetWaterMl,
          onInPageToast: (msg) => setToastMessage(msg),
        });
      }
    };

    checkAndTrigger();
    const id = setInterval(checkAndTrigger, 30_000);
    return () => clearInterval(id);
  }, [enabled, scheduleInvalid, currentWaterMl, targetWaterMl, schedule]);

  // ── Handlers ──

  const handleToggle = async () => {
    const nextState = !enabled;

    if (nextState) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);

      setEnabled(true);
      localStorage.setItem(HYDRATION_REMINDER_STORAGE_KEY, "true");

      if (!scheduleInvalid) {
        const lastReminder = Number(
          localStorage.getItem(HYDRATION_LAST_REMINDER_KEY) || 0,
        );
        if (
          shouldSendHydrationReminder(
            currentWaterMl,
            targetWaterMl,
            lastReminder,
            schedule,
          )
        ) {
          dispatchHydrationAlert({
            currentWaterMl,
            targetWaterMl,
            onInPageToast: (msg) => setToastMessage(msg),
          });
        } else if (perm === "denied") {
          setToastMessage(
            "Desktop notifications are blocked by your browser. We'll show in-app reminders instead.",
          );
        }
      }
    } else {
      setEnabled(false);
      localStorage.setItem(HYDRATION_REMINDER_STORAGE_KEY, "false");
      setSettingsOpen(false);
    }
  };

  const handleScheduleChange = (patch: Partial<HydrationSchedule>) => {
    setSchedule((prev) => {
      const next = { ...prev, ...patch };
      saveSchedule(next);
      return next;
    });
  };

  const handleManualTest = () => {
    dispatchHydrationAlert({
      currentWaterMl,
      targetWaterMl,
      onInPageToast: (msg) => setToastMessage(msg),
    });
  };

  // ── Derived display values ──

  const progressPercent = Math.min(
    100,
    Math.round((currentWaterMl / Math.max(1, targetWaterMl)) * 100),
  );
  const isTargetReached = currentWaterMl >= targetWaterMl;
  const inWindow = isReminderWindowActive(new Date(), schedule);

  const activeLabel = `Active (${friendlyHour(schedule.startHour)} – ${friendlyHour(schedule.endHour)})`;
  const descLine = `every ${schedule.intervalHours}h between ${friendlyHour(schedule.startHour)} – ${friendlyHour(schedule.endHour)}`;

  // ── Render ──

  return (
    <>
      {/* ── In-page Toast / Banner ── */}
      {toastMessage && (
        <aside
          role="alert"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3.5 rounded-2xl border border-[#C5D0BE] bg-[#FCFAF5] p-4 shadow-xl shadow-[#344C3D]/15 sm:top-5 sm:bottom-auto"
        >
          <div className="rounded-xl bg-[#DCE3D5] p-2.5 text-[#344C3D]">
            <Droplets size={22} className="animate-bounce" />
          </div>
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#344C3D]">
              <span>Hydration Reminder</span>
              <span className="text-xs font-normal text-[#77796E]">
                (every {schedule.intervalHours}h)
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#556353]">
              {toastMessage}
            </p>
            {onAddWater && !isTargetReached && (
              <button
                type="button"
                onClick={() => {
                  onAddWater(250);
                  setToastMessage(null);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#344C3D] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#263A2E]"
              >
                + Log 250 ml glass
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss reminder"
            className="rounded-lg p-1 text-[#77796E] transition hover:bg-[#F0F2EB] hover:text-[#344C3D]"
          >
            <X size={18} />
          </button>
        </aside>
      )}

      {/* ── Main Card ── */}
      <section
        aria-label="Hydration Reminders"
        className={`rounded-2xl border border-[#E1E2D7] bg-[#FCFAF5] p-5 transition sm:p-6 ${className}`}
      >
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`rounded-2xl p-3 ${
                enabled
                  ? "bg-[#DCE3D5] text-[#344C3D]"
                  : "bg-[#EFEFEA] text-[#85887E]"
              }`}
            >
              <Droplets size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-[#344C3D]">
                  Hydration Reminders
                </h3>
                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    !enabled
                      ? "bg-[#EFEFEA] text-[#77796E]"
                      : scheduleInvalid
                        ? "bg-red-100 text-red-700"
                        : isTargetReached
                          ? "bg-emerald-100 text-emerald-800"
                          : inWindow
                            ? "bg-[#DCE3D5] text-[#344C3D]"
                            : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {!enabled ? (
                    <><BellOff size={12} /> Off</>
                  ) : scheduleInvalid ? (
                    <><X size={12} /> Invalid schedule</>
                  ) : isTargetReached ? (
                    <><CheckCircle2 size={12} /> Target met</>
                  ) : inWindow ? (
                    <><Bell size={12} /> {activeLabel}</>
                  ) : (
                    <><Clock size={12} /> Outside window</>
                  )}
                </span>
              </div>

              {/* Description line */}
              <p className="mt-1 text-xs text-[#77796E]">
                {!enabled ? (
                  "Get reminded at your chosen interval until your water target is reached."
                ) : scheduleInvalid ? (
                  "End time must be later than start time."
                ) : isTargetReached ? (
                  "Goal reached today! Keep up the good work."
                ) : notificationPermission === "granted" ? (
                  `Reminds ${descLine} via browser notifications.`
                ) : (
                  `Reminds ${descLine} via in-page alert.`
                )}
              </p>
            </div>
          </div>

          {/* Toggle + actions */}
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {enabled && (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  aria-expanded={settingsOpen}
                  aria-label="Toggle schedule settings"
                  className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    settingsOpen
                      ? "border-[#344C3D] bg-[#DCE3D5] text-[#344C3D]"
                      : "border-[#D9DED2] bg-white text-[#4D5A4B] hover:bg-[#F3F5EF]"
                  }`}
                >
                  <Settings2 size={13} />
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={handleManualTest}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#D9DED2] bg-white px-3 py-1.5 text-xs font-medium text-[#4D5A4B] transition hover:bg-[#F3F5EF]"
                  title="Trigger a test reminder notification now"
                >
                  <Sparkles size={13} />
                  Test alert
                </button>
              </>
            )}

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="hydration-reminder-toggle"
                checked={enabled}
                onChange={handleToggle}
                className="peer sr-only"
                aria-label="Toggle hydration reminders"
              />
              <div className="peer h-7 w-12 rounded-full bg-[#D9DED2] transition after:absolute after:top-[3px] after:left-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-[#344C3D] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#344C3D]/30" />
            </label>
          </div>
        </div>

        {/* ── Schedule Settings Panel (visible when toggle is ON) ── */}
        {enabled && settingsOpen && (
          <div className="mt-4 rounded-xl border border-[#E1E2D7] bg-[#F6F2E9] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#626B5E]">
              Reminder Schedule
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Start time */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="hydration-start-time"
                  className="text-xs font-medium text-[#556353]"
                >
                  Start time
                </label>
                <input
                  id="hydration-start-time"
                  type="time"
                  step="3600"
                  value={hourToTimeValue(schedule.startHour)}
                  onChange={(e) =>
                    handleScheduleChange({
                      startHour: timeValueToHour(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-[#D9DED2] bg-white px-3 py-2 text-sm text-[#344C3D] focus:outline-none focus:ring-2 focus:ring-[#344C3D]/30"
                />
              </div>

              {/* End time */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="hydration-end-time"
                  className="text-xs font-medium text-[#556353]"
                >
                  End time
                </label>
                <input
                  id="hydration-end-time"
                  type="time"
                  step="3600"
                  value={hourToTimeValue(schedule.endHour)}
                  onChange={(e) =>
                    handleScheduleChange({
                      endHour: timeValueToHour(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-[#D9DED2] bg-white px-3 py-2 text-sm text-[#344C3D] focus:outline-none focus:ring-2 focus:ring-[#344C3D]/30"
                />
              </div>

              {/* Interval */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="hydration-interval"
                  className="text-xs font-medium text-[#556353]"
                >
                  Reminder interval
                </label>
                <select
                  id="hydration-interval"
                  value={schedule.intervalHours}
                  onChange={(e) =>
                    handleScheduleChange({
                      intervalHours: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                  className="w-full rounded-lg border border-[#D9DED2] bg-white px-3 py-2 text-sm text-[#344C3D] focus:outline-none focus:ring-2 focus:ring-[#344C3D]/30"
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={3}>Every 3 hours</option>
                </select>
              </div>
            </div>

            {/* Validation message */}
            {scheduleInvalid && (
              <p
                role="alert"
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                <X size={13} />
                End time must be later than start time. Reminders are paused
                until corrected.
              </p>
            )}
          </div>
        )}

        {/* ── Progress Bar ── */}
        <div className="mt-4 border-t border-[#EAECE4] pt-3.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#626B5E]">
            <span>Today's intake: {currentWaterMl} ml</span>
            <span>Target: {targetWaterMl} ml ({progressPercent}%)</span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAECE4]"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isTargetReached ? "bg-emerald-600" : "bg-[#4A6B56]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
