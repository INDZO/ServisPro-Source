import { describe, it, expect, beforeEach } from "vitest";
import { setAuth, isAuthenticated, clearAuth } from "../src/auth/auth";

function base64UrlEncode(obj) {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function makeJwtWithExpMs(expMs) {
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncode({ exp: Math.floor(expMs / 1000) });
  return `${header}.${payload}.x`;
}

describe("auth helper", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("kada je token validan, isAuthenticated() vraca true", () => {
    const token = makeJwtWithExpMs(Date.now() + 60_000);
    setAuth({ token, role: "Client", userId: 1 });
    expect(isAuthenticated()).toBe(true);
  });

  it("posle clearAuth(), isAuthenticated() vraca false", () => {
    const token = makeJwtWithExpMs(Date.now() + 60_000);
    setAuth({ token, role: "Client", userId: 1 });
    clearAuth();
    expect(isAuthenticated()).toBe(false);
  });
});
