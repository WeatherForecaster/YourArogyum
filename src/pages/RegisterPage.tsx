import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Mail, X } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
  registerUser,
  googleLoginUser,
  verifyOtp,
} from "../services/auth";

interface RegisterPageProps {
  onClose: () => void;
  onLogin: () => void;
  onRegisterSuccess: () => void;
}

export default function RegisterPage({
  onClose,
  onLogin,
  onRegisterSuccess,
}: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpStep, setOtpStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  const inputClass =
    "w-full rounded-xl border border-[#E2E2D8] bg-white px-4 py-3 text-sm text-[#30382F] outline-none transition placeholder:text-[#A4A49A] focus:border-[#71846B] focus:ring-2 focus:ring-[#DCE3D5]";

  function validateForm(): string | null {
    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return "Please enter a valid email address.";
    }

    if (trimmedEmail.length > 254) {
      return "Email address must not exceed 254 characters.";
    }

    if (password.length < 8 || password.length > 128) {
      return "Password must contain 8 to 128 characters.";
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      return "Include at least one uppercase and one lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
      return "Include at least one number in your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setIsError(true);
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const result = await registerUser({
        email: normalizedEmail,
        password,
      });

      setRegisteredEmail(normalizedEmail);
      setOtp("");
      setOtpStep(true);
      setIsError(false);
      setMessage(
        result.message || "Verification code sent. Check your email."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setIsError(true);
      setMessage("Enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyOtp({
        email: registeredEmail,
        otp: otp.trim(),
      });

      setIsError(false);
      setMessage(result.message || "Email verified successfully.");
      onRegisterSuccess();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Verification failed. Check your code and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await googleLoginUser(credential);

      setIsError(false);
      setMessage(result.message || "Google sign-in successful.");
      onRegisterSuccess();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#26372C]/45 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-heading"
        className="relative my-auto w-full max-w-md rounded-[1.75rem] border border-[#E5E1D6] bg-[#FAF8F2] px-6 py-7 shadow-2xl sm:px-9 sm:py-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close registration"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#344C3D] transition hover:bg-[#E8EDE3]"
        >
          <X size={19} />
        </button>

        {!otpStep ? (
          <>


            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="register-email"
                  className="mb-1.5 block text-sm font-medium text-[#344C3D]"
                >
                  Email address
                </label>

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="mb-1.5 block text-sm font-medium text-[#344C3D]"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77796F] hover:text-[#344C3D]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-[#77796F]">
                  Use 8–128 characters, with uppercase, lowercase, and a number.
                </p>
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="mb-1.5 block text-sm font-medium text-[#344C3D]"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((previous) => !previous)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77796F] hover:text-[#344C3D]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-1.5 text-xs ${
                      passwordsMatch ? "text-[#56734F]" : "text-[#A34F45]"
                    }`}
                  >
                    {passwordsMatch
                      ? "Passwords match."
                      : "Passwords do not match."}
                  </p>
                )}
              </div>

              {message && (
                <p
                  role="alert"
                  aria-live="polite"
                  className={`text-sm ${
                    isError ? "text-[#A34F45]" : "text-[#56734F]"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#344C3D] py-3.5 text-sm font-medium text-white transition hover:bg-[#26392D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E2E2D8]" />
              <span className="text-xs text-[#96968B]">OR</span>
              <div className="h-px flex-1 bg-[#E2E2D8]" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential) {
                    void handleGoogleSuccess(response.credential);
                  } else {
                    setIsError(true);
                    setMessage(
                      "Google did not return a credential. Please try again."
                    );
                  }
                }}
                onError={() => {
                  setIsError(true);
                  setMessage("Google sign-in failed. Please try again.");
                }}
                theme="outline"
                size="large"
                text="signup_with"
                shape="pill"
                width="320"
              />
            </div>

            {message && isError && (
              <p
                role="alert"
                aria-live="polite"
                className="mt-3 text-center text-sm text-[#A34F45]"
              >
                {message}
              </p>
            )}

            <p className="mt-5 text-center text-sm text-[#77796F]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onLogin}
                className="font-semibold text-[#344C3D] underline underline-offset-4 hover:text-[#71846B]"
              >
                Sign in
              </button>
            </p>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCE3D5] text-[#344C3D]">
              <Mail size={23} />
            </div>

            <div>
              <h2
                id="register-heading"
                className="text-2xl font-semibold tracking-tight text-[#344C3D]"
              >
                Verify your email
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77796F]">
                Enter the 6-digit verification code sent to{" "}
                <span className="font-medium text-[#344C3D]">
                  {registeredEmail}
                </span>
                .
              </p>
            </div>

            <div>
              <label
                htmlFor="register-otp"
                className="mb-1.5 block text-sm font-medium text-[#344C3D]"
              >
                Verification code
              </label>

              <input
                id="register-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                className={`${inputClass} text-center text-xl tracking-[0.5em]`}
              />
            </div>

            {message && (
              <p
                role="alert"
                aria-live="polite"
                className={`text-sm ${
                  isError ? "text-[#A34F45]" : "text-[#56734F]"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="w-full rounded-full bg-[#344C3D] py-3.5 text-sm font-medium text-white transition hover:bg-[#26392D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify email"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setOtpStep(false);
                setOtp("");
                setMessage("");
                setIsError(false);
              }}
              className="w-full text-sm font-medium text-[#56734F] underline underline-offset-4 disabled:opacity-50"
            >
              Back to registration
            </button>
          </form>
        )}
      </section>
    </div>
  );
}