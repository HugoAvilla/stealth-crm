const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://msdpmhtdjyoqdmjwunkm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  try {
    console.log("=== LENDO ÚLTIMAS 5 VENDAS ===");
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, total, status, is_open, sale_date, client_id')
      .order('id', { ascending: false })
      .limit(5);

    if (salesError) throw salesError;
    console.log(JSON.stringify(sales, null, 2));

    console.log("\n=== LENDO ÚLTIMAS 5 TRANSAÇÕES ===");
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, name, amount, type, is_paid, account_id, sale_id, created_at')
      .order('id', { ascending: false })
      .limit(5);

    if (txError) throw txError;
    console.log(JSON.stringify(transactions, null, 2));

    console.log("\n=== LENDO CONTAS BANCÁRIAS ===");
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, name, current_balance, is_main');

    if (accError) throw accError;
    console.log(JSON.stringify(accounts, null, 2));

    if (sales.length > 0) {
      const lastSaleId = sales[0].id;
      console.log(`\n=== PAGAMENTOS DA VENDA #${lastSaleId} ===`);
      const { data: payments, error: payError } = await supabase
        .from('sale_payments')
        .select('*')
        .eq('sale_id', lastSaleId);

      if (payError) throw payError;
      console.log(JSON.stringify(payments, null, 2));
    }

  } catch (err) {
    console.error("Erro na consulta:", err);
  }
}

check();
