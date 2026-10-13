import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Leaf,
  ArrowLeft,
  ArrowRight,
  Check,
  UserRound,
  HeartPulse,
  Activity,
  Salad,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Pencil,
  LoaderCircle,
} from "lucide-react";
import { saveMyAssessment } from "../services/assessment";

interface AssessmentPageProps {
  onComplete: (assessment: Record<string, string>) => void;
  onBack?: () => void;
  initialData?: Record<string, string> | null;
  isEditing?: boolean;
}

type FormData = Record<string, string>;

const steps = [
  { title: "Personal information", description: "Your basic details", icon: UserRound },
  { title: "Health profile", description: "Your health background", icon: HeartPulse },
  { title: "Lifestyle", description: "Your everyday habits", icon: Activity },
  { title: "Diet & goals", description: "Your personal preferences", icon: Salad },
  { title: "Review answers", description: "Check your information", icon: ClipboardCheck },
];

const initialFormData: FormData = {
  fullName: "",
  age: "",
  sex: "",
  height: "",
  weight: "",
  conditions: "",
  healthConcerns: "",
  familyHistory: "",
  allergies: "",
  medications: "",
  activity: "",
  sleep: "",
  dailyActivity: "",
  workLifestyle: "",
  water: "",
  stress: "",
  diet: "",
  foodAllergies: "",
  foodsToAvoid: "",
  foodPreferences: "",
  goal: "",
  targetWeight: "",
  fitnessLevel: "",
  bmi: "",
};

const healthConditions = [
  "Diabetes",
  "Hypertension",
  "High cholesterol",
  "Thyroid condition",
  "PCOS / PCOD",
  "Heart disease",
  "Asthma",
  "Kidney stones",
  "Other",
  "None",
];

const familyHistoryOptions = [
  "Diabetes",
  "Heart disease",
  "Hypertension",
  "None",
];

const fieldLabels: Record<string, string> = {
  fullName: "Full name",
  age: "Age",
  sex: "Gender",
  height: "Height",
  weight: "Current weight",
  conditions: "Selected health conditions",
  healthConcerns: "Other health concerns",
  familyHistory: "Family health history",
  allergies: "Allergies",
  medications: "Current medications",
  activity: "Activity level",
  sleep: "Sleep duration",
  dailyActivity: "Daily activity",
  workLifestyle: "Work / study lifestyle",
  water: "Daily water intake",
  stress: "Stress level",
  diet: "Diet preference",
  foodAllergies: "Food allergies",
  foodsToAvoid: "Foods to avoid",
  foodPreferences: "Food preferences",
  goal: "Fitness / wellness goal",
  targetWeight: "Target weight",
  fitnessLevel: "Fitness level",
};

const dropdownOptions: Record<string, string[]> = {
  sex: ["Female", "Male", "Other"],
  activity: ["Sedentary", "Lightly active", "Moderately active", "Very active"],
  sleep: ["Less than 5 hours", "5–6 hours", "7–8 hours", "More than 8 hours"],
  dailyActivity: [
    "Mostly sitting",
    "A mix of sitting and movement",
    "Mostly standing / walking",
    "Physically demanding",
  ],
  workLifestyle: [
    "Mostly desk-based",
    "Student with mostly sitting",
    "Active work / study",
    "Shift work",
    "Other",
  ],
  water: ["Less than 1 litre", "1–2 litres", "2–3 litres", "More than 3 litres"],
  stress: ["Low", "Moderate", "High"],
  diet: [
    "Vegetarian",
    "Vegetarian with eggs",
    "Vegan",
    "Non-vegetarian",
    "Eggetarian",
    "Other",
  ],
  goal: [
    "Improve overall wellbeing",
    "Build healthier eating habits",
    "Weight management",
    "Build strength and fitness",
    "Improve stamina",
    "Improve sleep",
    "Preventive wellness",
  ],
  fitnessLevel: [
    "Beginner",
    "Intermediate",
    "Advanced",
    "Currently not exercising",
  ],
};

