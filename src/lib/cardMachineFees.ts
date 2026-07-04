export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeCardMachineRatePercent(ratePercent: number): number {
  const safeRate = Number.isFinite(ratePercent) ? ratePercent : 0;

  return Math.abs(safeRate) > 100 ? safeRate / 100 : safeRate;
}

export function formatCardMachineRatePercent(ratePercent: number): string {
  return normalizeCardMachineRatePercent(ratePercent).toFixed(2);
}

export function calculateCardMachineFeeAmount(amount: number, ratePercent: number): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeRate = normalizeCardMachineRatePercent(ratePercent);

  return roundCurrency((safeAmount * safeRate) / 100);
}

export function calculateCardMachineNetAmount(amount: number, ratePercent: number): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return roundCurrency(safeAmount - calculateCardMachineFeeAmount(safeAmount, ratePercent));
}
