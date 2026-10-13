
import { useCallback, useEffect, useState } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AssessmentPage from "./pages/AssessmentPage";
import HomePage, { type HomeSection } from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import DietPlanPage from "./pages/DietPlanPage";
import WorkoutPlanPage from "./pages/WorkoutPlanPage";
import ProgressPage from "./pages/ProgressPage";
import ProfilePage from "./pages/ProfilePage";
import AppLayout from "./components/AppLayout";

import {
  getMyAssessment,
  type AssessmentData,
} from "./services/assessment";

type ModalType = "login" | "register" | null;

type AppPage =
  | "landing"
  | "home"
  | "assessment"
  | "dashboard"
  | "ai-assistant"
  | "diet-plan"
  | "workout-plan"
  | "progress"
  | "profile";

const AUTH_URL = "http://localhost:8080/api/auth";

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
          setAssessmentCompleted(
            Boolean(assessment.completed && assessment.assessment)
          );
          setCurrentPage("home");
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
      await loadAssessment();
    } catch (error) {
      setAssessmentData(null);
      setAssessmentCompleted(false);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your health profile."
      );
    }

    setCurrentPage("home");
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

    setCurrentPage(wasEditing ? "profile" : "home");
  };

  // Home page: Review Details opens the profile, not the assessment form.
  const handleOpenProfile = async () => {
    setPageError("");

    try {
      const savedAssessment = await loadAssessment();

      if (!savedAssessment) {
        setIsEditingAssessment(false);
        setCurrentPage("assessment");
        return;
      }

      setCurrentPage("profile");
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your saved health details."
      );
    }
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

  const handleNavigate = (page: HomeSection | "home") => {
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
    currentPage === "home" ||
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
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        >
          {currentPage === "home" && (
            <HomePage
              onNavigate={handleNavigate}
              onReviewDetails={handleOpenProfile}
              assessmentCompleted={assessmentCompleted}
            />
          )}

          {currentPage === "dashboard" && (
            <DashboardPage
              assessmentData={assessmentData}
              assessmentCompleted={assessmentCompleted}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === "ai-assistant" && (
            <AIAssistantPage
              onBack={() => setCurrentPage("home")}
            />
          )}

          {currentPage === "diet-plan" && (
            <DietPlanPage
              onBack={() => setCurrentPage("home")}
            />
          )}

          {currentPage === "workout-plan" && (
            <WorkoutPlanPage
              onBack={() => setCurrentPage("home")}
            />
          )}


{currentPage === "progress" && (
  <ProgressPage assessmentData={assessmentData} />
)}

          {currentPage === "profile" && (
            <ProfilePage
              assessmentData={assessmentData}
              onBack={() => setCurrentPage("home")}
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
              setCurrentPage(assessmentData ? "home" : "landing");
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
