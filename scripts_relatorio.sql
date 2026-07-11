-- ==============================================================================
-- SCRIPT 1: LIMPEZA DOS DADOS DO USUÁRIO Hugoodfort@gmail.com
-- ==============================================================================
DO $$
DECLARE
    v_company_id INT;
BEGIN
    -- Informado pelo usuário
    v_company_id := 9;

    -- 0. Excluir dependências soltas (Compras e Parcelas) para evitar bloqueio de FK em finanças
    -- Excluir parcelas atreladas a transações desta empresa
    DELETE FROM public.purchase_installments WHERE transaction_id IN (SELECT id FROM public.transactions WHERE company_id = v_company_id);
    
    -- Excluir compras ligadas a esta empresa e seus itens
    DELETE FROM public.purchase_items WHERE purchase_id IN (SELECT id FROM public.purchases WHERE company_id = v_company_id);
    DELETE FROM public.purchases WHERE company_id = v_company_id;

    -- 1. Excluir Finanças (entradas, saídas)
    DELETE FROM public.transactions WHERE company_id = v_company_id;
    
    -- 2. Excluir Boletos e parcelas
    DELETE FROM public.boleto_installments
    WHERE boleto_id IN (SELECT id FROM public.boletos WHERE company_id = v_company_id);
    DELETE FROM public.boletos WHERE company_id = v_company_id;
    
    -- 3. Excluir Vendas e itens
    DELETE FROM public.sale_payments WHERE sale_id IN (SELECT id FROM public.sales WHERE company_id = v_company_id);
    DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE company_id = v_company_id);
    
    -- 4. Excluir Vagas (spaces) e finalmente Vendas
    DELETE FROM public.spaces WHERE company_id = v_company_id;
    DELETE FROM public.sales WHERE company_id = v_company_id;

    -- 5. Excluir clientes e chat_messages (se houver)
    DELETE FROM public.chat_messages WHERE company_id = v_company_id;
    DELETE FROM public.clients WHERE company_id = v_company_id;
    
    -- 6. Excluir contas bancárias
    DELETE FROM public.accounts WHERE company_id = v_company_id;

    RAISE NOTICE 'Dados da empresa 9 excluídos com sucesso!';
END $$;


-- ==============================================================================
-- SCRIPT 2: CRIAÇÃO DE DADOS FICTÍCIOS
-- Rode isto LOGO DEPOIS do Script 1
-- ==============================================================================
DO $$
DECLARE
    v_company_id INT;
    v_client_id INT;
    v_account_id INT;
    v_sale_id INT;
    v_category_id INT;
BEGIN
    -- Informado pelo usuário
    v_company_id := 9;

    -- 1. Criar uma Conta Padrão
    INSERT INTO public.accounts (company_id, name, current_balance, initial_balance, is_main, is_active)
    VALUES (v_company_id, 'Conta Teste Relatórios', 5000.00, 5000.00, TRUE, TRUE)
    RETURNING id INTO v_account_id;

    -- 2. Criar 2 Clientes
    INSERT INTO public.clients (company_id, name, phone, email) 
    VALUES (v_company_id, 'Cliente Ficticio Um', '11999999999', 'clf1@teste.com')
    RETURNING id INTO v_client_id;
    
    INSERT INTO public.clients (company_id, name, phone, email) 
    VALUES (v_company_id, 'Cliente Ficticio Dois', '11888888888', 'clf2@teste.com');

    -- 3. Tentar achar categorias para transactions, ou inserir padrão (Income)
    SELECT id INTO v_category_id FROM public.categories WHERE company_id = v_company_id AND type = 'income' LIMIT 1;
    IF v_category_id IS NULL THEN
       INSERT INTO public.categories (company_id, name, type) VALUES (v_company_id, 'Receita Teste', 'income') RETURNING id INTO v_category_id;
    END IF;

    -- 4. Criar Vendas e Vagas
    -- Venda 1: Finalizada e paga
    INSERT INTO public.sales (company_id, client_id, sale_date, total, status, is_open, plate)
    VALUES (v_company_id, v_client_id, current_date, 1500.00, 'done', false, 'ABC1234')
    RETURNING id INTO v_sale_id;
    
    INSERT INTO public.spaces (company_id, name, client_id, sale_id, entry_date, entry_time, exit_date, exit_time, has_exited, payment_status)
    VALUES (v_company_id, 'Serviço 1 - Placa ABC1234', v_client_id, v_sale_id, current_date, '10:00:00', current_date, '12:00:00', true, 'paid');
    
    INSERT INTO public.transactions (company_id, account_id, sale_id, amount, date, transaction_date, type, status, name, is_paid)
    VALUES (v_company_id, v_account_id, v_sale_id, 1500.00, current_date, current_date, 'income', 'completed', 'Pagamento Venda Fictícia 1', true);

    -- Venda 2: Aberta
    INSERT INTO public.sales (company_id, client_id, sale_date, total, status, is_open, plate)
    VALUES (v_company_id, v_client_id, current_date, 3000.00, 'open', true, 'XYZ9876')
    RETURNING id INTO v_sale_id;

    INSERT INTO public.spaces (company_id, name, client_id, sale_id, entry_date, entry_time, exit_date, exit_time, has_exited, payment_status)
    VALUES (v_company_id, 'Serviço 2 - Placa XYZ9876', v_client_id, v_sale_id, current_date + interval '1 day', '14:00:00', current_date + interval '1 day', '16:00:00', false, 'pending');

    -- Transação Solta (Saída)
    SELECT id INTO v_category_id FROM public.categories WHERE company_id = v_company_id AND type = 'expense' LIMIT 1;
    IF v_category_id IS NULL THEN
       INSERT INTO public.categories (company_id, name, type) VALUES (v_company_id, 'Despesa Teste', 'expense') RETURNING id INTO v_category_id;
    END IF;

    INSERT INTO public.transactions (company_id, account_id, amount, date, transaction_date, type, status, name, is_paid)
    VALUES (v_company_id, v_account_id, 250.00, current_date, current_date, 'expense', 'completed', 'Compra de materiais', true);

    INSERT INTO public.transactions (company_id, account_id, amount, date, transaction_date, type, status, name, is_paid)
    VALUES (v_company_id, v_account_id, 150.00, current_date + interval '5 days', current_date + interval '5 days', 'expense', 'pending', 'Conta de Luz Fictícia', false);

    RAISE NOTICE 'Dados fictícios inseridos com sucesso na empresa 9!';
END $$;
