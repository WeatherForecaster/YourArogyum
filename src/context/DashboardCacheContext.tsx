import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "../api/client";
import {
  getDailyLog,
  getGoalProgress,
  getWeightHistory,
  type DailyLogResponse,
  type GoalProgressResponse,
  type WeightRecord,
} from "../services/healthTracking";

export type { DailyLogResponse, GoalProgressResponse, WeightRecord };

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

export const EMPTY_DASHBOARD: DashboardData = {
  assessmentCompleted: false,
  bmi: null,
  bmiCategory: null,
  dailyCalories: null,
  proteinTargetGrams: null,
  profile: null,
};

export const EMPTY_LOG: DailyLogResponse = {
  logDate: "",
  logged: false,
  proteinGrams: null,
  waterMl: null,
  sleepHours: null,
  activityMinutes: null,
  weightKg: null,
};

export function getTodayDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STALE_TIME_MS = 3 * 60 * 1000; // 3 minutes stale-while-revalidate threshold

interface DashboardCacheContextValue {
  dashboard: DashboardData;
  todayLog: DailyLogResponse;
  weightHistory: WeightRecord[];
  goalData: GoalProgressResponse;
  loading: boolean;
  isRevalidating: boolean;
  error: string;
  hasLoaded: boolean;
  fetchDashboardData: (force?: boolean) => Promise<void>;
  invalidateDashboardCache: () => void;
  resetDashboardCache: () => void;
  updateTodayLog: (log: DailyLogResponse) => void;
  prefetchDashboardData: () => Promise<void>;
}

const DashboardCacheContext = createContext<DashboardCacheContextValue | null>(
  null
);

export function DashboardCacheProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [todayLog, setTodayLog] = useState<DailyLogResponse>(EMPTY_LOG);
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [goalData, setGoalData] = useState<GoalProgressResponse>({
    available: false,
  });

  const [loading, setLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInProgressRef = useRef<Promise<void> | null>(null);
  const lastFetchedRef = useRef<number>(0);
  const hasLoadedRef = useRef<boolean>(false);

  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now();
    const isStale = now - lastFetchedRef.current > STALE_TIME_MS;

    if (hasLoadedRef.current && !isStale && !force) {
      return;
    }

    if (fetchInProgressRef.current) {
      return fetchInProgressRef.current;
    }

    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setIsRevalidating(true);
    }
    setError("");

    const promise = (async () => {
      try {
        const today = getTodayDateString();

        // Fire all independent requests in parallel via Promise.all
        const [dashboardRes, todayRes, historyRes, goalRes] = await Promise.all(
          [
            apiRequest<DashboardData>("/api/dashboard/me"),
            getDailyLog(today).catch(() => EMPTY_LOG),
            getWeightHistory().catch(() => [] as WeightRecord[]),
            getGoalProgress().catch(
              () => ({ available: false }) as GoalProgressResponse
            ),
          ]
        );

        setDashboard(dashboardRes);
        setTodayLog(todayRes);
        setWeightHistory(
          Array.isArray(historyRes)
            ? historyRes.filter(
                (item) =>
                  Number.isFinite(Number(item.weightKg)) && Boolean(item.date)
              )
            : []
        );
        setGoalData(goalRes);
        hasLoadedRef.current = true;
        setHasLoaded(true);
        lastFetchedRef.current = Date.now();
      } catch (err) {
        if (!hasLoadedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect to the dashboard service."
          );
        }
      } finally {
        setLoading(false);
        setIsRevalidating(false);
        fetchInProgressRef.current = null;
      }
    })();

    fetchInProgressRef.current = promise;
    return promise;
  }, []);

  const invalidateDashboardCache = useCallback(() => {
    lastFetchedRef.current = 0;
    void fetchDashboardData(true);
  }, [fetchDashboardData]);

  const resetDashboardCache = useCallback(() => {
    lastFetchedRef.current = 0;
    hasLoadedRef.current = false;
    setHasLoaded(false);
    setDashboard(EMPTY_DASHBOARD);
    setTodayLog(EMPTY_LOG);
    setWeightHistory([]);
    setGoalData({ available: false });
    setError("");
  }, []);

  const updateTodayLog = useCallback((log: DailyLogResponse) => {
    setTodayLog(log);
  }, []);

  const prefetchDashboardData = useCallback(async () => {
    return fetchDashboardData(true);
  }, [fetchDashboardData]);

  return (
    <DashboardCacheContext.Provider
      value={{
        dashboard,
        todayLog,
        weightHistory,
        goalData,
        loading,
        isRevalidating,
        error,
        hasLoaded,
        fetchDashboardData,
        invalidateDashboardCache,
        resetDashboardCache,
        updateTodayLog,
        prefetchDashboardData,
      }}
    >
      {children}
    </DashboardCacheContext.Provider>
  );
}

export function useDashboardCache(): DashboardCacheContextValue {
  const context = useContext(DashboardCacheContext);
  if (!context) {
    throw new Error(
      "useDashboardCache must be used within a DashboardCacheProvider"
    );
  }
  return context;
}
