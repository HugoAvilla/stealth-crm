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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { consumeStockForDetailedSale, createTransactionFromSale } from "@/lib/stockConsumption";
import { createBoletoInstallmentTransactions } from "@/lib/financialTransactions";
import NewClientModal from "@/components/vendas/NewClientModal";
import ServiceItemRow, { DetailedServiceItem, ProductCategory } from "@/components/vendas/ServiceItemRow";
import CustomizedServiceBlock, { CustomizedRegionItem, createInitialCustomItems } from "@/components/vendas/CustomizedServiceBlock";
import CommissionSelectors from "@/components/vendas/CommissionSelectors";
import { AccountSelectCard } from "@/components/vendas/AccountSelectCard";
import { PaymentBlock, SalePayment } from "@/components/vendas/PaymentBlock";
import { toast } from "sonner";

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

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: number;
  initialDate?: Date;
  prefillData?: {
    clientId: number;
    vehicleId: number;
    discount?: number;
    services: any[];
    spaceId?: number;
  };
  onSuccess?: () => void;
}

const NewSaleModal = ({ open, onOpenChange, defaultClientId, initialDate, prefillData, onSuccess }: NewSaleModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
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
  const [openClientPopover, setOpenClientPopover] = useState(false);
  const [servicePrice, setServicePrice] = useState("");
  const [isNewClient, setIsNewClient] = useState(true);
  const [pastSalesCount, setPastSalesCount] = useState(0);
  
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [selectedInstallerIds, setSelectedInstallerIds] = useState<number[]>([]);
  
  const [payments, setPayments] = useState<SalePayment[]>([
    {
      tempId: Math.random().toString(36).substr(2, 9),
      payment_method: "Pix",
      amount: 0,
      account_id: null,
      machine_id: null,
      installments: 1,
      due_date: new Date().toISOString(),
      status: 'received'
    }
  ]);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [vehicleRegions, setVehicleRegions] = useState<VehicleRegion[]>([]);
  const [consumptionRules, setConsumptionRules] = useState<ConsumptionRule[]>([]);
  const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
  const [customizedGroups, setCustomizedGroups] = useState<Map<string, CustomizedRegionItem[]>>(new Map());
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      if (initialDate) {
        setSaleDate(initialDate);
      } else {
        setSaleDate(new Date());
      }
      fetchData();
      if (prefillData) {
        setSelectedClientId(prefillData.clientId.toString());
        setSelectedVehicleId(prefillData.vehicleId.toString());
        if (prefillData.discount) setDiscountValue(prefillData.discount.toString());
        if (prefillData.services && prefillData.services.length > 0) {
          // Initialize detailed services from prefill
          setDetailedItems(prefillData.services.map((s: any) => ({
            id: crypto.randomUUID(),
            category: s.category || "INSULFILM" as ProductCategory,
            regionId: s.regionId || null,
            regionName: s.regionName || "",
            productTypeId: s.productTypeId || null,
            productTypeName: s.productTypeName || "",
            metersUsed: s.metersUsed || 0,
            totalPrice: s.totalPrice || 0,
            serviceName: s.serviceName || s.regionName || "",
            regionCode: s.regionCode || null,
            displayName: s.displayName || s.regionName || "",
            isCustomized: false,
            customizationGroup: null,
          })));
        }
      } else if (defaultClientId) {
        setSelectedClientId(defaultClientId.toString());
      }
    }
  }, [open, user?.id, initialDate, prefillData]);

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

      const [clientsRes, productTypesRes, regionsRes, rulesRes, materialsRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id).order('name'),
        supabase.from('product_types').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('brand'),
        supabase.from('vehicle_regions').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('sort_order'),
        supabase.from('region_consumption_rules').select('*').eq('company_id', profile.company_id),
        supabase.from('materials').select('product_type_id, is_open_roll, current_stock').eq('company_id', profile.company_id).eq('is_active', true)
      ]);
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
      
      const rulesList = (rulesRes.data || []).map((rule: any) => {
        const region = regionsList.find(r => r.id === rule.region_id);
        return { ...rule, region_code: region?.region_code || null };
      });
      setConsumptionRules(rulesList);

      // Retroactive mapping for spaces created before ID tracking
      setDetailedItems(currentItems => {
        if (!currentItems || currentItems.length === 0) return currentItems;
        
        return currentItems.map(item => {
          let mappedRegionId = item.regionId;
          if (!mappedRegionId && item.regionName) {
            const itemCategory = item.category || 'INSULFILM';
            const found = regionsList.find(r => r.name?.toLowerCase().trim() === item.regionName?.toLowerCase().trim() && r.category === itemCategory);
            if (found) mappedRegionId = found.id;
          }
          
          let mappedProductId = item.productTypeId;
          if (!mappedProductId && item.productTypeName) {
            const itemCategory = item.category || 'INSULFILM';
            const found = productsList.find(p => {
               const brand = p.brand || "";
               const name = p.name || "";
               const light = p.light_transmission ? ` ${p.light_transmission}` : "";
               const fullName = `${brand} ${name}${light}`.trim().toLowerCase();
               return fullName === item.productTypeName?.toLowerCase().trim() && p.category === itemCategory;
            });
            if (found) mappedProductId = found.id;
          }
          
          return { ...item, regionId: mappedRegionId, productTypeId: mappedProductId };
        });
      });
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

  // Auto-detect if client is new or returning
  useEffect(() => {
    const detectClientType = async () => {
      if (!selectedClientId || !companyId) {
        setIsNewClient(true);
        setPastSalesCount(0);
        return;
      }
      const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', parseInt(selectedClientId))
        .eq('company_id', companyId)
        .eq('status', 'Fechada');
      const total = count || 0;
      setPastSalesCount(total);
      setIsNewClient(total === 0);
    };
    detectClientType();
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
  const paid = isOpen ? 0 : total;

  // Sync first payment amount with total if there's only one payment
  useEffect(() => {
    if (payments.length === 1) {
      setPayments(prev => [{ ...prev[0], amount: total }]);
    }
  }, [total]);

  // Update service price when calculated subtotal changes
  useEffect(() => {
    if (calculatedSubtotal > 0) {
      setServicePrice(calculatedSubtotal.toFixed(2));
    } else if (detailedItems.length === 0) {
      setServicePrice("");
    }
  }, [calculatedSubtotal, detailedItems.length]);

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
      id: crypto.randomUUID(),
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
    if (!item) return;

    if (item.isCustomized && item.customizationGroup) {
      // Already customized - revert handled by CustomizedServiceBlock
      return;
    }

    const groupId = crypto.randomUUID();
    const initialItems = createInitialCustomItems(
      selectedVehicle?.size || null,
      consumptionRules,
      item.productTypeId,
      item.productTypeName,
      item.regionId
    );

    // Mark this item as customized
    setDetailedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isCustomized: true, customizationGroup: groupId }
          : i
      )
    );
    setCustomizedGroups(prev => new Map(prev).set(groupId, initialItems));
  };

  // Revert from customized to simple mode
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

  // Update customized group items
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

    if (!isOpen) {
      const paymentsTotal = payments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(paymentsTotal - total) > 0.01) {
        toast.error(`A soma dos pagamentos (R$ ${paymentsTotal.toFixed(2)}) deve ser igual ao total da venda (R$ ${total.toFixed(2)})`);
        return;
      }

      if (payments.some(p => !p.account_id)) {
        toast.error("Por favor, selecione a conta de destino para todos os pagamentos.");
        return;
      }
    }

    // Validate items - customized items don't need regionId/productTypeId at item level
    const invalidItems = detailedItems.filter(item => {
      if (item.isCustomized && item.customizationGroup) {
        // For customized items, validate the group items instead
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

    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === parseInt(selectedClientId));

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
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
          company_id: companyId,
          seller_id: user?.id,
          is_new_client: isNewClient,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create service_items_detailed
      const serviceItemsData: any[] = [];
      for (const item of detailedItems) {
        if (item.isCustomized && item.customizationGroup) {
          // Customized: insert 4 rows
          const groupItems = customizedGroups.get(item.customizationGroup) || [];
          for (const gi of groupItems) {
            serviceItemsData.push({
              sale_id: sale.id,
              category: item.category,
              product_type_id: gi.productTypeId,
              region_id: null,
              meters_used: gi.metersUsed,
              unit_price: 0,
              total_price: item.totalPrice / 4, // Distribui o preço
              company_id: companyId,
              service_name: gi.regionLabel,
              region_code: gi.regionCode,
              display_name: `${gi.regionLabel} - ${gi.productTypeName}`,
              is_customized: true,
              customization_group: item.customizationGroup,
            });
          }
        } else {
          // Simple: insert 1 row
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

      // Insert commission snapshots
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

      // Update space if exported from a slot
      // RF-07: Só marca como pago se a venda for fechada E sem boleto pendente
      if (prefillData?.spaceId) {
        const hasBoleto = !isOpen && payments.some(p => p.payment_method === "Boleto");
        const newPaymentStatus = isOpen || hasBoleto ? 'pending' : 'paid';
        const { error: spaceUpdateError } = await supabase
          .from('spaces')
          .update({ sale_id: sale.id, payment_status: newPaymentStatus })
          .eq('id', prefillData.spaceId);
          
        if (spaceUpdateError) {
          console.error('Error updating space:', spaceUpdateError);
        }
      }

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

      // Create financial transactions and sale payments if sale is closed
      if (!isOpen) {
        for (const p of payments) {
          // Calculate net amount if card
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

          // Insert sale payment
          await supabase.from("sale_payments").insert({
            sale_id: sale.id,
            method: p.payment_method,
            amount: p.amount,
            account_id: p.account_id,
            machine_id: p.machine_id,
            installments: p.installments,
            status: p.status || 'received',
            company_id: companyId
          });

          // Create transaction — boleto usa is_paid=false, demais is_paid=true
          const isBoleto = p.payment_method === "Boleto";
          if (!isBoleto) {
            await createTransactionFromSale(
              sale.id,
              p.amount,
              selectedClient?.name || 'Cliente',
              p.payment_method,
              format(saleDate, 'yyyy-MM-dd'),
              companyId,
              p.account_id,
              p.machine_id,
              p.installments,
              finalNetAmount,
              true // isPaid
            );
          }

          // If Boleto, register installments
          if (p.payment_method === "Boleto") {
            const { data: boletoData, error: boletoError } = await supabase
              .from("boletos")
              .insert({
                sale_id: sale.id,
                total_amount: p.amount,
                status: 'pending',
                company_id: companyId,
                account_id: p.account_id as number,
                client_id: parseInt(selectedClientId)
              })
              .select()
              .single();

            if (boletoError) {
              console.error('Error creating boleto:', boletoError);
              throw boletoError;
            }

            if (boletoData) {
              const installmentsToInsert = [];
              const installmentAmount = p.amount / (p.installments || 1);
              
              for (let i = 1; i <= (p.installments || 1); i++) {
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

              // RF-02: Buscar IDs das parcelas criadas e gerar transações pendentes
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
                  accountId: p.account_id as number,
                  installments: createdInstallments.map(ci => ({
                    installmentNumber: ci.installment_number,
                    amount: ci.amount,
                    dueDate: ci.due_date,
                    installmentId: ci.id,
                  })),
                });
              }
            }
          }
        }
      }

      toast.success(`Venda de R$ ${total.toFixed(2)} cadastrada com sucesso!`);

      // Call onSuccess to notify parent components
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setSelectedClientId("");
      setSelectedVehicleId("");
      setDetailedItems([]);
      setCustomizedGroups(new Map());
      setDiscountValue("");
      setDiscountPercent("");
      setServicePrice("");
      setNotes("");
      setIsOpen(false);
      setSelectedSellerId(null);
      setSelectedInstallerIds([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error("Erro ao cadastrar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleNewClientCreated = async (newClient?: any) => {
    setIsNewClientModalOpen(false);
    await fetchData();
    if (newClient?.id) {
      setSelectedClientId(newClient.id.toString());
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
                <DialogTitle>Cadastrar venda</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar a venda
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
                <Popover>
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
                      onSelect={(date) => date && setSaleDate(date)}
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
                  <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientPopover}
                        className="flex-1 justify-between"
                      >
                        {selectedClientId
                          ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="truncate">
                                {clients?.find((c) => c.id.toString() === selectedClientId)?.name}
                              </span>
                            </div>
                          )
                          : loading ? "Carregando..." : "Selecione um cliente"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente por nome..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clients?.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  setSelectedClientId(client.id.toString());
                                  setOpenClientPopover(false);
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{client.name}</span>
                                  {client.phone && (
                                    <span className="text-muted-foreground text-xs ml-auto whitespace-nowrap">
                                      ({client.phone})
                                    </span>
                                  )}
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedClientId === client.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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

              {/* Client Type: Novo vs Retorno */}
              {selectedClientId && (
                <div className="space-y-2">
                  <Label>Tipo de Atendimento</Label>
                  <Select value={isNewClient ? 'new' : 'returning'} onValueChange={(v) => setIsNewClient(v === 'new')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Novo Cliente
                        </div>
                      </SelectItem>
                      <SelectItem value="returning">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Cliente Retorno
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {pastSalesCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ⓘ Detectado automaticamente: cliente possui {pastSalesCount} venda(s) anterior(es).
                    </p>
                  )}
                </div>
              )}

              {/* Vehicle Selection */}
              {selectedClientId && (
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  {vehicles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cliente não possui veículos cadastrados</p>
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
                                  title="Personalizar - dividir em 3 regiões com películas individuais"
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
                        Adicionar Região / Serviço
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

              <Separator />

              {/* Multi-Payment Section */}
              {!isOpen && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Pagamentos</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1"
                      onClick={() => setPayments([...payments, {
                        tempId: Math.random().toString(36).substr(2, 9),
                        payment_method: "Pix",
                        amount: 0,
                        account_id: payments[0]?.account_id || null,
                        machine_id: null,
                        installments: 1,
                        due_date: new Date().toISOString(),
                        status: 'received'
                      }])}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Forma
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {payments.map((p, index) => (
                      <PaymentBlock
                        key={p.tempId}
                        payment={p}
                        isFirst={index === 0}
                        companyId={companyId || 0}
                        totalRemaining={total - payments.reduce((acc, curr, i) => i < index ? acc + curr.amount : acc, 0)}
                        onUpdate={(updated) => setPayments(payments.map(item => item.tempId === p.tempId ? updated : item))}
                        onRemove={() => setPayments(payments.filter(item => item.tempId !== p.tempId))}
                      />
                    ))}
                  </div>

                  {payments.length > 1 && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm font-medium flex justify-between items-center",
                      Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 
                        ? "bg-green-500/10 text-green-600 border border-green-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                    )}>
                      <span>Total Pago: R$ {payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}</span>
                      <span>Total Venda: R$ {total.toFixed(2)}</span>
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
                    {isOpen ? "Gera conta a receber" : "Paga agora"}
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
              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Resumo da venda</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-info" />
                      Data da venda
                    </span>
                    <span>{format(saleDate, "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4 text-info" />
                      Serviços
                    </span>
                    <span>{detailedItems.length} item(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Sub-total
                    </span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Desconto
                    </span>
                    <span className="text-destructive">- R$ {discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      Valor total
                    </span>
                    <span className="text-success">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Valor pago
                    </span>
                    <span>R$ {paid.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full" disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogContent>
      </Dialog>

      <NewClientModal
        open={isNewClientModalOpen}
        onOpenChange={setIsNewClientModalOpen}
        onClientCreated={handleNewClientCreated}
      />
    </>
  );
};

export default NewSaleModal;
