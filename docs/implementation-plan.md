# Plano de Implementação — Melhoria Visual no Seletor de Vagas (Perdas)

Este plano detalha a melhoria de usabilidade no modal **Registrar Perda de Material** (Aba Percas), onde a identificação das vagas estava confusa por exibir apenas a placa e o cliente.

---

## 📋 Contexto e Problema
No modal de **Registrar Perda de Material**, o campo **Vaga (Veículo)** exibe uma lista de opções de vagas disponíveis. Anteriormente, a lista renderizava apenas a placa do veículo e o nome do cliente no formato:
`[Placa] - [Cliente]`

**Problema:** Quando há placas fictícias repetidas no ambiente (ex: `999-9999`) ou o mesmo cliente possui mais de uma vaga/veículo ativo simultaneamente, o usuário não consegue distinguir qual vaga corresponde a qual serviço em andamento no pátio.

---

## 🛠️ Solução Proposta
Enriquecer os dados retornados e formatar a exibição da vaga no dropdown para incluir:
1. **Identificador da Vaga (`space.name`)**: Exibe qual box ou vaga o veículo está ocupando (ex: *Vaga 1*, *Box 2*).
2. **Dados do Veículo (`vehicle.brand`, `vehicle.model`)**: Marca e Modelo ajudam na identificação visual direta.
3. **Placa do Veículo (`vehicle.plate`)**: Mantida como dado de confirmação.
4. **Nome do Cliente (`client.name`)**: Mantido para contexto do proprietário.

O novo formato de exibição no dropdown é:
`[Nome da Vaga]: [Marca] [Modelo] ([Placa]) — [Nome do Cliente]`
*Exemplo:* `Vaga 1: Toyota Corolla (999-9999) — Eduardo`

---

## ⚡ Plano de Tarefas (Padrão buildsaas.md)

### ## Batch 1: Ajuste de Queries e Frontend
- **Task 1.1**: Atualizar a query de busca de vagas em andamento (`active-spaces`) no modal de perdas para selecionar os campos `name` da tabela `spaces` e `brand` da relação `vehicles`, além de adicionar o filtro `.is('deleted_at', null)` para alinhar 100% com a seção de vagas ocupadas ativas do painel.
  - **Arquivos Envolvidos:** `src/components/material-losses/MaterialLossFormModal.tsx`
  - **Verificação:** Garantir que o hook do TanStack Query compile e filtre corretamente os registros deletados logicamente (lixeira) e traga os novos campos.

- **Task 1.2**: Formatar e enriquecer a exibição do `SelectItem` correspondente à vaga, construindo uma string legível contendo a vaga, modelo, marca, placa e cliente.
  - **Arquivos Envolvidos:** `src/components/material-losses/MaterialLossFormModal.tsx`
  - **Verificação:** Abrir o modal de registrar perdas e conferir se a listagem de vagas exibe os dados enriquecidos em vez de apenas a placa, contendo exatamente as mesmas vagas da seção de Vagas Ocupadas.

---

## ✅ Verificação Local (Checklist)
- [x] Query atualizada com os campos `spaces(name)` e `vehicles(brand)`.
- [x] Filtro `.is('deleted_at', null)` adicionado para ignorar vagas da lixeira.
- [x] Renderização do dropdown exibindo o padrão `Vaga: Marca Modelo (Placa) — Cliente`.
- [x] O valor da vaga continua sendo mapeado para o ID correspondente da tabela `spaces` no hook-form.
