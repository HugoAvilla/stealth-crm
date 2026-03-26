import sys
import re

with open('src/components/vendas/EditSaleModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'import { useAuth } from "@/contexts/AuthContext";',
    'import { useAuth } from "@/contexts/AuthContext";\nimport { SaleWithDetails } from "@/types/sales";'
)

text = re.sub(
    r'interface NewSaleModalProps \{[\s\S]*?\}',
    'interface EditSaleModalProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  sale: SaleWithDetails;\n}',
    text
)

text = re.sub(
    r'const NewSaleModal = \({ open, onOpenChange.*?}: NewSaleModalProps\) => \{',
    'const EditSaleModal = ({ open, onOpenChange, sale }: EditSaleModalProps) => {',
    text
)

text = re.sub(
    r'  useEffect\(\(\) => \{[\s\S]*?\}, \[open, user\?\.id.*?\]\);',
    '''  useEffect(() => {
    if (open && sale) {
      setSaleDate(new Date(sale.sale_date + 'T12:00:00'));
      if (sale.client_id) setSelectedClientId(sale.client_id.toString());
      if (sale.vehicle_id) setSelectedVehicleId(sale.vehicle_id.toString());
      if (sale.discount) {
         setDiscountValue(sale.discount.toString());
         const calcPercent = (sale.discount / sale.subtotal) * 100;
         setDiscountPercent(calcPercent.toFixed(1));
      }
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
  }, [open, user?.id, sale]);''',
    text
)

text = re.sub(
    r'      const \{ data: (?:\w+), error: saleError \} = await supabase[\s\S]*?\.single\(\);',
    r"""      const { error: saleError } = await supabase
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
        .eq('id', sale.id);""",
    text
)

text = re.sub(
    r'      if \(saleError\) throw saleError;',
    r"""      if (saleError) throw saleError;
      
      const { data: oldMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .like('reason', `Consumo automático - Venda #${sale.id}%`)
        .eq('movement_type', 'Saida');
        
      if (oldMovements && oldMovements.length > 0) {
        const estornoData = oldMovements.map(m => ({
          material_id: m.material_id,
          movement_type: 'Entrada',
          quantity: m.quantity,
          reason: `Estorno de Edição - Venda #${sale.id}`,
          user_id: user?.id,
          company_id: companyId,
        }));
        await supabase.from('stock_movements').insert(estornoData);
      }
      
      await supabase.from('service_items_detailed').delete().eq('sale_id', sale.id);
      await supabase.from('transactions').delete().eq('sale_id', sale.id);""",
    text
)

text = re.sub(r'sale_id: \w+\.id', 'sale_id: sale.id', text)

text = text.replace('Cadastrar venda', 'Editar venda')
text = text.replace('cadastrar a venda', 'atualizar a venda')
text = text.replace('export default NewSaleModal;', 'export default EditSaleModal;')
text = text.replace('>Adicionar<', '>Salvar<')
text = text.replace('Venda de R$ ${total.toFixed(2)} cadastrada com sucesso!', 'Venda de R$ ${total.toFixed(2)} atualizada com sucesso!')
text = text.replace('Cadastrar Venda', 'Editar Venda')

with open('src/components/vendas/EditSaleModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
