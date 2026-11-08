import { API_BASE_URL } from "./baseUrl";
import { getAuth, handleUnauthorized } from "../auth/auth";

async function requestAuthed(path, options = {}) {
  const { token } = getAuth();

  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (handleUnauthorized(res)) return null;

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return JSON.parse(text || "{}");
  return text;
}

export const ChatApi = {
  getConversations: () => requestAuthed("/api/chat/conversations", { method: "GET" }),

  getMessages: (conversationId) =>
    requestAuthed(`/api/chat/${conversationId}/messages`, { method: "GET" }),

  sendMessage: ({ conversationId, receiverUserId, messageText }) =>
    requestAuthed("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, receiverUserId, messageText }),
    }),

  getBetween: ({ serviceUserId, clientUserId }) =>
    requestAuthed(`/api/chat/between?serviceUserId=${serviceUserId}&clientUserId=${clientUserId}`, {
      method: "GET",
    }),
};
