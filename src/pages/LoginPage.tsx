
import { useState } from "react";
import type { FormEvent } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { loginUser, googleLoginUser } from "../services/auth";

interface LoginPageProps {
  onClose: () => void;
  onRegister: () => void;
  onLoginSuccess: () => void;
}

export default function LoginPage({
  onClose,
  onRegister,
  onLoginSuccess,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-[#E2E2D8] bg-white/70 px-4 py-3 text-sm text-[#30382F] outline-none transition placeholder:text-[#A4A49A] focus:border-[#71846B] focus:ring-2 focus:ring-[#DCE3D5]";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSuccess(false);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setSuccess(false);
      setMessage("Please enter your password.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const result = await loginUser({
        email: normalizedEmail,
        password,
      });

      setSuccess(true);
      setMessage(result.message || "Login successful!");
      onLoginSuccess();
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const result = await googleLoginUser(credential);

      setSuccess(true);
      setMessage(result.message || "Google sign-in successful!");
      onLoginSuccess();
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#26372C]/45 p-4 backdrop-blur-sm">
      <div className="relative my-auto w-full max-w-md rounded-[2rem] border border-[#E5E1D6] bg-[#FAF8F2] px-7 py-9 shadow-2xl sm:px-10 sm:py-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-[#344C3D] transition hover:bg-[#E8EDE3]"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm text-[#344C3D]"
            >
              Email address
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm text-[#344C3D]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77796F] transition hover:text-[#344C3D]"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${
                success ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#344C3D] py-3.5 text-sm font-medium text-white transition hover:bg-[#26392D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-[#E2E2D8]" />
          <span className="mx-4 whitespace-nowrap text-xs uppercase tracking-[0.15em] text-[#96968B]">
            or continue with
          </span>
          <div className="flex-grow border-t border-[#E2E2D8]" />
        </div>

        <div className="flex w-full justify-center">
          <GoogleLogin
            onSuccess={(response) => {
              if (response.credential) {
                void handleGoogleSuccess(response.credential);
              } else {
                setSuccess(false);
                setMessage(
                  "Google did not return a credential. Please try again."
                );
              }
            }}
            onError={() => {
              setSuccess(false);
              setMessage("Google sign-in failed. Please try again.");
            }}
            theme="outline"
            size="large"
            text="continue_with"
            shape="pill"
            width="320"
          />
        </div>

        <p className="mt-7 text-center text-sm text-[#77796F]">
          New to YourArogyum?{" "}
          <button
            type="button"
            onClick={onRegister}
            className="font-semibold text-[#344C3D] underline underline-offset-4 transition hover:text-[#71846B]"
          >
            Create an account
          </button>
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-[#96968B]">
          Your health journey, your pace. Your information deserves care.
        </p>
      </div>
    </div>
  );
}
