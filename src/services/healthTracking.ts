import { apiRequest } from "../api/client";

export interface DailyLogPayload {
  proteinGrams?: number | null;
  waterMl?: number | null;
  sleepHours?: number | null;
  activityMinutes?: number | null;
  weightKg?: number | null;
}

export interface DailyLogResponse {
  logDate: string;
  logged: boolean;
  proteinGrams: number | null;
  waterMl: number | null;
  sleepHours: number | null;
  activityMinutes: number | null;
  weightKg: number | null;
}

export interface WeightRecord {
  date: string;
  weightKg: number;
}

export interface GoalProgressResponse {
  available: boolean;
  goal?: string;
  startingWeightKg?: number | string | null;
  targetWeightKg?: number | string | null;
  currentWeightKg?: number | string | null;
  progressPercent?: number | null;
  remainingKg?: number | null;
  message?: string;
}

export const LEGACY_STORAGE_KEYS = {
  weights: "yourarogyum_progress_weights",
  activities: "yourarogyum_progress_activities",
  target: "yourarogyum_progress_target",
};

export const ARCHIVE_KEY_PREFIX = "yourarogyum_legacy_archive_";

/**
 * Safely inspects and archives legacy unscoped localStorage keys into a
 * timestamped backup key, then removes the active keys.
 *
 * This prevents cross-account data leakage while preserving potentially
 * recoverable data without assigning it to the wrong account.
 */
export function archiveAndClearLegacyStorage(): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let hasLegacyData = false;
    const archivePayload: Record<string, unknown> = {
      archivedAt: new Date().toISOString(),
      note: "Unscoped legacy data preserved for manual recovery. Not associated with any authenticated account.",
    };

    for (const [name, key] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        hasLegacyData = true;
        try {
          archivePayload[name] = JSON.parse(raw);
        } catch {
          archivePayload[name] = raw;
        }
        localStorage.removeItem(key);
      }
    }

    if (hasLegacyData) {
      const archiveKey = `${ARCHIVE_KEY_PREFIX}${timestamp}`;
      localStorage.setItem(archiveKey, JSON.stringify(archivePayload));
      console.info(
        `[YourArogyum] Legacy progress data safely archived to '${archiveKey}' and active keys cleared.`
      );
    }
  } catch (err) {
    console.warn("[YourArogyum] Error archiving legacy storage:", err);
  }
}

/**
 * Fetches the daily health log for a specific date (YYYY-MM-DD).
 */
export function getDailyLog(date: string): Promise<DailyLogResponse> {
  return apiRequest<DailyLogResponse>(`/api/health-tracking/me?date=${date}`, {
    method: "GET",
  });
}

/**
 * Saves or updates today's or a past date's daily health metrics in the database.
 */
export function saveDailyLog(
  date: string,
  payload: DailyLogPayload
): Promise<DailyLogResponse> {
  return apiRequest<DailyLogResponse>(`/api/health-tracking/me?date=${date}`, {
    method: "PUT",
    body: payload,
  });
}

/**
 * Fetches the weight history for the authenticated user between two dates.
 */
export function getWeightHistory(
  from?: string,
  to?: string
): Promise<WeightRecord[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  return apiRequest<WeightRecord[]>(
    `/api/health-tracking/weight-history${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );
}

/**
 * Fetches the goal progress calculated by the backend.
 */
export function getGoalProgress(): Promise<GoalProgressResponse> {
  return apiRequest<GoalProgressResponse>("/api/health-tracking/goal-progress", {
    method: "GET",
  });
}
