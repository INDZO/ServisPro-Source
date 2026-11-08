import { authedRequest } from "./authedRequest";


export const ServiceProfileApi = {
  get: async () => {
    const res = await authedRequest("/api/ServiceProfile", { method: "GET" });
    return res.data;
  },

  update: async ({
    name,
    pib,
    description,
    adress,
    city,
    workingHours,
    workingDays,
    ownerFullName,
    phoneNumber,
    googleMapsLink,
  }) => {
    const res = await authedRequest("/api/ServiceProfile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        pib,
        description,
        adress,
        city,
        workingHours,
        workingDays,
        ownerFullName,
        phoneNumber,
        googleMapsLink,
      }),
    });
    return res.data; 
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await authedRequest("/api/ServiceProfile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.data;
  },

  updateServiceTypes: async (typeIds) => {
    const res = await authedRequest("/api/ServiceProfile/service-types", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeIds }),
    });
    return res.data; 
  },
};