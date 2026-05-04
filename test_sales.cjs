const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('c:/Users/hglav/OneDrive/Área de Trabalho/WFE/stealth-crm/.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="(.*)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function run() {
  const { data: sales, error: saleErr } = await supabase.from('sales').select('id, sale_date, total, payment_method').eq('payment_method', 'Boleto');
  console.log('SALES WITH BOLETO:', sales);
  if (saleErr) console.error(saleErr);

  const { data: spData, error: spErr } = await supabase.from('sale_payments').select('*').eq('method', 'Boleto');
  console.log('SALE_PAYMENTS WITH BOLETO:', spData);
  if (spErr) console.error(spErr);
}
run();
