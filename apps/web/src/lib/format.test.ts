import { describe, expect, it } from "vitest";

import { formatMoney, formatProductPrice } from "./format";

describe("formatMoney", () => {
  it("formats Colombian pesos without cents", () => {
    expect(formatMoney(184500)).toBe("$184.500");
    expect(formatMoney("3200")).toBe("$3.200");
  });
});

describe("formatProductPrice", () => {
  it("labels fixed and weight prices", () => {
    expect(formatProductPrice(600, "fixed", "und")).toBe("$600 c/u");
    expect(formatProductPrice(3200, "weight", "kg")).toBe("$3.200 / kg");
  });
});
