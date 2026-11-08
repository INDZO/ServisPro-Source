import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "../src/components/ProtectedRoute";

vi.mock("../src/auth/auth", () => ({
  isAuthenticated: vi.fn(),
}));

import { isAuthenticated } from "../src/auth/auth";

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("kad nije ulogovan, ide na /uloguj-se", () => {
    isAuthenticated.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/uloguj-se" element={<div>LOGIN</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>ADMIN</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });

  it("kad je ulogovan, prikazuje children", () => {
    isAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>ADMIN</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });
});
