
# Plano: Sistema Completo de Preenchimento de Vagas no Espaco

## Resumo

Implementar um sistema completo de preenchimento de vagas na aba Espaco, permitindo selecionar vendas existentes, configurar datas de entrada/saida, adicionar fotos de checklist, e visualizar detalhes da vaga preenchida.

---

## Componentes a Criar

### 1. FillSlotModal.tsx (Modal Principal de Preenchimento)

Modal completo baseado no print fornecido, com as seguintes secoes:

**Campos do Modal:**
- Nome da vaga (opcional)
- Cliente (Select ou botao "+ Criar novo cliente")
- Veiculo do cliente (card com info do veiculo selecionado)
- Servicos da venda (exibe servicos vinculados)
- Data e Hora de entrada (obrigatorio)
- Data e Hora de saida (opcional - previsao)
- Fotos de checklist (upload ate 20 fotos)
- Campos opcionais (Desconto, Observacoes, Tag, Produtos)
- Resumo da vaga (calculo automatico)

**Layout do Modal:**
```text
┌──────────────────────────────────────────────────────────────────┐
│  Preencher vaga                                             [X]  │
│  Informe os dados para preencher a vaga                          │
├──────────────────────────────────────────────────────────────────┤
│  Nome da vaga (opcional)                                         │
│  [__________________________________]                            │
│                                                                  │
│  Cliente * [+ Criar novo cliente]                                │
│  [Select: hugo Avila                               ▼]    [🔄]   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🚗 Marca: ALFA ROMEO  Placa: 3849207        [✏️] [🗑️]    │  │
│  │    Modelo: 23938       Ano: 2020                          │  │
│  │    ─────────────────────────────────────────────────────   │  │
│  │    Higienizacao                               R$ 51,55    │  │
│  │    Total em servicos                          R$ 51,55    │  │
│  │    ─────────────────────────────────────────────────────   │  │
│  │    1 servico adicionado R$ 51,55                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ Dia da entrada * │  │ Hora da entrada *│                     │
│  │ [02/02/2026   ▼] │  │ [--:--       ▼] │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ Dia da saida     │  │ Hora saida *     │                     │
│  │ [Selecionar   ▼] │  │ [--:--       ▼] │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  Fotos de checklist                                              │
│  Abaixo estao as fotos dessa vaga                                │
│  [+ Carregar nova foto 0/20]                                     │
│                                                                  │
│  Campos opcionais                                                │
│  [Desconto] [+ Observacoes] [+ Tag] [+ Produtos]                │
│                                                                  │
│  Resumo da vaga                                                  │
│  ○ Vaga com 1 servico                                           │
│  $ Sub-total ficou em R$ 51,55                                  │
│  ○ Desconto de R$ 1,00                                          │
│  $ Total ficou em R$ 50,55                                      │
│  📅 Entrada em 02/02/2026                                       │
│  📷 Nenhuma foto adicionada                                     │
│  ⚠️ O valor pendente para fechar a venda e de R$ 50,55         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Adicionar vaga                           ✓      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2. SlotDetailsDrawer.tsx (Drawer de Detalhes da Vaga)

Drawer para exibir detalhes quando clicar em uma vaga preenchida:

**Secoes do Drawer:**
- Header com nome da vaga e botao concluir
- Info do cliente (telefone, data nascimento)
- Card do veiculo com servicos
- Resumo da vaga (datas, valores, venda vinculada)
- Comprovantes em PDF (3 formatos)
- Mais opcoes (mensagens, exportar, ver cliente)
- Botoes de acao (Editar, Excluir)

**Layout:**
```text
┌──────────────────────────────────────────────────────────────────┐
│  🚗 Vaga de hugo Avila                                      [X]  │
├──────────────────────────────────────────────────────────────────┤
│  [Toggle: Concluir vaga e liberar espaco                    ○]   │
│                                                                  │
│  📞 +55 (17) 99257-3141                                         │
│  👤 Cliente nasceu em 17/02/2016                                │
│                                                                  │
│  Servicos dessa vaga                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🚗 ALFA ROMEO  Placa: 3849207                              │  │
│  │    Modelo: 23938    Ano: 2020                              │  │
│  │    Higienizacao                               R$ 51,55     │  │
│  │    Total em servicos                          R$ 51,55     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Resumo da vaga                                                  │
│  📅 Entrada em 02/02/2026 as 04:05h                             │
│  🕐 Saida prevista para 03/02/2026 as 15:15h                    │
│  ○ Vaga com 1 servico                                           │
│  ⚠️ Vaga sem servicos adicionados                               │
│  $ Sub-total ficou em R$ 51,55                                  │
│  ○ Desconto de R$ 1,00                                          │
│  $ Total ficou em R$ 50,55                                      │
│  🔗 Vinculado a venda Nº 3                                      │
│                                                                  │
│  Comprovantes em PDF                                             │
│  [🔴 Baixar PDF em formato A4                              ]    │
│  [🔴 Baixar PDF em formato Notinha                         ]    │
│  [🔴 Baixar PDF em formato Notinha Mini                    ]    │
│                                                                  │
│  Mais opcoes                                                     │
│  [🟢 Enviar mensagem de entrada                            ]    │
│  [🟡 Enviar mensagem de saida                              ]    │
│  [🔵 Exportar para agenda                                  ]    │
│  [🟣 Exportar para orcamento                               ]    │
│  [🔵 Ver cliente da vaga                                   ]    │
│                                                                  │
│  ┌──────────────┐  ┌──────┐  ┌──────┐                           │
│  │   Editar     │  │  ✏️  │  │  🗑️  │                           │
│  └──────────────┘  └──────┘  └──────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alteracoes em Arquivos Existentes

