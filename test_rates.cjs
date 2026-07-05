const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msdpmhtdjyoqdmjwunkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: machines, error: err1 } = await supabase.from("card_machines").select("*");
  console.log("Machines:", machines);
  
  const { data: rates, error: err2 } = await supabase.from("card_machine_rates").select("*");
  console.log("Rates:", rates);
}

test();
