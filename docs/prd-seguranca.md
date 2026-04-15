# PRD - Sistema de Seguranca do Stealth CRM

## 1. Resumo executivo

Este PRD define o sistema de seguranca que deve ser adicionado ao `stealth-crm` para reduzir risco de vazamento de dados, acesso cruzado entre empresas, abuso de funcoes server-side, roubo de credenciais e exposicao indevida de arquivos.

O projeto atual usa `Vite + React + Supabase` com acesso direto do frontend ao Supabase. Isso acelera o desenvolvimento, mas hoje cria lacunas que entram em conflito com o fluxo de seguranca descrito em `buildsaas.md` e com as regras de `securitycoderules.md`, principalmente em:

- autenticacao sem camada de proxy/BFF
- sessao persistida no browser
- credenciais sensiveis salvas no `localStorage`
- funcoes server-side com validacao fraca
- policies de storage amplas demais para ambiente multi-tenant
- uploads sem validacao forte de tipo e tamanho

Este documento propoe uma estrategia em duas camadas:

1. endurecimento imediato no stack atual
2. arquitetura-alvo aderente ao modelo `iron-session + proxy autenticado + backend validando identidade`

## 2. Contexto e motivacao

O CRM manipula:

- dados pessoais de clientes
- telefones, emails e dados de veiculos
- informacoes financeiras e operacionais
- garantias emitidas em PDF
- fotos de checklist
- configuracoes internas da empresa

Como o produto e multi-tenant, a falha mais critica nao e apenas invasao externa, mas tambem:

- usuario autenticado de uma empresa acessar arquivos de outra
- colaborador sem permissao abrir documentos privados
- uso indevido de funcoes com `service_role`
- persistencia de senha e sessao em local vulneravel do browser

## 3. Diagnostico atual

### 3.1 Brechas identificadas no codigo atual

1. **Sessao do Supabase persistida no `localStorage`**
   Arquivo de evidencia: `src/integrations/supabase/client.ts`
   Risco: qualquer XSS ou extensao maliciosa do browser consegue extrair sessao e assumir a conta.

2. **Senhas salvas em texto no `localStorage`**
   Arquivo de evidencia: `src/pages/Login.tsx`
   Risco: exposicao direta de credenciais do usuario no browser.

3. **Funcao `serve-pdf` acessivel por URL com `path` e sem verificacao forte do usuario**
   Arquivos de evidencia:
   - `supabase/functions/serve-pdf/index.ts`
   - `supabase/config.toml`
   Risco: leitura indevida de PDF privado se o caminho for descoberto ou enumerado.

4. **CORS permissivo (`*`) em Edge Functions**
   Arquivos de evidencia:
   - `supabase/functions/serve-pdf/index.ts`
   - `supabase/functions/check-pwned-password/index.ts`
   Risco: abuso cross-origin e superficie maior para automacao maliciosa.

5. **Bucket `pdfs` com policies sem isolamento por empresa**
   Arquivo de evidencia: `supabase/migrations/20260214015849_2cb1ac5d-3fff-4dc5-8cf0-e6d4ea1f6292.sql`
   Estado atual:
   - upload liberado para qualquer autenticado
   - leitura liberada para qualquer autenticado
   - delete liberado para qualquer autenticado
   Risco: usuario autenticado de uma empresa conseguir atuar sobre arquivos de outra.

6. **Fotos de checklist abertas por `getPublicUrl`**
   Arquivo de evidencia: `src/components/espaco/SlotDetailsDrawer.tsx`
   Risco: se o bucket for ou vier a ficar publico, as fotos viram URL compartilhaveis sem controle de acesso.

7. **Uploads sem validacao de MIME type, extensao e tamanho maximo**
   Arquivos de evidencia:
   - `src/components/espaco/FillSlotModal.tsx`
   - `src/components/espaco/EditSlotModal.tsx`
   - `src/pages/Empresa.tsx`
   Risco: upload de arquivo indevido, imagem maliciosa, arquivo gigante ou formato inesperado.

8. **Logs de console com contexto operacional sensivel**
   Arquivo de evidencia: `src/components/garantias/IssueWarrantyModal.tsx`
   Risco: exposicao de IDs internos e fluxo de emissao no console do browser.

9. **Headers HTTP de seguranca nao definidos no deploy**
   Arquivo de evidencia: `vercel.json`
   Risco: protecao insuficiente contra clickjacking, MIME sniffing e algumas classes de injecao.

10. **Nao existe `.env.example`**
    Risco: baixa governanca de segredo, onboarding inseguro e maior chance de configuracao manual incorreta.

### 3.2 Lacuna estrutural frente ao `securitycoderules.md`

O documento de regras exige:

- `iron-session` com cookie `httpOnly`
- frontend nunca acessando backend diretamente
- proxy autenticado repassando identidade ao backend
- backend validando identidade em toda rota protegida

