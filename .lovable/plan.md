
# Plano: Limites por Empresa, Lotes de Produtos e Recuperacao de Senha

## Resumo das Alteracoes

Este plano aborda tres grandes implementacoes solicitadas:

1. **Limite de Contas no Painel Master** - Adicionar botao para configurar quantidade maxima de membros por empresa
2. **Ajustes no Modal de Tipos de Produtos** - Trocar "Modelo" por "Lote" e remover preco de venda por metro
3. **Fluxo de Recuperacao de Senha** - Sistema completo com email, codigo de verificacao 6 digitos e redefinicao

---

## 1. Limite de Contas Vinculadas no Painel Master

### Objetivo
Permitir que o Master defina individualmente o limite maximo de membros para cada empresa, diretamente na sub-aba "Assinaturas".

### Alteracoes Necessarias

**Arquivo: `src/components/master/SubscriptionsManager.tsx`**

Adicionar novo botao de acao na tabela de assinaturas (icone de usuarios) que abre um modal para ajustar o limite de membros da empresa.

| Coluna Atual | Nova Coluna |
|-------------|-------------|
| Acoes: [$] [Calendar] [Power] | Acoes: [$] [Calendar] [Users] [Power] |

**Novo Modal: Alterar Limite de Membros**
- Campo: Novo limite (input number, min=1, max=50)
- Campo: Motivo da alteracao (textarea obrigatorio)
- Botoes: Cancelar / Confirmar

**Nova RPC Function: `master_change_member_limit`**
- Atualiza `companies.max_members`
- Registra acao na tabela `master_actions`

### Fluxo Visual

```text
Tabela Assinaturas
      |
      v
[Users Icon] -> Modal Alterar Limite
      |
      v
Novo limite + Motivo
      |
      v
Salvar no banco
```

---

## 2. Ajustes no Modal de Tipos de Produtos

### Mudancas Solicitadas

| Campo Atual | Acao |
|-------------|------|
| Modelo | **Renomear** para "Lote" |
| Preco de Venda por Metro (R$) | **Remover** |

**Arquivo: `src/components/estoque/ProductTypesTab.tsx`**

Alteracoes no formulario:
- Renomear label "Modelo" para "Lote"
- Renomear placeholder "Ex: Crystalline, Premium" para "Ex: A001, B002, C003"
- Remover campo `unit_price` do formulario
- Remover coluna "Preco Venda" da tabela

### Impacto no Banco

O campo `unit_price` continuara existindo na tabela `product_types` mas sera preenchido no momento da venda (ver item 3).

---

## 3. Campo de Preco do Servico no Modal de Vendas

### Objetivo
Mover a definicao do preco do servico para o modal de vendas, entre "Forma de Pagamento" e "Desconto".

**Arquivo: `src/components/vendas/NewSaleModal.tsx`**

Adicionar novo card/campo:

```text
[Forma de Pagamento]
        |
        v
[Preco do Servico (R$)] <-- NOVO
        |
        v
[Desconto]
```

### Implementacao

- Campo numerico para preco manual
- Valor pre-preenchido com base no calculo automatico (metros x preco por metro do produto)
- Permitir edicao manual pelo vendedor
- O valor final impacta o calculo do subtotal

---

## 4. Fluxo Completo de Recuperacao de Senha

### Visao Geral

O usuario esqueceu a senha e precisa redefini-la via email. O fluxo usa o metodo nativo do Supabase Auth (`resetPasswordForEmail`) que envia um magic link por email.

### Paginas a Criar

| Pagina | Rota | Descricao |
|--------|------|-----------|
| ForgotPassword | `/esqueci-senha` | Input de email + botao Enviar |
| ResetPassword | `/redefinir-senha` | Formulario de nova senha |

### Fluxo do Usuario

```text
Login Page
    |
    v
"Esqueci minha senha" (link)
    |
    v
/esqueci-senha
[Digite seu email]
[Enviar]
    |
    v
Email com link de recuperacao
    |
    v
Usuario clica no link
    |
    v
/redefinir-senha (com token na URL)
[Nova senha]
[Confirmar senha]
[Salvar]
    |
    v
Senha atualizada!
Redirect -> /login
```

### Alteracoes Necessarias

