
# Plano de Implementacao - CRM WFE Evolution

## Resumo do Estado Atual

Analisei o codigo existente e identifiquei que:
- **Tabela spaces** ja possui as colunas `sale_id`, `payment_status` e `has_exited` no banco
- **Painel Master** (`/master`) ja existe com gestao de cupons e assinaturas
- **PaidExitedVehicles** ja existe em `src/components/espaco/`
- **TransferToSpaceModal** existe mas usa mock data ao inves de Supabase
- Muitas funcionalidades usam dados mock (`mockData.ts`) ao inves do banco real

## Alteracoes Necessarias

### PARTE 1: Alteracoes de Banco de Dados

As colunas da tabela `spaces` ja existem no banco. Porem, precisamos criar um storage bucket para upload de logos.

**Migracao SQL necessaria:**
- Criar bucket de storage `company-logos` para upload de logos das empresas

---

### PARTE 2: Funcionalidades Novas

#### 2.1 TransferToSpaceModal - Conectar ao Supabase

**Arquivo:** `src/components/vendas/TransferToSpaceModal.tsx`

**Alteracoes:**
- Importar `supabase` client
- Modificar `handleTransfer` para fazer insert real na tabela `spaces`
- Buscar `company_id` do usuario logado via `useAuth`
- Remover simulacao de timeout

---

#### 2.2 Aba "Veiculos Pagos" - Ja Implementada

**Status:** O componente `PaidExitedVehicles.tsx` ja existe e esta integrado na pagina `Espaco.tsx`. Nenhuma alteracao necessaria.

---

#### 2.3 Botao "Voltar" nas Assinaturas - Ja Implementado no Master

**Status:** O painel Master ja possui navegacao adequada.

---

#### 2.4 Painel Master - Ja Implementado

**Status:** A rota `/master` ja existe com:
- Gestao de cupons
- Gestao de assinaturas com alteracao de preco e expiracao
- Verificacao de acesso master via `is_master_account`

---

### PARTE 3: Correcoes e Ajustes

#### 3.1 Dashboard - Botao no Card Financeiro

**Arquivo:** `src/components/dashboard/FinancialSummary.tsx`

**Alteracoes:**
- Adicionar botao "Ver Financeiro Completo" que navega para `/financeiro`
- Adicionar import do `useNavigate` do react-router-dom
- Estilizar botao com cor primaria (amarelo/lime)

---

#### 3.2 Vendas - PDFs Reais com jsPDF

**Novos arquivos:**
- `src/lib/pdfGenerator.ts` - Funcoes para gerar PDFs A4, 80mm e 58mm

**Arquivos a modificar:**
- `src/components/vendas/PdfA4Modal.tsx` - Usar jsPDF real
- `src/components/vendas/PdfNotinhaModal.tsx` - Usar jsPDF real

**Dependencias:**
- Instalar `jspdf` e `jspdf-autotable`

---

#### 3.3 Vendas - Editar e Excluir

**Arquivo:** `src/components/vendas/SaleDetailsModal.tsx`

**Alteracoes:**
- Implementar `handleEditSale` que abre modal de edicao
- Implementar `handleDeleteSale` com confirmacao e delete no Supabase
- Adicionar modal de edicao de venda

---

#### 3.4 Espaco - Status de Pagamento Visivel

**Arquivo:** `src/components/espaco/SlotCard.tsx`

**Alteracoes:**
- Adicionar indicador visual de `payment_status` (Pago/Nao pago)
- Mostrar badge verde para "Pago" e vermelho para "Nao pago"

---

#### 3.5 Espaco - Permitir Datas Futuras no Calendario

**Arquivo:** `src/pages/Espaco.tsx`

**Alteracoes:**
- Remover condicao `isFuture(day)` que desabilita datas futuras
- Permitir agendamentos para datas futuras

---

#### 3.6 Clientes - Excluir com Verificacao

**Arquivo:** `src/pages/Clientes.tsx`

**Alteracoes:**
- Modificar `confirmDelete` para verificar vendas vinculadas antes de excluir
- Conectar ao Supabase para operacoes reais de delete

---

#### 3.7 Servicos - Remover Colunas Desnecessarias

**Arquivo:** `src/pages/Servicos.tsx`

**Alteracoes:**
- Remover colunas "Pos-Venda" e "Auto-Agendar" da tabela
- Manter apenas: Servico, Preco, Qtde Vendas, Total Vendido, Acoes
- Remover card "Faturamento Total" (primeiro card de stats)

---

#### 3.8 Garantias - PDF Real

**Arquivo:** `src/pages/Garantias.tsx`

**Alteracoes:**
- Importar e usar `jsPDF` para gerar PDF real
- Implementar `generateWarrantyPDF` com dados da garantia

---

#### 3.9 Garantias - Corrigir Scroll no Modal

**Arquivo:** `src/components/garantias/IssueWarrantyModal.tsx`

