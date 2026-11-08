import { API_BASE_URL } from "./baseUrl";
import { getAuth, handleUnauthorized } from "../auth/auth";

function authHeaders() {
  const { token } = getAuth();
  const h = new Headers();
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

async function parseJsonOrText(res) {
  const text = await res.text().catch(() => "");
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return {};
    }
  }
  return text;
}

export const ReviewApi = {
  getMine: async (serviceId) => {
    const res = await fetch(`${API_BASE_URL}/api/review/mine/${serviceId}`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (handleUnauthorized(res)) return null;
    if (res.status === 404) return null;

    const data = await parseJsonOrText(res);
    if (!res.ok) throw new Error(typeof data === "string" ? data : `HTTP ${res.status}`);
    return data;
  },

  create: async ({ serviceId, rating, comment }) => {
    const headers = authHeaders();
    headers.set("Content-Type", "application/json");

    const payload = {
      serviceId,
      rating,
      comment: comment?.trim() ? comment.trim() : null,
    };

    const res = await fetch(`${API_BASE_URL}/api/review`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (handleUnauthorized(res)) return null;

    const data = await parseJsonOrText(res);
    if (!res.ok) throw new Error(typeof data === "string" ? data : `HTTP ${res.status}`);
    return data; 
  },

  update: async (reviewId, { rating, comment }) => {
    const headers = authHeaders();
    headers.set("Content-Type", "application/json");

    const payload = {
      rating,
      comment: comment?.trim() ? comment.trim() : null,
    };

    const res = await fetch(`${API_BASE_URL}/api/review/${reviewId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    if (handleUnauthorized(res)) return null;

    const data = await parseJsonOrText(res);
    if (!res.ok) throw new Error(typeof data === "string" ? data : `HTTP ${res.status}`);
    return data;
  },

  remove: async (reviewId) => {
    const res = await fetch(`${API_BASE_URL}/api/review/${reviewId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (handleUnauthorized(res)) return false;

    if (res.status === 204) return true;

    const data = await parseJsonOrText(res);
    if (!res.ok) throw new Error(typeof data === "string" ? data : `HTTP ${res.status}`);
    return true;
  },
};