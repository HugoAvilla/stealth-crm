-- Create whatsapp_sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Whatsapp sessions policy" ON whatsapp_sessions
    FOR ALL
    USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Create mensagens_whatsapp table
CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mensagens whatsapp policy" ON mensagens_whatsapp
    FOR ALL
    USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Create chatbot_flows table
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

-- Enable RLS
ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chatbot flows policy" ON chatbot_flows
    FOR ALL
    USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
