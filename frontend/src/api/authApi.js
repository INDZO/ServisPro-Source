import { API_BASE_URL } from "./baseUrl";

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return JSON.parse(text || "{}");
  return text;
}

export const AuthApi = {
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  registerUser: (payload) =>
    request("/api/auth/register-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  createClientProfile: (payload) =>
    request("/api/auth/create-client-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  createServiceProfile: (payload) =>
    request("/api/auth/create-service-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  verifyEmail: (payload) =>
    request("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  resendOtp: (email) =>
    request("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: "" }),
    }),

  getServiceTypes: () => request("/api/auth/usluge", { method: "GET" }),

  forgotPassword: (email) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

  verifyResetOtp: (payload) =>
    request("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload) =>
    request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};