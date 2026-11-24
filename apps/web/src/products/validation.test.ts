import { describe, expect, it } from "vitest";

import { formToCreateBody, validateProductForm } from "./validation";

describe("validateProductForm", () => {
  it("requires name, price and weight unit", () => {
    expect(
      validateProductForm({
        name: "",
        priceType: "weight",
        price: "",
        unit: "und",
        iva: "excluido",
        cost: "",
      }),
    ).toEqual({
      name: "Escribe el nombre del producto.",
      price: "Ingresa un precio válido.",
      unit: "Elige g, kg o lb.",
    });
  });

  it("accepts a valid weight product", () => {
    expect(
      validateProductForm({
        name: "Papa",
        priceType: "weight",
        price: "4500",
        unit: "kg",
        iva: "excluido",
        cost: "",
      }),
    ).toEqual({});
  });
});

describe("formToCreateBody", () => {
  it("omits cost unless includeCost is true", () => {
    const values = {
      name: "Huevos",
      priceType: "fixed" as const,
      price: "600",
      unit: "und" as const,
      iva: "excluido" as const,
      cost: "400",
    };
    expect(formToCreateBody(values, false)).not.toHaveProperty("cost");
    expect(formToCreateBody(values, true).cost).toBe("400");
  });
});
