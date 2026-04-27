import { describe, expect, it } from "vitest";
import {
  getCategoryFromMaterial,
  getHistoryRangeStart,
  getOperationalStatus,
  materialMatchesHistoryRange,
} from "../stockHistory";

describe("stockHistory helpers", () => {
  it("prefers the linked product type category", () => {
    expect(
      getCategoryFromMaterial({
        type: "INSULFILM",
        product_types: { category: "PPF" },
      })
    ).toBe("PPF");
  });

  it("falls back to material.type when relation is missing", () => {
    expect(
      getCategoryFromMaterial({
        type: "PPF",
        product_types: null,
      })
    ).toBe("PPF");
  });

  it("returns the correct operational status for a closed inactive roll", () => {
    expect(
      getOperationalStatus({
        id: 1,
        type: "PPF",
        created_at: "2026-04-20T10:00:00.000Z",
        is_active: false,
        is_open_roll: true,
      })
    ).toBe("open_closed");
  });

  it("uses the last movement date to validate the selected period", () => {
    const rangeStart = getHistoryRangeStart("1m", new Date("2026-04-26T12:00:00.000Z"));

    expect(
      materialMatchesHistoryRange(
        {
          created_at: "2025-12-01T10:00:00.000Z",
        },
        "2026-04-10T09:00:00.000Z",
        rangeStart
      )
    ).toBe(true);
  });

  it("falls back to the creation date when the material has no movement", () => {
    const rangeStart = getHistoryRangeStart("1m", new Date("2026-04-26T12:00:00.000Z"));

    expect(
      materialMatchesHistoryRange(
        {
          created_at: "2026-04-15T10:00:00.000Z",
        },
        undefined,
        rangeStart
      )
    ).toBe(true);
  });
});
