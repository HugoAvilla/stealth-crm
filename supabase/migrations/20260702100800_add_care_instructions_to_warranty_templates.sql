-- ================================================================
-- EXECUTAR NO SUPABASE DASHBOARD → SQL EDITOR OU VIA CLI
-- Adiciona coluna care_instructions na tabela warranty_templates
-- ================================================================

ALTER TABLE public.warranty_templates 
  ADD COLUMN IF NOT EXISTS care_instructions TEXT DEFAULT NULL;

-- Opcional: preencher registros existentes com instruções de cuidado padrão
UPDATE public.warranty_templates
SET care_instructions = '• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado'
WHERE care_instructions IS NULL;
