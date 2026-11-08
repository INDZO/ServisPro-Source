import { authedRequest } from "./authedRequest";

export const ServiceCarHistoryApi = {
  listMyWork: async () => {
    const res = await authedRequest("/api/ServiceCarHistory", { method: "GET" });
    return res.data;
  },

  updateWork: async (id, payload) => {
    const res = await authedRequest(`/api/ServiceCarHistory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return res.data;
  },
};