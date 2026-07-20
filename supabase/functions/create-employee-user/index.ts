import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, name, role_title, whatsapp, companyId, locked_modules } = await req.json()

        if (!email || !password || !name || !companyId) {
            throw new Error('Faltam dados obrigatórios')
        }

        // Usamos o Service Role Key para conseguir criar o usuário passando por cima das regras.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Criar Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                name: name,
                is_employee: true,
                target_company_id: companyId
            }
        })

        if (authError) throw authError

        const newUserId = authData.user.id

        // 2. Atualizar o profile com as informações cadastradas
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                user_id: newUserId,
                email: email,
                name: name,
                role_title: role_title,
                company_id: companyId,
                whatsapp: whatsapp,
                locked_modules: locked_modules || []
            }, { onConflict: 'user_id' })

        if (profileError) throw profileError

        // 3. Atualizar a role verdadeira no DB para o RLS liberar os dados
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .upsert({
                user_id: newUserId,
                role: 'FUNCIONARIO'
            }, { onConflict: 'user_id' })

        if (roleError) {
            console.error('Erro ao adicionar role:', roleError);
        }

        return new Response(JSON.stringify({ success: true, userId: newUserId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error("Create Employee API Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
