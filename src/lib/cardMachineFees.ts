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

/** Taxa (R$) sem arredondar — para somar várias e arredondar só no total. */
export function rawCardMachineFeeAmount(amount: number, ratePercent: number): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeRate = normalizeCardMachineRatePercent(ratePercent);

  return (safeAmount * safeRate) / 100;
}

export function calculateCardMachineFeeAmount(amount: number, ratePercent: number): number {
  return roundCurrency(rawCardMachineFeeAmount(amount, ratePercent));
}

export function calculateCardMachineNetAmount(amount: number, ratePercent: number): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return roundCurrency(safeAmount - calculateCardMachineFeeAmount(safeAmount, ratePercent));
}

export interface CardPaymentForFee {
  method: string;
  amount: number;
  installments: number | null;
  machine_id: number | null;
  brand: string | null;
}

export interface MachineForFee {
  debit_rate: number | null;
}

export interface RateForFee {
  machine_id: number;
  brand: string | null;
  installments: number | null;
  rate: number;
}

/**
 * Taxa (R$) de UM pagamento em maquininha usando a taxa real configurada:
 * débito = debit_rate da máquina; crédito = taxa por parcelas/bandeira.
 * Mesma regra do card "Taxas de Maquininha" do Financeiro.
 */
export function cardMachinePaymentFee(
  p: CardPaymentForFee,
  machinesById: Map<number, MachineForFee>,
  rates: RateForFee[]
): number {
  if (p.machine_id == null) return 0;

  if (p.method === "Débito") {
    const machine = machinesById.get(p.machine_id);
    return rawCardMachineFeeAmount(p.amount, machine?.debit_rate ?? 0);
  }

  if (p.method === "Crédito") {
    const rateRecord = rates.find(
      (r) =>
        r.machine_id === p.machine_id &&
        (r.installments ?? 1) === (p.installments ?? 1) &&
        (!p.brand || !r.brand || r.brand.toLowerCase() === p.brand.toLowerCase())
    );
    return rawCardMachineFeeAmount(p.amount, rateRecord?.rate ?? 0);
  }

  return 0;
}
