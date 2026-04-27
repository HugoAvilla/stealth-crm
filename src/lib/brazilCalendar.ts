import { addDays, format, set } from "date-fns";

export type BrazilCalendarEventKind = "holiday" | "optional";

export interface BrazilCalendarEvent {
  date: string;
  name: string;
  shortName: string;
  kind: BrazilCalendarEventKind;
}

interface EventSeed {
  month: number;
  day: number;
  name: string;
  shortName: string;
  kind: BrazilCalendarEventKind;
}

export const BRAZIL_CALENDAR_EVENT_STYLES: Record<
  BrazilCalendarEventKind,
  {
    dayClass: string;
    chipClass: string;
    dotClass: string;
    legendLabel: string;
  }
> = {
  holiday: {
    dayClass: "border-rose-500/40 bg-rose-500/10",
    chipClass: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    dotClass: "bg-rose-500/20 border border-rose-500/30",
    legendLabel: "Feriado nacional",
  },
  optional: {
    dayClass: "border-amber-500/40 bg-amber-500/10",
    chipClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    dotClass: "bg-amber-500/20 border border-amber-500/30",
    legendLabel: "Ponto facultativo / data oficial",
  },
};

const FIXED_EVENTS: EventSeed[] = [
  {
    month: 0,
    day: 1,
    name: "Confraternizacao Universal",
    shortName: "Ano Novo",
    kind: "holiday",
  },
  {
    month: 3,
    day: 21,
    name: "Tiradentes",
    shortName: "Tiradentes",
    kind: "holiday",
  },
  {
    month: 4,
    day: 1,
    name: "Dia Mundial do Trabalho",
    shortName: "Trabalho",
    kind: "holiday",
  },
  {
    month: 8,
    day: 7,
    name: "Independencia do Brasil",
    shortName: "Independencia",
    kind: "holiday",
  },
  {
    month: 9,
    day: 12,
    name: "Nossa Senhora Aparecida",
    shortName: "Aparecida",
    kind: "holiday",
  },
  {
    month: 10,
    day: 2,
    name: "Finados",
    shortName: "Finados",
    kind: "holiday",
  },
  {
    month: 10,
    day: 15,
    name: "Proclamacao da Republica",
    shortName: "Republica",
    kind: "holiday",
  },
  {
    month: 10,
    day: 20,
    name: "Dia Nacional de Zumbi e da Consciencia Negra",
    shortName: "Consciencia Negra",
    kind: "holiday",
  },
  {
    month: 11,
    day: 25,
    name: "Natal",
    shortName: "Natal",
    kind: "holiday",
  },
];

const EXTRA_OFFICIAL_EVENTS_BY_YEAR: Record<number, EventSeed[]> = {
  2026: [
    {
      month: 3,
      day: 20,
      name: "Ponto facultativo anterior a Tiradentes",
      shortName: "Ponto facult.",
      kind: "optional",
    },
    {
      month: 5,
      day: 5,
      name: "Ponto facultativo apos Corpus Christi",
      shortName: "Ponto facult.",
      kind: "optional",
    },
    {
      month: 9,
      day: 28,
      name: "Dia do Servidor Publico federal",
      shortName: "Servidor",
      kind: "optional",
    },
    {
      month: 11,
      day: 24,
      name: "Vespera de Natal (apos 13h)",
      shortName: "Natal 13h",
      kind: "optional",
    },
    {
      month: 11,
      day: 31,
      name: "Vespera de Ano Novo (apos 13h)",
      shortName: "Ano Novo 13h",
      kind: "optional",
    },
  ],
};

function makeLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function toEvent(date: Date, data: Omit<BrazilCalendarEvent, "date">): BrazilCalendarEvent {
  return {
    date: format(date, "yyyy-MM-dd"),
    ...data,
  };
}

export function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return set(new Date(year, month - 1, day), {
    hours: 12,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
}

export function getBrazilCalendarEventsForYear(year: number): BrazilCalendarEvent[] {
  const easterSunday = calculateEasterSunday(year);

  const movableEvents: BrazilCalendarEvent[] = [
    toEvent(addDays(easterSunday, -48), {
      name: "Carnaval",
      shortName: "Carnaval",
      kind: "optional",
    }),
    toEvent(addDays(easterSunday, -47), {
      name: "Carnaval",
      shortName: "Carnaval",
      kind: "optional",
    }),
    toEvent(addDays(easterSunday, -46), {
      name: "Quarta-feira de Cinzas (ate 14h)",
      shortName: "Cinzas 14h",
      kind: "optional",
    }),
    toEvent(addDays(easterSunday, -2), {
      name: "Paixao de Cristo",
      shortName: "Paixao",
      kind: "holiday",
    }),
    toEvent(addDays(easterSunday, 60), {
      name: "Corpus Christi",
      shortName: "Corpus Christi",
      kind: "optional",
    }),
  ];

  const fixedEvents = FIXED_EVENTS.map((event) =>
    toEvent(makeLocalDate(year, event.month, event.day), event)
  );

  const extraEvents = (EXTRA_OFFICIAL_EVENTS_BY_YEAR[year] || []).map((event) =>
    toEvent(makeLocalDate(year, event.month, event.day), event)
  );

  return [...fixedEvents, ...movableEvents, ...extraEvents].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
}

export function getBrazilCalendarEventsForDate(date: Date): BrazilCalendarEvent[] {
  const dayKey = format(date, "yyyy-MM-dd");
  return getBrazilCalendarEventsForYear(date.getFullYear()).filter(
    (event) => event.date === dayKey
  );
}

export function getPrimaryBrazilCalendarEvent(
  date: Date
): BrazilCalendarEvent | null {
  const events = getBrazilCalendarEventsForDate(date);
  if (!events.length) return null;

  return (
    events.find((event) => event.kind === "holiday") ??
    events.find((event) => event.kind === "optional") ??
    null
  );
}

export function getBrazilCalendarTitle(date: Date): string | undefined {
  const events = getBrazilCalendarEventsForDate(date);
  if (!events.length) return undefined;
  return events.map((event) => event.name).join(" • ");
}
