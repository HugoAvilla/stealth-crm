import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const { searchParams } = new URL(req.url);
  const storagePath = searchParams.get("path");

  if (!storagePath) {
    return new Response(JSON.stringify({ error: "Missing 'path' parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Generate signed URL server-side (never exposed to frontend)
    const { data, error } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error);
      return new Response(JSON.stringify({ error: "PDF not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the PDF binary using the signed URL
    const pdfResponse = await fetch(data.signedUrl);

    if (!pdfResponse.ok) {
      console.error("Error fetching PDF:", pdfResponse.status);
      return new Response(JSON.stringify({ error: "Failed to fetch PDF" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const filename = storagePath.split("/").pop() || "document.pdf";

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
