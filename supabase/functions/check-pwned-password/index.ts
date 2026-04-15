import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }
  
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;

  try {
    const { hashPrefix } = await req.json();

    // Validate hash prefix format (exactly 5 hex characters)
    if (!hashPrefix || typeof hashPrefix !== 'string') {
      return new Response(
        JSON.stringify({ error: 'hashPrefix é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPrefix = hashPrefix.toUpperCase();
    
    if (!/^[0-9A-F]{5}$/.test(normalizedPrefix)) {
      return new Response(
        JSON.stringify({ error: 'hashPrefix deve ter exatamente 5 caracteres hexadecimais' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking HIBP for prefix: ${normalizedPrefix}`);

    // Call the Have I Been Pwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${normalizedPrefix}`, {
      headers: {
        'User-Agent': 'WFE-Evolution-CRM',
        'Add-Padding': 'true', // Adds padding to prevent timing attacks
      },
    });

    if (!response.ok) {
      console.error(`HIBP API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar API de senhas vazadas' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await response.text();
    
    // Parse the response into a map of suffix -> count
    const hashes: Record<string, number> = {};
    const lines = text.split('\r\n');
    
    for (const line of lines) {
      if (!line) continue;
      const [suffix, countStr] = line.split(':');
      if (suffix && countStr) {
        hashes[suffix] = parseInt(countStr, 10);
      }
    }

    console.log(`Found ${Object.keys(hashes).length} hash suffixes`);

    return new Response(
      JSON.stringify({ hashes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-pwned-password:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
