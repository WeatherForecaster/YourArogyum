
import { useCallback, useEffect, useState } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AssessmentPage from "./pages/AssessmentPage";
import type { HomeSection } from "./types/navigation";
import DashboardPage from "./pages/DashboardPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import DietPlanPage from "./pages/DietPlanPage";
import WorkoutPlanPage from "./pages/WorkoutPlanPage";
import ProgressPage from "./pages/ProgressPage";
import ProfilePage from "./pages/ProfilePage";
import AppLayout from "./components/AppLayout";
import WearableTrackerPage from "./pages/WearableTrackerPage";

import { API_BASE_URL } from "./api/client";
import {
  getMyAssessment,
  type AssessmentData,
} from "./services/assessment";
import { archiveAndClearLegacyStorage } from "./services/healthTracking";
import { setWearableDemoEnabled } from "./services/wearableDemo";

type ModalType = "login" | "register" | null;
type WellnessMode = "manual" | "tracker";

type AppPage = "landing" | "mode-selection" | "assessment" | HomeSection;

const AUTH_URL = `${API_BASE_URL}/api/auth`;
const WELLNESS_MODE_STORAGE_KEY = "yourarogyum:wellness-mode:v1";

function readStoredWellnessMode(): WellnessMode | null {
  try {
    const savedMode = localStorage.getItem(WELLNESS_MODE_STORAGE_KEY);

    if (savedMode === "manual" || savedMode === "tracker") {
      return savedMode;
    }
  } catch {
    // The app can still work when browser storage is unavailable.
  }

  return null;
}

