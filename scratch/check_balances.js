import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msdpmhtdjyoqdmjwunkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching accounts...");
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id, name, current_balance, initial_balance");
    
  if (accError) {
    console.error("Error fetching accounts:", accError);
    return;
  }
  
  for (const acc of accounts) {
    console.log(`\nAccount: ${acc.name} (ID: ${acc.id})`);
    console.log(`  Current Balance: ${acc.current_balance}`);
    console.log(`  Initial Balance: ${acc.initial_balance}`);
    
    // Sum of paid transactions
    const { data: txs, error: txError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("account_id", acc.id)
      .eq("is_paid", true);
      
    if (txError) {
      console.error("Error fetching transactions:", txError);
      continue;
    }
    
    const entradas = txs.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + Number(t.amount), 0);
    const saidas = txs.filter(t => t.type === 'Saida').reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Sum of transfers
    const { data: transfersTo, error: trToError } = await supabase
      .from("transfers")
      .select("amount")
      .eq("to_account_id", acc.id);
      
    const { data: transfersFrom, error: trFromError } = await supabase
      .from("transfers")
      .select("amount")
      .eq("from_account_id", acc.id);
      
    const trTo = transfersTo?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const trFrom = transfersFrom?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    const calculated = Number(acc.initial_balance) + entradas - saidas + trTo - trFrom;
    console.log(`  Calculated Balance: ${calculated} (Diff: ${acc.current_balance - calculated})`);
    console.log(`  Entradas: +${entradas}, Saídas: -${saidas}, Transf Received: +${trTo}, Transf Sent: -${trFrom}`);
  }
}

check();
