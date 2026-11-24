import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HolaPage } from "./HolaPage";

describe("HolaPage", () => {
  it("muestra el saludo Hola", () => {
    render(<HolaPage />);
    expect(screen.getByRole("heading", { name: "Hola" })).toBeInTheDocument();
  });
});