function App() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentPage, setCurrentPage] = useState<AppPage>("landing");

  const [assessmentData, setAssessmentData] =
      useState<AssessmentData | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [pageError, setPageError] = useState("");
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);

  const [wellnessMode, setWellnessMode] =
      useState<WellnessMode | null>(() => readStoredWellnessMode());

  const loadAssessment = useCallback(async () => {
    const response = await getMyAssessment();

    setAssessmentData(response.assessment);
    setAssessmentCompleted(
        Boolean(response.completed && response.assessment)
    );

    return response.assessment;
  }, []);

  const handleModeSelection = useCallback(
      (mode: WellnessMode) => {
        setPageError("");

        try {
          localStorage.setItem(WELLNESS_MODE_STORAGE_KEY, mode);
        } catch {
          // Keep the selected mode for this session even if storage fails.
        }

        // Keep the existing wearable demo service in sync with the chosen mode.
        // Tracker values are simulated examples, not real device readings.
        setWearableDemoEnabled(mode === "tracker");

        setWellnessMode(mode);

        // New users still complete the assessment. Existing users continue
        // to their dashboard without having to repeat their assessment.
        if (assessmentCompleted && assessmentData) {
          setIsEditingAssessment(false);
          setCurrentPage("dashboard");
        } else {
          setCurrentPage("assessment");
        }
      },
      [assessmentCompleted, assessmentData]
  );

  useEffect(() => {
    let cancelled = false;

    // Safely archive legacy unscoped storage keys to prevent
    // old local health data from leaking between accounts.
    archiveAndClearLegacyStorage();

    async function restoreSession() {
      try {
        const response = await fetch(`${AUTH_URL}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            sessionStorage.removeItem("yourarogyum:diet-plan:v1");
            setAssessmentData(null);
            setAssessmentCompleted(false);
            setCurrentPage("landing");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
              `Unable to restore session (${response.status}).`
          );
        }

        await response.json();

        const assessment = await getMyAssessment();

        if (!cancelled) {
          setAssessmentData(assessment.assessment);

          const completed = Boolean(
              assessment.completed && assessment.assessment
          );

          setAssessmentCompleted(completed);

          // Ask for a mode the first time. Otherwise restore the
          // existing assessment/dashboard flow.
          if (!wellnessMode) {
            setCurrentPage("mode-selection");
          } else {
            setCurrentPage(completed ? "dashboard" : "assessment");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAssessmentData(null);
          setAssessmentCompleted(false);
          setCurrentPage("landing");
        }

        console.error("Session restoration failed:", error);
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [wellnessMode]);

  const handleLoginSuccess = useCallback(async () => {
    setPageError("");
    setActiveModal(null);

    try {
      const assessment = await loadAssessment();

      if (!wellnessMode) {
        setCurrentPage("mode-selection");
      } else {
        setCurrentPage(assessment ? "dashboard" : "assessment");
      }
    } catch (error) {
      setAssessmentData(null);
      setAssessmentCompleted(false);

      setPageError(
          error instanceof Error
              ? error.message
              : "Unable to load your health profile."
      );

      setCurrentPage("assessment");
    }
  }, [loadAssessment, wellnessMode]);

  const handleRegistrationSuccess = () => {
    sessionStorage.removeItem("yourarogyum:diet-plan:v1");

    setActiveModal(null);
    setAssessmentData(null);
    setAssessmentCompleted(false);
    setIsEditingAssessment(false);
    setPageError("");

    if (!wellnessMode) {
      setCurrentPage("mode-selection");
    } else {
      setCurrentPage("assessment");
    }
  };

  const handleAssessmentComplete = (data: AssessmentData) => {
    const wasEditing = isEditingAssessment;

    setAssessmentData(data);
    setAssessmentCompleted(true);
    setIsEditingAssessment(false);
    setPageError("");

    // Refresh the saved assessment from the backend.
    void loadAssessment();

    setCurrentPage(wasEditing ? "profile" : "dashboard");
  };

  // Profile page: edit the assessment using previously saved answers.
  const handleEditAssessment = async () => {
    setPageError("");

    try {
      const savedAssessment = await loadAssessment();

      if (!savedAssessment) {
        setIsEditingAssessment(false);
        setCurrentPage("assessment");
        return;
      }

      setIsEditingAssessment(true);
      setCurrentPage("assessment");
    } catch (error) {
      setPageError(
          error instanceof Error
              ? error.message
              : "Unable to load your saved assessment. Please try again."
      );
    }
  };

  const handleNavigate = (page: HomeSection) => {
    setPageError("");
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    setPageError("");

    try {
      const response = await fetch(`${AUTH_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setPageError("Logout failed. Please try again.");
        return;
      }
    } catch {
      setPageError("Unable to contact the server. Please try again.");
      return;
    }

    // Clear legacy account-related data. The mode preference is kept
    // as a browser preference so it does not need to be selected again.
    archiveAndClearLegacyStorage();
    sessionStorage.removeItem("yourarogyum:diet-plan:v1");

    setAssessmentData(null);
    setAssessmentCompleted(false);
    setIsEditingAssessment(false);
    setActiveModal(null);
    setCurrentPage("landing");
  };

  if (checkingSession) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F6F2E9]">
          <p className="text-sm text-[#77796F]">
            Preparing your wellness journey...
          </p>
        </main>
    );
  }

  const showAppLayout =
      currentPage === "dashboard" ||
      currentPage === "ai-assistant" ||
      currentPage === "diet-plan" ||
      currentPage === "workout-plan" ||
      currentPage === "progress" ||
      currentPage === "wearable-tracker" ||
      currentPage === "profile";

  return (
      <>
        {currentPage === "landing" && (
            <LandingPage
                onLogin={() => {
                  setPageError("");
                  setActiveModal("login");
                }}
                onRegister={() => {
                  setPageError("");
                  setActiveModal("register");
                }}
            />
        )}

        {currentPage === "mode-selection" && (
            <main className="flex min-h-screen items-center justify-center bg-[#F6F2E9] px-4 py-10">
              <section className="w-full max-w-4xl">
                <div className="mb-8 text-center">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#71836A]">
                    YourArogyum
                  </p>

                  <h1 className="text-3xl font-semibold tracking-tight text-[#25352B] sm:text-4xl">
                    How would you like to track your wellness?
                  </h1>

                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#77796F] sm:text-base">
                    Choose how YourArogyum should handle your routine activity
                    information. You can change this choice later.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <button
                      type="button"
                      onClick={() => handleModeSelection("manual")}
                      className="group rounded-3xl border border-[#DDD8CA] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#71836A] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#71836A] focus:ring-offset-2 sm:p-8"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0EEE5] text-2xl">
                      <span aria-hidden="true">✍️</span>
                    </div>

                    <h2 className="text-xl font-semibold text-[#25352B]">
                      Manual Mode
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[#77796F]">
                      Enter your information yourself and continue with your
                      existing assessment and planning workflow.
                    </p>

                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#52664F]">
                  Choose Manual Mode
                  <span aria-hidden="true">→</span>
                </span>
                  </button>

                  <button
                      type="button"
                      onClick={() => handleModeSelection("tracker")}
                      className="group rounded-3xl border border-[#C7D5C2] bg-[#EAF0E5] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#71836A] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#71836A] focus:ring-offset-2 sm:p-8"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
                      <span aria-hidden="true">⌚</span>
                    </div>

                    <h2 className="text-xl font-semibold text-[#25352B]">
                      Wearable Tracker Mode
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[#657162]">
                      Prefer tracker values for supported activity and sleep
                      information, so relevant recommendations can use those
                      values instead of asking you to enter them repeatedly.
                    </p>

                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#52664F]">
                  Choose Tracker Mode
                  <span aria-hidden="true">→</span>
                </span>
                  </button>
                </div>

                <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-[#77796F]">
                  Important: the current wearable values are simulated sample
                  data, not live measurements from your watch. Your initial
                  assessment may still ask for personal details the tracker
                  cannot provide, such as allergies, medical conditions and
                  individual goals.
                </p>
              </section>
            </main>
        )}

        {showAppLayout && (
            <AppLayout
                currentPage={currentPage as HomeSection}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
            >
              {currentPage === "dashboard" && (
                  <DashboardPage
                      assessmentData={assessmentData}
                      assessmentCompleted={assessmentCompleted}
                      onNavigate={handleNavigate}
                  />
              )}

              {currentPage === "ai-assistant" && (
                  <AIAssistantPage
                      onBack={() => setCurrentPage("dashboard")}
                  />
              )}

              {currentPage === "diet-plan" && (
                  <DietPlanPage
                      onBack={() => setCurrentPage("dashboard")}
                  />
              )}

              {currentPage === "workout-plan" && (
                  <WorkoutPlanPage
                      assessmentData={assessmentData}
                      onBack={() => setCurrentPage("dashboard")}
                  />
              )}

              {currentPage === "progress" && (
                  <ProgressPage
                      assessmentData={assessmentData}
                      onAssessmentUpdate={(updated: AssessmentData) =>
                          setAssessmentData(updated)
                      }
                  />
              )}

              {currentPage === "wearable-tracker" && (
                  <WearableTrackerPage />
              )}

              {currentPage === "profile" && (
                  <ProfilePage
                      assessmentData={assessmentData}
                      onBack={() => setCurrentPage("dashboard")}
                      onLogout={handleLogout}
                      onReviewAssessment={handleEditAssessment}
                  />
              )}
            </AppLayout>
        )}

        {showAppLayout && wellnessMode && (
            <button
                type="button"
                onClick={() => setCurrentPage("mode-selection")}
                className="fixed bottom-4 right-4 z-40 rounded-full border border-[#D7DCCF] bg-white px-4 py-3 text-xs font-semibold text-[#344C3D] shadow-lg transition hover:bg-[#EAF0E5] focus:outline-none focus:ring-2 focus:ring-[#71836A] focus:ring-offset-2"
                aria-label="Change wellness data mode"
            >
              Mode: {wellnessMode === "tracker" ? "Tracker" : "Manual"} · Change
            </button>
        )}

        {currentPage === "assessment" && (
            <AssessmentPage
                key={isEditingAssessment ? "edit-assessment" : "new-assessment"}
                initialData={assessmentData}
                onComplete={handleAssessmentComplete}
                isEditing={isEditingAssessment}
                onBack={() => {
                  if (isEditingAssessment) {
                    setIsEditingAssessment(false);
                    setCurrentPage("profile");
                  } else {
                    setCurrentPage(assessmentData ? "dashboard" : "landing");
                  }
                }}
            />
        )}

        {activeModal === "login" && (
            <LoginPage
                onClose={() => setActiveModal(null)}
                onRegister={() => setActiveModal("register")}
                onLoginSuccess={handleLoginSuccess}
            />
        )}

        {activeModal === "register" && (
            <RegisterPage
                onClose={() => setActiveModal(null)}
                onLogin={() => setActiveModal("login")}
                onRegisterSuccess={handleRegistrationSuccess}
            />
        )}

        {pageError && (
            <div
                role="alert"
                className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-lg"
            >
              {pageError}
              <button
                  type="button"
                  onClick={() => setPageError("")}
                  className="ml-3 font-medium underline"
              >
                Dismiss
              </button>
            </div>
        )}
      </>
  );
}

export default App;
