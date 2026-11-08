import { authedRequest } from "./authedRequest";

export const ClientProfileApi = {
  get: async () => {
    const res = await authedRequest("/api/client/profile", { method: "GET" });
    return res.data; 
  },

  update: async ({ fullName }) => {
    const res = await authedRequest("/api/client/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
    return res.data; 
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await authedRequest("/api/client/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.data;
  },
};