O CRM atual nao possui essa camada. Portanto:

- parte do endurecimento pode ser feita no stack atual
- conformidade total com o fluxo proposto exige introduzir um BFF/proxy autenticado

## 4. Problema do produto

Hoje o sistema opera com controles importantes no banco e no Supabase, mas ainda carece de uma camada coesa de seguranca aplicada ponta a ponta.

Sem esse sistema de seguranca, o CRM fica exposto a:

- vazamento de credenciais
- exposicao de arquivos privados
- falhas de isolamento multi-tenant
- abuso de funcoes server-side
- dificuldade de auditoria
- alto impacto reputacional e juridico em caso de incidente

## 5. Objetivos

### 5.1 Objetivos principais

- Garantir isolamento real entre empresas em banco, storage e funcoes.
- Eliminar persistencia insegura de credenciais no frontend.
- Garantir que arquivos privados so sejam acessados por usuarios autorizados.
- Adicionar validacao de upload antes de aceitar qualquer arquivo.
- Restringir CORS, headers e exposicao de metadados.
- Definir arquitetura-alvo aderente ao fluxo recomendado no `buildsaas.md`.
- Criar trilha de rollout com quick wins e migracao estruturada.

### 5.2 Objetivos de negocio

- Reduzir risco de incidente com dados de clientes.
- Aumentar confianca para escalar o CRM como SaaS multi-tenant.
- Preparar o produto para cobranca, auditoria e operacao com mais empresas.

### 5.3 Fora de escopo

- Certificacao SOC 2, ISO 27001 ou equivalente.
- WAF corporativo ou SIEM completo nesta fase.
- Reescrita completa da aplicacao.
- Troca imediata de stack frontend, caso o time opte por fasear a migracao.

## 6. Principios de seguranca

O sistema proposto deve seguir estes principios:

- menor privilegio
- isolamento por tenant em toda camada
- negacao por padrao
- segredo nunca exposto ao cliente
- validacao server-side sempre que houver operacao sensivel
- links temporarios para arquivos privados
- logs minimizados no frontend e auditados no backend
- mensagens de erro seguras, sem stack trace ou detalhes internos

## 7. Usuarios e papeis impactados

- `MASTER`
  acessa administracao global e nunca pode usar bypass sem auditoria

- `ADMIN`
  gerencia empresa, equipe, documentos e configuracoes

- `VENDEDOR`
  acessa clientes, vendas e alguns documentos

- `PRODUCAO`
  acessa operacao e espaco, sem permissao ampla de administracao

## 8. Solucao proposta

## 8.1 Visao geral

O sistema de seguranca sera dividido em 6 blocos:

1. autenticacao e sessao
2. autorizacao e isolamento multi-tenant
3. seguranca de storage e documentos
4. seguranca de upload e input
5. seguranca de borda e deploy
6. auditoria e operacao

## 8.2 Arquitetura-alvo

### Fase A - endurecimento no stack atual

Aplicar seguranca sem reescrever a aplicacao:

- remover senha salva no browser
- endurecer bucket policies
- exigir autenticacao real para documentos privados
- trocar URLs publicas por URLs temporarias/autenticadas
- validar uploads
- restringir CORS e headers
- criar padroes de segredo e log

### Fase B - arquitetura aderente ao `securitycoderules.md`

Adicionar uma camada BFF/proxy autenticado:

`Browser -> App Web -> Proxy autenticado/BFF -> API/Edge -> Supabase`

Regras:

- sessao em cookie `httpOnly`, `secure`, `sameSite=lax`
- frontend sem acesso direto a rotas sensiveis do backend
- backend recebendo identidade de forma controlada
- rotas protegidas validando usuario e tenant em todas as entradas

Se o produto permanecer em Vite no curto prazo, essa camada pode ser criada como um gateway separado. Se migrar para Next.js, o BFF passa a ser a implementacao nativa do fluxo recomendado.

## 9. Requisitos funcionais

### 9.1 Autenticacao e sessao

- O sistema nao deve salvar senha do usuario em `localStorage`, `sessionStorage` ou cookie acessivel por JavaScript.
- O sistema pode lembrar apenas o email ou alias da conta para facilitar login futuro.
- No estado-alvo, a sessao deve ser mantida por cookie `httpOnly`.
- Logout deve invalidar a sessao local e remota.
- Expiracao de sessao deve redirecionar para login sem expor erro interno.

### 9.2 Autorizacao

- Toda leitura e escrita de dados multi-tenant deve validar `company_id` do usuario.
- Toda policy de storage privado deve validar a pasta raiz do arquivo contra a empresa do usuario.
- Operacoes de `MASTER` devem ser auditadas.
- Operacoes administrativas devem exigir role compativel.

