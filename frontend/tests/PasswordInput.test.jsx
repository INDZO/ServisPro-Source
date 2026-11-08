import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PasswordInput from "../src/components/PasswordInput";

describe("PasswordInput", () => {
  it("podrazumevano je type=password i dugme prikazuje 'Prikaži'", () => {
    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        placeholder="Lozinka"
        name="password"
      />
    );

    const input = screen.getByPlaceholderText("Lozinka");
    expect(input).toHaveAttribute("type", "password");

    const btn = screen.getByRole("button", { name: "Prikaži lozinku" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Prikaži");
  });

  it("klik na dugme menja type u text, a drugi klik vraca na password", async () => {
    const user = userEvent.setup();

    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        placeholder="Lozinka"
        name="password"
      />
    );

    const input = screen.getByPlaceholderText("Lozinka");

    await user.click(screen.getByRole("button", { name: "Prikaži lozinku" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sakrij lozinku" })).toHaveTextContent("Sakrij");

    await user.click(screen.getByRole("button", { name: "Sakrij lozinku" }));
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Prikaži lozinku" })).toHaveTextContent("Prikaži");
  });
});