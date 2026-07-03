import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msdpmhtdjyoqdmjwunkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("--- Testando boletos ---");
  const { data: bData, error: bError } = await supabase
    .from("boletos")
    .select("*")
    .limit(1);
  
  if (bError) {
    console.error("Erro na query de boletos:", bError);
  } else {
    console.log("Sucesso ao consultar boletos. Dados:", bData);
  }

  console.log("\n--- Testando boleto_installments com todos os campos ---");
  const { data: instData, error: instError } = await supabase
    .from("boleto_installments")
    .select("id, boleto_id, installment_number, amount, due_date, status, paid_amount, payment_date, transaction_id")
    .limit(1);

  if (instError) {
    console.error("Erro na query de boleto_installments:", instError);
  } else {
    console.log("Sucesso ao consultar boleto_installments. Dados:", instData);
  }
}

test();
