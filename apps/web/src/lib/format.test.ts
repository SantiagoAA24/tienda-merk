import { describe, expect, it } from "vitest";

import {
  formatInvoiceNumber,
  formatLongDate,
  formatMoney,
  formatProductPrice,
  formatQuantity,
  formatShortDate,
  formatTime,
} from "./format";

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

describe("formatQuantity", () => {
  it("formats quantities with comma and unit", () => {
    expect(formatQuantity(2.5, "kg")).toBe("2,5 kg");
    expect(formatQuantity(1, "und")).toBe("1 und");
    expect(formatQuantity(18.5, "kg")).toBe("18,5 kg");
  });

  it("accepts millis of the unit", () => {
    expect(formatQuantity(2500, "kg", { asMillis: true })).toBe("2,5 kg");
  });
});

describe("formatTime", () => {
  it("formats afternoon time with p. m.", () => {
    const date = new Date(2025, 10, 21, 19, 42, 0);
    expect(formatTime(date)).toBe("7:42 p. m.");
  });

  it("formats morning time with a. m.", () => {
    const date = new Date(2025, 10, 21, 7, 5, 0);
    expect(formatTime(date)).toBe("7:05 a. m.");
  });
});

describe("formatShortDate", () => {
  it("formats short Colombian Spanish date", () => {
    const date = new Date(2025, 10, 21, 12, 0, 0);
    expect(formatShortDate(date)).toBe("Vie 21 nov");
  });
});

describe("formatLongDate", () => {
  it("formats long Colombian Spanish date", () => {
    const date = new Date("2026-11-21T15:00:00-05:00");
    expect(formatLongDate(date)).toMatch(/sábado.*21.*noviembre/i);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads consecutive with FE prefix", () => {
    expect(formatInvoiceNumber(231)).toBe("FE-0231");
    expect(formatInvoiceNumber("232")).toBe("FE-0232");
  });
});