### 1. Espaco.tsx

**Adicoes:**
- Botao "+ Preencher Vaga" no header da pagina
- Novo estado para controlar drawer de detalhes
- Query para buscar vagas do Supabase (tabela `spaces`)
- Substituir dados mock por dados reais

**Refatoracao do calendario:**
- Exibir vagas por data de entrada
- Badge de cores por status (ocupada, finalizada)

---

### 2. SlotCard.tsx

**Alteracoes:**
- Usar dados da tabela `spaces` em vez de mock
- Ao clicar no card ocupado, abrir SlotDetailsDrawer
- Mostrar informacoes do cliente e veiculo
- Exibir timer desde entrada

---

### 3. NewSlotModal.tsx

**Renomear para FillSlotModal.tsx e refatorar:**
- Interface completa baseada no print
- Select de cliente com busca
- Carregamento de vendas em aberto do cliente
- Card de veiculo com servicos
- Campos de data/hora
- Upload de fotos
- Campos opcionais toggleaveis
- Resumo dinamico
- Salvar na tabela `spaces`

---

## Fluxo de Dados

```text
1. Usuario clica em "+ Preencher Vaga" ou em vaga disponivel
                        │
                        ▼
2. Abre FillSlotModal
   - Busca clientes da empresa
   - Ao selecionar cliente, busca vendas em aberto
   - Ao selecionar venda, carrega veiculo e servicos
                        │
                        ▼
3. Usuario preenche dados e clica "Adicionar vaga"
   - Valida campos obrigatorios
   - INSERT na tabela `spaces`
   - Atualiza lista de vagas
                        │
                        ▼
4. Vaga aparece no calendario e grid de vagas
   - Card mostra info do cliente/veiculo
   - Timer conta desde entrada
                        │
                        ▼
5. Usuario clica na vaga ocupada
   - Abre SlotDetailsDrawer
   - Mostra todos os detalhes
   - Opcoes de acao
                        │
                        ▼
6. Usuario marca "Concluir vaga"
   - UPDATE em spaces (has_exited = true)
   - Se pago, aparece em "Veiculos Pagos (Saida)"
```

---

## Estrutura de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Espaco.tsx` | Refatorar (usar Supabase, adicionar botao) |
| `src/components/espaco/FillSlotModal.tsx` | Criar (substituir NewSlotModal) |
| `src/components/espaco/SlotDetailsDrawer.tsx` | Criar |
| `src/components/espaco/SlotCard.tsx` | Atualizar (dados do Supabase) |
| `src/components/espaco/NewSlotModal.tsx` | Remover (substituido) |

---

## Queries Supabase

**Buscar vagas da empresa:**
```typescript
const { data: spaces } = await supabase
  .from('spaces')
  .select(`
    *,
    client:clients(id, name, phone, birth_date),
    vehicle:vehicles(id, brand, model, plate, year, size),
    sale:sales(
      id, total, subtotal, discount, payment_method,
      items:service_items_detailed(
        *,
        product_type:product_types(brand, name),
        region:vehicle_regions(name)
      )
    )
  `)
  .eq('company_id', companyId)
  .eq('has_exited', false)
  .order('entry_date', { ascending: false });
```

**Buscar vendas em aberto do cliente:**
```typescript
const { data: sales } = await supabase
  .from('sales')
  .select(`
    *,
    vehicle:vehicles(*),
    items:service_items_detailed(
      *,
      product_type:product_types(brand, name, model),
      region:vehicle_regions(name)
    )
  `)
  .eq('client_id', clientId)
  .eq('company_id', companyId)
  .eq('is_open', true);
```

---

## Detalhes Tecnicos

### FillSlotModal - Estados:

```typescript
const [slotName, setSlotName] = useState("");
const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
const [entryTime, setEntryTime] = useState(format(new Date(), 'HH:mm'));
const [exitDate, setExitDate] = useState("");
const [exitTime, setExitTime] = useState("");
const [photos, setPhotos] = useState<string[]>([]);
const [discount, setDiscount] = useState(0);
const [observations, setObservations] = useState("");
const [tag, setTag] = useState("");
const [showDiscount, setShowDiscount] = useState(false);
const [showObservations, setShowObservations] = useState(false);
const [showTag, setShowTag] = useState(false);
```

### SlotDetailsDrawer - Funcionalidades:

```typescript
// Toggle para concluir vaga
const handleCompleteSlot = async () => {
  await supabase
    .from('spaces')
    .update({
      has_exited: true,
      exit_date: format(new Date(), 'yyyy-MM-dd'),
      exit_time: format(new Date(), 'HH:mm'),
    })
    .eq('id', space.id);
};

// Marcar como pago
const handleMarkAsPaid = async () => {
  await supabase
    .from('spaces')
    .update({ payment_status: 'paid' })
    .eq('id', space.id);
};
```

---

## Resumo Visual do Calendario

O calendario mostrara badges coloridos por dia:
- **Amarelo**: Vagas em andamento
- **Verde**: Vagas finalizadas/pagas
- **Vermelho**: Vagas com pagamento pendente

Ao clicar em um dia, abre o SlotsDayDrawer mostrando todas as vagas daquele dia.

---

## Ordem de Implementacao

1. Criar `FillSlotModal.tsx` com interface completa
2. Criar `SlotDetailsDrawer.tsx` para visualizar detalhes
3. Refatorar `Espaco.tsx` para usar Supabase
4. Atualizar `SlotCard.tsx` para dados reais
5. Remover dependencias do mockData
6. Testar fluxo completo
