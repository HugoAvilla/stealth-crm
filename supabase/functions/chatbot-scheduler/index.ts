import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { runAndPersist } from "../_shared/flowRunner.ts";

/**
 * Resumes conversations parked on a timed `wait` (delay) node whose timer is due.
 * Meant to be invoked once a minute by pg_cron (via pg_net http_post). See the
 * pg_cron snippet in chatbot-setup.sql. Unauthenticated (verify_jwt=false); an
 * optional SCHEDULER_SECRET guards it if set.
 */
serve(async (req) => {
  try {
    const secret = Deno.env.get("SCHEDULER_SECRET");
    if (secret && req.headers.get("x-scheduler-secret") !== secret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const nowIso = new Date().toISOString();
    const { data: due } = await supabase
      .from("chatbot_conversations")
      .select("*")
      .not("active_flow_id", "is", null)
      .not("waiting_until", "is", null)
      .lte("waiting_until", nowIso)
      .eq("bot_paused", false)
      .limit(50);

    let resumed = 0;
    for (const conv of due ?? []) {
      const { data: flow } = await supabase
        .from("chatbot_flows")
        .select("*")
        .eq("id", conv.active_flow_id)
        .maybeSingle();
      if (!flow?.flow_schema) {
        await supabase.from("chatbot_conversations").update({ waiting_until: null }).eq("id", conv.id);
        continue;
      }
      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("instance_token")
        .eq("company_id", conv.company_id)
        .maybeSingle();

      // Resume from the parked delay node (incoming != null advances the flow).
      await runAndPersist({
        supabase,
        companyId: conv.company_id,
        session,
        conversation: conv,
        schema: flow.flow_schema,
        flowId: flow.id,
        flowRow: flow,
        incoming: { text: "" },
      });
      resumed++;
    }

    return new Response(JSON.stringify({ ok: true, resumed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("chatbot-scheduler error:", (error as Error).message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});
