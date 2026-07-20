// @ts-nocheck
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  CalendarIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Percent,
  User,
  Car,
  Layers,
  Sliders,
  CreditCard,
  Banknote,
  Settings,
  Shield,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { consumeStockForDetailedSale, createTransactionFromSale } from "@/lib/stockConsumption";
import { reverseAllSaleTransactions, createBoletoInstallmentTransactions } from "@/lib/financialTransactions";
import {
  calculateCardMachineNetAmount,
  formatCardMachineRatePercent,
} from "@/lib/cardMachineFees";
import NewClientModal from "@/pages/Vendas/components/NewClientModal";
import NewVehicleModal from "@/pages/Vendas/components/NewVehicleModal";
import ServiceItemRow, { DetailedServiceItem, ProductCategory } from "@/pages/Vendas/components/ServiceItemRow";
import CustomizedServiceBlock, { CustomizedRegionItem, createInitialCustomItems } from "@/pages/Vendas/components/CustomizedServiceBlock";
import CommissionSelectors from "@/pages/Vendas/components/CommissionSelectors";
import { toast } from "sonner";
import { SaleWithDetails } from "@/types/sales";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
  size: string | null;
  client_id: number | null;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  // unit_price removido - preço vem do serviço
  openRollsCount?: number;
  hasClosedRoll?: boolean;
}

interface VehicleRegion {
  id: number;
  category: string;
  name: string;
  description: string | null;
  fixed_price: number | null;
  region_code?: string | null;
}

interface ConsumptionRule {
  id: number;
  category: string;
  region_id: number;
  vehicle_size: string;
  meters_consumed: number;
  region_code?: string | null;
}

interface EditSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails;
}

