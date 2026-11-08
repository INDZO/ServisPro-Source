import { authedRequest } from "./authedRequest";

export const ServiceCarsApi = {
  listInService: async () => {
    const res = await authedRequest("/api/service/cars/in-service", { method: "GET" });
    return res.data;
  },

  getDetailsByVin: async (vin) => {
    const v = encodeURIComponent(String(vin || "").trim());
    const res = await authedRequest(`/api/service/cars/details?vin=${v}`, { method: "GET" });
    return res.data;
  },

  getMileageHistoryByVin: async (vin) => {
    const v = encodeURIComponent(String(vin || "").trim());
    const res = await authedRequest(`/api/service/cars/mileage-history?vin=${v}`, { method: "GET" });
    return res.data;
  },
};