
# Corrigir Botão "Voltar para Login"

## Problema Identificado
O botão "Voltar para login" não funciona porque:
1. O usuário está autenticado
2. A rota `/login` redireciona usuários autenticados de volta
3. Isso causa um loop de redirecionamento

## Solucao

Modificar o botão para fazer **logout** antes de navegar para a página de login, permitindo que o usuário acesse a tela de login sem estar autenticado.

## Alteracao Tecnica

### Arquivo: `src/pages/WaitingApproval.tsx`

**Mudancas:**
1. Importar `signOut` do contexto de autenticacao
2. Modificar o `onClick` do botao para chamar `signOut()` antes de navegar

**Codigo atual (linha 81-89):**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate('/login')}
  className="mb-4 text-muted-foreground hover:text-foreground"
>
  <ArrowLeft className="mr-2 h-4 w-4" />
  Voltar para login
</Button>
```

**Codigo corrigido:**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={async () => {
    await signOut();
    navigate('/login');
  }}
  className="mb-4 text-muted-foreground hover:text-foreground"
>
  <ArrowLeft className="mr-2 h-4 w-4" />
  Voltar para login
</Button>
```

**Atualizar desestruturacao do useAuth (linha 9):**
```tsx
const { user, refreshUser, signOut } = useAuth();
```

## Comportamento Esperado
1. Usuario clica em "Voltar para login"
2. Sistema faz logout do usuario
3. Usuario e redirecionado para `/login`
4. Tela de login e exibida normalmente
