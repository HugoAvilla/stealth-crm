import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: './.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
    await supabase.from('plan_prices').upsert({ plan_code: 'basic', billing_period: 'monthly', price: 99.99 }, { onConflict: 'plan_code,billing_period' });
    await supabase.from('plan_prices').upsert({ plan_code: 'ultra', billing_period: 'monthly', price: 119.90 }, { onConflict: 'plan_code,billing_period' });
    await supabase.from('plan_prices').upsert({ plan_code: 'ultra', billing_period: 'annual', price: 998.90 }, { onConflict: 'plan_code,billing_period' });
    await supabase.from('plan_prices').upsert({ plan_code: 'premium', billing_period: 'monthly', price: 359.90 }, { onConflict: 'plan_code,billing_period' });
    console.log('Prices updated successfully');
}
run();
