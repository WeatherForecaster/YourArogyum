import {
  ArrowRight,
  Activity,
  HeartPulse,
  Leaf,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const GOLD = "#A87945";

const features = [
  {
    icon: Activity,
    title: "Disease-aware diet",
    description:
      "Food and nutrition suggestions designed to consider your health conditions and dietary preferences.",
  },
  {
    icon: Leaf,
    title: "Personalized exercise",
    description:
      "Practical activity suggestions shaped around your fitness level, lifestyle, and goals.",
  },
  {
    icon: HeartPulse,
    title: "Everyday wellbeing",
    description:
      "Build healthier routines around sleep, movement, nutrition, and your daily habits.",
  },
];

const steps = [
  {
    number: "01",
    title: "Build your health profile",
    description:
      "Share relevant health details, medical history, lifestyle habits, and personal preferences.",
  },
  {
    number: "02",
    title: "Understand your needs",
    description:
      "Explore your health indicators and available risk insights through clear explanations.",
  },
  {
    number: "03",
    title: "Receive your plan",
    description:
      "Discover relevant wellness suggestions and monitor your progress over time.",
  },
];

const benefits = [
  ["AI-powered", "Personalized recommendations"],
  ["Disease-aware", "Health-conscious planning"],
  ["One journey", "Diet, exercise, and lifestyle"],
  ["Progress", "Track habits over time"],
];

const questions = [
  {
    question: "How does the AI personalize recommendations?",
    answer:
      "The platform is designed to use details such as age, BMI, health history, lifestyle, preferences, and goals.",
  },
  {
    question: "Can it consider existing health conditions?",
    answer:
      "It is designed to consider selected health conditions when generating wellness suggestions. It does not diagnose or treat medical conditions.",
  },
  {
    question: "Can I update my health information?",
    answer:
      "Your health profile can be updated as your goals, preferences, and lifestyle change.",
  },
  {
    question: "Is this a replacement for a doctor?",
    answer:
      "No. YourArogyum provides preventive wellness guidance and does not replace professional medical advice.",
  },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      href="#home"
      className="flex shrink-0 items-center gap-2"
      aria-label="YourArogyum home"
    >
      <span
        className={`grid place-items-center rounded-full bg-[#344C3D] text-[#F6F2E9] ${
          footer ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <Leaf size={footer ? 18 : 21} strokeWidth={1.7} />
      </span>

      <span
        className={`font-serif font-semibold tracking-tight ${
          footer ? "text-xl" : "text-xl sm:text-2xl"
        }`}
      >
        Your<span style={{ color: GOLD }}>Arogyum</span>
      </span>
    </a>
  );
}

function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const navLinks = [
    { label: "Benefits", href: "#benefits" },
    { label: "How it works", href: "#how" },
    { label: "Personalization", href: "#personalization" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F2E9] pt-[73px] text-[#30382F]">
      {/* Navigation */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-[#344C3D]/10 bg-[#F6F2E9]/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8 lg:px-12">
          <Brand />

          <div className="hidden items-center gap-7 text-sm lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-[#A87945]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[#344C3D] transition hover:bg-[#DCE3D5]"
            >
              <LogIn size={16} />
              Login
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="inline-flex items-center rounded-full bg-[#344C3D] px-5 py-3 text-sm text-white transition hover:bg-[#263A2E]"
            >
              Get started <span className="ml-2">↗</span>
            </button>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full p-2 transition hover:bg-[#DCE3D5] lg:hidden"
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-[#344C3D]/10 bg-[#F6F2E9] px-6 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="hover:text-[#A87945]"
                >
                  {link.label}
                </a>
              ))}

              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onLogin();
                }}
                className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-[#344C3D] hover:bg-[#DCE3D5]"
              >
                <LogIn size={16} />
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onRegister();
                }}
                className="inline-flex w-fit rounded-full bg-[#344C3D] px-5 py-3 text-white"
              >
                Get started ↗
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative isolate flex min-h-[500px] items-center overflow-hidden sm:min-h-[540px] lg:min-h-[580px]"
      >
        <img
          src="/images/botanical.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#F6F2E9]/80 via-[#F6F2E9]/50 to-[#F6F2E9]/10" />

        <div className="absolute -right-24 top-16 z-[2] h-72 w-72 rounded-full bg-[#DCE3D5]/30 blur-3xl sm:h-96 sm:w-96" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24">
          <div className="max-w-2xl">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-medium tracking-[0.16em] backdrop-blur-sm sm:text-[11px]"
              style={{
                borderColor: `${GOLD}66`,
                backgroundColor: "#F6F2E9D9",
                color: GOLD,
              }}
            >
              <Sparkles size={13} />
              AI-POWERED PREVENTIVE HEALTHCARE
            </div>

            <h1 className="font-serif text-[2.45rem] font-normal leading-[1.1] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Personalized health,
              <span className="mt-1 block font-normal italic text-[#344C3D]">
                designed around you.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[#50594F] sm:text-base">
              Discover diet, exercise, and lifestyle recommendations shaped
              around your health profile, preferences, and personal goals.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRegister}
                className="inline-flex items-center gap-2 rounded-full bg-[#344C3D] px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#263A2E]"
              >
                Create my health plan <ArrowRight size={16} />
              </button>

              <a
                href="#how"
                className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-[#344C3D] transition hover:text-[#A87945]"
              >
                How it works <ArrowRight size={14} />
              </a>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#596458]">
              <ShieldCheck size={16} className="shrink-0 text-[#A87945]" />
              Thoughtful health insights. Your wellbeing comes first.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-5 right-7 z-10 hidden text-right text-[10px] tracking-[0.22em] text-[#344C3D]/70 md:block lg:right-12">
          <span className="block">YOUR WELLBEING</span>
          <span className="mt-1 block">YOUR JOURNEY</span>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-y border-[#344C3D]/10 bg-[#EBEEE5] px-6 py-4 sm:px-10 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {benefits.map(([title, description]) => (
            <div key={title} className="flex flex-col gap-1">
              <p className="font-serif text-xl text-[#344C3D]">{title}</p>
              <p className="text-sm text-[#6D7167]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section
        id="benefits"
        className="scroll-mt-[73px] px-6 pb-10 pt-8 sm:px-10 sm:pb-12 sm:pt-10 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <p
            className="text-xs font-medium tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            WHAT WE OFFER
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2 md:items-end">
            <h2 className="max-w-xl font-serif text-4xl leading-tight sm:text-5xl">
              Health recommendations made for <i>you.</i>
            </h2>
            <p className="max-w-lg leading-7 text-[#6D7167] md:justify-self-end">
              Your health is personal. Your recommendations should be too.
              Bring health awareness and practical wellness guidance together
              in one place.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#344C3D]/10 bg-white/60 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/90 sm:p-6"
                >
                  <div
                    className="mb-4 inline-flex rounded-xl p-3"
                    style={{ backgroundColor: "#DCE3D5", color: GOLD }}
                  >
                    <Icon size={23} />
                  </div>
                  <h3 className="font-serif text-2xl">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#6D7167]">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="scroll-mt-[73px] bg-[#344C3D] px-6 py-9 text-[#F6F2E9] sm:px-10 sm:py-12 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.2em] text-[#D7B88F]">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              A simpler path to better everyday health.
            </h2>
            <p className="mt-3 leading-7 text-[#E0E7DA]">
              Start with your health profile. Understand your needs. Find
              practical recommendations that fit your life.
            </p>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="border-t border-[#F6F2E9]/25 pt-4"
              >
                <p className="font-serif text-4xl italic text-[#D7B88F]">
                  {step.number}
                </p>
                <h3 className="mt-3 font-serif text-2xl">{step.title}</h3>
                <p className="mt-2 leading-7 text-[#E0E7DA]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Personalization */}
      <section
        id="personalization"
        className="scroll-mt-[73px] px-6 py-9 sm:px-10 sm:py-12 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-7 lg:grid-cols-2 lg:gap-10">
          <div className="relative min-h-[300px] overflow-hidden rounded-[48%_48%_20px_20px] bg-[#DCE3D5] sm:min-h-[380px]">
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1100&q=85"
              alt="A colourful selection of nourishing everyday foods"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#263A2E]/40 via-transparent to-transparent" />
            <p className="absolute bottom-6 left-6 right-6 font-serif text-2xl italic text-white sm:text-3xl">
              A healthier journey, made personal.
            </p>
          </div>

          <div>
            <p
              className="text-xs font-medium tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              PERSONALIZATION MATTERS
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              One health plan doesn't fit everyone.
            </h2>
            <p className="mt-4 leading-8 text-[#6D7167]">
              YourArogyum considers the person behind the health data.
              Recommendations are designed to take account of conditions,
              preferences, habits, and personal goals.
            </p>

            <ul className="mt-5 grid gap-3 text-sm text-[#50594F]">
              {[
                "Age and BMI-aware insights",
                "Consideration of selected health conditions",
                "Weight-management and wellness goals",
                "Dietary preferences and lifestyle",
                "Progress tracking over time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#DCE3D5]">
                    <Leaf size={12} style={{ color: GOLD }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-[73px] bg-[#EBEEE5] px-6 py-9 sm:px-10 sm:py-12 lg:px-12"
      >
        <div className="mx-auto max-w-3xl">
          <p
            className="text-xs font-medium tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            FAQ
          </p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">
            Questions, answered simply.
          </h2>

          <div className="mt-5 divide-y divide-[#344C3D]/15">
            {questions.map((item) => (
              <details key={item.question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-serif text-lg sm:text-xl">
                  {item.question}
                  <span
                    className="text-2xl transition group-open:rotate-45"
                    style={{ color: GOLD }}
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pt-2 text-sm leading-7 text-[#6D7167]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section
        id="final-cta"
        className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12"
      >
        <div className="mx-auto max-w-7xl rounded-3xl bg-[#DCE3D5] px-6 py-9 text-center sm:px-12 sm:py-12">
          <p
            className="text-xs font-medium tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            START YOUR HEALTH JOURNEY
          </p>

          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Your health plan should understand <i>you.</i>
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#596458] sm:text-base">
            Discover a more personalized approach to preventive healthcare
            with thoughtful, AI-powered wellness recommendations.
          </p>

          <button
            type="button"
            onClick={onRegister}
            className="mt-6 inline-flex items-center justify-center gap-3 rounded-full bg-[#344C3D] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#263A2E]"
          >
            Get started <ArrowRight size={17} />
          </button>
        </div>
      </section>

    </main>
  );
}

export default LandingPage;