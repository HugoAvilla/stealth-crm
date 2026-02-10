
# Plano: Tornar Logo Clicavel em Todas as Paginas

## Objetivo
Adicionar navegacao ao clicar na logo WFE em todas as paginas:
- **Paginas pre-login** (Login, Esqueci Senha, Redefinir Senha, Aprovacao Pendente): clicar na logo redireciona para `/login`
- **Paginas pos-login** (TopNavigation/Sidebar): ja funciona corretamente com `<Link to="/">`

## Paginas que precisam de alteracao

### 1. Login.tsx (linha 64)
A logo no topo esquerdo sera envolvida em um `<Link to="/login">` (ou simplesmente recarrega a pagina). Como ja esta na tela de login, o clique apenas recarrega a pagina.

### 2. ForgotPassword.tsx (linha 60)
Envolver a `<img>` da logo em um `<Link to="/login">` com estilo cursor pointer.

### 3. ResetPassword.tsx (linha 217)
Envolver a `<img>` da logo em um `<Link to="/login">` com estilo cursor pointer.

### 4. PendingApprovalModal.tsx (linha 14-17)
Envolver a `<img>` da logo em um `<Link to="/login">` com estilo cursor pointer.

### Paginas pos-login
- **TopNavigation.tsx** - Ja possui `<Link to="/">` na logo (linha 148). Nenhuma alteracao necessaria.
- **Sidebar.tsx** - Verificar se precisa de link (provavelmente nao esta em uso ativo).

## Detalhes Tecnicos

Cada arquivo afetado recebera:
- Import de `Link` do `react-router-dom` (se ainda nao existir)
- A tag `<img>` da logo sera envolvida em `<Link to="/login">` (pre-login) ou `<Link to="/">` (pos-login)
- Adicionado `cursor-pointer` para feedback visual

### Exemplo da alteracao:
```tsx
// Antes
<img src={wfeLogo} alt="WFE Evolution" className="h-12 w-auto object-contain" />

// Depois
<Link to="/login">
  <img src={wfeLogo} alt="WFE Evolution" className="h-12 w-auto object-contain cursor-pointer" />
</Link>
```

## Arquivos afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Login.tsx` | Envolver logo em `<Link to="/login">` |
| `src/pages/ForgotPassword.tsx` | Envolver logo em `<Link to="/login">` |
| `src/pages/ResetPassword.tsx` | Envolver logo em `<Link to="/login">` |
| `src/components/auth/PendingApprovalModal.tsx` | Envolver logo em `<Link to="/login">` |
| `src/components/layout/TopNavigation.tsx` | Ja implementado, nenhuma alteracao |
