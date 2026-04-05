export const ORIGIN_OPTIONS = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Indicação",
  "Passante",
] as const;

export type ClientOrigin = typeof ORIGIN_OPTIONS[number];

export const CAC_ORIGIN_OPTIONS = [
  ...ORIGIN_OPTIONS,
  "Geral",
] as const;

export type CacOrigin = typeof CAC_ORIGIN_OPTIONS[number];
