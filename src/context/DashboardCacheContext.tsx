
/**
 * DashboardCacheContext
 *
 * Provides a stale-while-revalidate cache for the three dashboard API calls:
 *   /api/dashboard/me
 *   /api/health-tracking/me?date=<today>
 *   /api/health-tracking/weight-history
 *   /api/health-tracking/goal-progress
 *
 * Data is shared across all consumers so navigating back to the Dashboard
 * shows cached data instantly and only refetches when the cache is stale
 * (older than STALE_MS) or when invalidate() is called after a mutation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "../api/client";

// ─── Types (mirrored from DashboardPage so the cache owns them) ────────────

export interface MlFactor {
  feature: string;
  value: string | number;
  impact: number;
}

export interface MlRiskResult {
  risk_level: string;
  probabilities: Record<string, number>;
  top_factors: MlFactor[];
  plainExplanation?: string | null;
}

export interface MlResult {
  bmi: number;
  diabetes: MlRiskResult;
  heart: MlRiskResult;
  model: string;
  explainability: string;
  data_notice: string;
}

export interface DashboardData {
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

export interface DailyLog {
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

export interface GoalProgress {
  available: boolean;
  goal?: string;
  startingWeightKg?: string | number | null;
  targetWeightKg?: string | number | null;
  currentWeightKg?: number | string | null;
  progressPercent?: number | null;
  remainingKg?: number | null;
  message?: string;
}

export interface DashboardSnapshot {
  dashboard: DashboardData;
  todayLog: DailyLog;
  weightHistory: WeightRecord[];
  goalData: GoalProgress;
  fetchedAt: number; // Date.now()
  today: string;     // YYYY-MM-DD the data belongs to
}

// ─── Cache config ──────────────────────────────────────────────────────────

/** Re-fetch background refresh after this many ms (5 minutes). */
const STALE_MS = 5 * 60 * 1000;

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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Your session may have expired. Please sign in again.");
    }
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

async function fetchAll(today: string): Promise<DashboardSnapshot> {
  const [dashboard, todayLog, weightHistory, goalData] = await Promise.all([
    fetchJson<DashboardData>("/api/dashboard/me"),
    fetchJson<DailyLog>(`/api/health-tracking/me?date=${today}`),
    fetchJson<WeightRecord[]>("/api/health-tracking/weight-history"),
    fetchJson<GoalProgress>("/api/health-tracking/goal-progress"),
  ]);

  const cleanHistory = Array.isArray(weightHistory)
    ? weightHistory.filter(
        (item) =>
          Number.isFinite(Number(item.weightKg)) && Boolean(item.date)
      )
    : [];

  return {
    dashboard,
    todayLog,
    weightHistory: cleanHistory,
    goalData,
    fetchedAt: Date.now(),
    today,
  };
}

// ─── Context ───────────────────────────────────────────────────────────────

interface DashboardCacheState {
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  error: string;
}

interface DashboardCacheContextValue extends DashboardCacheState {
  /** Call this to warm the cache (e.g. right after login). */
  prefetch: () => void;
  /** Call after a mutation (save log, update assessment, etc.) to force refresh. */
  invalidate: () => void;
  /** Reload – shows loading state if no cached data yet, background if cached. */
  reload: () => Promise<void>;
}

const DashboardCacheContext = createContext<DashboardCacheContextValue | null>(null);

export function DashboardCacheProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardCacheState>({
    snapshot: null,
    loading: false,
    error: "",
  });

  // Ref to avoid running multiple concurrent fetches.
  const inflightRef = useRef<Promise<void> | null>(null);
  // Ref to hold latest snapshot without causing re-renders in effects.
  const snapshotRef = useRef<DashboardSnapshot | null>(null);

  const doFetch = useCallback(
    async (showLoading: boolean): Promise<void> => {
      if (showLoading) {
        setState((prev) => ({ ...prev, loading: true, error: "" }));
      }

      const today = getToday();

      try {
        const snapshot = await fetchAll(today);
        snapshotRef.current = snapshot;
        setState({ snapshot, loading: false, error: "" });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not connect to the dashboard service.";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    },
    []
  );

  const fetchIfNeeded = useCallback(
    (forceShowLoading = false): void => {
      const snap = snapshotRef.current;
      const today = getToday();
      const isStale =
        !snap ||
        snap.today !== today ||
        Date.now() - snap.fetchedAt > STALE_MS;

      if (!isStale && !forceShowLoading) return;

      // Don't start another fetch if one is in-flight.
      if (inflightRef.current) return;

      const showLoading = forceShowLoading || !snap;
      inflightRef.current = doFetch(showLoading).finally(() => {
        inflightRef.current = null;
      });
    },
    [doFetch]
  );

  const prefetch = useCallback((): void => {
    fetchIfNeeded(false);
  }, [fetchIfNeeded]);

  const invalidate = useCallback((): void => {
    // Clear the snapshot so the next load shows the loading state briefly.
    snapshotRef.current = null;
    setState((prev) => ({ ...prev, snapshot: null }));
    fetchIfNeeded(true);
  }, [fetchIfNeeded]);

  const reload = useCallback(async (): Promise<void> => {
    if (inflightRef.current) {
      await inflightRef.current;
      return;
    }
    const p = doFetch(!snapshotRef.current);
    inflightRef.current = p.finally(() => { inflightRef.current = null; });
    await p;
  }, [doFetch]);

  const value: DashboardCacheContextValue = {
    ...state,
    prefetch,
    invalidate,
    reload,
  };

  return (
    <DashboardCacheContext.Provider value={value}>
      {children}
    </DashboardCacheContext.Provider>
  );
}

export function useDashboardCache(): DashboardCacheContextValue {
  const ctx = useContext(DashboardCacheContext);
  if (!ctx) {
    throw new Error(
      "useDashboardCache must be used inside <DashboardCacheProvider>"
    );
  }
  return ctx;
}

export { EMPTY_DASHBOARD, EMPTY_LOG, getToday };
