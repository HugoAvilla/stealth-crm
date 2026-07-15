const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");

const envStr = readFileSync('.env', 'utf-8');
const key = envStr.split('\n').find(l => l.includes('SUPABASE_SERVICE_ROLE_KEY'))?.split('=')[1]?.replace(/['"]/g, '').trim() || '';

const supabase = createClient('https://msdpmhtdjyoqdmjwunkm.supabase.co', key);

async function check() {
    const { data: users, error: e1 } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(2);
    const { data: roles, error: e2 } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false }).limit(2);
    console.log("PROFILES:", users, e1);
    console.log("ROLES:", roles, e2);
}

check();
