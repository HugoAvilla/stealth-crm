const fs = require('fs');
let code = fs.readFileSync('c:/Users/hglav/OneDrive/Área de Trabalho/WFE/stealth-crm/src/components/vendas/EditSaleModal.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { SaleWithDetails } from "@/types/sales";'
);

// 2. Props
code = code.replace(
  /interface NewSaleModalProps \{[\s\S]*?\}/,
  `interface EditSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails;
}`
);

// 3. Component signature
code = code.replace(
  /const NewSaleModal = \({ open, onOpenChange, defaultClientId, initialDate }: NewSaleModalProps\) => \{/,
  'const EditSaleModal = ({ open, onOpenChange, sale }: EditSaleModalProps) => {'
);
code = code.replace(
  /const NewSaleModal = \({ open, onOpenChange, defaultClientId }: NewSaleModalProps\) => \{/,
  'const EditSaleModal = ({ open, onOpenChange, sale }: EditSaleModalProps) => {'
);

// 4. useEffect
code = code.replace(
  /  useEffect\(\(\) => \{[\s\S]*?\}, \[open, user\?\.id, initialDate\]\);/,
  `  useEffect(() => {
    if (open && sale) {
      setSaleDate(new Date(sale.sale_date + 'T12:00:00'));
      if (sale.client_id) setSelectedClientId(sale.client_id.toString());
      if (sale.vehicle_id) setSelectedVehicleId(sale.vehicle_id.toString());
      if (sale.discount) setDiscountValue(sale.discount.toString());
      if (sale.payment_method) setPaymentMethod(sale.payment_method);
      setIsOpen(sale.is_open || false);
      if (sale.observations) {
         setNotes(sale.observations);
         setShowNotes(true);
      }
      fetchData();
      
      const fetchItems = async () => {
         const { data } = await supabase.from('service_items_detailed').select('*').eq('sale_id', sale.id);
         if (data) {
            setDetailedItems(data.map((item) => ({
              id: crypto.randomUUID(),
              category: item.category,
              regionId: item.region_id,
              regionName: '', 
              productTypeId: item.product_type_id,
              productTypeName: '', 
              metersUsed: item.meters_used,
              totalPrice: item.total_price
            })));
         }
      };
      fetchItems();
    }
  }, [open, user?.id, sale]);`
);

// 5. handleSubmit - Update sale instead of insert
code = code.replace(
  /      const \{ data: saleRes, error: saleError \} = await supabase[\s\S]*?\.single\(\);/,
  `      const { error: saleError } = await supabase
        .from('sales')
        .update({
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          subtotal,
          discount: discount || 0,
          total,
          payment_method: paymentMethod,
          is_open: isOpen,
          status: isOpen ? 'Aberta' : 'Fechada',
          observations: notes || null,
        })
        .eq('id', sale.id);`
);

code = code.replace(
  /      const \{ data: saleLocal, error: saleError \} = await supabase[\s\S]*?\.single\(\);/,
  `      const { error: saleError } = await supabase
        .from('sales')
        .update({
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          subtotal,
          discount: discount || 0,
          total,
          payment_method: paymentMethod,
          is_open: isOpen,
          status: isOpen ? 'Aberta' : 'Fechada',
          observations: notes || null,
        })
        .eq('id', sale.id);`
);

code = code.replace(
  /      const \{ data: sale, error: saleError \} = await supabase[\s\S]*?\.single\(\);/,
  `      const { error: saleError } = await supabase
        .from('sales')
        .update({
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          subtotal,
          discount: discount || 0,
          total,
          payment_method: paymentMethod,
          is_open: isOpen,
          status: isOpen ? 'Aberta' : 'Fechada',
          observations: notes || null,
        })
        .eq('id', sale.id);`
);

// 6. estorno logic inside handleSubmit
code = code.replace(
  /      if \(saleError\) throw saleError;/,
  `      if (saleError) throw saleError;
      
      const { data: oldMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .like('reason', \`Consumo automático - Venda #\${sale.id}%\`)
        .eq('movement_type', 'Saida');
        
      if (oldMovements && oldMovements.length > 0) {
        const estornoData = oldMovements.map(m => ({
          material_id: m.material_id,
          movement_type: 'Entrada',
          quantity: m.quantity,
          reason: \`Estorno de Edição - Venda #\${sale.id}\`,
          user_id: user?.id,
          company_id: companyId,
        }));
        await supabase.from('stock_movements').insert(estornoData);
      }
      
      await supabase.from('service_items_detailed').delete().eq('sale_id', sale.id);
      await supabase.from('transactions').delete().eq('sale_id', sale.id);`
);

// FIX ID access in transactions and items 
code = code.replace(/sale_id: sale\.id/g, 'sale_id: sale.id');
code = code.replace(/sale_id: saleRes\.id/g, 'sale_id: sale.id');
code = code.replace(/sale\.id,/g, 'sale.id,');

// texts
code = code.replaceAll('Cadastrar venda', 'Editar venda');
code = code.replaceAll('cadastrar a venda', 'atualizar a venda');
code = code.replaceAll('export default NewSaleModal;', 'export default EditSaleModal;');
code = code.replaceAll('>Adicionar<', '>Salvar<');
code = code.replace('Venda de R$ ${total.toFixed(2)} cadastrada com sucesso!', 'Venda de R$ ${total.toFixed(2)} atualizada com sucesso!');

fs.writeFileSync('c:/Users/hglav/OneDrive/Área de Trabalho/WFE/stealth-crm/src/components/vendas/EditSaleModal.tsx', code);
