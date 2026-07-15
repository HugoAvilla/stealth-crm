import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// We won't have the service role key in .env usually, we only have anon key
// Wait! Edge function used ADMIN_SERVICE_ROLE_KEY. Is it in .env?
// Let's just use the anon key for now, or check if we can query user_roles
// But user_roles has RLS! So maybe we can't read it freely.
// Let's print the env variables to see what we have.
console.log("URL:", process.env.VITE_SUPABASE_URL);
console.log("Anon Key (first 10 chars):", process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 10));

