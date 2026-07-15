import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const supabaseUrl = "https://msdpmhtdjyoqdmjwunkm.supabase.co"
const envVars = readFileSync(".env.local", "utf-8")
const serviceKeyLine = envVars.split("\n").find(line => line.includes("SUPABASE_SERVICE_ROLE_KEY"))
const serviceKey = serviceKeyLine ? serviceKeyLine.split("=")[1].replace(/['"]/g, '').trim() : ""

if (!serviceKey) throw new Error("Could not find SUPABASE_SERVICE_ROLE_KEY in .env.local")

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

async function investigate() {
    // get trigger
    const { data, error } = await supabase.rpc('debug_sql', {
        query: `
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'on_auth_user_created';
        `
    })

    if (error) {
        console.error("RPC Error:", error)
    } else {
        console.dir(data, { depth: null })
    }
}

investigate()
