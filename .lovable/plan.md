
# Plano: Correcao WhatsApp, Persistencia de Edicoes e DDI em Empresa/Perfil

## Problema 1: WhatsApp Bloqueado (api.whatsapp.com)

O erro "api.whatsapp.com esta bloqueado" acontece porque o link `wa.me/` redireciona para `api.whatsapp.com`, que bloqueia acesso dentro de iframes. A solucao e trocar todos os links de WhatsApp para usar `https://web.whatsapp.com/send?phone=NUMERO&text=MENSAGEM`, que funciona corretamente.

### Arquivos afetados
| Arquivo | Problema |
|---------|----------|
| `src/lib/utils.ts` | Funcao `openWhatsApp` usa `wa.me/` |
| `src/components/vendas/WhatsAppPreviewModal.tsx` | Usa `wa.me/` direto (linha 58) |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | Usa `wa.me/` no handleSend |
| `src/components/clientes/ClientProfileModal.tsx` | Usa `wa.me/` direto (linha 70) |
| `src/pages/WaitingApproval.tsx` | Usa `wa.me/` direto (linha 74) |
| `src/pages/Subscription.tsx` | Usa `wa.me/` direto (linha 214) |

### Correcao
Atualizar a funcao `openWhatsApp` em `utils.ts`:
```typescript
export const openWhatsApp = (phone: string, message?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = message 
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  window.open(url, '_blank');
};
```
Tambem remover a logica que adiciona `55` automaticamente -- agora o DDI ja vem salvo no numero. Atualizar os demais arquivos que usam `wa.me/` diretamente para usar essa funcao centralizada.

---

## Problema 2: EditCompanyModal nao salva no banco

O modal `EditCompanyModal` carrega dados de `companySettings` (dados mock/estaticos) e o `handleSubmit` apenas mostra um toast, sem salvar nada no Supabase.

### Correcao
- Receber `companyId` e dados atuais como props do componente pai (`Empresa.tsx`)
- Inicializar os campos com os dados reais do banco
- No `handleSubmit`, fazer `supabase.from('companies').update(...)` com os campos editados
- Separar o endereco em campos individuais (rua, numero, bairro, cidade, estado, CEP) -- a tabela ja tem esses campos
- Apos salvar, chamar callback para atualizar os dados na tela pai
- Substituir o campo de telefone pelo componente `PhoneInputWithDDI`

---

## Problema 3: EditInfoModal nao salva no banco

O modal `EditInfoModal` tem um `TODO: Implement profile update with Supabase`. Ele nao salva nada.

### Correcao
- No `handleSubmit`, fazer `supabase.from('profiles').update({ name, phone })` com o `user.id`
- Apos salvar, atualizar o contexto de autenticacao para refletir os novos dados
- Substituir o campo de telefone pelo componente `PhoneInputWithDDI`

---

## Problema 4: Adicionar PhoneInputWithDDI nas telas Empresa e Perfil

Substituir os campos `<Input>` de telefone pelo componente reutilizavel `PhoneInputWithDDI` nos seguintes modais:
- `EditCompanyModal.tsx` (campo WhatsApp da empresa)
- `EditInfoModal.tsx` (campo telefone do perfil)

---

## Resumo de Todos os Arquivos

| Arquivo | Tipo | Alteracao |
|---------|------|-----------|
| `src/lib/utils.ts` | Editar | Trocar `wa.me/` por `web.whatsapp.com/send`, remover prefixo 55 hardcoded |
| `src/components/vendas/WhatsAppPreviewModal.tsx` | Editar | Usar funcao `openWhatsApp` centralizada |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | Editar | Usar funcao `openWhatsApp` centralizada |
| `src/components/clientes/ClientProfileModal.tsx` | Editar | Usar funcao `openWhatsApp` centralizada |
| `src/pages/WaitingApproval.tsx` | Editar | Usar `web.whatsapp.com/send` |
| `src/pages/Subscription.tsx` | Editar | Usar `web.whatsapp.com/send` |
| `src/components/empresa/EditCompanyModal.tsx` | Editar | Carregar dados reais, salvar no Supabase, adicionar PhoneInputWithDDI, separar campos de endereco |
| `src/components/perfil/EditInfoModal.tsx` | Editar | Salvar no Supabase (profiles), adicionar PhoneInputWithDDI |
| `src/pages/Empresa.tsx` | Editar | Passar dados da empresa e callback de refresh como props para o modal |
