import { authedRequest } from "./authedRequest";

function toLocalMidnightIso(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T00:00:00`;
}

export const ServiceCalendarApi = {
  getCalendar: async ({ year, month } = {}) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));

    const qs = q.toString();
    const res = await authedRequest(`/api/ServiceCalendar${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  closeDay: async ({ dateStr, reason } = {}) => {
    const payload = {
      date: toLocalMidnightIso(dateStr),
      reason: reason || null,
    };

    const res = await authedRequest(`/api/ServiceCalendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteClosedDay: async (id) => {
    const res = await authedRequest(`/api/ServiceCalendar/${id}`, {
      method: "DELETE",
    });
    return res.data;
  },

  decide: async ({ appointmentId, isAccepted } = {}) => {
    const q = new URLSearchParams();
    q.set("isAccepted", String(!!isAccepted));
    const res = await authedRequest(
      `/api/ServiceCalendar/${appointmentId}/decision?${q.toString()}`,
      { method: "PUT" }
    );
    return res.data;
  },

  getClosedDayId: async ({ dateStr } = {}) => {
    const q = new URLSearchParams();
    q.set("date", String(dateStr));
    const res = await authedRequest(`/api/ServiceCalendar/closed?${q.toString()}`);
    return res.data;
  },
};