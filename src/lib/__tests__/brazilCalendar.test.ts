import { describe, expect, it } from "vitest";
import {
  calculateEasterSunday,
  getBrazilCalendarEventsForDate,
  getBrazilCalendarEventsForYear,
  getPrimaryBrazilCalendarEvent,
} from "../brazilCalendar";

describe("brazilCalendar", () => {
  it("calculates Easter Sunday for 2026", () => {
    expect(calculateEasterSunday(2026).toISOString().startsWith("2026-04-05")).toBe(true);
  });

  it("includes the official Carnaval dates for 2026", () => {
    const carnivalMonday = getBrazilCalendarEventsForDate(new Date(2026, 1, 16));
    const carnivalTuesday = getBrazilCalendarEventsForDate(new Date(2026, 1, 17));

    expect(carnivalMonday.some((event) => event.name === "Carnaval")).toBe(true);
    expect(carnivalTuesday.some((event) => event.name === "Carnaval")).toBe(true);
  });

  it("includes Good Friday and Tiradentes in April 2026", () => {
    const events = getBrazilCalendarEventsForYear(2026);

    expect(events.find((event) => event.date === "2026-04-03")?.name).toBe("Paixao de Cristo");
    expect(events.find((event) => event.date === "2026-04-21")?.name).toBe("Tiradentes");
  });

  it("prioritizes a holiday when the day has official data", () => {
    const event = getPrimaryBrazilCalendarEvent(new Date(2026, 3, 21));
    expect(event?.kind).toBe("holiday");
    expect(event?.shortName).toBe("Tiradentes");
  });
});
