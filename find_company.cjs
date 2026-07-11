const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://msdpmhtdjyoqdmjwunkm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findCompany() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .ilike('email', '%Hugoodfort@gmail.com%');

    if (error) {
        console.error('Error fetching company by email directly:', error);
    } else {
        console.log('Companies by email:', data);
    }
}

findCompany();
