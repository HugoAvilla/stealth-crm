import { readFileSync } from 'fs';
const envFile = readFileSync('./.env', 'utf-8');
const env = {};
envFile.split('\n').filter(Boolean).forEach(line => {
    const [k, ...v] = line.split('=');
    if (k) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});
const DOMAIN = env['VITE_SUPABASE_URL'];
const KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'];
if (!DOMAIN || !KEY) { console.error('Missing credentials'); process.exit(1); }

const headers = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' };
const getPayload = (code, period, price) => ({ plan_code: code, billing_period: period, price });
const data = [
    getPayload('basic', 'monthly', 99.99),
    getPayload('ultra', 'monthly', 119.90),
    getPayload('ultra', 'annual', 998.90),
    getPayload('premium', 'monthly', 359.90)
];

const res = await fetch(`${DOMAIN}/rest/v1/plan_prices`, { method: 'POST', headers, body: JSON.stringify(data) });
if (!res.ok) {
    console.error(await res.text());
} else {
    console.log('Prices updated natively via REST API!');
}
