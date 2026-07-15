const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf-8');
const anonKey = envStr.split('\n').find(l => l.includes('VITE_SUPABASE_PUBLISHABLE_KEY'))?.split('=')[1]?.replace(/['"]/g, '').trim() || '';

async function run() {
    const headers = { "apikey": anonKey };
    const res = await fetch("https://msdpmhtdjyoqdmjwunkm.supabase.co/rest/v1/?apikey=" + anonKey);
    const data = await res.json();

    // Extract definitions for user_roles and any enums
    console.log(JSON.stringify({
        user_roles: data.definitions?.user_roles,
        profiles: data.definitions?.profiles,
    }, null, 2));
}
run();
