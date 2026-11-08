import { apiFetch } from "./baseUrl";
import { API_BASE_URL } from "./baseUrl";

async function request(path) {
  const res = await apiFetch(`${API_BASE_URL}${path}`);

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!isJson) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Očekivao sam JSON, ali sam dobio: ${ct || "unknown"} | ${text.slice(0, 140)}...`
    );
  }

  return await res.json();
}

function buildListQuery(params) {
  const q = new URLSearchParams();

  if (params.city) q.set("city", params.city);
  if (params.search) q.set("search", params.search);
  if (params.workingDay) q.set("workingDay", params.workingDay);

  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortDirection) q.set("sortDirection", params.sortDirection);

  q.set("pageNumber", String(params.pageNumber || 1));
  q.set("pageSize", String(params.pageSize || 4));

  (params.serviceTypeIds || []).forEach((id) => q.append("serviceTypeIds", String(id)));

  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export function getPublicServices(params) {
  const qs = buildListQuery(params || {});
  return request(`/api/PublicServices${qs}`);
}

export function getServiceTypes() {
  return request(`/api/auth/usluge`);
}

export function getServiceDetails(serviceId, reviewQuery) {
  const q = new URLSearchParams();

  if (reviewQuery && reviewQuery.ratingFilter) q.set("ratingFilter", String(reviewQuery.ratingFilter));
  if (reviewQuery && reviewQuery.sortBy) q.set("sortBy", reviewQuery.sortBy);
  if (reviewQuery && reviewQuery.sortDirection) q.set("sortDirection", reviewQuery.sortDirection);

  const qs = q.toString();
  return request(`/api/PublicServices/${serviceId}${qs ? `?${qs}` : ""}`);
}
