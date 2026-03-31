export const CLIENT_ORIGIN_OPTIONS = [
  "Instagram",
  "Google",
  "Indicação",
  "Passante",
] as const;

export const CAC_GENERAL_ORIGIN = "Geral";
export const UNKNOWN_CLIENT_ORIGIN = "Não informado";

export const CAC_ORIGIN_OPTIONS = [
  CAC_GENERAL_ORIGIN,
  ...CLIENT_ORIGIN_OPTIONS,
] as const;

export type ClientOriginOption = (typeof CLIENT_ORIGIN_OPTIONS)[number];
export type CacOriginOption = (typeof CAC_ORIGIN_OPTIONS)[number];

export function normalizeClientOrigin(origin: string | null | undefined) {
  return origin?.trim() || UNKNOWN_CLIENT_ORIGIN;
}

export function normalizeCacOrigin(origin: string | null | undefined) {
  return origin?.trim() || CAC_GENERAL_ORIGIN;
}
