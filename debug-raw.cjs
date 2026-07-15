const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf-8');
const key = envStr.split('\n').find(l => l.includes('SUPABASE_SERVICE_ROLE_KEY'))?.split('=')[1]?.replace(/['"]/g, '').trim() || '';

async function run() {
    const headers = {
        "apikey": key,
        "Authorization": `Bearer ${key}`
    };

    const resRoles = await fetch("https://msdpmhtdjyoqdmjwunkm.supabase.co/rest/v1/user_roles?select=*", { headers });
    const roles = await resRoles.json();

    const resProfiles = await fetch("https://msdpmhtdjyoqdmjwunkm.supabase.co/rest/v1/profiles?select=user_id,name,role_title&order=created_at.desc&limit=3", { headers });
    const profiles = await resProfiles.json();

    console.log("ROLES (Raw API):", JSON.stringify(roles, null, 2));
    console.log("PROFILES (Raw API):", JSON.stringify(profiles, null, 2));
}
run();
