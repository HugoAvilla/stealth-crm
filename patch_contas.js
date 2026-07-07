const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Contas.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes('ConfirmPurchasePaymentModal')) {
    content = content.replace(
        'import { supabase } from "@/integrations/supabase/client";',
        'import { supabase } from "@/integrations/supabase/client";\nimport { ConfirmPurchasePaymentModal } from "@/components/compras/ConfirmPurchasePaymentModal";\nimport { SalePayment } from "@/components/vendas/PaymentBlock";'
    );
}

// 2. Add states
if (!content.includes('const [companyId, setCompanyId]')) {
    content = content.replace(
        'const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);',
        'const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);\n\n  // States for payment confirmation modal\n  const [companyId, setCompanyId] = useState<number | null>(null);\n  const [paymentModalOpen, setPaymentModalOpen] = useState(false);\n  const [transactionToPay, setTransactionToPay] = useState<Transaction | null>(null);\n'
    );
}

// 3. Set company Id
if (!content.includes('setCompanyId(profile.company_id);')) {
    content = content.replace(
        '// Fetch accounts',
        'setCompanyId(profile.company_id);\n\n      // Fetch accounts'
    );
}

// 4. Add methods
const methodsCode = `
  const handleOpenPaymentModal = (tx: Transaction) => {
    if (typeof tx.id === 'string') {
      toast.error("Não é possível alterar o status de uma transferência.");
      return;
    }
    setTransactionToPay(tx);
    setPaymentModalOpen(true);
  };

  const handleConfirmPaymentTransactions = async (payments: SalePayment[]) => {
    if (!transactionToPay || !companyId) return;

    try {
      const p = payments[0];
      
      let finalNetAmount = p.amount;
      if ((p.payment_method === "Crédito" || p.payment_method === "Débito") && p.machine_id) {
        const { data: rateData } = await supabase
          .from("card_machine_rates")
          .select("rate")
          .eq("machine_id", p.machine_id)
          .eq("installments", p.installments)
          .single();
        
        if (rateData) {
          finalNetAmount = p.amount * (1 - rateData.rate / 100);
        }
      }

      const { error: txError } = await supabase
        .from('transactions')
        .update({ 
          is_paid: true,
          amount: finalNetAmount,
          account_id: p.account_id,
          payment_method: p.payment_method
        })
        .eq('id', transactionToPay.id);

      if (txError) throw txError;

      for (let i = 1; i < payments.length; i++) {
        const splitPayment = payments[i];
        
        let splitNetAmount = splitPayment.amount;
        if ((splitPayment.payment_method === "Crédito" || splitPayment.payment_method === "Débito") && splitPayment.machine_id) {
          const { data: rateData } = await supabase
            .from("card_machine_rates")
            .select("rate")
            .eq("machine_id", splitPayment.machine_id)
            .eq("installments", splitPayment.installments)
            .single();
          if (rateData) {
            splitNetAmount = splitPayment.amount * (1 - rateData.rate / 100);
          }
        }
        
        const { error: splitError } = await supabase
          .from('transactions')
          .insert({
            name: \`\${transactionToPay.name} (Split)\`,
            amount: splitNetAmount,
            type: transactionToPay.type,
            transaction_date: transactionToPay.transaction_date,
            account_id: splitPayment.account_id,
            company_id: companyId,
            is_paid: true,
            payment_method: splitPayment.payment_method,
            description: transactionToPay.description
          });
        if (splitError) throw splitError;
      }

      fetchData();
      toast.success('Pagamento confirmado e registrado!');
      setPaymentModalOpen(false);
      setTransactionToPay(null);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      toast.error('Erro ao atualizar status do lançamento.');
    }
  };

  // Payment methods breakdown from real transactions`;

if (!content.includes('handleOpenPaymentModal = ')) {
    content = content.replace(
        '// Payment methods breakdown from real transactions',
        methodsCode
    );
}

// 5. Change onClick in Future groups
content = content.replace(
    'onClick={(e) => { e.stopPropagation(); handleTogglePayment(tx, true); }}',
    'onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(tx); }}'
);

// 6. Add modal inside JSX
const modalJSX = `
        <ManageCategoriesModal
          open={manageCategoriesOpen}
          onOpenChange={setManageCategoriesOpen}
          onCategoriesChange={fetchData}
        />

        {transactionToPay && companyId && (
          <ConfirmPurchasePaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            installmentAmount={transactionToPay.amount}
            companyId={companyId}
            defaultAccountId={transactionToPay.account_id}
            purchasePaymentMethod={transactionToPay.payment_method || "Pix"}
            onConfirm={handleConfirmPaymentTransactions}
          />
        )}
`;

if (!content.includes('<ConfirmPurchasePaymentModal')) {
    content = content.replace(
        '<ManageCategoriesModal\n          open={manageCategoriesOpen}\n          onOpenChange={setManageCategoriesOpen}\n          onCategoriesChange={fetchData}\n        />',
        modalJSX
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched Contas.tsx successfully');
