import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  aggregateRecognizedInMonth,
  type BoletoInstallmentForRecognition,
  type MachineForRecognition,
  type RateForRecognition,
  type RecognitionContext,
  type RecognitionMode,
  type SaleForRecognition,
} from "@/lib/salesRecognition";
import { cardMachinePaymentFee, roundCurrency } from "@/lib/cardMachineFees";

export interface SalesRecognitionResult {
  loading: boolean;
  /** Valor líquido reconhecido no mês — todas as vendas (abertas + fechadas). */
  valorTodas: number;
  /** Valor líquido reconhecido no mês — apenas vendas fechadas. */
  valorFechadas: number;
  /** Valor líquido reconhecido no mês — apenas vendas em aberto. */
  valorEmAberto: number;
  /** Quantidade de vendas que contribuem com valor no mês (mesmo conjunto do valor). */
  qtdTodas: number;
  qtdFechadas: number;
  qtdEmAberto: number;
  /** Taxa total (R$) de maquininha das vendas fechadas com data no mês. */
  taxaMaquininhaFechadas: number;
  /** Taxa (R$) de maquininha das vendas fechadas por dia ('yyyy-MM-dd'). */
  taxaMaquininhaByDay: Record<string, number>;
  refetch: () => void;
}

/**
 * Busca TODAS as vendas (não deletadas) da empresa com o necessário para
 * aplicar a regra única de reconhecimento (ver lib/salesRecognition) e
 * devolve os valores reconhecidos no mês informado.
 */
export function useSalesRecognition(
  companyId: number | null | undefined,
  month: Date,
  /** "net" (padrão, ex.: Entradas do Financeiro) desconta a taxa da maquininha;
   *  "gross" (cards da aba Vendas) mostra o valor mais bruto, sem descontar a taxa. */
  mode: RecognitionMode = "net"
): SalesRecognitionResult {
  const [loading, setLoading] = useState(true);
  const [valorTodas, setValorTodas] = useState(0);
  const [valorFechadas, setValorFechadas] = useState(0);
  const [valorEmAberto, setValorEmAberto] = useState(0);
  const [qtdTodas, setQtdTodas] = useState(0);
  const [qtdFechadas, setQtdFechadas] = useState(0);
  const [qtdEmAberto, setQtdEmAberto] = useState(0);
  const [taxaMaquininhaFechadas, setTaxaMaquininhaFechadas] = useState(0);
  const [taxaMaquininhaByDay, setTaxaMaquininhaByDay] = useState<Record<string, number>>({});

  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

  const fetchAndCompute = useCallback(async () => {
    if (!companyId) {
      setValorTodas(0);
      setValorFechadas(0);
      setValorEmAberto(0);
      setQtdTodas(0);
      setQtdFechadas(0);
      setQtdEmAberto(0);
      setTaxaMaquininhaFechadas(0);
      setTaxaMaquininhaByDay({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [salesRes, machinesRes, ratesRes, boletosRes] = await Promise.all([
        supabase
          .from("sales")
          .select(
            `id, sale_date, is_open, status, total,
             sale_payments ( method, amount, installments, machine_id, brand )`
          )
          .eq("company_id", companyId)
          .is("deleted_at", null),
        supabase
          .from("card_machines")
          .select("id, is_anticipated, debit_rate")
          .eq("company_id", companyId),
        supabase
          .from("card_machine_rates")
          .select("machine_id, brand, installments, rate")
          .eq("company_id", companyId),
        supabase
          .from("boletos")
          .select("sale_id, boleto_installments ( payment_date, paid_amount, amount )")
          .eq("company_id", companyId),
      ]);

      const sales = (salesRes.data ?? []) as unknown as SaleForRecognition[];

      const machinesById = new Map<number, MachineForRecognition>();
      (machinesRes.data ?? []).forEach((m: any) =>
        machinesById.set(m.id, { id: m.id, is_anticipated: !!m.is_anticipated, debit_rate: m.debit_rate })
      );

      const rates = (ratesRes.data ?? []) as unknown as RateForRecognition[];

      const boletoInstallmentsBySale = new Map<number, BoletoInstallmentForRecognition[]>();
      (boletosRes.data ?? []).forEach((b: any) => {
        const list: BoletoInstallmentForRecognition[] = (b.boleto_installments ?? []).map((bi: any) => ({
          sale_id: b.sale_id,
          payment_date: bi.payment_date,
          paid_amount: bi.paid_amount,
          amount: bi.amount,
        }));
        const existing = boletoInstallmentsBySale.get(b.sale_id) ?? [];
        boletoInstallmentsBySale.set(b.sale_id, [...existing, ...list]);
      });

      const ctx: RecognitionContext = {
        machinesById,
        rates,
        boletoInstallmentsBySale,
        monthStart,
        monthEnd,
      };

      const todas = aggregateRecognizedInMonth(sales, ctx, "all", mode);
      const fechadas = aggregateRecognizedInMonth(sales, ctx, "closed", mode);
      const emAberto = aggregateRecognizedInMonth(sales, ctx, "open", mode);

      // Taxa real de maquininha por dia (vendas fechadas) — mesma regra do card
      // "Taxas de Maquininha" do Financeiro: status 'Fechada' (exclui canceladas)
      // e taxa real por máquina. Soma-se a taxa CRUA por pagamento e arredonda-se
      // uma vez por agregação (por dia p/ o drawer, no mês p/ o card mensal).
      const feeByDayRaw: Record<string, number> = {};
      sales
        .filter((s) => s.status === "Fechada")
        .forEach((s) => {
          const dayFee = (s.sale_payments ?? [])
            .filter((p) => (p.method === "Crédito" || p.method === "Débito") && p.machine_id != null)
            .reduce((sum, p) => sum + cardMachinePaymentFee(p, machinesById, rates), 0);
          if (dayFee > 0) feeByDayRaw[s.sale_date] = (feeByDayRaw[s.sale_date] ?? 0) + dayFee;
        });

      // Restrito ao mês, para casar com a janela de vendas do drawer (mensal).
      const taxaByDay: Record<string, number> = {};
      let taxaFechadasMes = 0;
      for (const [day, valor] of Object.entries(feeByDayRaw)) {
        if (day < monthStart || day > monthEnd) continue;
        taxaByDay[day] = roundCurrency(valor);
        taxaFechadasMes += valor;
      }

      setValorTodas(todas.valor);
      setValorFechadas(fechadas.valor);
      setValorEmAberto(emAberto.valor);
      setQtdTodas(todas.quantidade);
      setQtdFechadas(fechadas.quantidade);
      setQtdEmAberto(emAberto.quantidade);
      setTaxaMaquininhaFechadas(roundCurrency(taxaFechadasMes));
      setTaxaMaquininhaByDay(taxaByDay);
    } catch (error) {
      console.error("Error computing sales recognition:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId, monthStart, monthEnd, mode]);

  useEffect(() => {
    fetchAndCompute();
  }, [fetchAndCompute]);

  return {
    loading,
    valorTodas,
    valorFechadas,
    valorEmAberto,
    qtdTodas,
    qtdFechadas,
    qtdEmAberto,
    taxaMaquininhaFechadas,
    taxaMaquininhaByDay,
    refetch: fetchAndCompute,
  };
}