const inputClass =
  "w-full rounded-xl border border-[#E5E5DA] bg-[#FFFEFA] px-4 py-3 text-sm text-[#344C3D] outline-none transition placeholder:text-[#A3A398] focus:border-[#A87945] focus:ring-2 focus:ring-[#A87945]/10";

const labelClass = "mb-2 block text-sm font-medium text-[#344C3D]";

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-[#85877D]">{hint}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A87945]">
        {eyebrow}
      </p>
      <h1 className="font-serif text-3xl leading-tight tracking-tight text-[#344C3D] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#77796E]">
        {description}
      </p>
    </div>
  );
}

function SelectField({
  name,
  value,
  onChange,
  placeholder = "Choose an option",
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: string[];
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ConditionSelector({
  value,
  onChange,
  options = healthConditions,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}) {
  const selected = value ? value.split(", ").filter(Boolean) : [];

  const toggle = (condition: string) => {
    let next: string[];

    if (condition === "None") {
      next = selected.includes("None") ? [] : ["None"];
    } else {
      next = selected.filter((item) => item !== "None");
      next = next.includes(condition)
        ? next.filter((item) => item !== condition)
        : [...next, condition];
    }

    onChange(next.join(", "));
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((condition) => {
        const checked = selected.includes(condition);

        return (
          <button
            key={condition}
            type="button"
            onClick={() => toggle(condition)}
            aria-pressed={checked}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition ${
              checked
                ? "border-[#344C3D] bg-[#DCE3D5] text-[#344C3D]"
                : "border-[#E9E8DF] bg-[#FFFEFA] text-[#686C61] hover:border-[#B7C0AD]"
            }`}
          >
            <span>{condition}</span>
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                checked
                  ? "border-[#344C3D] bg-[#344C3D] text-white"
                  : "border-[#D7D8CD]"
              }`}
            >
              {checked && <Check size={11} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function AssessmentPage({
  onComplete,
  onBack,
  initialData,
  isEditing = false,
}: AssessmentPageProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    setFormData({ ...initialFormData, ...(initialData ?? {}) });
    setCurrentStep(0);
    setErrors({});
    setApiError("");
  }, [initialData, isEditing]);

  const updateField = (name: string, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setApiError("");
  };

  const bmi =
    Number(formData.height) > 0 && Number(formData.weight) > 0
      ? (
          Number(formData.weight) /
          Math.pow(Number(formData.height) / 100, 2)
        ).toFixed(1)
      : "";

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setErrors({});
    setApiError("");
    document.getElementById("assessment-scroll-area")?.scrollTo({ top: 0 });
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.fullName.trim()) {
        nextErrors.fullName = "Please enter your full name.";
      }

      const age = Number(formData.age);
      const height = Number(formData.height);
      const weight = Number(formData.weight);

      if (!formData.age || !Number.isFinite(age) || age < 1 || age > 120) {
        nextErrors.age = "Enter an age between 1 and 120.";
      }

      if (!formData.sex) {
        nextErrors.sex = "Please select your gender.";
      }

      if (
        !formData.height ||
        !Number.isFinite(height) ||
        height < 30 ||
        height > 260
      ) {
        nextErrors.height = "Enter a height between 30 and 260 cm.";
      }

      if (
        !formData.weight ||
        !Number.isFinite(weight) ||
        weight < 2 ||
        weight > 500
      ) {
        nextErrors.weight = "Enter a weight between 2 and 500 kg.";
      }
    }

    if (currentStep === 2) {
      [
        "activity",
        "sleep",
        "dailyActivity",
        "workLifestyle",
        "water",
        "stress",
      ].forEach((field) => {
        if (!formData[field]) {
          nextErrors[field] = "Please select an option.";
        }
      });
    }

    if (currentStep === 3) {
      ["diet", "goal", "fitnessLevel"].forEach((field) => {
        if (!formData[field]) {
          nextErrors[field] = "Please select an option.";
        }
      });

      if (formData.targetWeight) {
        const targetWeight = Number(formData.targetWeight);

        if (
          !Number.isFinite(targetWeight) ||
          targetWeight < 2 ||
          targetWeight > 500
        ) {
          nextErrors.targetWeight =
            "Enter a target weight between 2 and 500 kg.";
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (saving || !validateStep()) return;

    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
      return;
    }

    setSaving(true);
    setApiError("");

    try {
      const data: FormData = { ...formData, bmi };
      const result = await saveMyAssessment(data);
      onComplete(result.assessment);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "We couldn't save your assessment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (saving) return;

    if (currentStep > 0) {
      goToStep(currentStep - 1);
    } else {
      onBack?.();
    }
  };

  const errorFor = (field: string) => errors[field];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Heading
              eyebrow="01 / Personal information"
              title={isEditing ? "Update your details." : "Let's get to know you."}
              description={
                isEditing
                  ? "Your saved details are shown below. Change only what needs updating."
                  : "Start with your basic details. We'll use them to personalize your wellness experience."
              }
            />

            <div className="space-y-5">
              <Field label="Full name" error={errorFor("fullName")}>
                <input
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Age" error={errorFor("age")}>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => updateField("age", e.target.value)}
                    placeholder="Age in years"
                    className={inputClass}
                  />
                </Field>

                <Field label="Gender" error={errorFor("sex")}>
                  <SelectField
                    name="sex"
                    value={formData.sex}
                    onChange={(value) => updateField("sex", value)}
                    options={dropdownOptions.sex}
                  />
                </Field>

                <Field label="Height (cm)" error={errorFor("height")}>
                  <input
                    type="number"
                    min="30"
                    max="260"
                    value={formData.height}
                    onChange={(e) => updateField("height", e.target.value)}
                    placeholder="e.g. 165"
                    className={inputClass}
                  />
                </Field>

                <Field label="Current weight (kg)" error={errorFor("weight")}>
                  <input
                    type="number"
                    min="2"
                    max="500"
                    value={formData.weight}
                    onChange={(e) => updateField("weight", e.target.value)}
                    placeholder="e.g. 60"
                    className={inputClass}
                  />
                </Field>
              </div>

              {bmi && (
                <div className="rounded-2xl border border-[#DCE3D5] bg-[#EDF0E7] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCE3D5]">
                      <Activity size={21} />
                    </div>
                    <div>
                      <p className="text-xs text-[#77796E]">Your calculated BMI</p>
                      <p className="mt-1 font-serif text-3xl text-[#344C3D]">
                        {bmi}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#77796E]">
                    BMI is a screening measure, not a diagnosis. Interpretation
                    can vary by age and individual circumstances.
                  </p>
                </div>
              )}
            </div>
          </>
        );

      case 1:
        return (
          <>
            <Heading
              eyebrow="02 / Health profile"
              title="Your health matters."
              description="Select any health conditions that apply. You can add other concerns and medication details below."
            />

            <div className="space-y-6">
              <Field
                label="Do any of these health conditions apply to you?"
                hint="Select all that apply. Choose None if none of the listed conditions apply."
              >
                <ConditionSelector
                  value={formData.conditions}
                  onChange={(value) => updateField("conditions", value)}
                />
              </Field>

              <Field
                label="Family health history"
                hint="Optional. Select any conditions that occur in your family. Choose None if none apply."
              >
                <ConditionSelector
                  value={formData.familyHistory}
                  onChange={(value) => updateField("familyHistory", value)}
                  options={familyHistoryOptions}
                />
              </Field>

              <Field
                label="Other existing health concerns"
                hint="Optional. Include conditions not listed above, or additional context you want us to consider."
              >
                <textarea
                  value={formData.healthConcerns}
                  onChange={(e) => updateField("healthConcerns", e.target.value)}
                  placeholder="Describe any other health concerns..."
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field
                label="Allergies"
                hint="Mention medication or other allergies if relevant."
              >
                <textarea
                  value={formData.allergies}
                  onChange={(e) => updateField("allergies", e.target.value)}
                  placeholder="List known allergies, or enter None"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field
                label="Current medications"
                hint="Optional. Include prescribed medicines and supplements if you wish."
              >
                <textarea
                  value={formData.medications}
                  onChange={(e) => updateField("medications", e.target.value)}
                  placeholder="List current medications, or enter None"
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <p className="rounded-xl bg-[#DCE3D5]/60 p-4 text-xs leading-5 text-[#77796E]">
                Your answers help provide more relevant guidance. Do not start,
                stop, or change medication based on app recommendations.
              </p>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <Heading
              eyebrow="03 / Lifestyle"
              title="Your everyday rhythm."
              description="Your routines help us understand your activity, rest, and daily habits."
            />

            <div className="space-y-6">
              {(
                [
                  ["activity", "Overall activity level"],
                  ["sleep", "Typical sleep duration"],
                  ["dailyActivity", "Daily activity"],
                  ["workLifestyle", "Work / study lifestyle"],
                  ["water", "Daily water intake"],
                  ["stress", "Typical stress level"],
                ] as [string, string][]
              ).map(([field, label]) => (
                <Field key={field} label={label} error={errorFor(field)}>
                  <SelectField
                    name={field}
                    value={formData[field]}
                    onChange={(value) => updateField(field, value)}
                    options={dropdownOptions[field]}
                  />
                </Field>
              ))}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <Heading
              eyebrow="04 / Diet & goals"
              title="Nourishment, your way."
              description="Tell us about your food preferences and the wellness goals you'd like to work towards."
            />

            <div className="space-y-6">
              <Field label="Diet preference" error={errorFor("diet")}>
                <SelectField
                  name="diet"
                  value={formData.diet}
                  onChange={(value) => updateField("diet", value)}
                  options={dropdownOptions.diet}
                />
              </Field>

              <Field label="Food allergies">
                <textarea
                  value={formData.foodAllergies}
                  onChange={(e) => updateField("foodAllergies", e.target.value)}
                  placeholder="e.g. peanuts, dairy, or None"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field label="Foods you prefer to avoid">
                <textarea
                  value={formData.foodsToAvoid}
                  onChange={(e) => updateField("foodsToAvoid", e.target.value)}
                  placeholder="Foods you dislike or prefer not to eat"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field label="Food preferences">
                <textarea
                  value={formData.foodPreferences}
                  onChange={(e) => updateField("foodPreferences", e.target.value)}
                  placeholder="e.g. home-cooked meals, regional foods, preferred ingredients"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field label="Your primary goal" error={errorFor("goal")}>
                <SelectField
                  name="goal"
                  value={formData.goal}
                  onChange={(value) => updateField("goal", value)}
                  options={dropdownOptions.goal}
                />
              </Field>

              <Field
                label="Target weight (kg)"
                hint="Optional. Only enter a target if you have one in mind."
                error={errorFor("targetWeight")}
              >
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={formData.targetWeight}
                  onChange={(e) => updateField("targetWeight", e.target.value)}
                  placeholder="Enter target weight"
                  className={inputClass}
                />
              </Field>

              <Field label="Current fitness level" error={errorFor("fitnessLevel")}>
                <SelectField
                  name="fitnessLevel"
                  value={formData.fitnessLevel}
                  onChange={(value) => updateField("fitnessLevel", value)}
                  options={dropdownOptions.fitnessLevel}
                />
              </Field>
            </div>
          </>
        );

      case 4: {
        const groups = [
          {
            title: "Personal information",
            icon: UserRound,
            fields: ["fullName", "age", "sex", "height", "weight"],
            step: 0,
          },
          {
            title: "Health profile",
            icon: HeartPulse,
            fields: [
              "conditions",
              "familyHistory",
              "healthConcerns",
              "allergies",
              "medications",
            ],
            step: 1,
          },
          {
            title: "Lifestyle",
            icon: Activity,
            fields: [
              "activity",
              "sleep",
              "dailyActivity",
              "workLifestyle",
              "water",
              "stress",
            ],
            step: 2,
          },
          {
            title: "Diet & goals",
            icon: Salad,
            fields: [
              "diet",
              "foodAllergies",
              "foodsToAvoid",
              "foodPreferences",
              "goal",
              "targetWeight",
              "fitnessLevel",
            ],
            step: 3,
          },
        ];

        const displayValue = (field: string) => {
          const value = formData[field]?.trim();
          if (!value) return "Not provided";
          if (field === "height") return `${value} cm`;
          if (field === "weight" || field === "targetWeight") {
            return `${value} kg`;
          }
          return value;
        };

        return (
          <>
            <Heading
              eyebrow={isEditing ? "05 / Review changes" : "05 / Final review"}
              title={isEditing ? "Review your updates." : "Let's review your details."}
              description={
                isEditing
                  ? "Check your saved information and make any changes before saving your updated assessment."
                  : "Check your answers before saving. You can return to any section to make changes."
              }
            />

            <div className="divide-y divide-[#E6E1D6]">
              {groups.map((group) => {
                const Icon = group.icon;

                return (
                  <section key={group.title} className="py-5 first:pt-0">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={17} className="text-[#A87945]" />
                      <h2 className="text-sm font-semibold text-[#344C3D]">
                        {group.title}
                      </h2>
                      <button
                        type="button"
                        onClick={() => goToStep(group.step)}
                        className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#A87945] hover:bg-[#F0EDE3]"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </div>

                    <div className="divide-y divide-[#EEEEE5]">
                      {group.fields.map((field) => (
                        <div key={field} className="py-3">
                          <p className="text-xs text-[#85877D]">
                            {fieldLabels[field]}
                          </p>
                          <p className="mt-1.5 break-words text-sm leading-6 text-[#344C3D]">
                            {displayValue(field)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {bmi && (
              <div className="mt-5 rounded-xl bg-[#DCE3D5]/70 p-4">
                <p className="text-xs text-[#77796E]">Calculated BMI</p>
                <p className="mt-1 font-serif text-2xl text-[#344C3D]">{bmi}</p>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E6E1D6] p-4">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-[#344C3D]"
              />
              <p className="text-xs leading-5 text-[#77796E]">
                Your information is used to personalize preventive wellness
                guidance. This tool does not diagnose disease or replace advice
                from a qualified healthcare professional.
              </p>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#F6F2E9] text-[#344C3D] lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:h-full lg:min-h-0 lg:flex-row">
        <aside className="relative flex shrink-0 flex-col bg-[#DCE3D5] px-6 py-6 sm:px-10 sm:py-8 lg:sticky lg:top-0 lg:h-full lg:w-[37%] lg:max-w-[490px] lg:overflow-hidden lg:px-8 lg:py-6 xl:px-10">
          <div className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full border border-[#C8D3C3] opacity-70" />
          <div className="pointer-events-none absolute -right-12 top-52 h-40 w-40 rounded-full border border-[#C8D3C3] opacity-70" />

          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="relative z-10 mb-6 flex w-fit items-center gap-2 text-sm text-[#344C3D] hover:text-[#A87945] disabled:opacity-50 lg:hidden"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#344C3D] text-white">
              <Leaf size={21} strokeWidth={1.6} />
            </div>
            <p className="font-serif text-2xl tracking-tight text-[#344C3D]">
              Your<span className="text-[#A87945]">Arogyum</span>
            </p>
          </div>

          <div className="relative z-10 mt-7 rounded-2xl border border-[#C8D3C3] bg-[#F6F2E9]/70 p-4 xl:mt-9 xl:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#344C3D]">
                {isEditing ? "Edit assessment" : "Your assessment"}
              </p>
              <p className="text-xs tabular-nums text-[#77796E]">
                {String(currentStep + 1).padStart(2, "0")} / 05
              </p>
            </div>

            <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#DCE3D5]">
              <div
                className="h-full rounded-full bg-[#A87945] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-1">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCurrent = index === currentStep;
                const isCompleted = index < currentStep;
                const isAccessible = index <= currentStep;

                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => {
                      if (isAccessible && index !== currentStep) {
                        goToStep(index);
                      }
                    }}
                    disabled={!isAccessible || saving}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      isCurrent
                        ? "bg-[#344C3D] text-white shadow-sm"
                        : isCompleted
                          ? "text-[#344C3D] hover:bg-[#DCE3D5]"
                          : "text-[#92978A]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isCurrent
                          ? "bg-white/15"
                          : isCompleted
                            ? "bg-[#DCE3D5]"
                            : "bg-[#E9EDE4]"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={15} />
                      ) : (
                        <Icon size={16} strokeWidth={1.7} />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">
                        {step.title}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          isCurrent ? "text-white/75" : "opacity-75"
                        }`}
                      >
                        {step.description}
                      </span>
                    </span>

                    {isCurrent && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A87945]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-5 flex items-start gap-3 border-t border-[#C8D3C3] pt-4">
            <ShieldCheck
              size={18}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-[#344C3D]">
                Your health, your privacy.
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[#77796E]">
                Share only what you are comfortable sharing. Your answers help
                personalize your wellness experience.
              </p>
            </div>
          </div>

          <p className="relative z-10 mt-auto pt-5 text-[9px] tracking-wide text-[#77796E]">
            YOURAROGYUM · PREVENTIVE WELLNESS
          </p>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#F6F2E9] lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="sticky top-0 z-20 hidden shrink-0 items-center justify-between border-b border-[#E6E1D6] bg-[#F6F2E9] px-8 py-5 sm:px-12 lg:flex xl:px-16">
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="flex items-center gap-2 text-sm text-[#77796E] transition hover:text-[#344C3D] disabled:opacity-50"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-2 text-xs text-[#77796E]">
              <Sparkles size={14} className="text-[#A87945]" />
              {isEditing
                ? "Keep your wellness profile up to date"
                : "A more personal approach to wellness"}
            </div>
          </header>

          <div
            id="assessment-scroll-area"
            className="min-h-0 flex-1 px-6 py-8 sm:px-10 sm:py-10 lg:overflow-y-auto lg:overscroll-contain lg:px-12 lg:py-8 xl:px-16"
          >
            <div className="mx-auto flex w-full max-w-[620px] flex-col">
              <div className="mb-7 lg:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A87945]">
                    STEP {currentStep + 1} OF {steps.length}
                  </span>
                  <span className="text-xs text-[#77796E]">
                    {Math.round(progress)}% complete
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#E5E4D9]">
                  <div
                    className="h-full rounded-full bg-[#A87945] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {renderStep()}

              {apiError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {apiError}
                </div>
              )}

              <div className="mt-9 border-t border-[#E6E1D6] pt-5">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl px-2 py-3 text-sm text-[#77796E] transition hover:text-[#344C3D] disabled:opacity-50"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={saving}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#344C3D] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#263A2E] focus:outline-none focus:ring-2 focus:ring-[#A87945] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : currentStep === steps.length - 1 ? (
                      <>
                        {isEditing ? "Save Changes" : "Complete assessment"}
                        <Check size={16} />
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-4 text-center text-[11px] leading-5 text-[#77796E]">
                  YourArogyum provides wellness guidance, not a medical diagnosis.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
