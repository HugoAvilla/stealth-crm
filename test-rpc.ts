import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Try to find ANY company code first to see if the table has them
    const { data: companies, error: fetchErr } = await supabase
        .from('companies')
        .select('company_code')
        .not('company_code', 'is', null)
        .limit(1);

    if (fetchErr) {
        console.error('Error fetching companies (might be RLS):', fetchErr);
    } else {
        console.log('Found companies with code:', companies);
    }

    // Now let's try the RPC
    if (companies && companies.length > 0) {
        const code = companies[0].company_code;
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_by_code', { code_input: code });
        console.log(`RPC get_company_by_code('${code}') ->`, { rpcData, rpcError });
    } else {
        // try a dummy code
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_by_code', { code_input: '123456' });
        console.log(`RPC get_company_by_code('123456') ->`, { rpcData, rpcError });
    }
}

test();