### 9.3 Seguranca de documentos

- PDFs e outros arquivos privados nao devem ser acessiveis por URL publica previsivel.
- Download/visualizacao deve usar um destes modelos:
  - signed URL curta emitida apos autorizacao
  - proxy autenticado que valida usuario e empresa antes de servir o arquivo
- O caminho do storage deve seguir convencao:
  - `company_id/modulo/arquivo`
  - ou `company_id/recurso/subpasta/arquivo`

### 9.4 Seguranca de uploads

- Upload de logo deve aceitar apenas `png`, `jpg`, `jpeg`, `webp`.
- Upload de checklist deve aceitar apenas imagens aprovadas.
- Tamanho maximo deve ser configurado por tipo de arquivo.
- MIME, extensao e tamanho devem ser validados antes do upload.
- Nome do arquivo deve ser sanitizado antes de virar path.

### 9.5 Edge Functions

- Toda function sensivel deve exigir autenticacao valida ou verificacao forte equivalente.
- `service_role` so pode ser usada dentro da function apos validacao do usuario.
- CORS deve aceitar apenas dominios explicitamente permitidos.
- Responses devem ser genericas, sem stack trace ou SQL interno.

### 9.6 Frontend seguro

- IDs internos sensiveis nao devem ser logados no console.
- Erros mostrados para o usuario devem ser amigaveis e sem detalhe interno.
- O frontend nao deve exibir URL privada permanente de arquivo.
- Historicos locais podem armazenar apenas metadados nao sensiveis.

### 9.7 Deploy e configuracao

- O projeto deve ter `.env.example` sem valores reais.
- O deploy deve publicar headers de seguranca no host.
- Segredos devem existir apenas em ambiente seguro.

## 10. Requisitos nao funcionais

### 10.1 Seguranca

- RLS habilitado em 100% das tabelas multi-tenant.
- Buckets privados com isolamento por empresa.
- Zero senha salva em armazenamento persistente do navegador.
- Zero arquivo privado servido sem validacao de identidade.

### 10.2 Performance

- Geracao de URL de acesso privado em ate 500 ms na media.
- Download de PDF nao deve exigir mais de 1 roundtrip extra alem da autorizacao.

### 10.3 Observabilidade

- Toda tentativa negada de acesso a documento deve ser registravel.
- Toda operacao administrativa sensivel deve ser auditavel.

### 10.4 Compatibilidade

- O endurecimento imediato deve preservar o fluxo principal de login, emissao de PDF e upload.
- A migracao para BFF deve ser planejada de forma incremental.

## 11. Componentes do sistema de seguranca

## 11.1 Camada de sessao

### Estado imediato

- remover salvamento de senha
- manter no maximo email salvo
- revisar persistencia de sessao atual do Supabase e documentar risco residual

### Estado-alvo

- `iron-session` ou mecanismo equivalente com cookie `httpOnly`
- renovacao controlada de sessao
- expiracao e logout centralizados

## 11.2 Camada de autorizacao

- revisar tabelas publicas versus privadas
- garantir policies por `company_id`
- revisar tabelas de configuracao, documentos e relacionamento de equipe
- criar checklist formal de RLS por tabela

## 11.3 Camada de storage

### Bucket `company-logos`

- leitura publica pode continuar apenas se isso for decisao de produto
- escrita, update e delete devem ficar restritos ao `ADMIN` da mesma empresa

### Bucket `pdfs`

- leitura privada
- upload e delete restritos por `company_id`
- signed URL curta ou proxy autenticado

### Bucket `checklists`

- leitura privada
- sem `publicUrl`
- lista e download condicionados a pertencer a mesma empresa

## 11.4 Camada de upload

Cada upload deve passar por:

- validacao de tipo permitido
- validacao de extensao
- validacao de tamanho maximo
- normalizacao do nome
- recusa com mensagem generica quando invalido

Parametros iniciais sugeridos:

- logo da empresa: max 2 MB
- fotos de checklist: max 5 MB por arquivo
- limite de 20 imagens por checklist continua valido

## 11.5 Camada de funcoes server-side

### `serve-pdf`

Problema atual:

- usa `service_role`
- recebe apenas `path`
- `verify_jwt = false`
- CORS `*`

Novo comportamento:

- exigir token valido ou autenticacao equivalente
- identificar usuario chamador
- buscar `company_id` do usuario
- validar que o `storagePath` pertence a empresa do usuario
- gerar URL curta ou devolver o binario somente apos autorizacao
- registrar negacao de acesso

### `check-pwned-password`

Problema atual:

- funcao aberta demais
- CORS `*`

Novo comportamento:

- restringir origem por allowlist
- remover logs desnecessarios
- manter resposta minima
- opcionalmente adicionar rate limiting por IP/origem

## 11.6 Camada de borda

