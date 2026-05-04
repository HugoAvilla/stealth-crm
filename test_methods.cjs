const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('c:/Users/hglav/OneDrive/Área de Trabalho/WFE/stealth-crm/.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="(.*)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function run() {
  const { data: sales, error: saleErr } = await supabase.from('sales').select('payment_method');
  if(sales) {
    const methods = new Set(sales.map(s => s.payment_method));
    console.log('PAYMENT METHODS IN SALES:', Array.from(methods));
  }
}
run();
