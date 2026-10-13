import { apiRequest } from "../api/client";

const AUTH_BASE_PATH = "/api/auth";

export interface AuthResponse {
  message: string;
  id?: number;
  name?: string;
  email: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface GoogleLoginData {
  credential: string;
}

export interface VerifyOtpData {
  email: string;
  otp: string;
}

function authRequest<T>(
  endpoint: string,
  data: RegisterData | LoginData | GoogleLoginData | VerifyOtpData,
): Promise<T> {
  return apiRequest<T>(`${AUTH_BASE_PATH}${endpoint}`, {
    method: "POST",
    body: data,
  });
}

export function registerUser(data: RegisterData) {
  return authRequest<AuthResponse>("/register", data);
}

export function loginUser(data: LoginData) {
  return authRequest<AuthResponse>("/login", data);
}

export function googleLoginUser(credential: string) {
  return authRequest<AuthResponse>("/google", { credential });
}

export function verifyOtp(data: VerifyOtpData) {
  return authRequest<AuthResponse>("/verify-otp", data);
}