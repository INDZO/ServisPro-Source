import { authedRequest } from "./authedRequest";

export const ServiceAppointmentsApi = {
  daily: async ({ filter } = {}) => {
    const q = new URLSearchParams();
    if (filter) q.set("filter", filter);
    const qs = q.toString();
    const res = await authedRequest(
      `/api/service/appointments/daily${qs ? `?${qs}` : ""}`
    );
    return res.data;
  },

  arrived: async (id) => {
    const res = await authedRequest(`/api/service/appointments/${id}/arrived`, {
      method: "POST",
    });
    return res.data;
  },

  start: async (id) => {
    const res = await authedRequest(`/api/service/appointments/${id}/start`, {
      method: "POST",
    });
    return res.data;
  },

  pause: async (id) => {
    const res = await authedRequest(`/api/service/appointments/${id}/pause`, {
      method: "POST",
    });
    return res.data;
  },

  complete: async (appointmentId, model) => {
    const payload = {
      title: model?.title ?? "",
      description: model?.description ?? "",
      mileage: Number(model?.mileage ?? 0) || 0,
    };

    const res = await authedRequest(
      `/api/service/appointments/${appointmentId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  cancel: async (id, reason) => {
    const res = await authedRequest(`/api/service/appointments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ?? null),
    });
    return res.data;
  },

  reject: async (id, reason) => {
    const res = await authedRequest(`/api/service/appointments/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? "" }),
    });
    return res.data;
  },
};