**Alteracoes:**
- Adicionar classes `max-h-[85vh] overflow-y-auto` no DialogContent

---

#### 3.10 Perfil - Card de Assinatura Conectado ao Banco

**Arquivo:** `src/pages/Perfil.tsx`

**Alteracoes:**
- Buscar dados reais de `subscriptions` via Supabase
- Calcular dias restantes com base em `expires_at`
- Remover dados mock de subscription

---

#### 3.11 Sua Empresa - Upload de Logo

**Arquivo:** `src/pages/Empresa.tsx`

**Alteracoes:**
- Adicionar input file para upload de logo
- Fazer upload para Supabase Storage bucket `company-logos`
- Atualizar `companies.logo_url` apos upload
- Exibir logo existente se houver

---

#### 3.12 Relatorios - Exportacao PDF Real

**Arquivo:** `src/components/relatorios/ReportConfigModal.tsx`

**Alteracoes:**
- Implementar geracao real de PDF com jsPDF e jspdf-autotable
- Criar funcao generica que recebe dados do relatorio e gera PDF

---

### PARTE 4: Arquivos a Criar

```text
src/
├── lib/
│   └── pdfGenerator.ts         # Funcoes de geracao de PDF
├── components/
│   └── vendas/
│       └── EditSaleModal.tsx   # Modal de edicao de venda (novo)
```

---

### PARTE 5: Dependencias a Instalar

```bash
npm install jspdf jspdf-autotable
```

Tipos TypeScript:
```bash
npm install -D @types/jspdf @types/jspdf-autotable
```

---

## Ordem de Implementacao

1. **Banco de dados**: Criar bucket de storage para logos
2. **Dependencias**: Instalar jspdf e jspdf-autotable
3. **Core**: Criar `pdfGenerator.ts` com funcoes de PDF
4. **Vendas**: TransferToSpaceModal com Supabase real
5. **Vendas**: PDFs A4/80mm/58mm reais + Editar/Excluir
6. **Dashboard**: Botao no card financeiro
7. **Espaco**: Status de pagamento visivel + datas futuras
8. **Clientes**: Excluir com verificacao
9. **Servicos**: Remover colunas
10. **Garantias**: PDF real + scroll modal
11. **Perfil**: Assinatura conectada ao banco
12. **Empresa**: Upload de logo
13. **Relatorios**: Exportacao PDF real

---

## Detalhes Tecnicos

### TransferToSpaceModal - Implementacao

```typescript
// Modificar handleTransfer para usar Supabase
const handleTransfer = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const companyId = user?.companyId;
    if (!companyId) throw new Error("Company not found");

    const { error } = await supabase.from("spaces").insert({
      company_id: companyId,
      name: `Vaga - ${client?.name}`,
      client_id: sale.client_id,
      vehicle_id: Number(vehicleId),
      sale_id: sale.id,
      status: "ocupado",
      entry_date: entryDate,
      entry_time: entryTime,
      exit_date: exitDate || null,
      exit_time: exitTime || null,
      payment_status: paymentStatus,
      has_exited: !!exitDate,
      observations: observations,
    });

    if (error) throw error;
    toast({ title: "Venda transferida para Espaco!" });
    onOpenChange(false);
    onTransferComplete?.();
  } catch (error) {
    toast({ title: "Erro ao transferir venda", variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
};
```

### PDF Generator

```typescript
// src/lib/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateSalePDF(sale: Sale, format: 'A4' | '80mm' | '58mm') {
  const width = format === 'A4' ? 210 : format === '80mm' ? 80 : 58;
  const doc = new jsPDF({
    orientation: format === 'A4' ? 'portrait' : 'portrait',
    unit: 'mm',
    format: format === 'A4' ? 'a4' : [width, 200]
  });
  
  // Cabecalho
  doc.setFontSize(format === 'A4' ? 16 : 12);
  doc.text('WFE Evolution', 10, 10);
  // ... resto da implementacao
  
  doc.save(`venda-${sale.id}.pdf`);
}
```

### Perfil - Buscar Assinatura Real

```typescript
const [subscription, setSubscription] = useState<Subscription | null>(null);

useEffect(() => {
  const fetchSubscription = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    setSubscription(data);
  };
  
  fetchSubscription();
}, [user?.id]);

const daysRemaining = subscription?.expires_at
  ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  : null;
```

---

## Consideracoes Importantes

1. **Dados Mock vs Supabase**: Varios componentes ainda usam `mockData.ts`. Para integracao completa, seria necessario conectar todos ao Supabase.

2. **Storage Bucket**: O bucket `company-logos` precisa ser criado com policies RLS apropriadas.

3. **Verificacao de Vendas**: Ao excluir cliente, verificar se existem vendas vinculadas para evitar erros de foreign key.

4. **Painel Master**: Ja esta funcional com as RPC functions `master_change_subscription_price` e `master_change_expiry_date`.
