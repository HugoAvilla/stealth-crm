-- =====================================================================
-- SETUP DO CHATBOT — rode UMA vez no projeto que o app usa (São Paulo:
-- kmcvlvcgjbqtvkasqdbh) via Supabase Dashboard -> SQL Editor -> Run.
-- Combina as 2 migrations do chatbot. Idempotente (pode rodar de novo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTE 1 — tabelas base (whatsapp_sessions, mensagens_whatsapp, chatbot_flows)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Whatsapp sessions policy" ON whatsapp_sessions;
CREATE POLICY "Whatsapp sessions policy" ON whatsapp_sessions
    FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mensagens whatsapp policy" ON mensagens_whatsapp;
CREATE POLICY "Mensagens whatsapp policy" ON mensagens_whatsapp
    FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS chatbot_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    triggers JSONB DEFAULT '{}'::jsonb,
    flow_schema JSONB DEFAULT '{}'::jsonb,
    total_launched INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chatbot flows policy" ON chatbot_flows;
CREATE POLICY "Chatbot flows policy" ON chatbot_flows
    FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- PARTE 2 — engine: extensões + conversations/stages + RLS + realtime
-- ---------------------------------------------------------------------
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'uazapi';
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS chatbot_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#64748b',
    bot_flow_id UUID REFERENCES chatbot_flows(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_stages_company ON chatbot_stages(company_id, position);
ALTER TABLE chatbot_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chatbot stages tenant policy" ON chatbot_stages;
CREATE POLICY "Chatbot stages tenant policy" ON chatbot_stages
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id(auth.uid()))
    WITH CHECK (company_id = get_user_company_id(auth.uid()));

ALTER TABLE chatbot_flows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    chat_id TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    client_id BIGINT,
    stage_id UUID REFERENCES chatbot_stages(id) ON DELETE SET NULL,
    assigned_user_id UUID,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    bot_paused BOOLEAN DEFAULT false,
    active_flow_id UUID REFERENCES chatbot_flows(id) ON DELETE SET NULL,
    current_node_id TEXT,
    flow_vars JSONB DEFAULT '{}'::jsonb,
    waiting_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_company ON chatbot_conversations(company_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_stage ON chatbot_conversations(stage_id);
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chatbot conversations tenant policy" ON chatbot_conversations;
CREATE POLICY "Chatbot conversations tenant policy" ON chatbot_conversations
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id(auth.uid()))
    WITH CHECK (company_id = get_user_company_id(auth.uid()));

ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE CASCADE;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS from_me BOOLEAN DEFAULT false;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS sent_by_bot BOOLEAN DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mensagens_wa_msgid
    ON mensagens_whatsapp(company_id, wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mensagens_conversation ON mensagens_whatsapp(conversation_id, timestamp);

-- Realtime (inbox ao vivo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='mensagens_whatsapp') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chatbot_conversations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE chatbot_conversations';
  END IF;
END $$;

-- Seed das etapas do Kanban para empresas existentes
INSERT INTO chatbot_stages (company_id, name, position, color, is_default)
SELECT c.id, s.name, s.position, s.color, true
FROM public.companies c
CROSS JOIN (VALUES ('Novo',0,'#3b82f6'),('Em andamento',1,'#f59e0b'),('Aguardando',2,'#a855f7'),('Resolvido',3,'#22c55e')) AS s(name,position,color)
WHERE NOT EXISTS (SELECT 1 FROM chatbot_stages cs WHERE cs.company_id = c.id);

-- =====================================================================
-- OPCIONAL — Agendador dos nós de espera (wait: delay). Só é necessário
-- se você usar nós de "Espera por tempo". Requer as extensões pg_cron e
-- pg_net habilitadas (Dashboard -> Database -> Extensions) e a edge
-- function chatbot-scheduler publicada. Rode UMA vez, trocando <REF>:
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule(
--     'chatbot-scheduler', '* * * * *',
--     $$ select net.http_post(
--          url := 'https://<REF>.supabase.co/functions/v1/chatbot-scheduler',
--          headers := '{"Content-Type":"application/json"}'::jsonb
--        ) $$
--   );
-- (para <REF> use kmcvlvcgjbqtvkasqdbh; se definir SCHEDULER_SECRET na function,
--  adicione o header "x-scheduler-secret" acima.)
-- =====================================================================