O deploy deve adicionar:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options` ou equivalente no CSP
- `Strict-Transport-Security` quando aplicavel em producao

## 11.7 Camada de auditoria

Eventos a registrar:

- login com sucesso
- falha de login
- acesso negado a documento
- emissao de documento sensivel
- alteracao de configuracao da empresa
- alteracao de permissao ou role
- acao de `MASTER`

## 12. User stories de seguranca

### US-01

Como dono da empresa, quero que usuarios de outras empresas nao consigam abrir meus PDFs, para proteger documentos comerciais e dados dos meus clientes.

### US-02

Como usuario do CRM, quero que minha senha nunca fique salva em texto no navegador, para reduzir risco de roubo de credenciais.

### US-03

Como administrador, quero que uploads aceitem apenas tipos permitidos, para evitar arquivos maliciosos e erros operacionais.

### US-04

Como operador, quero acessar apenas fotos e documentos da minha empresa, para preservar isolamento entre tenants.

### US-05

Como gestor de produto, quero ter um modelo de sessao aderente a `httpOnly cookie` no estado-alvo, para reduzir superficie de ataque no frontend.

## 13. Criterios de aceite

### 13.1 Credenciais

- nenhuma senha e salva em `localStorage`
- nenhum fluxo de "conta salva" depende de senha persistida

### 13.2 Buckets privados

- usuario autenticado da empresa A nao consegue listar, ler ou apagar arquivos da empresa B
- checklist nao usa URL publica permanente
- PDF privado nao abre sem autorizacao valida

### 13.3 Funcoes

- `serve-pdf` retorna `401` ou `403` quando nao autorizado
- `serve-pdf` nao aceita servir arquivo de outra empresa
- Edge Functions nao respondem com `Access-Control-Allow-Origin: *` em producao

### 13.4 Uploads

- upload invalido por MIME, extensao ou tamanho e bloqueado antes de subir
- arquivos aceitos seguem padrao de nome seguro

### 13.5 Deploy

- headers de seguranca presentes nas respostas principais
- `.env.example` existente e atualizado

### 13.6 Arquitetura-alvo

- existe especificacao aprovada para BFF/proxy autenticado
- identidade do usuario deixa de ser responsabilidade do browser no estado final

## 14. Priorizacao por fase

## Fase 1 - Critico imediato

- remover senha salva no `localStorage`
- endurecer policies do bucket `pdfs`
- proteger `serve-pdf`
- trocar `getPublicUrl` de checklist por acesso privado temporario
- adicionar validacao de upload
- reduzir CORS permissivo

## Fase 2 - Alta prioridade

- adicionar headers de seguranca no deploy
- revisar logs sensiveis no frontend
- criar `.env.example`
- formalizar checklist de RLS por tabela e bucket

## Fase 3 - Arquitetura-alvo

- introduzir BFF/proxy autenticado
- migrar sessao para cookie `httpOnly`
- centralizar autorizacao de rotas sensiveis fora do browser

## 15. Riscos e dependencias

### Riscos

- endurecer storage sem ajustar frontend pode quebrar download/preview de arquivos
- mudar sessao para cookie `httpOnly` exige mudanca arquitetural relevante
- CSP excessivamente restritivo pode bloquear funcionalidades existentes se nao for calibrado

### Dependencias

- revisao das policies atuais do Supabase
- definicao dos dominios oficiais do frontend
- decisao do time sobre permanencia em Vite ou migracao futura para Next.js/BFF

## 16. Open questions

Antes da implementacao, o time precisa fechar:

1. O CRM seguira em `Vite + Supabase direto` no medio prazo ou sera migrado para BFF/Next.js?
2. O bucket de logo da empresa continuara com leitura publica por decisao de produto?
3. Quais dominios oficiais devem entrar na allowlist de CORS?
4. O time quer sessao extremamente segura com relogin mais frequente no curto prazo, ou prefere manter UX atual ate a fase do BFF?
5. Havera webhook, billing ou integracoes externas adicionais que precisem entrar no escopo da camada de assinatura e rate limit?

## 17. Entregaveis esperados

Ao implementar este PRD, o projeto deve produzir:

- policies de storage revisadas
- funcoes server-side endurecidas
- frontend sem senha persistida
- uploads validados
- deploy com headers de seguranca
- `.env.example`
- documento de arquitetura da fase BFF
- plano de testes de isolamento multi-tenant

## 18. Resultado esperado

Ao final da execucao deste PRD, o Stealth CRM deve sair de um modelo de seguranca parcial e distribuida para um modelo com:

- isolamento real por empresa
- acesso privado a documentos
- credenciais melhor protegidas
- uploads controlados
- funcao server-side sem exposicao indevida
- trilha clara de migracao para a arquitetura recomendada no fluxo `buildsaas`

