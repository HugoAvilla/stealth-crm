-- =====================================================================
-- Chatbot engine: extend existing tables + add conversations & stages
-- Depends on 20260720000000_create_chatbot_tables.sql
-- Uses existing helpers get_user_company_id(uuid) (RLS multi-tenant).
-- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) so it is safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend whatsapp_sessions with provider/connection metadata
-- ---------------------------------------------------------------------
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'uazapi';
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;          -- transient, cleared once connected
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 2. chatbot_stages (Kanban columns / conversation status)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#64748b',
    bot_flow_id UUID REFERENCES chatbot_flows(id) ON DELETE SET NULL, -- optional bot linked to the column
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

-- ---------------------------------------------------------------------
-- 3. chatbot_flows: active flag
-- ---------------------------------------------------------------------
ALTER TABLE chatbot_flows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- 4. chatbot_conversations (Inbox row / Kanban card + flow state)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    chat_id TEXT NOT NULL,                 -- normalized phone / whatsapp id
    contact_name TEXT,
    contact_phone TEXT,
    client_id BIGINT,                      -- soft link to clientes(id)
    stage_id UUID REFERENCES chatbot_stages(id) ON DELETE SET NULL,
    assigned_user_id UUID,                 -- soft link to auth user
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    bot_paused BOOLEAN DEFAULT false,      -- human takeover
    -- flow execution state
    active_flow_id UUID REFERENCES chatbot_flows(id) ON DELETE SET NULL,
    current_node_id TEXT,
    flow_vars JSONB DEFAULT '{}'::jsonb,
    waiting_until TIMESTAMPTZ,             -- for timed "wait" nodes (Fase 3 scheduler)
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

-- ---------------------------------------------------------------------
-- 5. mensagens_whatsapp: richer message metadata + dedup
-- ---------------------------------------------------------------------
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE CASCADE;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS direction TEXT;       -- 'in' | 'out'
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS from_me BOOLEAN DEFAULT false;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS status TEXT;          -- sent | delivered | read | failed
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE mensagens_whatsapp ADD COLUMN IF NOT EXISTS sent_by_bot BOOLEAN DEFAULT false;

-- Dedup incoming/outgoing provider messages per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_mensagens_wa_msgid
    ON mensagens_whatsapp(company_id, wa_message_id)
    WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mensagens_conversation ON mensagens_whatsapp(conversation_id, timestamp);

-- ---------------------------------------------------------------------
-- 6. Realtime publication (live inbox needs these tables published)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensagens_whatsapp'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chatbot_conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE chatbot_conversations';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7. Seed default Kanban stages for existing companies (idempotent)
-- ---------------------------------------------------------------------
INSERT INTO chatbot_stages (company_id, name, position, color, is_default)
SELECT c.id, s.name, s.position, s.color, true
FROM public.companies c
CROSS JOIN (VALUES
    ('Novo', 0, '#3b82f6'),
    ('Em andamento', 1, '#f59e0b'),
    ('Aguardando', 2, '#a855f7'),
    ('Resolvido', 3, '#22c55e')
) AS s(name, position, color)
WHERE NOT EXISTS (
    SELECT 1 FROM chatbot_stages cs WHERE cs.company_id = c.id
);
