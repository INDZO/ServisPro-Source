import { apiFetch } from "./baseUrl";
import { API_BASE_URL } from "./baseUrl";
import { getAuth, handleUnauthorized } from "../auth/auth";

async function requestAuthed(path, options = {}) {
  const { token } = getAuth();

  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (handleUnauthorized(res)) return null;

  const ct = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  if (ct.includes("application/json")) return JSON.parse(text || "null");
  return text;
}

export const ClientCarsApi = {
  list: ({ vin } = {}) => {
    const q = new URLSearchParams();
    if (vin) q.set("vin", vin);
    const qs = q.toString();
    return requestAuthed(`/api/client/cars${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  getById: (id) => requestAuthed(`/api/client/cars/${id}`, { method: "GET" }),

  getMileageHistory: (id) => requestAuthed(`/api/client/cars/${id}/mileage-history`, { method: "GET" }),

  create: (payload) =>
    requestAuthed(`/api/client/cars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  remove: (id) => requestAuthed(`/api/client/cars/${id}`, { method: "DELETE" }),

  getBrands: () => requestAuthed(`/api/client/cars/car-brands`, { method: "GET" }),

  getModelsByBrand: (brandId) =>
    requestAuthed(`/api/client/cars/car-brands/${brandId}/models`, { method: "GET" }),
};
