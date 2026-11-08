import { API_BASE_URL } from "./baseUrl";
import { getAuth, handleUnauthorized } from "../auth/auth";

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

export async function authedRequest(path, options = {}) {
  const { token } = getAuth();

  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (handleUnauthorized(res)) {
    return { ok: false, status: 401, data: null };
  }

  const data = await parseJsonOrText(res);

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;

    if (typeof data === "string") {
      msg = data;
    } else if (data?.title) {
      msg = data.title;
    } else if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      const firstMsg = data.errors[firstKey]?.[0];
      if (firstMsg) msg = firstMsg;
    }

    throw new Error(msg);
  }

  return { ok: true, status: res.status, data };
}
