import { authedRequest } from "./authedRequest";

function buildReasonBody(reason) {
  const r = (reason ?? "").toString().trim();
  return JSON.stringify({ reason: r });
}

export const AdminApi = {
  async getPendingServices() {
    const res = await authedRequest("/api/admin/pending-services");
    return res.data;
  },

  async getServices({ isActive = null, isApproved = null } = {}) {
    const qs = new URLSearchParams();
    if (isActive !== null && isActive !== undefined) qs.set("isActive", String(isActive));
    if (isApproved !== null && isApproved !== undefined) qs.set("isApproved", String(isApproved));
    const url = qs.toString() ? `/api/admin/services?${qs}` : "/api/admin/services";
    const res = await authedRequest(url);
    return res.data;
  },

  async approveService(serviceId, reason = "") {
    await authedRequest(`/api/admin/services/${serviceId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildReasonBody(reason),
    });
  },

  async rejectService(serviceId, reason = "") {
    await authedRequest(`/api/admin/services/${serviceId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildReasonBody(reason),
    });
  },

  async activateService(serviceId, reason = "") {
    await authedRequest(`/api/admin/services/${serviceId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildReasonBody(reason),
    });
  },

  async deactivateService(serviceId, reason = "") {
    await authedRequest(`/api/admin/services/${serviceId}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildReasonBody(reason),
    });
  },

  async getUsers(role) {
    const qs = role ? `?role=${encodeURIComponent(role)}` : "";
    const res = await authedRequest(`/api/admin/users${qs}`);
    return res.data;
  },

  async deleteUser(userId, reason = "") {
    await authedRequest(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: buildReasonBody(reason),
    });
  },

  async getServiceTypes() {
    const res = await authedRequest("/api/admin/service-types");
    return res.data;
  },

  async createServiceType(name) {
    const res = await authedRequest("/api/admin/service-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.data;
  },

  async updateServiceType(id, name) {
    await authedRequest(`/api/admin/service-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
  },

  async deleteServiceType(id) {
    await authedRequest(`/api/admin/service-types/${id}`, { method: "DELETE" });
  },

  async getCarBrands() {
    const res = await authedRequest("/api/admin/car-brands");
    return res.data;
  },

  async createCarBrand(name) {
    const res = await authedRequest("/api/admin/car-brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.data;
  },

  async updateCarBrand(id, name) {
    await authedRequest(`/api/admin/car-brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
  },

  async deleteCarBrand(id) {
    await authedRequest(`/api/admin/car-brands/${id}`, { method: "DELETE" });
  },

  async getCarModelsByBrand(brandId) {
    const res = await authedRequest(`/api/admin/car-brands/${brandId}/models`);
    return res.data;
  },

  async createCarModel(name, carBrandId) {
    const res = await authedRequest("/api/admin/car-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, carBrandId }),
    });
    return res.data;
  },

  async updateCarModel(id, name, carBrandId) {
    await authedRequest(`/api/admin/car-models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, carBrandId }),
    });
  },

  async deleteCarModel(id) {
    await authedRequest(`/api/admin/car-models/${id}`, { method: "DELETE" });
  },

  async getCars({ clientId = null } = {}) {
    const qs = new URLSearchParams();
    if (clientId) qs.set("clientId", String(clientId));
    const url = qs.toString() ? `/api/admin/cars?${qs}` : "/api/admin/cars";
    const res = await authedRequest(url);
    return res.data;
  },

  async getAppointments({ serviceId = null, clientId = null, status = null } = {}) {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("serviceId", String(serviceId));
    if (clientId) qs.set("clientId", String(clientId));
    if (status !== null && status !== undefined) qs.set("status", String(status));
    const url = qs.toString() ? `/api/admin/appointments?${qs}` : "/api/admin/appointments";
    const res = await authedRequest(url);
    return res.data;
  },

  async getCarHistory({ serviceId = null, carId = null } = {}) {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("serviceId", String(serviceId));
    if (carId) qs.set("carId", String(carId));
    const url = qs.toString() ? `/api/admin/car-history?${qs}` : "/api/admin/car-history";
    const res = await authedRequest(url);
    return res.data;
  },

  async getReviews({ serviceId = null, clientId = null } = {}) {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("serviceId", String(serviceId));
    if (clientId) qs.set("clientId", String(clientId));
    const url = qs.toString() ? `/api/admin/reviews?${qs}` : "/api/admin/reviews";
    const res = await authedRequest(url);
    return res.data;
  },

  async deleteCar(carId) {
    await authedRequest(`/api/admin/cars/${carId}`, { method: "DELETE" });
  },

  async deleteAppointment(appointmentId) {
    await authedRequest(`/api/admin/appointments/${appointmentId}`, { method: "DELETE" });
  },

  async deleteCarHistory(carHistoryId) {
    await authedRequest(`/api/admin/car-history/${carHistoryId}`, { method: "DELETE" });
  },

  async deleteReview(reviewId) {
    await authedRequest(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
  },
};