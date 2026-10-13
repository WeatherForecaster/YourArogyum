
import {
  ClipboardCheck,
  HeartPulse,
  Pencil,
} from "lucide-react";
import type { AssessmentData } from "../services/assessment";

interface ProfilePageProps {
  assessmentData: AssessmentData | null;
  onBack: () => void;
  onLogout: () => void;
  onReviewAssessment: () => void;
}

function ProfilePage({
                       assessmentData,
                       onReviewAssessment,
                     }: ProfilePageProps) {
  return (
    <main className="h-screen overflow-hidden bg-[#F6F2E9] px-5 py-8 text-[#30382F] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="mt-7 rounded-3xl border border-[#344C3D]/10 bg-white/80 p-6 sm:p-9">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl text-[#344C3D] sm:text-4xl">
                Health Profile
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#77796F]">
                View and update your saved health information.
              </p>
            </div>

            {assessmentData && (
              <button
                type="button"
                onClick={onReviewAssessment}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#344C3D] px-5 py-3 text-sm text-white transition hover:bg-[#263A2E]"
              >
                <Pencil size={16} />
                Edit assessment
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <HeartPulse size={21} className="text-[#A87945]" />
            <h2 className="font-serif text-xl text-[#344C3D]">
              Saved health details
            </h2>
          </div>

          {assessmentData ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Age</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessmentData.age} years
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Height</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessmentData.height} cm
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Weight</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessmentData.weight} kg
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#344C3D]/10 p-5">
                <div className="flex items-start gap-3">
                  <ClipboardCheck
                    size={21}
                    className="mt-0.5 shrink-0 text-[#A87945]"
                  />
                  <div>
                    <h3 className="font-medium text-[#344C3D]">
                      Health assessment
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#77796F]">
                      Your saved assessment is used to personalize your
                      preventive health recommendations. You can edit your
                      details whenever they change.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl bg-[#EBEEE5] p-6">
              <p className="font-medium text-[#344C3D]">
                No saved assessment found.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#77796F]">
                Complete your health assessment to view your details here.
              </p>
              <button
                type="button"
                onClick={onReviewAssessment}
                className="mt-4 rounded-full bg-[#344C3D] px-5 py-3 text-sm text-white transition hover:bg-[#263A2E]"
              >
                Complete assessment
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
