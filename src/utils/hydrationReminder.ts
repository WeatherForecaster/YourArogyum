/**
 * Hydration reminder utilities and state helpers (Synopsis Module 4.1.3).
 *
 * Provides:
 * - A fixed daily water target (2000 ml = 8 × 250 ml glasses).
 * - User-configurable time-window and interval scheduling logic.
 * - Browser Notification API integration with in-page toast/banner fallback.
 * - LocalStorage persistence (toggle + schedule settings shared across pages).
 */

// ─── Storage keys ────────────────────────────────────────────────────────────
export const HYDRATION_REMINDER_STORAGE_KEY =
  "yourarogyum_hydration_reminder_enabled";
export const HYDRATION_LAST_REMINDER_KEY =
  "yourarogyum_hydration_last_reminder_time";
export const HYDRATION_START_TIME_KEY =
  "yourarogyum_hydration_start_time"; // "HH:MM"
export const HYDRATION_END_TIME_KEY =
  "yourarogyum_hydration_end_time";   // "HH:MM"
export const HYDRATION_INTERVAL_KEY =
  "yourarogyum_hydration_interval";   // "1" | "2" | "3"

// ─── Water target ─────────────────────────────────────────────────────────────
/**
 * Daily water target in millilitres used across DietPlanPage and DashboardPage.
 * Kept as a named constant so a single change propagates everywhere.
 */
export const DEFAULT_WATER_TARGET_ML = 2000;

/**
 * Returns the daily water target in millilitres.
 * Uses DietPlanPage's glass-based tracker as the single authoritative source.
 * No weight-formula or intake-band estimation is applied.
 */
export function getDailyWaterTargetMl(): number {
  return DEFAULT_WATER_TARGET_ML;
}

// ─── Schedule type ─────────────────────────────────────────────────────────────
export interface HydrationSchedule {
  /** 24-hour start hour, e.g. 8 for 8 AM. */
  startHour: number;
  /** 24-hour end hour (exclusive), e.g. 21 for 9 PM. */
  endHour: number;
  /** Interval between reminders in hours: 1, 2, or 3. */
  intervalHours: 1 | 2 | 3;
}

export const DEFAULT_SCHEDULE: HydrationSchedule = {
  startHour: 8,
  endHour: 21,
  intervalHours: 2,
};

/**
 * Parses a stored "HH:MM" string into an integer hour (0-23).
 * Returns the fallback if the string is absent or invalid.
 */
function parseStoredHour(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const hour = parseInt(raw.split(":")[0], 10);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

/**
 * Reads the schedule settings from localStorage.
 * Falls back to DEFAULT_SCHEDULE for any missing or invalid entry.
 */
export function loadSchedule(): HydrationSchedule {
  if (typeof window === "undefined") return DEFAULT_SCHEDULE;

  const startHour = parseStoredHour(
    localStorage.getItem(HYDRATION_START_TIME_KEY),
    DEFAULT_SCHEDULE.startHour,
  );
  const endHour = parseStoredHour(
    localStorage.getItem(HYDRATION_END_TIME_KEY),
    DEFAULT_SCHEDULE.endHour,
  );
  const rawInterval = Number(localStorage.getItem(HYDRATION_INTERVAL_KEY));
  const intervalHours: 1 | 2 | 3 =
    rawInterval === 1 || rawInterval === 2 || rawInterval === 3
      ? rawInterval
      : DEFAULT_SCHEDULE.intervalHours;

  return { startHour, endHour, intervalHours };
}

/**
 * Persists schedule settings to localStorage.
 * Stores times as "HH:MM" strings for use by <input type="time">.
 */
export function saveSchedule(schedule: HydrationSchedule): void {
  if (typeof window === "undefined") return;
  const pad = (n: number) => String(n).padStart(2, "0");
  localStorage.setItem(
    HYDRATION_START_TIME_KEY,
    `${pad(schedule.startHour)}:00`,
  );
  localStorage.setItem(
    HYDRATION_END_TIME_KEY,
    `${pad(schedule.endHour)}:00`,
  );
  localStorage.setItem(HYDRATION_INTERVAL_KEY, String(schedule.intervalHours));
}

// ─── Scheduling logic ──────────────────────────────────────────────────────────

/**
 * Checks whether the current time is inside the user's chosen reminder window.
 * Returns false if endHour <= startHour (invalid range — validated in UI too).
 */
export function isReminderWindowActive(
  now: Date = new Date(),
  schedule: HydrationSchedule = DEFAULT_SCHEDULE,
): boolean {
  if (schedule.endHour <= schedule.startHour) return false;
  const hour = now.getHours();
  return hour >= schedule.startHour && hour < schedule.endHour;
}

/**
 * Determines whether a reminder is currently due:
 * - Must be inside the user's configured time window.
 * - User must be strictly below today's water target.
 * - At least `intervalHours` must have elapsed since the last reminder.
 */
export function shouldSendHydrationReminder(
  currentWaterMl: number,
  targetWaterMl: number,
  lastReminderTimeMs: number,
  schedule: HydrationSchedule = DEFAULT_SCHEDULE,
  now: Date = new Date(),
): boolean {
  if (!isReminderWindowActive(now, schedule)) {
    return false;
  }

  if (currentWaterMl >= targetWaterMl) {
    return false;
  }

  const intervalMs = schedule.intervalHours * 60 * 60 * 1000;
  return now.getTime() - lastReminderTimeMs >= intervalMs;
}

// ─── Notification dispatch ─────────────────────────────────────────────────────

/**
 * Requests Notification permission only if currently "default".
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  return Notification.permission;
}

/**
 * Dispatches a hydration notification through the browser API if granted,
 * or triggers the in-page banner callback if denied/unsupported.
 */
export function dispatchHydrationAlert({
  currentWaterMl,
  targetWaterMl,
  onInPageToast,
}: {
  currentWaterMl: number;
  targetWaterMl: number;
  onInPageToast?: (message: string) => void;
}): boolean {
  const remainingMl = Math.max(0, targetWaterMl - currentWaterMl);
  const message = `You've logged ${currentWaterMl} ml of your ${targetWaterMl} ml daily goal (${remainingMl} ml remaining). Drink a glass of water to stay hydrated!`;

  let usedBrowserNotification = false;

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification("Hydration Reminder 💧", {
          body: message,
          icon: "/favicon.ico",
        });
        usedBrowserNotification = true;
      } catch {
        usedBrowserNotification = false;
      }
    }
  }

  // If browser notification wasn't shown, trigger in-page toast/banner fallback
  if (!usedBrowserNotification && onInPageToast) {
    onInPageToast(message);
  }

  // Record timestamp in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(HYDRATION_LAST_REMINDER_KEY, String(Date.now()));
  }

  return usedBrowserNotification;
}