const EditSaleModal = ({ open, onOpenChange, sale }: EditSaleModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showDetailedServices, setShowDetailedServices] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [servicePrice, setServicePrice] = useState("");

  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [selectedInstallerIds, setSelectedInstallerIds] = useState<number[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [vehicleRegions, setVehicleRegions] = useState<VehicleRegion[]>([]);
  const [consumptionRules, setConsumptionRules] = useState<ConsumptionRule[]>([]);
  const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
  const [customizedGroups, setCustomizedGroups] = useState<Map<string, CustomizedRegionItem[]>>(new Map());
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [originalAccountId, setOriginalAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);
  const [cardRates, setCardRates] = useState<any[]>([]);

  useEffect(() => {
    if (open && sale) {
      setSaleDate(new Date(sale.sale_date + 'T12:00:00'));
      if (sale.client_id) setSelectedClientId(sale.client_id.toString());
      if (sale.vehicle_id) setSelectedVehicleId(sale.vehicle_id.toString());
      if (sale.discount) {
        setDiscountValue(sale.discount.toString());
        if (sale.subtotal) {
          setDiscountPercent(((sale.discount / sale.subtotal) * 100).toFixed(1));
        }
      }
      if (sale.payment_method) setPaymentMethod(sale.payment_method);
      setIsOpen(sale.is_open || false);
      if (sale.observations) {
        setNotes(sale.observations);
        setShowNotes(true);
      }
      setSelectedMachineId(null);
      setSelectedInstallments(1);
      fetchData();

      const fetchItems = async () => {
        const queryColumns = 'id, name, region_code' as '*';
        const [{ data: items }, { data: regions }, { data: commissions }] = await Promise.all([
          supabase.from('service_items_detailed').select('*').eq('sale_id', sale.id),
          supabase.from('vehicle_regions').select(queryColumns).eq('company_id', (sale as any).company_id || companyId || 0),
          supabase.from('sale_commissions').select('*').eq('sale_id', sale.id)
        ]);

        if (items) {
          setDetailedItems(items.map((item) => {
            const foundRegion = regions?.find(r => r.id === item.region_id);
            return {
              id: Math.random().toString(36).substr(2, 9),
              category: item.category as ProductCategory,
              regionId: item.region_id,
              regionName: foundRegion?.name || '',
              productTypeId: item.product_type_id,
              productTypeName: '',
              metersUsed: item.meters_used,
              totalPrice: item.total_price,
              serviceName: (item as any).service_name || '',
              regionCode: (item as any).region_code || foundRegion?.region_code || null,
              displayName: (item as any).display_name || '',
              isCustomized: (item as any).is_customized || false,
              customizationGroup: (item as any).customization_group || null,
            };
          }));
        }

        if (commissions) {
          const seller = commissions.find(c => c.person_type === 'VENDEDOR');
          if (seller) setSelectedSellerId(seller.commission_person_id);

          const installers = commissions
            .filter(c => c.person_type !== 'VENDEDOR')
            .map(c => c.commission_person_id);
          setSelectedInstallerIds(installers);
        }
      };
      if (sale.id) fetchItems();
    }
  }, [open, user?.id, sale]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      const [clientsRes, productTypesRes, regionsRes, rulesRes, materialsRes, paymentsRes, accountsRes, machinesRes, ratesRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id).order('name'),
        supabase.from('product_types').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('brand'),
        supabase.from('vehicle_regions').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('sort_order'),
        supabase.from('region_consumption_rules').select('*').eq('company_id', profile.company_id),
        supabase.from('materials').select('product_type_id, is_open_roll, current_stock').eq('company_id', profile.company_id).eq('is_active', true),
        supabase.from('sale_payments').select('*').eq('sale_id', sale.id),
        supabase.from('accounts').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('is_main', { ascending: false }),
        supabase.from('card_machines').select('id, name, debit_rate, is_anticipated').eq('company_id', profile.company_id),
        supabase.from('card_machine_rates').select('*')
      ]);
      setCardRates(ratesRes.data || []);

      const regionsList = regionsRes.data || [];
      const materialsList = materialsRes.data || [];
      const productsList = (productTypesRes.data || []).map(pt => {
        const ptMaterials = materialsList.filter(m => m.product_type_id === pt.id);
        const openRolls = ptMaterials.filter(m => m.is_open_roll);
        const closedRolls = ptMaterials.filter(m => !m.is_open_roll);
        return {
          ...pt,
          openRollsCount: openRolls.length,
          hasClosedRoll: closedRolls.length > 0
        };
      });

      setClients(clientsRes.data || []);
      setProductTypes(productsList);
      setVehicleRegions(regionsList);
      setAccounts(accountsRes.data || []);
      setMachines(machinesRes.data || []);

      const rulesList = (rulesRes.data || []).map((rule: any) => {
        const region = regionsList.find(r => r.id === rule.region_id);
        return { ...rule, region_code: region?.region_code || null };
      });
      setConsumptionRules(rulesList);

      const payData = paymentsRes.data || [];
      if (payData.length > 0) {
        const firstPayment = payData[0];
        setOriginalAccountId(firstPayment.account_id);
        setSelectedAccountId(firstPayment.account_id);
        setSelectedMachineId(firstPayment.machine_id);
        setSelectedInstallments(firstPayment.installments || 1);
      } else {
        const { data: txData } = await supabase
          .from('transactions')
          .select('account_id')
          .eq('sale_id', sale.id)
          .limit(1);
        if (txData && txData.length > 0 && txData[0].account_id) {
          setOriginalAccountId(txData[0].account_id);
          setSelectedAccountId(txData[0].account_id);
        } else if (accountsRes.data && accountsRes.data.length > 0) {
          setSelectedAccountId(accountsRes.data[0].id);
        }
      }

      // If the sale payment method is Boleto, let's load installments count and account from boletos table
      if (sale.payment_method === "Boleto") {
        const { data: boletoData } = await supabase
          .from("boletos")
          .select("id, account_id")
          .eq("sale_id", sale.id)
          .maybeSingle();

        if (boletoData) {
          const { data: insts } = await supabase
            .from("boleto_installments")
            .select("id")
            .eq("boleto_id", boletoData.id);

          if (insts && insts.length > 0) {
            setSelectedInstallments(insts.length);
          }
          if (boletoData.account_id) {
            setSelectedAccountId(boletoData.account_id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicles when client changes
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selectedClientId || !companyId) {
        setVehicles([]);
        return;
      }

      const { data } = await supabase
        .from('vehicles')
        .select('id, brand, model, plate, size, client_id')
        .eq('client_id', parseInt(selectedClientId))
        .eq('company_id', companyId);

      setVehicles(data || []);

      if (data && data.length === 1) {
        setSelectedVehicleId(data[0].id.toString());
      } else {
        setSelectedVehicleId("");
      }
    };

    fetchVehicles();
  }, [selectedClientId, companyId]);

  // Get selected vehicle
  const selectedVehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));

  // Recalculate meters when vehicle changes (mantém o preço do serviço)
  useEffect(() => {
    if (selectedVehicle?.size && detailedItems.length > 0) {
      const updatedItems = detailedItems.map(item => {
        if (item.regionId) {
          const rule = consumptionRules.find(
            r => r.region_id === item.regionId &&
              r.vehicle_size === selectedVehicle.size &&
              r.category === item.category
          );
          const meters = rule?.meters_consumed || item.metersUsed;
          return {
            ...item,
            metersUsed: meters,
            // Mantém totalPrice - preço vem do serviço, não recalcula
          };
        }
        return item;
      });
      setDetailedItems(updatedItems);
    }
  }, [selectedVehicleId, consumptionRules]);

  // Calculate totals - use servicePrice if set, otherwise use calculated subtotal
  const calculatedSubtotal = detailedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotal = servicePrice ? parseFloat(servicePrice) : calculatedSubtotal;
  const discount = discountValue ? parseFloat(discountValue) : 0;
  const total = subtotal - discount;

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cardPaymentDetail = (() => {
    if ((paymentMethod === "Crédito" || paymentMethod === "Débito") && selectedMachineId) {
      const machine = machines.find(m => m.id === selectedMachineId);
      const rateObj = paymentMethod === "Débito"
        ? null
        : cardRates.find(r => r.machine_id === selectedMachineId && r.installments === selectedInstallments);
      const rate = paymentMethod === "Débito"
        ? (machine?.debit_rate || 0)
        : (rateObj?.rate || 0);
      const netAmount = calculateCardMachineNetAmount(total, rate);
      return {
        method: paymentMethod,
        amount: total,
        installments: selectedInstallments,
        isAnticipated: Boolean(machine?.is_anticipated),
        rate,
        rateFormatted: formatCardMachineRatePercent(rate),
        netAmount
      };
    }
    return null;
  })();

  // Update service price when calculated subtotal changes (only if not manually set)
  useEffect(() => {
    if (calculatedSubtotal > 0 && !servicePrice) {
      setServicePrice(calculatedSubtotal.toFixed(2));
    }
  }, [calculatedSubtotal]);

  // Handle discount changes
  const handleDiscountValueChange = (value: string) => {
    setDiscountValue(value);
    if (value && subtotal > 0) {
      const percent = (parseFloat(value) / subtotal) * 100;
      setDiscountPercent(percent.toFixed(1));
    } else {
      setDiscountPercent("");
    }
  };

  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercent(value);
    if (value && subtotal > 0) {
      const discValue = (parseFloat(value) / 100) * subtotal;
      setDiscountValue(discValue.toFixed(2));
    } else {
      setDiscountValue("");
    }
  };

  const handleAddDetailedItem = () => {
    const newItem: DetailedServiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      category: 'INSULFILM' as ProductCategory,
      regionId: null,
      regionName: "",
      productTypeId: null,
      productTypeName: "",
      metersUsed: 0,
      totalPrice: 0,
      serviceName: "",
      regionCode: null,
      displayName: "",
      isCustomized: false,
      customizationGroup: null,
    };
    setDetailedItems([...detailedItems, newItem]);
  };

  // Toggle customized mode for an item
  const handleToggleCustomize = (itemId: string) => {
    const item = detailedItems.find(i => i.id === itemId);
    if (!item || (item.isCustomized && item.customizationGroup)) return;

    const groupId = Math.random().toString(36).substr(2, 9);
    const initialItems = createInitialCustomItems(
      selectedVehicle?.size || null,
      consumptionRules,
      item.productTypeId,
      item.productTypeName,
      item.regionId
    );

    setDetailedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isCustomized: true, customizationGroup: groupId }
          : i
      )
    );
    setCustomizedGroups(prev => new Map(prev).set(groupId, initialItems));
  };

  const handleRevertToSimple = (itemId: string, groupId: string) => {
    setDetailedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isCustomized: false, customizationGroup: null, productTypeId: null, productTypeName: "" }
          : i
      )
    );
    setCustomizedGroups(prev => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleUpdateCustomizedItems = (groupId: string, items: CustomizedRegionItem[]) => {
    setCustomizedGroups(prev => new Map(prev).set(groupId, items));
  };

  // Update detailed service item
  const handleUpdateDetailedItem = (updatedItem: DetailedServiceItem) => {
    setDetailedItems(prev =>
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Update customized group price
  const handleUpdateCustomizedPrice = (itemId: string, newPrice: number) => {
    setDetailedItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, totalPrice: newPrice } : i)
    );
  };

  // Remove detailed service item
  const handleRemoveDetailedItem = (id: string) => {
    setDetailedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedVehicleId || detailedItems.length === 0 || !companyId) {
      toast.error("Preencha cliente, veículo e pelo menos um serviço.");
      return;
    }

    const invalidItems = detailedItems.filter(item => {
      if (item.isCustomized && item.customizationGroup) {
        const groupItems = customizedGroups.get(item.customizationGroup);
        if (!groupItems) return true;
        return groupItems.some(gi => !gi.productTypeId);
      }
      return !item.regionId || !item.productTypeId || item.metersUsed <= 0;
    });
    if (invalidItems.length > 0) {
      toast.error("Preencha todos os campos de cada serviço (região, produto e metros).");
      return;
    }

    if (!isOpen && selectedAccountId && paymentMethod !== "Crédito" && paymentMethod !== "Débito") {
      const { data } = await supabase
        .from("accounts")
        .select("id, name, accepted_payment_methods")
        .eq("id", selectedAccountId);

      const accountsToCheck = data as any[] | null;
      if (accountsToCheck && accountsToCheck.length > 0) {
        const account = accountsToCheck[0];
        if (account.accepted_payment_methods && !account.accepted_payment_methods.includes(paymentMethod)) {
          toast.error(`A forma de pagamento "${paymentMethod}" não é aceita pela conta "${account.name}".`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === parseInt(selectedClientId));

      // Update sale
      const { error: saleError } = await supabase
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
        .eq('id', sale.id);

      if (saleError) throw saleError;

      // Find old stock movements to reverse
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
      // RF-08: Reverter transações antigas via serviço financeiro (trigger reverte saldo)
      await reverseAllSaleTransactions(sale.id, "delete");
      await supabase.from('sale_commissions').delete().eq('sale_id', sale.id);
      await supabase.from('sale_payments').delete().eq('sale_id', sale.id);

      // Deletar boletos antigos se existirem
      const { data: oldBoleto } = await supabase
        .from('boletos')
        .select('id')
        .eq('sale_id', sale.id)
        .maybeSingle();

      if (oldBoleto) {
        await supabase.from('boleto_installments').delete().eq('boleto_id', oldBoleto.id);
        await supabase.from('boletos').delete().eq('id', oldBoleto.id);
      }

      // Create service_items_detailed
      const serviceItemsData: any[] = [];
      for (const item of detailedItems) {
        if (item.isCustomized && item.customizationGroup) {
          const groupItems = customizedGroups.get(item.customizationGroup) || [];
          for (const gi of groupItems) {
            serviceItemsData.push({
              sale_id: sale.id,
              category: item.category,
              product_type_id: gi.productTypeId,
              region_id: null,
              meters_used: gi.metersUsed,
              unit_price: 0,
              total_price: item.totalPrice / 4,
              company_id: companyId,
              service_name: gi.regionLabel,
              region_code: gi.regionCode,
              display_name: `${gi.regionLabel} - ${gi.productTypeName}`,
              is_customized: true,
              customization_group: item.customizationGroup,
            });
          }
        } else {
          const region = vehicleRegions.find(r => r.id === item.regionId);
          serviceItemsData.push({
            sale_id: sale.id,
            category: item.category,
            product_type_id: item.productTypeId,
            region_id: item.regionId,
            meters_used: item.metersUsed,
            unit_price: 0,
            total_price: item.totalPrice,
            company_id: companyId,
            service_name: item.serviceName || item.regionName,
            region_code: region?.region_code || null,
            display_name: item.displayName || `${item.regionName} • ${item.productTypeName}`,
            is_customized: false,
            customization_group: null,
          });
        }
      }

      const { error: itemsError } = await supabase
        .from('service_items_detailed')
        .insert(serviceItemsData);

      if (itemsError) throw itemsError;

      // Consume stock based on detailed items
      if (selectedVehicle?.size) {
        await consumeStockForDetailedSale(
          sale.id,
          serviceItemsData,
          selectedVehicle.brand,
          selectedVehicle.model,
          selectedVehicle.size,
          companyId,
          user?.id || ''
        );
      }

      // Create financial transaction if sale is closed
      if (!isOpen) {
        // Calculate net amount if card
        let finalNetAmount = total;
        if ((paymentMethod === "Crédito" || paymentMethod === "Débito") && selectedMachineId) {
          const machine = machines.find(m => m.id === selectedMachineId);
          const rateObj = paymentMethod === "Débito"
            ? null
            : cardRates.find(r => r.machine_id === selectedMachineId && r.installments === selectedInstallments);
          const rate = paymentMethod === "Débito"
            ? (machine?.debit_rate || 0)
            : (rateObj?.rate || 0);
          finalNetAmount = calculateCardMachineNetAmount(total, rate);
        }


        let initialStatus = 'received';
        let transactionDueDate = format(new Date(), 'yyyy-MM-dd');
        let isCard = false;
        let machine: any = null;
        let targetAccountId = selectedAccountId;

        if ((paymentMethod === "Crédito" || paymentMethod === "Débito") && selectedMachineId) {
          isCard = true;
          machine = machines.find((m: any) => m.id === selectedMachineId);
          initialStatus = 'pending';
          if (machine?.account_id) {
            targetAccountId = machine.account_id;
          }
          if (machine?.is_anticipated) {
            const dt = new Date();
            if (machine.anticipation_type === 'hours') {
              dt.setHours(dt.getHours() + (machine.anticipation_value || 0));
            } else {
              dt.setDate(dt.getDate() + (machine.anticipation_value || 0));
            }
            transactionDueDate = format(dt, 'yyyy-MM-dd');
          }
        }

        // Insert sale payment record
        await supabase.from("sale_payments").insert({
          sale_id: sale.id,
          method: paymentMethod,
          amount: total,
          account_id: targetAccountId,
          machine_id: selectedMachineId,
          installments: selectedInstallments,
          status: initialStatus,
          company_id: companyId
        });

        if (paymentMethod === "Boleto") {
          // If Boleto, register boletos & installments
          const { data: boletoData, error: boletoError } = await supabase
            .from("boletos")
            .insert({
              sale_id: sale.id,
              total_amount: total,
              status: 'pending',
              company_id: companyId,
              account_id: selectedAccountId as number,
              client_id: parseInt(selectedClientId)
            })
            .select()
            .single();

          if (boletoError) throw boletoError;

          if (boletoData) {
            const installmentsToInsert = [];
            const installmentAmount = total / selectedInstallments;

            for (let i = 1; i <= selectedInstallments; i++) {
              const dueDate = new Date(saleDate);
              dueDate.setMonth(dueDate.getMonth() + i);

              installmentsToInsert.push({
                boleto_id: boletoData.id,
                installment_number: i,
                amount: installmentAmount,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                status: 'pending'
              });
            }

            await supabase.from("boleto_installments").insert(installmentsToInsert);

            // Fetch created installments to generate pending transactions
            const { data: createdInstallments } = await supabase
              .from("boleto_installments")
              .select("id, installment_number, amount, due_date")
              .eq("boleto_id", boletoData.id)
              .order("installment_number");

            if (createdInstallments && createdInstallments.length > 0) {
              await createBoletoInstallmentTransactions({
                saleId: sale.id,
                clientName: selectedClient?.name || 'Cliente',
                saleDate: format(saleDate, 'yyyy-MM-dd'),
                companyId,
                accountId: selectedAccountId as number,
                installments: createdInstallments.map(ci => ({
                  installmentNumber: ci.installment_number,
                  amount: ci.amount,
                  dueDate: ci.due_date,
                  installmentId: ci.id
                }))
              });
            }
          }
        } else {
          // Normal payment method or Card Flow
          if (isCard && machine && !machine.is_anticipated && (selectedInstallments || 1) > 1 && paymentMethod === "Crédito") {
            const instCount = selectedInstallments || 1;
            const portion = finalNetAmount / instCount;
            const portionAmount = total / instCount;
            for (let i = 1; i <= instCount; i++) {
              const portionDate = new Date();
              portionDate.setDate(portionDate.getDate() + (30 * i));
              await createTransactionFromSale(
                sale.id,
                portionAmount,
                selectedClient?.name || 'Cliente',
                paymentMethod,
                format(saleDate, 'yyyy-MM-dd'),
                companyId,
                targetAccountId || undefined,
                selectedMachineId || undefined,
                selectedInstallments || undefined,
                portion,
                false,
                undefined,
                format(portionDate, 'yyyy-MM-dd')
              );
            }
          } else if (isCard && machine && !machine.is_anticipated && (paymentMethod === "Débito" || (selectedInstallments || 1) === 1)) {
            const portionDate = new Date();
            portionDate.setDate(portionDate.getDate() + 30);
            await createTransactionFromSale(
              sale.id,
              total,
              selectedClient?.name || 'Cliente',
              paymentMethod,
              format(saleDate, 'yyyy-MM-dd'),
              companyId,
              targetAccountId || undefined,
              selectedMachineId || undefined,
              selectedInstallments || undefined,
              finalNetAmount,
              false,
              undefined,
              format(portionDate, 'yyyy-MM-dd')
            );
          } else {
            const willBePaidNow = !isCard ? true : false;
            const txCreated = await createTransactionFromSale(
              sale.id,
              total,
              selectedClient?.name || 'Cliente',
              paymentMethod,
              format(saleDate, 'yyyy-MM-dd'),
              companyId,
              targetAccountId || undefined,
              selectedMachineId || undefined,
              selectedInstallments || undefined,
              finalNetAmount,
              willBePaidNow, // isPaid
              undefined,
              isCard ? transactionDueDate : format(saleDate, 'yyyy-MM-dd')
            );
            if (!txCreated) {
              toast.error("Venda atualizada, mas não foi possível gerar o lançamento financeiro automático. Verifique suas contas.");
            }
          }
        }
      }

      // Re-insert commission snapshots
      if (selectedSellerId || selectedInstallerIds.length > 0) {
        const { data: peopleData } = await supabase
          .from('commission_people')
          .select('id, name, type, commission_percentage')
          .in('id', [selectedSellerId, ...selectedInstallerIds].filter(Boolean) as number[]);

        if (peopleData && peopleData.length > 0) {
          const commissionsToInsert = peopleData.map(person => ({
            sale_id: sale.id,
            commission_person_id: person.id,
            person_name_snapshot: person.name,
            person_type: person.type,
            percentage_snapshot: person.commission_percentage,
            commission_base_amount: subtotal,
            commission_amount: (subtotal * person.commission_percentage) / 100,
            company_id: companyId
          }));

          await supabase.from('sale_commissions').insert(commissionsToInsert);
        }
      }

      toast.success(`Venda de R$ ${total.toFixed(2)} atualizada com sucesso!`);

      // Reset form
      setSelectedClientId("");
      setSelectedVehicleId("");
      setDetailedItems([]);
      setDiscountValue("");
      setDiscountPercent("");
      setServicePrice("");
      setNotes("");
      setIsOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error("Erro ao cadastrar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleNewClientCreated = () => {
    setIsNewClientModalOpen(false);
    fetchData();
  };

  const handleNewVehicleCreated = async (vehicle: any) => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          client_id: parseInt(selectedClientId),
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          size: vehicle.size,
          company_id: companyId
        })
        .select('id, brand, model, plate, size, client_id')
        .single();

      if (error) throw error;

      // Update vehicles list and select the new one
      setVehicles(prev => [...prev, data]);
      setSelectedVehicleId(data.id.toString());
      setIsNewVehicleModalOpen(false);
      toast.success("Veículo cadastrado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar veículo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Editar venda</DialogTitle>
                <DialogDescription>
                  Preencha os dados para atualizar a venda
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Data da Venda *</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(saleDate, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={saleDate}
                      onSelect={(date) => {
                        if (date) {
                          setSaleDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {client.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewClientModalOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Novo
                  </Button>
                </div>
              </div>

              {/* Vehicle Selection */}
              {selectedClientId && (
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      {vehicles.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Cliente não possui veículos cadastrados</p>
                      ) : (
                        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um veículo" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4" />
                                  {vehicle.brand} {vehicle.model} - {vehicle.plate}
                                  {vehicle.size && (
                                    <Badge variant="outline" className="ml-2">
                                      {vehicle.size}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsNewVehicleModalOpen(true)}
                      className="gap-1 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Novo
                    </Button>
                  </div>
                </div>
              )}

              {/* Detailed Services Section */}
              {selectedVehicleId && (
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => setShowDetailedServices(!showDetailedServices)}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Serviços Detalhados
                      {detailedItems.length > 0 && (
                        <Badge variant="secondary">{detailedItems.length}</Badge>
                      )}
                    </span>
                    {showDetailedServices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {showDetailedServices && (
                    <div className="space-y-3">
                      {!selectedVehicle?.size && (
                        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                          ⚠️ Veículo sem tamanho (P/M/G) cadastrado. Os metros serão calculados manualmente.
                        </p>
                      )}

                      {detailedItems.map((item) => (
                        <div key={item.id} className="space-y-2">
                          {item.isCustomized && item.customizationGroup ? (
                            <CustomizedServiceBlock
                              groupId={item.customizationGroup}
                              items={customizedGroups.get(item.customizationGroup) || []}
                              productTypes={productTypes}
                              vehicleSize={selectedVehicle?.size || null}
                              consumptionRules={consumptionRules}
                              servicePrice={item.totalPrice}
                              onUpdate={(items) => handleUpdateCustomizedItems(item.customizationGroup!, items)}
                              onRevertToSimple={() => handleRevertToSimple(item.id, item.customizationGroup!)}
                              onPriceChange={(price) => handleUpdateCustomizedPrice(item.id, price)}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <ServiceItemRow
                                  item={item}
                                  vehicleSize={selectedVehicle?.size || null}
                                  productTypes={productTypes}
                                  vehicleRegions={vehicleRegions}
                                  consumptionRules={consumptionRules}
                                  onUpdate={handleUpdateDetailedItem}
                                  onRemove={handleRemoveDetailedItem}
                                />
                              </div>
                              {item.category === 'INSULFILM' && (item.regionCode === 'SIDE_REAR' || item.regionName?.toLowerCase().includes('latera')) && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => handleToggleCustomize(item.id)}
                                  title="Personalizar"
                                >
                                  <Sliders className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        className="w-full gap-2 border-dashed"
                        onClick={handleAddDetailedItem}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Serviços
                      </Button>

                      {detailedItems.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <span className="text-sm text-muted-foreground">
                            Subtotal serviços:{" "}
                            <span className="font-semibold text-foreground">
                              R$ {subtotal.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Débito">Débito</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isOpen && (
                <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-muted/20">
                  {paymentMethod !== "Crédito" && paymentMethod !== "Débito" && (
                    <div className="space-y-2">
                      <Label>Conta de Destino *</Label>
                      <Select
                        value={selectedAccountId ? selectedAccountId.toString() : ""}
                        onValueChange={(val) => setSelectedAccountId(parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.name} (Saldo: R$ {acc.current_balance?.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {paymentMethod === "Boleto" && (
                    <div className="space-y-2">
                      <Label>Número de Parcelas *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="36"
                        value={selectedInstallments}
                        onChange={(e) => setSelectedInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  )}

                  {(paymentMethod === "Crédito" || paymentMethod === "Débito") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Maquininha de Cartão *</Label>
                        <Select
                          value={selectedMachineId ? selectedMachineId.toString() : ""}
                          onValueChange={(val) => setSelectedMachineId(parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a maquininha" />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.map(m => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {paymentMethod === "Crédito" && (
                        <div className="space-y-2">
                          <Label>Parcelas *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="18"
                            value={selectedInstallments}
                            onChange={(e) => setSelectedInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Service Price - NEW FIELD */}
              <div className="space-y-2">
                <Label>Preço do Serviço (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9"
                    value={servicePrice}
                    onChange={(e) => {
                      setServicePrice(e.target.value);
                      // Reset discount when price changes
                      if (e.target.value) {
                        const newSubtotal = parseFloat(e.target.value);
                        if (discountPercent) {
                          const discValue = (parseFloat(discountPercent) / 100) * newSubtotal;
                          setDiscountValue(discValue.toFixed(2));
                        }
                      }
                    }}
                  />
                </div>
                {calculatedSubtotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Valor calculado: R$ {calculatedSubtotal.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label>Desconto</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0,00"
                      className="pl-9"
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-9"
                      value={discountPercent}
                      onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Commission Selectors */}
              <CommissionSelectors
                companyId={companyId || 0}
                selectedSellerId={selectedSellerId}
                selectedInstallerIds={selectedInstallerIds}
                onSellerChange={setSelectedSellerId}
                onInstallersChange={setSelectedInstallerIds}
              />

              {/* Toggle Open Sale */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Essa venda ficará em aberto?</Label>
                  <p className="text-sm text-muted-foreground">
                    {isOpen ? "Gerada uma conta a receber" : "Não"}
                  </p>
                </div>
                <Switch checked={isOpen} onCheckedChange={setIsOpen} />
              </div>

              {/* Notes */}
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Observações
                  </span>
                  {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showNotes && (
                  <Textarea
                    placeholder="Observações sobre a venda (máx. 4000 caracteres)"
                    className="mt-2"
                    maxLength={4000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                )}
              </div>

              {/* Live Summary */}
              <Card className="p-5 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold text-base text-foreground">Resumo da venda</h4>
                  <p className="text-xs text-muted-foreground">Informações importantes dessa venda</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Venda com <span className="font-semibold text-primary">{detailedItems.length}</span> serviço(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Venda do dia <span className="font-semibold text-primary">{format(saleDate, "dd/MM/yyyy")}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Subtotal ficou <span className="font-semibold text-primary">{formatCurrency(subtotal)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Desconto de <span className="font-semibold text-primary">{formatCurrency(discount)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Valor total da venda ficou <span className="font-semibold text-primary">{formatCurrency(total)}</span>
                    </span>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-dashed border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-muted">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span>
                        Forma de pagamento é{" "}
                        <span className="font-semibold text-primary">
                          {isOpen
                            ? "conta a receber"
                            : cardPaymentDetail
                              ? `${cardPaymentDetail.method === "Crédito" ? `${cardPaymentDetail.installments}x no ` : ""}${cardPaymentDetail.method} (${cardPaymentDetail.isAnticipated ? "antecipação" : "sem antecipação"}) (${formatCurrency(cardPaymentDetail.amount)})`
                              : `${paymentMethod} (${formatCurrency(total)})`}
                        </span>
                      </span>
                    </div>

                    {!isOpen && cardPaymentDetail && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-muted">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>
                            Taxas de maquininhas{" "}
                            <span className="font-semibold text-primary">{cardPaymentDetail.rateFormatted}% no {cardPaymentDetail.method}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-muted">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>
                            Valor total com desconto da maquininha{" "}
                            <span className="font-semibold text-primary">{formatCurrency(cardPaymentDetail.netAmount)}</span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-dashed border-border">
                    <div className="p-1.5 rounded bg-muted">
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>Não vinculado a nenhuma vaga</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full" disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogContent>
      </Dialog>

      <NewClientModal
        open={isNewClientModalOpen}
        onOpenChange={setIsNewClientModalOpen}
        onClientCreated={handleNewClientCreated}
      />
      <NewVehicleModal
        open={isNewVehicleModalOpen}
        onOpenChange={setIsNewVehicleModalOpen}
        onVehicleCreated={handleNewVehicleCreated}
      />
    </>
  );
};

export default EditSaleModal;
