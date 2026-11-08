import { authedRequest } from "./authedRequest";

function toLocalMidnightIso(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T00:00:00`;
}

function normalizeTimeToTimeSpan(timeStr) {
  if (!timeStr) return null;
  const t = String(timeStr).trim();
  if (!t) return null;

  const parts = t.split(":");
  if (parts.length === 2)
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
  if (parts.length === 3)
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  return null; 
}

export const ClientAppointmentsApi = {
  list: async ({ status } = {}) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    const qs = q.toString();
    const res = await authedRequest(`/api/client/appointments${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  cancel: async ({ id, reason } = {}) => {
    const res = await authedRequest(`/api/client/appointments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || null }),
    });
    return res.data;
  },

  getServiceCalendar: async (serviceId) => {
    const res = await authedRequest(
      `/api/client/appointments/services/${serviceId}/calendar`,
      { method: "GET" }
    );
    return res.data;
  },

  create: async ({ serviceId, carId, serviceTypeId, dateStr, timeStr, description } = {}) => {
    const payload = {
      serviceId: Number(serviceId),
      carId: Number(carId),
      serviceTypeId: Number(serviceTypeId),
      appointmentDate: toLocalMidnightIso(dateStr),
      appointmentTime: normalizeTimeToTimeSpan(timeStr),
      description: description || null,
    };

    const res = await authedRequest(`/api/client/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};