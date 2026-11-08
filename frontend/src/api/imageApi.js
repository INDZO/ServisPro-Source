import { API_BASE_URL } from "./baseUrl";

async function parseResponse(res) {
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  try { return JSON.parse(text || "{}"); } catch { return text; }
}

export const ImageApi = {
  upload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/Image/upload`, {
      method: "POST",
      body: fd,
    });

    return parseResponse(res);
  },
};