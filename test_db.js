import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msdpmhtdjyoqdmjwunkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from("boletos").select("*");
  console.log("Boletos count:", data?.length);
  if (data?.length) console.log(data);
  
  const { data: data2 } = await supabase.from("boleto_installments").select("*");
  console.log("Installments count:", data2?.length);
  if (data2?.length) console.log(data2);
  
  const { data: sales } = await supabase.from("sales").select("*").order("id", { ascending: false }).limit(5);
  console.log("Recent sales:");
  console.log(sales);
}

test();
