import { describe, expect, it } from "vitest";

import {
  lineTotalPesos,
  millisToQuantityInput,
  parseQuantityToMillis,
  quantityMillisToMg,
  saleTotals,
} from "./pricing";

describe("quantityMillisToMg", () => {
  it("converts kg, g and commercial lb", () => {
    expect(quantityMillisToMg(2500, "kg")).toBe(2_500_000);
    expect(quantityMillisToMg(125_000, "g")).toBe(125_000);
    expect(quantityMillisToMg(1000, "lb")).toBe(500_000);
  });
});

describe("lineTotalPesos", () => {
  it("computes fixed-price lines", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 600,
        quantityMillis: 6000,
        quantityUnit: "und",
        priceUnit: "und",
        priceType: "fixed",
      }),
    ).toBe(3600);
  });

  it("computes 2,5 kg at $3.200 / kg as $8.000", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 3200,
        quantityMillis: 2500,
        quantityUnit: "kg",
        priceUnit: "kg",
        priceType: "weight",
      }),
    ).toBe(8000);
  });

  it("converts grams when price is per kg", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 3200,
        quantityMillis: 125_000,
        quantityUnit: "g",
        priceUnit: "kg",
        priceType: "weight",
      }),
    ).toBe(400);
  });

  it("converts lb when price is per kg (1 lb = 500 g)", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 3200,
        quantityMillis: 1000,
        quantityUnit: "lb",
        priceUnit: "kg",
        priceType: "weight",
      }),
    ).toBe(1600);
  });

  it("converts kg when price is per lb", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 3100,
        quantityMillis: 1000,
        quantityUnit: "kg",
        priceUnit: "lb",
        priceType: "weight",
      }),
    ).toBe(6200);
  });

  it("rounds to nearest peso", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 1000,
        quantityMillis: 333,
        quantityUnit: "kg",
        priceUnit: "kg",
        priceType: "weight",
      }),
    ).toBe(333);
  });

  it("returns 0 for non-positive quantity", () => {
    expect(
      lineTotalPesos({
        unitPricePesos: 3200,
        quantityMillis: 0,
        quantityUnit: "kg",
        priceUnit: "kg",
        priceType: "weight",
      }),
    ).toBe(0);
  });
});

describe("saleTotals", () => {
  it("sums lines and keeps tax at 0", () => {
    expect(saleTotals([{ lineTotal: 8000 }, { lineTotal: 3600 }])).toEqual({
      subtotal: 11600,
      tax: 0,
      total: 11600,
    });
  });
});

describe("parseQuantityToMillis / millisToQuantityInput", () => {
  it("round-trips keypad input", () => {
    expect(parseQuantityToMillis("2,5")).toBe(2500);
    expect(millisToQuantityInput(2500)).toBe("2,5");
    expect(parseQuantityToMillis("1")).toBe(1000);
    expect(millisToQuantityInput(1000)).toBe("1");
  });
});