**1. Pagina de Login (`src/pages/Login.tsx`)**
- Adicionar link "Esqueci minha senha" abaixo do campo de senha

**2. Nova Pagina: `src/pages/ForgotPassword.tsx`**
- Input de email
- Botao "Enviar link de recuperacao"
- Usa `supabase.auth.resetPasswordForEmail({ email, redirectTo })`
- Mensagem de sucesso informando para verificar email

**3. Nova Pagina: `src/pages/ResetPassword.tsx`**
- Formulario com:
  - Nova senha
  - Confirmar nova senha
  - Botao Salvar
- Validacao de senhas vazadas (HIBP)
- Usa `supabase.auth.updateUser({ password })`
- Redirect para login apos sucesso

**4. App.tsx**
- Adicionar rotas `/esqueci-senha` e `/redefinir-senha`

### Migracao de Banco

Nao e necessaria migracao. O Supabase Auth ja possui a infraestrutura de reset de senha.

### Nota sobre Codigo de 6 Digitos

O Supabase Auth utiliza **magic links** para recuperacao de senha, nao codigos OTP. Para implementar codigo de 6 digitos seria necessario:
- Uma edge function customizada
- Integracao com servico de email (Resend)
- Armazenamento temporario de codigos

**Recomendacao**: Usar o fluxo nativo do Supabase (magic link) que ja esta configurado e e mais seguro. O usuario recebe um link no email que o redireciona diretamente para a pagina de redefinicao.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/master/SubscriptionsManager.tsx` | Adicionar botao e modal de limite de membros |
| `src/components/estoque/ProductTypesTab.tsx` | Renomear "Modelo" para "Lote", remover preco de venda |
| `src/components/vendas/NewSaleModal.tsx` | Adicionar campo "Preco do Servico" |
| `src/pages/Login.tsx` | Adicionar link "Esqueci minha senha" |
| `src/App.tsx` | Adicionar rotas de recuperacao de senha |

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/ForgotPassword.tsx` | Pagina para solicitar recuperacao |
| `src/pages/ResetPassword.tsx` | Pagina para definir nova senha |

## Migracao SQL

```sql
-- Criar funcao para Master alterar limite de membros
CREATE OR REPLACE FUNCTION master_change_member_limit(
  company_id_input integer,
  new_limit_input integer,
  reason_input text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar limite
  UPDATE companies 
  SET max_members = new_limit_input
  WHERE id = company_id_input;
  
  -- Registrar acao
  INSERT INTO master_actions (action_type, target_table, target_id, details, performed_by)
  VALUES (
    'update_member_limit',
    'companies',
    company_id_input,
    jsonb_build_object(
      'new_limit', new_limit_input,
      'reason', reason_input
    ),
    auth.uid()
  );
END;
$$;
```

---

## Resumo Visual

```text
+---------------------------+
|     PAINEL MASTER         |
|  Aba Assinaturas          |
|                           |
|  [Users] Limite Membros   |
|  Modal: Novo limite + Motivo
+---------------------------+

+---------------------------+
|  ESTOQUE > Tipos Produto  |
|                           |
|  Modelo -> LOTE           |
|  Preco Venda -> REMOVIDO  |
+---------------------------+

+---------------------------+
|  VENDAS > Nova Venda      |
|                           |
|  Forma Pagamento          |
|  [Preco Servico] <- NOVO  |
|  Desconto                 |
+---------------------------+

+---------------------------+
|  LOGIN                    |
|                           |
|  "Esqueci minha senha"    |
|         |                 |
|         v                 |
|  /esqueci-senha           |
|  Email -> Link enviado    |
|         |                 |
|         v                 |
|  /redefinir-senha         |
|  Nova senha -> Salvo!     |
+---------------------------+
```

---

## Ordem de Implementacao

1. Criar migracao SQL para funcao `master_change_member_limit`
2. Atualizar `SubscriptionsManager.tsx` com novo botao e modal
3. Atualizar `ProductTypesTab.tsx` (Modelo -> Lote, remover preco venda)
4. Atualizar `NewSaleModal.tsx` com campo de preco do servico
5. Adicionar link "Esqueci senha" em `Login.tsx`
6. Criar paginas `ForgotPassword.tsx` e `ResetPassword.tsx`
7. Adicionar rotas em `App.tsx`
