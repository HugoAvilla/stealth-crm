import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  aggregateRecognizedInMonth,
  type BoletoInstallmentForRecognition,
  type MachineForRecognition,
  type RateForRecognition,
  type RecognitionContext,
  type SaleForRecognition,
} from "@/lib/salesRecognition";

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
  refetch: () => void;
}

/**
 * Busca TODAS as vendas (não deletadas) da empresa com o necessário para
 * aplicar a regra única de reconhecimento (ver lib/salesRecognition) e
 * devolve os valores reconhecidos no mês informado.
 */
export function useSalesRecognition(
  companyId: number | null | undefined,
  month: Date
): SalesRecognitionResult {
  const [loading, setLoading] = useState(true);
  const [valorTodas, setValorTodas] = useState(0);
  const [valorFechadas, setValorFechadas] = useState(0);
  const [valorEmAberto, setValorEmAberto] = useState(0);
  const [qtdTodas, setQtdTodas] = useState(0);
  const [qtdFechadas, setQtdFechadas] = useState(0);
  const [qtdEmAberto, setQtdEmAberto] = useState(0);

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
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [salesRes, machinesRes, ratesRes, boletosRes] = await Promise.all([
        supabase
          .from("sales")
          .select(
            `id, sale_date, is_open, total,
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

      const todas = aggregateRecognizedInMonth(sales, ctx, "all");
      const fechadas = aggregateRecognizedInMonth(sales, ctx, "closed");
      const emAberto = aggregateRecognizedInMonth(sales, ctx, "open");

      setValorTodas(todas.valor);
      setValorFechadas(fechadas.valor);
      setValorEmAberto(emAberto.valor);
      setQtdTodas(todas.quantidade);
      setQtdFechadas(fechadas.quantidade);
      setQtdEmAberto(emAberto.quantidade);
    } catch (error) {
      console.error("Error computing sales recognition:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId, monthStart, monthEnd]);

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
    refetch: fetchAndCompute,
  };
}
