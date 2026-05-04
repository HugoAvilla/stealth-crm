const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const envKey = envFile.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

const supabase = createClient(envUrl, envKey);

async function testBoletos() {
  const { data, error } = await supabase.from('boletos').select('id, sale_id, account_id, company_id, client_id, status, created_at');
  console.log('ALL BOLETOS:');
  console.dir(data, { depth: null });
  if(error) console.error(error);
}

testBoletos();
