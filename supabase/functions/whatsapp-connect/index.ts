import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";
import { resolveTenant, sessionNameFor, HttpError } from "../_shared/auth.ts";
import { getWhatsAppProvider } from "../_shared/whatsappProvider.ts";

/**
 * Connects (or checks) the tenant's WhatsApp number via the configured provider.
 *
 *  POST { action?: "connect" | "status" }
 *   - "connect" (default): ensures an instance exists, starts pairing and
 *     returns a QR/pair code + configures the provider webhook.
 *   - "status": queries the live status and updates whatsapp_sessions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { companyId, service } = await resolveTenant(req);
    const { action = "connect" } = (await req.json().catch(() => ({}))) as { action?: string };

    const provider = getWhatsAppProvider();
    const sessionName = sessionNameFor(companyId);

    // Ensure a session row exists for this company.
    let { data: session } = await service
      .from("whatsapp_sessions")
      .select("*")
      .eq("company_id", companyId)
      .eq("session_name", sessionName)
      .maybeSingle();

    if (!session) {
      const { data: created } = await service
        .from("whatsapp_sessions")
        .insert({ company_id: companyId, session_name: sessionName, status: "PENDING", provider: "uazapi" })
        .select()
        .single();
      session = created;
    }

    // Ensure the provider instance exists (creates on first connect).
    let instanceToken = session.instance_token as string | null;
    if (!instanceToken) {
      const inst = await provider.createInstance(sessionName);
      instanceToken = inst.instanceToken;
      await service
        .from("whatsapp_sessions")
        .update({ instance_token: instanceToken, instance_id: inst.instanceId })
        .eq("id", session.id);
    }

    if (action === "status") {
      const status = await provider.getStatus(instanceToken);
      const connected = /connect|open|online/i.test(status.status);
      await service
        .from("whatsapp_sessions")
        .update({
          status: status.status,
          phone_number: status.phoneNumber ?? session.phone_number,
          qr_code: connected ? null : session.qr_code,
          connected_at: connected ? new Date().toISOString() : session.connected_at,
        })
        .eq("id", session.id);
      return json({ status: status.status, connected, phoneNumber: status.phoneNumber });
    }

    // action === "connect"
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook?session=${encodeURIComponent(sessionName)}`;
    const conn = await provider.connectInstance(instanceToken);
    try {
      await provider.setWebhook(instanceToken, webhookUrl);
    } catch (e) {
      console.warn("setWebhook failed (continuing):", (e as Error).message);
    }

    await service
      .from("whatsapp_sessions")
      .update({ status: conn.status, qr_code: conn.qrcode ?? null, phone_number: conn.phoneNumber ?? session.phone_number })
      .eq("id", session.id);

    return json({
      status: conn.status,
      qrcode: conn.qrcode ?? null,
      pairCode: conn.pairCode ?? null,
      sessionName,
    });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("whatsapp-connect error:", (error as Error).message);
    return json({ error: "Internal Server Error" }, 500);
  }
});
