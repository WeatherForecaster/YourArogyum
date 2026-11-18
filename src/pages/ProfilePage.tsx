
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  HeartPulse,
  Loader2,
  Pencil,
} from "lucide-react";
import type { AssessmentData } from "../services/assessment";
import { getMyAssessment } from "../services/assessment";

interface ProfilePageProps {
  assessmentData: AssessmentData | null;
  onBack: () => void;
  onLogout: () => void;
  onReviewAssessment: () => void;
}

function ProfilePage({
  assessmentData: propAssessmentData,
  onReviewAssessment,
}: ProfilePageProps) {
  // Fetch fresh profile data to show all fields (prop may be partial).
  const [assessment, setAssessment] = useState<AssessmentData | null>(
    propAssessmentData,
  );
  const [loading, setLoading] = useState(!propAssessmentData);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getMyAssessment()
      .then((result) => {
        if (!cancelled) {
          setAssessment(result.completed ? result.assessment : propAssessmentData);
        }
      })
      .catch(() => {
        // Keep prop data as fallback.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Re-run only when the prop changes (e.g. after editing assessment).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propAssessmentData]);

  const profileDetails = assessment
    ? [
        { label: "Diet preference", value: assessment.diet },
        { label: "Health goal", value: assessment.goal },
        {
          label: "Current weight",
          value: assessment.weight ? `${assessment.weight} kg` : "",
        },
        {
          label: "Target weight",
          value: assessment.targetWeight ? `${assessment.targetWeight} kg` : "",
        },
        { label: "Food preferences", value: assessment.foodPreferences },
        { label: "Food allergies", value: assessment.foodAllergies },
        { label: "Other allergies", value: assessment.allergies },
        { label: "Foods to avoid", value: assessment.foodsToAvoid },
        { label: "Health conditions", value: assessment.conditions },
        { label: "Health concerns", value: assessment.healthConcerns },
        { label: "Medications", value: assessment.medications },
        { label: "Activity level", value: assessment.activity },
        { label: "Fitness level", value: assessment.fitnessLevel },
        { label: "Sleep duration", value: assessment.sleep },
      ].filter((item) => Boolean(item.value?.trim()))
    : [];

  const hasAllergyWarning =
    assessment &&
    (assessment.foodAllergies?.trim() ||
      assessment.allergies?.trim() ||
      assessment.foodsToAvoid?.trim());

  return (
    <main className="min-h-screen overflow-y-auto bg-[#F6F2E9] px-5 py-8 text-[#30382F] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-[#344C3D]/10 bg-white/80 p-6 sm:p-9">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl text-[#344C3D] sm:text-4xl">
                Health Profile
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#77796F]">
                View and update your saved health information.
              </p>
            </div>

            {assessment && (
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

          {/* Basic stats */}
          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-[#77796F]">
              <Loader2 size={18} className="animate-spin" />
              Loading your health details...
            </div>
          ) : assessment ? (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Age</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessment.age} years
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Height</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessment.height} cm
                  </p>
                </div>

                <div className="rounded-2xl bg-[#EBEEE5] p-5">
                  <p className="text-sm text-[#77796F]">Weight</p>
                  <p className="mt-2 font-serif text-2xl text-[#344C3D]">
                    {assessment.weight} kg
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

        {/* ── Full Health Profile details ──────────────────────────────── */}
        {assessment && profileDetails.length > 0 && (
          <section className="rounded-3xl border border-[#344C3D]/10 bg-white/80 p-6 sm:p-9">
            <div className="flex items-center gap-3">
              <HeartPulse size={21} className="text-[#A87945]" />
              <h2 className="font-serif text-xl text-[#344C3D]">
                Saved health details
              </h2>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profileDetails.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-[#EBEEE5] p-4"
                >
                  <p className="text-xs font-medium text-[#77796F]">
                    {item.label}
                  </p>
                  <p className="mt-2 break-words text-sm font-medium text-[#344C3D]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {hasAllergyWarning && (
              <p className="mt-5 rounded-xl bg-[#F5E9D7] p-3 text-sm text-[#73532C]">
                Review your listed allergies and foods to avoid. Always verify
                ingredients before eating; AI-generated suggestions do not
                guarantee allergen safety.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default ProfilePage;
