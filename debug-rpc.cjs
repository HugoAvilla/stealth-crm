const https = require('https');

const supabaseUrl = "msdpmhtdjyoqdmjwunkm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck";

const options = {
  hostname: supabaseUrl,
  path: '/rest/v1/?apikey=' + supabaseKey,
  method: 'GET',
  headers: {
    'Accept': 'application/openapi+json'
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => {
    try {
        const schema = JSON.parse(resData);
        console.log(JSON.stringify(schema.definitions.company_join_requests, null, 2));
    } catch (e) {
        console.error(e);
    }
  });
});

req.on('error', (e) => console.error(e));
req.end();
