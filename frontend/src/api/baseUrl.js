import { demoFetch } from "../demo/demoFetch";
export const DEMO_MODE = import.meta.env.MODE === "demo";
export function apiFetch(...args) { return DEMO_MODE ? demoFetch(...args) : fetch(...args); }
export const API_BASE_URL = DEMO_MODE ? "" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:5080").replace(/\/$/, "");
