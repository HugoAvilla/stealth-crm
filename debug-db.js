import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://msdpmhtdjyoqdmjwunkm.supabase.co"
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMTEwMCwiZXhwIjoyMDg1MTg3MTAwfQ.-rY2L9gJpLgE4fC2s73K7v-jE30N5L-E-A1U2aO1q2o"

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

async function check() {
    const { data: users, error: e1 } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(3);
    const { data: roles, error: e2 } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false }).limit(3);
    console.log("PROFILES:", users, e1);
    console.log("ROLES:", roles, e2);
}

check()
