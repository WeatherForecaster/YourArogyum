
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

import { API_BASE_URL } from "./api/client";
import {
  getMyAssessment,
  type AssessmentData,
} from "./services/assessment";
import { archiveAndClearLegacyStorage } from "./services/healthTracking";

type ModalType = "login" | "register" | null;

type AppPage =
  | "landing"
  | "assessment"
  | HomeSection;

const AUTH_URL = `${API_BASE_URL}/api/auth`;

function App() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentPage, setCurrentPage] = useState<AppPage>("landing");
  const [assessmentData, setAssessmentData] =
    useState<AssessmentData | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pageError, setPageError] = useState("");
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);

  const loadAssessment = useCallback(async () => {
    const response = await getMyAssessment();

    setAssessmentData(response.assessment);
    setAssessmentCompleted(
      Boolean(response.completed && response.assessment)
    );

    return response.assessment;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Safely archive any legacy unscoped storage keys so they cannot leak across accounts
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
          const completed = Boolean(assessment.completed && assessment.assessment);
          setAssessmentCompleted(completed);
          setCurrentPage(completed ? "dashboard" : "assessment");
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

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    setPageError("");
    setActiveModal(null);

    try {
      const assessment = await loadAssessment();
      // assessmentCompleted state is set by loadAssessment; navigate based on whether data came back
      setCurrentPage(assessment ? "dashboard" : "assessment");
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
  }, [loadAssessment]);

  const handleRegistrationSuccess = () => {
    sessionStorage.removeItem("yourarogyum:diet-plan:v1");
    setActiveModal(null);
    setAssessmentData(null);
    setAssessmentCompleted(false);
    setIsEditingAssessment(false);
    setPageError("");
    setCurrentPage("assessment");
  };

  const handleAssessmentComplete = (data: AssessmentData) => {
    const wasEditing = isEditingAssessment;

    setAssessmentData(data);
    setAssessmentCompleted(true);
    setIsEditingAssessment(false);
    setPageError("");

    // Refresh assessment state from backend so all pages receive the fresh stored record
    void loadAssessment();

    setCurrentPage(wasEditing ? "profile" : "dashboard");
  };

  // Profile page: Edit opens the assessment with saved details.
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

    // Clean up active legacy browser storage to prevent cross-account contamination
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
    onAssessmentUpdate={(updated: AssessmentData) => setAssessmentData(updated)}
  />
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

      {currentPage === "assessment" && (
        <AssessmentPage
          key={isEditingAssessment ? "edit-assessment" : "new-assessment"}
          initialData={assessmentData}
          onComplete={handleAssessmentComplete}
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
