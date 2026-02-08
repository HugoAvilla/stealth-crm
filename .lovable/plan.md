
# Plano: Correção da Página de Redefinição de Senha

## Problema Identificado

A página `/redefinir-senha` não está capturando corretamente os tokens que o Supabase envia na URL. Quando o usuário clica no link do email, o Supabase redireciona para:

```
/redefinir-senha#access_token=xxx&token_hash=xxx&type=recovery&...
```

Os parâmetros estão no **hash fragment** (#), não em query params (?), e a página atual não os extrai corretamente.

---

## Solução

### Arquivo a Modificar

`src/pages/ResetPassword.tsx`

### Alterações Necessárias

#### 1. Extrair Tokens do Hash Fragment

Adicionar função para parsear os parâmetros do hash:

```typescript
// Parse URL hash to get tokens
const getHashParams = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    tokenHash: params.get('token_hash'),
    type: params.get('type'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
};
```

#### 2. Verificar Token com verifyOtp

Atualizar o `useEffect` para validar o token corretamente:

```typescript
useEffect(() => {
  const handleRecovery = async () => {
    const hashParams = getHashParams();
    
    // Check for error in URL
    if (hashParams.error) {
      console.error('Recovery error:', hashParams.errorDescription);
      toast({
        title: "Link inválido",
        description: hashParams.errorDescription || "O link de recuperação é inválido.",
        variant: "destructive"
      });
      setIsCheckingSession(false);
      return;
    }
    
    // If we have token_hash, verify it
    if (hashParams.tokenHash && hashParams.type === 'recovery') {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: hashParams.tokenHash,
          type: 'recovery',
        });
        
        if (error) {
          throw error;
        }
        
        if (data.session) {
          setHasValidSession(true);
        }
      } catch (error: any) {
        console.error('Token verification failed:', error);
        toast({
          title: "Link expirado",
          description: "Solicite um novo link de recuperação.",
          variant: "destructive"
        });
      }
      setIsCheckingSession(false);
      return;
    }
    
    // If we have access_token directly (PKCE flow)
    if (hashParams.accessToken) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashParams.accessToken,
          refresh_token: hashParams.refreshToken || '',
        });
        
        if (error) throw error;
        if (data.session) setHasValidSession(true);
      } catch (error) {
        console.error('Session error:', error);
      }
      setIsCheckingSession(false);
      return;
    }
    
    // Fallback: check existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setHasValidSession(true);
    }
    setIsCheckingSession(false);
  };

  // Listen for PASSWORD_RECOVERY event
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    }
  );

  handleRecovery();

  return () => subscription.unsubscribe();
}, [toast]);
```

#### 3. Limpar Hash Após Verificação

Após verificar o token com sucesso, limpar o hash da URL por segurança:

```typescript
// After successful verification
if (data.session) {
  setHasValidSession(true);
  // Clean URL for security
  window.history.replaceState(null, '', window.location.pathname);
}
```

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Usuário clica no link do email                                          │
│                    ↓                                                        │
│  2. Redireciona para /redefinir-senha#access_token=xxx&token_hash=yyy       │
│                    ↓                                                        │
│  3. getHashParams() extrai token_hash e type                                │
│                    ↓                                                        │
│  4. supabase.auth.verifyOtp({ token_hash, type: 'recovery' })               │
│                    ↓                                                        │
│  5. Se válido → setHasValidSession(true) → Mostra formulário                │
│                    ↓                                                        │
│  6. Usuário digita nova senha → supabase.auth.updateUser({ password })      │
│                    ↓                                                        │
│  7. Senha alterada com sucesso → Redireciona para /login                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Código Completo do useEffect

```typescript
useEffect(() => {
  const handleRecovery = async () => {
    // Parse hash fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    // Handle error from Supabase
    if (error) {
      console.error('Recovery error:', errorDescription);
      toast({
        title: "Link inválido",
        description: errorDescription || "O link de recuperação é inválido ou expirou.",
        variant: "destructive"
      });
      setIsCheckingSession(false);
      return;
    }
    
    // Method 1: Verify with token_hash (newer Supabase versions)
    if (tokenHash && type === 'recovery') {
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        
        if (verifyError) throw verifyError;
        
        if (data.session) {
          setHasValidSession(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err: any) {
        console.error('Token verification failed:', err);
        toast({
          title: "Link expirado ou inválido",
          description: "Por favor, solicite um novo link de recuperação.",
          variant: "destructive"
        });
      }
      setIsCheckingSession(false);
      return;
    }
    
    // Method 2: Set session with access_token (PKCE flow)
    if (accessToken) {
      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (sessionError) throw sessionError;
        
        if (data.session) {
          setHasValidSession(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err: any) {
        console.error('Session setup failed:', err);
      }
      setIsCheckingSession(false);
      return;
    }
    
    // Method 3: Check existing session (user already authenticated)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setHasValidSession(true);
    } else {
      toast({
        title: "Link inválido ou expirado",
        description: "Solicite um novo link de recuperação de senha.",
        variant: "destructive"
      });
    }
    setIsCheckingSession(false);
  };

  // Listen for PASSWORD_RECOVERY event
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    }
  );

  handleRecovery();

  return () => subscription.unsubscribe();
}, [toast]);
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Parse do hash | Extrair `token_hash`, `type`, `access_token` do fragmento # da URL |
| Verificação com verifyOtp | Chamar `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` |
| Fallback com setSession | Suportar fluxo PKCE com `access_token` direto |
| Limpeza da URL | Remover tokens sensíveis da URL após verificação |
| Tratamento de erros | Exibir mensagens claras quando o link é inválido/expirado |
