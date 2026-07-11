const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://msdpmhtdjyoqdmjwunkm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    try {
        console.log("=== AUTENTICANDO ===");
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'Hugoodfort@gmail.com',
            password: 'Hg30082004%'
        });

        if (authError) throw authError;
        console.log("Login com sucesso. User ID:", authData.user.id);

        // Obter company_id 
        const { data: companies, error: compError } = await supabase
            .from('companies')
            .select('id, email')
            .eq('email', 'Hugoodfort@gmail.com')
            .limit(1);

        if (compError) throw compError;
        if (!companies || companies.length === 0) {
            throw new Error("Company not found for this email");
        }

        const companyId = companies[0].id;
        console.log("Company ID encontrado:", companyId);

        // ==================================
        // 1. LIMPEZA
        // ==================================
        console.log("\n=== LIMPANDO DADOS (DELETE) ===");

        // Transactions
        await supabase.from('transactions').delete().eq('company_id', companyId);
        console.log("Transactions deleted.");

        // Boletos
        const { data: boletos } = await supabase.from('boletos').select('id').eq('company_id', companyId);
        if (boletos && boletos.length > 0) {
            const boletoIds = boletos.map(b => b.id);
            await supabase.from('boleto_installments').delete().in('boleto_id', boletoIds);
            await supabase.from('boletos').delete().eq('company_id', companyId);
        }
        console.log("Boletos e parcelas excluídos.");

        // Sales and related
        const { data: sales } = await supabase.from('sales').select('id').eq('company_id', companyId);
        if (sales && sales.length > 0) {
            const saleIds = sales.map(s => s.id);
            await supabase.from('sale_payments').delete().in('sale_id', saleIds);
            await supabase.from('sale_items').delete().in('sale_id', saleIds);
        }
        await supabase.from('service_slots').delete().eq('company_id', companyId);
        await supabase.from('sales').delete().eq('company_id', companyId);
        console.log("Vendas, itens, pagamentos e slots excluídos.");

        // Clients
        await supabase.from('chat_messages').delete().eq('company_id', companyId);
        await supabase.from('clients').delete().eq('company_id', companyId);
        console.log("Clientes excluídos.");

        // Accounts
        await supabase.from('accounts').delete().eq('company_id', companyId);
        console.log("Contas bancárias excluídas.");


        // ==================================
        // 2. CRIAÇÃO DE DADOS MOCK (SEED)
        // ==================================
        console.log("\n=== INSERINDO DADOS MOCK ===");

        // Criar Conta Bancária
        const { data: account, error: accError } = await supabase.from('accounts').insert({
            company_id: companyId,
            name: 'Conta Teste Relatórios',
            current_balance: 5000.00,
            initial_balance: 5000.00,
            is_main: true,
            is_active: true
        }).select().single();
        if (accError) throw accError;
        const accountId = account.id;
        console.log("Conta Teste criada: ID", accountId);

        // Criar Categorias se não existirem
        let { data: catIncome } = await supabase.from('categories').select('id').eq('company_id', companyId).eq('type', 'income').limit(1);
        if (!catIncome || catIncome.length === 0) {
            const { data: newCat } = await supabase.from('categories').insert({ company_id: companyId, name: 'Receita Teste', type: 'income' }).select().single();
            catIncome = [newCat];
        }
        let { data: catExpense } = await supabase.from('categories').select('id').eq('company_id', companyId).eq('type', 'expense').limit(1);
        if (!catExpense || catExpense.length === 0) {
            const { data: newCat } = await supabase.from('categories').insert({ company_id: companyId, name: 'Despesa Teste', type: 'expense' }).select().single();
            catExpense = [newCat];
        }

        // Criar Clientes
        const { data: clients, error: cliError } = await supabase.from('clients').insert([
            { company_id: companyId, name: 'Cliente Ficticio Um', phone: '11999999999', email: 'clf1@teste.com' },
            { company_id: companyId, name: 'Cliente Ficticio Dois', phone: '11888888888', email: 'clf2@teste.com' }
        ]).select();
        if (cliError) throw cliError;
        const client1Id = clients[0].id;
        console.log("2 Clientes inseridos.");

        // Venda Concluída
        const { data: sale1, error: saleErr } = await supabase.from('sales').insert({
            company_id: companyId,
            client_id: client1Id,
            sale_date: new Date().toISOString().split('T')[0],
            total: 1500.00,
            status: 'done',
            is_open: false,
            plate: 'ABC1234'
        }).select().single();
        if (saleErr) throw saleErr;

        // Slot da Venda Concluída
        const startTime1 = new Date();
        startTime1.setHours(10, 0, 0, 0);
        const endTime1 = new Date();
        endTime1.setHours(12, 0, 0, 0);

        await supabase.from('service_slots').insert({
            company_id: companyId,
            client_id: client1Id,
            sale_id: sale1.id,
            start_time: startTime1.toISOString(),
            end_time: endTime1.toISOString(),
            status: 'completed',
            title: 'Serviço 1 - Placa ABC1234'
        });

        // Venda Aberta
        const { data: sale2 } = await supabase.from('sales').insert({
            company_id: companyId,
            client_id: client1Id,
            sale_date: new Date().toISOString().split('T')[0],
            total: 3000.00,
            status: 'open',
            is_open: true,
            plate: 'XYZ9876'
        }).select().single();

        // Transações Entradas e Saidas
        await supabase.from('transactions').insert([
            {
                company_id: companyId, account_id: accountId, sale_id: sale1.id,
                amount: 1500.00, date: new Date().toISOString().split('T')[0],
                transaction_date: new Date().toISOString().split('T')[0],
                type: 'income', status: 'completed', name: 'Pagamento Venda Fictícia 1',
                is_paid: true, payment_method: 'Pix'
            },
            {
                company_id: companyId, account_id: accountId,
                amount: 250.00, date: new Date().toISOString().split('T')[0],
                transaction_date: new Date().toISOString().split('T')[0],
                type: 'expense', status: 'completed', name: 'Compra de materiais',
                is_paid: true, payment_method: 'Cartão'
            },
            {
                company_id: companyId, account_id: accountId,
                amount: 150.00, date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                transaction_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                type: 'expense', status: 'pending', name: 'Conta de Luz Fictícia',
                is_paid: false, payment_method: 'Boleto'
            }
        ]);

        console.log("Vendas, Slots e Transações MOCK inseridas com sucesso.");
        console.log("\n=== TUDO PRONTO PARA TESTE! ===");

    } catch (error) {
        console.error("Erro no script:", error);
    }
}

run();
