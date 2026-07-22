import { addMonths, format } from "date-fns";
import { calculateCardMachineNetAmount } from "./cardMachineFees";

// ===================================================
// Regra ÚNICA de reconhecimento de valor de venda por mês.
// Usada tanto pela aba Vendas quanto pelo card Entradas
// do Financeiro para nunca mais divergirem.
//
// Valores são LÍQUIDOS (descontada a taxa da maquininha).
// Regras por forma de pagamento (quanto "cai" no mês M):
//   - Dinheiro / Pix / Débito .......... valor cheio, no mês da venda
//   - Crédito (maquininha antecipada) .. valor cheio, no mês da venda
//   - Crédito (não antecipada) ......... só a parcela que vence no mês
//   - Boleto ........................... só a(s) parcela(s) paga(s) no mês
// Vendas na lixeira (deleted_at) nunca devem ser passadas aqui.
// ===================================================

export interface PaymentForRecognition {
  method: string;
  amount: number;
  installments: number | null;
  machine_id: number | null;
  brand: string | null;
}

export interface SaleForRecognition {
  id: number;
  sale_date: string; // 'yyyy-MM-dd'
  is_open: boolean;
  total: number;
  sale_payments?: PaymentForRecognition[] | null;
}

export interface MachineForRecognition {
  id: number;
  is_anticipated: boolean;
  debit_rate: number | null;
}

export interface RateForRecognition {
  machine_id: number;
  brand: string | null;
  installments: number | null;
  rate: number;
}

export interface BoletoInstallmentForRecognition {
  sale_id: number;
  payment_date: string | null; // 'yyyy-MM-dd' quando pago
  paid_amount: number | null;
  amount: number;
}

export interface RecognitionContext {
  machinesById: Map<number, MachineForRecognition>;
  rates: RateForRecognition[];
  boletoInstallmentsBySale: Map<number, BoletoInstallmentForRecognition[]>;
  monthStart: string; // 'yyyy-MM-dd'
  monthEnd: string; // 'yyyy-MM-dd'
}

function inMonth(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function findCreditRate(
  ctx: RecognitionContext,
  machineId: number | null,
  installments: number | null,
  brand: string | null
): number {
  if (machineId == null) return 0;
  const rate = ctx.rates.find(
    (r) =>
      r.machine_id === machineId &&
      (r.installments ?? 1) === (installments ?? 1) &&
      (!brand || !r.brand || r.brand.toLowerCase() === brand.toLowerCase())
  );
  return rate?.rate ?? 0;
}

/** Valor líquido reconhecido no mês para UM pagamento de uma venda. */
export function recognizedPaymentInMonth(
  sale: SaleForRecognition,
  p: PaymentForRecognition,
  ctx: RecognitionContext
): number {
  const saleInMonth = inMonth(sale.sale_date, ctx.monthStart, ctx.monthEnd);

  switch (p.method) {
    case "Dinheiro":
    case "Pix":
      return saleInMonth ? p.amount : 0;

    case "Débito": {
      const machine = p.machine_id != null ? ctx.machinesById.get(p.machine_id) : undefined;
      const net = calculateCardMachineNetAmount(p.amount, machine?.debit_rate ?? 0);
      return saleInMonth ? net : 0;
    }

    case "Crédito": {
      const machine = p.machine_id != null ? ctx.machinesById.get(p.machine_id) : undefined;
      const rate = findCreditRate(ctx, p.machine_id, p.installments, p.brand);
      const net = calculateCardMachineNetAmount(p.amount, rate);

      // Antecipada: valor cheio (líquido) no mês da venda.
      if (machine?.is_anticipated) {
        return saleInMonth ? net : 0;
      }

      // Não antecipada: só a(s) parcela(s) que vence(m) no mês.
      const n = Math.max(1, p.installments ?? 1);
      const parcela = net / n;
      const base = new Date(sale.sale_date + "T12:00:00");
      let parcelasNoMes = 0;
      for (let i = 1; i <= n; i++) {
        const dueStr = format(addMonths(base, i), "yyyy-MM-dd");
        if (inMonth(dueStr, ctx.monthStart, ctx.monthEnd)) parcelasNoMes++;
      }
      return parcela * parcelasNoMes;
    }

    case "Boleto": {
      const insts = ctx.boletoInstallmentsBySale.get(sale.id) ?? [];
      return insts
        .filter((bi) => bi.payment_date && inMonth(bi.payment_date, ctx.monthStart, ctx.monthEnd))
        .reduce((sum, bi) => sum + (bi.paid_amount ?? bi.amount), 0);
    }

    default:
      // Forma desconhecida: trata como recebimento à vista no mês da venda.
      return saleInMonth ? p.amount : 0;
  }
}

/** Valor líquido reconhecido no mês para uma venda inteira. */
export function recognizedSaleValueInMonth(
  sale: SaleForRecognition,
  ctx: RecognitionContext
): number {
  const payments = sale.sale_payments ?? [];

  // Venda sem pagamentos detalhados (ex.: venda em aberto, que não grava
  // sale_payments): reconhece o total cheio no mês da venda. As regras finas
  // por forma de pagamento passam a valer quando a venda é fechada.
  if (payments.length === 0) {
    return inMonth(sale.sale_date, ctx.monthStart, ctx.monthEnd) ? sale.total : 0;
  }

  return payments.reduce((sum, p) => sum + recognizedPaymentInMonth(sale, p, ctx), 0);
}

export type SaleScope = "all" | "closed" | "open";

function matchesScope(sale: SaleForRecognition, scope: SaleScope): boolean {
  if (scope === "closed") return sale.is_open === false;
  if (scope === "open") return sale.is_open === true;
  return true;
}

/** Soma o valor reconhecido no mês para o conjunto de vendas do escopo. */
export function sumRecognizedInMonth(
  sales: SaleForRecognition[],
  ctx: RecognitionContext,
  scope: SaleScope = "all"
): number {
  return sales
    .filter((s) => matchesScope(s, scope))
    .reduce((sum, s) => sum + recognizedSaleValueInMonth(s, ctx), 0);
}

export interface RecognitionAggregate {
  /** Valor líquido reconhecido no mês. */
  valor: number;
  /** Quantidade de vendas que efetivamente contribuem com valor no mês. */
  quantidade: number;
}

/**
 * Agrega valor + quantidade no mês, contando SÓ as vendas que contribuem
 * com valor (> 0). Assim número e R$ sempre falam do mesmo conjunto.
 */
export function aggregateRecognizedInMonth(
  sales: SaleForRecognition[],
  ctx: RecognitionContext,
  scope: SaleScope = "all"
): RecognitionAggregate {
  let valor = 0;
  let quantidade = 0;
  for (const s of sales) {
    if (!matchesScope(s, scope)) continue;
    const v = recognizedSaleValueInMonth(s, ctx);
    if (v > 0) {
      valor += v;
      quantidade += 1;
    }
  }
  return { valor, quantidade };
}
