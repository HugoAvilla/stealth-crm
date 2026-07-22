import { describe, expect, it } from "vitest";
import {
  aggregateRecognizedInMonth,
  recognizedSaleValueInMonth,
  sumRecognizedInMonth,
  type RecognitionContext,
  type SaleForRecognition,
} from "@/lib/salesRecognition";

// Julho/2026 como mês de referência
const JULY: Pick<RecognitionContext, "monthStart" | "monthEnd"> = {
  monthStart: "2026-07-01",
  monthEnd: "2026-07-31",
};

function ctx(overrides: Partial<RecognitionContext> = {}): RecognitionContext {
  return {
    machinesById: new Map(),
    rates: [],
    boletoInstallmentsBySale: new Map(),
    monthStart: JULY.monthStart,
    monthEnd: JULY.monthEnd,
    ...overrides,
  };
}

function sale(partial: Partial<SaleForRecognition>): SaleForRecognition {
  return {
    id: 1,
    sale_date: "2026-07-10",
    is_open: false,
    total: 0,
    sale_payments: [],
    ...partial,
  };
}

describe("salesRecognition", () => {
  it("Dinheiro e Pix caem cheios no mês da venda", () => {
    const s = sale({
      sale_payments: [
        { method: "Dinheiro", amount: 1000, installments: 1, machine_id: null, brand: null },
        { method: "Pix", amount: 500, installments: 1, machine_id: null, brand: null },
      ],
    });
    expect(recognizedSaleValueInMonth(s, ctx())).toBe(1500);
  });

  it("não reconhece venda de outro mês (Dinheiro/Pix)", () => {
    const s = sale({
      sale_date: "2026-06-20",
      sale_payments: [{ method: "Pix", amount: 500, installments: 1, machine_id: null, brand: null }],
    });
    expect(recognizedSaleValueInMonth(s, ctx())).toBe(0);
  });

  it("Débito cai líquido (menos taxa de débito) no mês da venda", () => {
    const c = ctx({
      machinesById: new Map([[7, { id: 7, is_anticipated: false, debit_rate: 2 }]]),
    });
    const s = sale({
      sale_payments: [{ method: "Débito", amount: 1000, installments: 1, machine_id: 7, brand: null }],
    });
    // 1000 - 2% = 980
    expect(recognizedSaleValueInMonth(s, c)).toBe(980);
  });

  it("Crédito com maquininha antecipada cai cheio (líquido) no mês da venda", () => {
    const c = ctx({
      machinesById: new Map([[9, { id: 9, is_anticipated: true, debit_rate: null }]]),
      rates: [{ machine_id: 9, brand: null, installments: 3, rate: 5 }],
    });
    const s = sale({
      sale_payments: [{ method: "Crédito", amount: 1000, installments: 3, machine_id: 9, brand: null }],
    });
    // antecipada => valor cheio líquido: 1000 - 5% = 950
    expect(recognizedSaleValueInMonth(s, c)).toBe(950);
  });

  it("Crédito NÃO antecipado 3x conta só a parcela que vence no mês", () => {
    const c = ctx({
      machinesById: new Map([[9, { id: 9, is_anticipated: false, debit_rate: null }]]),
      rates: [{ machine_id: 9, brand: null, installments: 3, rate: 0 }],
    });
    // Venda em maio/2026, 3x. Parcelas vencem jun, jul, ago. Só 1 cai em julho.
    const s = sale({
      sale_date: "2026-05-10",
      sale_payments: [{ method: "Crédito", amount: 900, installments: 3, machine_id: 9, brand: null }],
    });
    // parcela = 900/3 = 300, uma parcela em julho
    expect(recognizedSaleValueInMonth(s, c)).toBe(300);
  });

  it("Crédito NÃO antecipado feito no próprio mês não gera parcela no mês (1ª parcela é no mês seguinte)", () => {
    const c = ctx({
      machinesById: new Map([[9, { id: 9, is_anticipated: false, debit_rate: null }]]),
      rates: [{ machine_id: 9, brand: null, installments: 3, rate: 0 }],
    });
    const s = sale({
      sale_date: "2026-07-10",
      sale_payments: [{ method: "Crédito", amount: 900, installments: 3, machine_id: 9, brand: null }],
    });
    expect(recognizedSaleValueInMonth(s, c)).toBe(0);
  });

  it("Boleto conta só as parcelas pagas dentro do mês (pelo payment_date)", () => {
    const c = ctx({
      boletoInstallmentsBySale: new Map([
        [
          1,
          [
            { sale_id: 1, payment_date: "2026-07-05", paid_amount: 500, amount: 500 },
            { sale_id: 1, payment_date: null, paid_amount: null, amount: 500 }, // não pago
            { sale_id: 1, payment_date: "2026-08-05", paid_amount: 500, amount: 500 }, // outro mês
          ],
        ],
      ]),
    });
    const s = sale({
      sale_date: "2026-05-01",
      sale_payments: [{ method: "Boleto", amount: 1500, installments: 3, machine_id: null, brand: null }],
    });
    expect(recognizedSaleValueInMonth(s, c)).toBe(500);
  });

  it("sumRecognizedInMonth separa escopo aberto/fechado/todos", () => {
    const c = ctx();
    const sales: SaleForRecognition[] = [
      sale({ id: 1, is_open: false, sale_payments: [{ method: "Pix", amount: 1000, installments: 1, machine_id: null, brand: null }] }),
      sale({ id: 2, is_open: true, sale_payments: [{ method: "Dinheiro", amount: 400, installments: 1, machine_id: null, brand: null }] }),
    ];
    expect(sumRecognizedInMonth(sales, c, "all")).toBe(1400);
    expect(sumRecognizedInMonth(sales, c, "closed")).toBe(1000);
    expect(sumRecognizedInMonth(sales, c, "open")).toBe(400);
  });

  it("venda em aberto (sem sale_payments) reconhece o total cheio no mês da venda", () => {
    const emAberto = sale({ id: 454, is_open: true, total: 10000, sale_date: "2026-07-22", sale_payments: [] });
    expect(recognizedSaleValueInMonth(emAberto, ctx())).toBe(10000);

    const outroMes = sale({ id: 455, is_open: true, total: 10000, sale_date: "2026-06-22", sale_payments: [] });
    expect(recognizedSaleValueInMonth(outroMes, ctx())).toBe(0);
  });

  it("aggregateRecognizedInMonth conta só as vendas que contribuem com valor no mês", () => {
    const c = ctx({
      machinesById: new Map([[9, { id: 9, is_anticipated: false, debit_rate: null }]]),
      rates: [{ machine_id: 9, brand: null, installments: 3, rate: 0 }],
    });
    const sales: SaleForRecognition[] = [
      // Contribui: Pix cheio no mês
      sale({ id: 1, is_open: false, sale_payments: [{ method: "Pix", amount: 1000, installments: 1, machine_id: null, brand: null }] }),
      // NÃO contribui: crédito 3x feito no mês -> 1ª parcela é mês seguinte (R$ 0 agora)
      sale({ id: 2, is_open: false, sale_date: "2026-07-15", sale_payments: [{ method: "Crédito", amount: 900, installments: 3, machine_id: 9, brand: null }] }),
    ];
    const fechadas = aggregateRecognizedInMonth(sales, c, "closed");
    expect(fechadas.valor).toBe(1000);
    expect(fechadas.quantidade).toBe(1); // só a venda #1 entra na contagem
  });
});
