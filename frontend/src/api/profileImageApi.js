import { authedRequest } from "./authedRequest";

export const ProfileImageApi = {
  upload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await authedRequest("/api/Image/profile", {
      method: "POST",
      body: fd,
    });

    return res.data;
  },

  remove: async () => {
    const res = await authedRequest("/api/Image/profile", { method: "DELETE" });
    return res.data;
  },
};