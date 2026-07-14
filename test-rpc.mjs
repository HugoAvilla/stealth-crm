import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://msdpmhtdjyoqdmjwunkm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing RPC get_company_by_code...');

    // Try to find ANY company using the service key? I am using anon key, so RLS might block companies fetch.
    // Wait, if RLS blocks 'companies' fetch, it might return empty array.
    const { data: companies, error: fetchErr } = await supabase
        .from('companies')
        .select('id, company_code, company_name')
        .not('company_code', 'is', null)
        .limit(1);

    console.log('FETCH COMPANIES RESULT:', JSON.stringify({ companies, fetchErr }));

    if (companies && companies.length > 0) {
        const code = companies[0].company_code;
        console.log('Found REAL code:', code);
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_by_code', { code_input: code });
        console.log('RPC result for REAL code:', JSON.stringify({ rpcData, rpcError }));
    } else {
        // If we can't find a company due to RLS, let's at least prove the RPC doesn't throw.
        console.log('No companies fetchable via anon key. RPC test with DUMMY1:');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_by_code', { code_input: 'DUMMY1' });
        console.log('RPC result for DUMMY1:', JSON.stringify({ rpcData, rpcError }));
    }
}

test();
