const LS_TOKEN = "token";
const LS_ROLE = "role";
const LS_USER_ID = "userId";
const LS_TOKEN_EXP_MS = "tokenExpMs";
const SS_LOGOUT_REASON = "authLogoutReason";

let _initDone = false;
let _logoutTimerId = null;


function _base64UrlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  try {
    return decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return atob(padded);
  }
}

function _parseJwt(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadJson = _base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function _getExpMsFromToken(token) {
  const payload = _parseJwt(token);
  if (!payload || !payload.exp) return null; 
  return payload.exp * 1000; 
}


export function getAuth() {
  return {
    token: localStorage.getItem(LS_TOKEN) || "",
    role: localStorage.getItem(LS_ROLE) || "",
    userId: localStorage.getItem(LS_USER_ID) || "",
    tokenExpMs: Number(localStorage.getItem(LS_TOKEN_EXP_MS) || 0) || 0,
  };
}

export function isAuthenticated() {
  const token = localStorage.getItem(LS_TOKEN) || "";
  if (!token) return false;

  const expMs = Number(localStorage.getItem(LS_TOKEN_EXP_MS) || 0) || 0;
  if (expMs && Date.now() >= expMs) return false;

  return true;
}

export function clearAuth() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_ROLE);
  localStorage.removeItem(LS_USER_ID);
  localStorage.removeItem(LS_TOKEN_EXP_MS);

  _clearLogoutTimer();

  window.dispatchEvent(new Event("auth:changed"));
}

function _clearLogoutTimer() {
  if (_logoutTimerId) {
    clearTimeout(_logoutTimerId);
    _logoutTimerId = null;
  }
}

function _scheduleLogout(expMs) {
  _clearLogoutTimer();

  if (!expMs) return;

  const SKEW_MS = 30_000;
  const delay = Math.max(0, expMs - Date.now() - SKEW_MS);

  _logoutTimerId = setTimeout(() => {
    sessionStorage.setItem(SS_LOGOUT_REASON, "expired");
    clearAuth();
  }, delay);
}

export function logoutIfExpired() {
  const token = localStorage.getItem(LS_TOKEN) || "";
  if (!token) return false;

  let expMs = Number(localStorage.getItem(LS_TOKEN_EXP_MS) || 0) || 0;
  if (!expMs) {
    const extracted = _getExpMsFromToken(token);
    if (extracted) {
      expMs = extracted;
      localStorage.setItem(LS_TOKEN_EXP_MS, String(expMs));
    }
  }

  if (expMs && Date.now() >= expMs) {
    sessionStorage.setItem(SS_LOGOUT_REASON, "expired");
    clearAuth();
    return true;
  }

  if (expMs) _scheduleLogout(expMs);

  return false;
}

export function setAuth({ token, role, userId }) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  if (role !== undefined) localStorage.setItem(LS_ROLE, role || "");
  if (userId !== undefined) localStorage.setItem(LS_USER_ID, String(userId ?? ""));

  const expMs = _getExpMsFromToken(token || ""); 
  if (expMs) {
    localStorage.setItem(LS_TOKEN_EXP_MS, String(expMs));
    _scheduleLogout(expMs);
  } else {
    localStorage.removeItem(LS_TOKEN_EXP_MS);
    _clearLogoutTimer();
  }

  sessionStorage.removeItem(SS_LOGOUT_REASON);

  window.dispatchEvent(new Event("auth:changed"));
}

export function handleUnauthorized(response) {
  if (!response) return false;
  if (response.status === 401) {
    sessionStorage.setItem(SS_LOGOUT_REASON, "unauthorized");
    clearAuth();
    return true;
  }
  return false;
}

export function initAuth() {
  if (_initDone) return;
  _initDone = true;

  logoutIfExpired();

  const onStorage = (e) => {
    if (
      e.key === LS_TOKEN ||
      e.key === LS_ROLE ||
      e.key === LS_USER_ID ||
      e.key === LS_TOKEN_EXP_MS
    ) {
      logoutIfExpired();
      window.dispatchEvent(new Event("auth:changed"));
    }
  };

  window.addEventListener("storage", onStorage);
}

initAuth();