// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Download, FileText, MessageCircle, Shield, Search, Plus, Loader2 } from "lucide-react";
import wfeLogo from "@/assets/wfe-logo.png";
import { generateWarrantyPDF, type WarrantyPDFData } from "@/lib/pdfGenerator";
import { getPDFProxyUrl } from "@/lib/pdfStorage";
import { WarrantyWhatsAppModal } from "./WarrantyWhatsAppModal";
import { Input } from "@/components/ui/input";

interface IssueWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSale?: any;
}

interface WarrantyTemplate {
  id: number;
  name: string;
  validity_months: number;
  terms: string | null;
  coverage: string | null;
  restrictions?: string | null;
  care_instructions?: string | null;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj?: string | null;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  client_id: number | null;
}

interface IssuedWarrantyData {
  certNumber: string;
  clientName: string;
  clientPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string | null;
  serviceName: string;
  issueDate: string;
  expiryDate: string;
  warrantyTerms: string;
  pdfLink: string;
}

interface CompanyInfo {
  company_name: string;
  logo_url: string | null;
  cnpj: string | null;
  phone: string;
  email: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

export function IssueWarrantyModal({ open, onOpenChange, preselectedSale }: IssueWarrantyModalProps) {
  const { user } = useAuth();
  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientCpfCnpj, setClientCpfCnpj] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [issuedData, setIssuedData] = useState<IssuedWarrantyData | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [careInstructions, setCareInstructions] = useState(`• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado`);

  // New sales linking states
  const [saleId, setSaleId] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [showSelectSaleModal, setShowSelectSaleModal] = useState(false);
  const [saleServicesText, setSaleServicesText] = useState("");
  // Option 2 state for linking service items to specific warranty templates
  const [saleItemsToMap, setSaleItemsToMap] = useState<any[]>([]);
  const [itemTemplates, setItemTemplates] = useState<Record<string, string>>({}); // key: item_id, value: templateId

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === parseInt(clientId));
      if (client) {
        setClientCpfCnpj(client.cpf_cnpj || "");
      }
    } else if (!clientId) {
      setClientCpfCnpj("");
    }
  }, [clientId, clients]);

  const fetchDetailedItemsForSale = async (saleId: number) => {
    try {
      const { data, error } = await supabase
        .from('service_items_detailed')
        .select(`
          *,
          product_type:product_types(brand, name, model, category, light_transmission),
          region:vehicle_regions(name, description)
        `)
        .eq('sale_id', saleId);

      if (error) {
        console.error('Error fetching detailed items:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const combineTermsAndServices = (servicesText: string, template: any) => {
    let combinedText = servicesText;
    if (template) {
      if (template.coverage) combinedText += `[ COBERTURA DA GARANTIA ]\n${template.coverage}\n\n`;
      if (template.terms) combinedText += `[ TERMOS ]\n${template.terms}\n\n`;
      if (template.restrictions) combinedText += `[ RESTRIÇÕES ]\n${template.restrictions}\n\n`;
    }
    return combinedText.trim();
  };

  const recalculateWarrantyTerms = (
    currentTemplates: WarrantyTemplate[],
    currentItemTemplates: Record<string, string>,
    currentSaleItems: any[],
    defaultTplId: string
  ) => {
    if (currentSaleItems.length > 0) {
      let text = "";

      // 1. Items and Validity Section
      text += `[ ITENS COBERTOS E VALIDADE DA GARANTIA ]\n`;

      const usedTemplateIds = new Set<string>();

      currentSaleItems.forEach(item => {
        const tId = currentItemTemplates[item.id];
        const tpl = tId && tId !== "none" ? currentTemplates.find(t => t.id === parseInt(tId)) : null;
        if (tpl) {
          usedTemplateIds.add(tId);
          const validity = tpl.validity_months || 12;
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + validity);
          text += `• ${item.name} - Garantia de ${validity} meses (Válido até ${expiryDate.toLocaleDateString('pt-BR')})\n`;
        } else {
          text += `• ${item.name} - Sem Garantia\n`;
        }
      });
      text += `\n`;

      // 2. Terms for each unique template used
      usedTemplateIds.forEach(tId => {
        const tpl = currentTemplates.find(t => t.id === parseInt(tId));
        if (tpl) {
          text += `=========================================\n`;
          text += `TERMOS DE GARANTIA: ${tpl.name.toUpperCase()}\n`;
          text += `=========================================\n`;
          if (tpl.coverage) text += `[ COBERTURA ]\n${tpl.coverage}\n\n`;
          if (tpl.terms) text += `[ TERMOS ]\n${tpl.terms}\n\n`;
          if (tpl.restrictions) text += `[ RESTRIÇÕES ]\n${tpl.restrictions}\n\n`;
        }
      });

      setWarrantyTerms(text.trim());
    } else {
      const template = defaultTplId ? currentTemplates.find(t => t.id === parseInt(defaultTplId)) : null;
      setWarrantyTerms(combineTermsAndServices(saleServicesText, template));
    }
  };

  const loadServicesText = async (sale: any, currentTemplates?: WarrantyTemplate[]) => {
    try {
      const detailedItems = await fetchDetailedItemsForSale(sale.id);
      let itemsList: any[] = [];
      let servicesText = "";

      if (detailedItems && detailedItems.length > 0) {
        servicesText += `[ SERVIÇOS REALIZADOS - VENDA Nº ${sale.id} ]\n`;
        detailedItems.forEach((item: any) => {
          const productName = item.product_type
            ? `${item.product_type.brand} ${item.product_type.name}${item.product_type.light_transmission ? ` ${item.product_type.light_transmission}` : ''}`
            : 'Produto';
          const name = item.display_name
            ? item.display_name
            : `${item.region?.name || "Geral"}: ${productName}`;
          servicesText += `• ${name}\n`;
          itemsList.push({
            id: `detailed_${item.id}`,
            name,
            originalItem: item,
            type: 'detailed'
          });
        });
        servicesText += `\n`;
      } else if (sale.sale_items && sale.sale_items.length > 0) {
        servicesText += `[ SERVIÇOS REALIZADOS - VENDA Nº ${sale.id} ]\n`;
        sale.sale_items.forEach((item: any) => {
          const name = item.service?.name || "Serviço";
          servicesText += `• ${name}\n`;
          itemsList.push({
            id: `generic_${item.id}`,
            name,
            originalItem: item,
            type: 'generic'
          });
        });
        servicesText += `\n`;
      }

      setSaleServicesText(servicesText);
      setSaleItemsToMap(itemsList);

      // Auto match templates
      const autoMatched: Record<string, string> = {};
      const tpls = currentTemplates && currentTemplates.length > 0 ? currentTemplates : templates;
      itemsList.forEach(item => {
        const matched = tpls.find(t =>
          item.name.toLowerCase().includes(t.name.toLowerCase()) ||
          t.name.toLowerCase().includes(item.name.toLowerCase())
        );
        if (matched) {
          autoMatched[item.id] = matched.id.toString();
        } else if (templateId) {
          autoMatched[item.id] = templateId;
        } else if (tpls.length > 0) {
          autoMatched[item.id] = tpls[0].id.toString();
        }
      });
      setItemTemplates(autoMatched);

      recalculateWarrantyTerms(tpls, autoMatched, itemsList, templateId);
    } catch (e) {
      console.error("Error loading services text:", e);
    }
  };

  const handleSelectSale = async (sale: any) => {
    setSelectedSale(sale);
    setSaleId(sale.id.toString());

    if (sale.client_id) {
      setClientId(sale.client_id.toString());
      const client = clients.find(c => c.id === sale.client_id);
      setClientCpfCnpj(client?.cpf_cnpj || sale.client?.cpf_cnpj || "");
    }
    if (sale.vehicle_id) {
      setVehicleId(sale.vehicle_id.toString());
    }

    await loadServicesText(sale);
  };

  const fetchSales = async () => {
    if (!companyId) return;
    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          client:clients(id, name, phone, email, cpf_cnpj),
          vehicle:vehicles(id, brand, model, year, plate, size),
          sale_items(
            id, service_id, quantity, unit_price, total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('id', { ascending: false });
      if (!error && data) {
        setSales(data);
      }
    } catch (e) {
      console.error("Error fetching sales:", e);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    if (open && user?.id) {
      fetchData();
    }
  }, [open, user?.id]);

  useEffect(() => {
    if (open && preselectedSale) {
      setSelectedSale(preselectedSale);
      setSaleId(preselectedSale.id.toString());
      if (preselectedSale.client_id) {
        setClientId(preselectedSale.client_id.toString());
        const client = clients.find(c => c.id === preselectedSale.client_id);
        setClientCpfCnpj(client?.cpf_cnpj || preselectedSale.client?.cpf_cnpj || "");
      }
      if (preselectedSale.vehicle_id) setVehicleId(preselectedSale.vehicle_id.toString());
      loadServicesText(preselectedSale);
    } else if (open && !preselectedSale) {
      setSelectedSale(null);
      setSaleId("");
      setSaleServicesText("");
      setClientCpfCnpj("");
    }
  }, [open, preselectedSale, clients]);

  useEffect(() => {
    if (showSelectSaleModal && companyId) {
      fetchSales();
    }
  }, [showSelectSaleModal, companyId]);

  useEffect(() => {
    if (templates.length > 0 && selectedSale && saleItemsToMap.length > 0) {
      const autoMatched = { ...itemTemplates };
      let updatedAny = false;
      saleItemsToMap.forEach(item => {
        if (!autoMatched[item.id] || autoMatched[item.id] === "none" || autoMatched[item.id] === "") {
          const matched = templates.find(t =>
            item.name.toLowerCase().includes(t.name.toLowerCase()) ||
            t.name.toLowerCase().includes(item.name.toLowerCase())
          );
          if (matched) {
            autoMatched[item.id] = matched.id.toString();
            updatedAny = true;
          } else if (templateId) {
            autoMatched[item.id] = templateId;
            updatedAny = true;
          } else if (templates.length > 0) {
            autoMatched[item.id] = templates[0].id.toString();
            updatedAny = true;
          }
        }
      });
      if (updatedAny) {
        setItemTemplates(autoMatched);
      }
      recalculateWarrantyTerms(templates, autoMatched, saleItemsToMap, templateId);
    }
  }, [templates, selectedSale, saleItemsToMap.length]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);

      const [templatesRes, clientsRes, vehiclesRes, companyRes] = await Promise.all([
        supabase.from('warranty_templates').select('*').eq('company_id', profile.company_id),
        supabase.from('clients').select('id, name, phone, email, cpf_cnpj').eq('company_id', profile.company_id),
        supabase.from('vehicles').select('id, brand, model, plate, year, client_id').eq('company_id', profile.company_id),
        supabase.from('companies').select('company_name, logo_url, cnpj, phone, email, street, number, neighborhood, city, state, cep').eq('id', profile.company_id).single(),
      ]);

      setTemplates(templatesRes.data || []);
      setClients(clientsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      if (companyRes.data) setCompanyInfo(companyRes.data as any);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templateId ? templates.find(t => t.id === parseInt(templateId)) : null;
  const selectedClient = clientId ? clients.find(c => c.id === parseInt(clientId)) : null;
  const selectedVehicle = vehicleId ? vehicles.find(v => v.id === parseInt(vehicleId)) : null;

  const filteredVehicles = clientId
    ? vehicles.filter(v => v.client_id === parseInt(clientId))
    : vehicles;

  const filteredSales = sales.filter(sale => {
    const filteredSalesSearch = salesSearch.toLowerCase();
    const clientName = sale.client?.name?.toLowerCase() || "";
    const vehiclePlate = sale.vehicle?.plate?.toLowerCase() || "";
    const vehicleModel = sale.vehicle?.model?.toLowerCase() || "";
    const saleIdStr = sale.id.toString();
    return clientName.includes(filteredSalesSearch) ||
      vehiclePlate.includes(filteredSalesSearch) ||
      vehicleModel.includes(filteredSalesSearch) ||
      saleIdStr.includes(filteredSalesSearch);
  });

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    const template = templates.find(t => t.id === parseInt(value));
    if (template) {
      if (template.care_instructions) {
        setCareInstructions(template.care_instructions);
      } else {
        setCareInstructions(`• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado`);
      }

      const updated = { ...itemTemplates };
      saleItemsToMap.forEach(item => {
        if (!updated[item.id] || updated[item.id] === "none" || updated[item.id] === "") {
          updated[item.id] = value;
        }
      });
      setItemTemplates(updated);

      recalculateWarrantyTerms(templates, updated, saleItemsToMap, value);
    }
  };

  const handleItemTemplateChange = (itemId: string, tId: string) => {
    const updated = { ...itemTemplates, [itemId]: tId };
    setItemTemplates(updated);
    recalculateWarrantyTerms(templates, updated, saleItemsToMap, templateId);
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    setVehicleId("");
    const client = clients.find(c => c.id === parseInt(value));
    if (client) {
      setClientCpfCnpj(client.cpf_cnpj || "");
    } else {
      setClientCpfCnpj("");
    }
  };

  const handleIssue = async () => {
    if (!isAnyTemplateSelected || !clientId || !vehicleId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!clientCpfCnpj.trim()) {
      toast.error("O CPF/CNPJ do cliente é obrigatório.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não encontrada. Faça login novamente.");
      return;
    }

    if (!selectedClient || !selectedVehicle) {
      toast.error("Dados do cliente ou veículo não encontrados.");
      return;
    }

    setIsSubmitting(true);
    try {
      const issueDate = new Date();
      const expiryDate = new Date();
      let warrantyType = "";

      if (selectedSale && saleItemsToMap.length > 0) {
        const activeTplIds = Array.from(new Set(Object.values(itemTemplates).filter(id => id && id !== "none")));
        const activeTpls = templates.filter(t => activeTplIds.includes(t.id.toString()));
        if (activeTpls.length > 0) {
          warrantyType = activeTpls.map(t => t.name).join(" + ");
          const maxValidity = Math.max(...activeTpls.map(t => t.validity_months || 12));
          expiryDate.setMonth(expiryDate.getMonth() + maxValidity);
        } else {
          warrantyType = selectedTemplate?.name || "Sem Modelo";
          expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate?.validity_months || 12));
        }
      } else {
        warrantyType = selectedTemplate?.name || "";
        expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate?.validity_months || 12));
      }

      console.log('[Garantia] Inserindo no banco...', { companyId, warrantyType });

      const finalWarrantyText = `${warrantyTerms}\n\n[ INSTRUÇÕES DE CUIDADO ]\n${careInstructions}`;

      const { data: inserted, error } = await supabase.from('warranties').insert({
        company_id: companyId,
        warranty_type: warrantyType,
        issue_date: issueDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        client_id: parseInt(clientId),
        vehicle_id: parseInt(vehicleId),
        warranty_text: finalWarrantyText,
        status: 'Pendente',
        sale_id: saleId ? parseInt(saleId) : null,
      }).select('id').single();

      if (error) {
        console.error('[Garantia] Erro no insert:', error);
        throw error;
      }

      console.log('[Garantia] Insert OK, id:', inserted?.id);

      // Save client CPF/CNPJ if edited/provided
      if (clientId && clientCpfCnpj) {
        await supabase
          .from('clients')
          .update({ cpf_cnpj: clientCpfCnpj })
          .eq('id', parseInt(clientId));
      }

      const certNumber = saleId ? String(saleId) : `${(inserted?.id || 0).toString().padStart(4, '0')}`;

      try {
        const companyAddress = companyInfo ? [companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ') : undefined;
        const pdfData: WarrantyPDFData = {
          certificate_number: certNumber,
          client_name: selectedClient.name,
          client_phone: selectedClient.phone,
          client_email: selectedClient.email || undefined,
          client_cpf_cnpj: clientCpfCnpj || undefined,
          vehicle_brand: selectedVehicle.brand,
          vehicle_model: selectedVehicle.model,
          vehicle_plate: selectedVehicle.plate || '',
          vehicle_year: selectedVehicle.year || undefined,
          service_name: warrantyType,
          issue_date: issueDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          warranty_text: finalWarrantyText,
          company_name: companyInfo?.company_name || 'Minha Empresa',
          company_logo_url: companyInfo?.logo_url || undefined,
          company_cnpj: companyInfo?.cnpj || undefined,
          company_phone: companyInfo?.phone || undefined,
          company_email: companyInfo?.email || undefined,
          company_address: companyAddress || undefined,
          sale_date: selectedSale?.sale_date || undefined,
          payment_method: selectedSale?.payment_method || undefined,
          subtotal: selectedSale?.subtotal || undefined,
          discount: selectedSale?.discount || undefined,
          total: selectedSale?.total || undefined,
        };

        console.log('[Garantia] Gerando e fazendo upload do PDF...');
        await generateWarrantyPDF(pdfData, companyId);
        console.log('[Garantia] PDF gerado e uploadado com sucesso');
      } catch (pdfError) {
        console.error('[Garantia] Erro ao gerar PDF (garantia já salva):', pdfError);
        toast.warning("Garantia salva, mas houve erro ao gerar o PDF.");
      }

      const storagePath = `${companyId}/garantias/garantia-${certNumber}.pdf`;
      const pdfLink = getPDFProxyUrl(storagePath);

      setIssuedData({
        certNumber,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        vehicleBrand: selectedVehicle.brand,
        vehicleModel: selectedVehicle.model,
        vehiclePlate: selectedVehicle.plate || null,
        serviceName: warrantyType,
        issueDate: issueDate.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        warrantyTerms: finalWarrantyText,
        pdfLink,
      });

      toast.success("Garantia emitida com sucesso!");
    } catch (error: any) {
      console.error('[Garantia] Erro ao emitir garantia:', error);
      const msg = error?.message || error?.details || 'Erro desconhecido';
      toast.error(`Erro ao emitir garantia: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTemplateId("");
    setClientId("");
    setClientCpfCnpj("");
    setVehicleId("");
    setWarrantyTerms("");
    setCareInstructions(`• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado`);
    setIssuedData(null);
    setSaleId("");
    setSelectedSale(null);
    setSaleServicesText("");
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleDownload = () => {
    if (!isAnyTemplateSelected || !clientId || !vehicleId || !selectedClient || !selectedVehicle) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const issueDate = new Date();
    const expiryDate = new Date();
    let serviceName = "";

    if (selectedSale && saleItemsToMap.length > 0) {
      const activeTplIds = Array.from(new Set(Object.values(itemTemplates).filter(id => id && id !== "none")));
      const activeTpls = templates.filter(t => activeTplIds.includes(t.id.toString()));
      if (activeTpls.length > 0) {
        serviceName = activeTpls.map(t => t.name).join(" + ");
        const maxValidity = Math.max(...activeTpls.map(t => t.validity_months || 12));
        expiryDate.setMonth(expiryDate.getMonth() + maxValidity);
      } else {
        serviceName = selectedTemplate?.name || "Sem Modelo";
        expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate?.validity_months || 12));
      }
    } else {
      serviceName = selectedTemplate?.name || "Sem Modelo";
      expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate?.validity_months || 12));
    }

    const certNumber = saleId ? String(saleId) : `PREV-${Date.now()}`;

    const companyAddress = companyInfo ? [companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ') : undefined;
    const pdfData: WarrantyPDFData = {
      certificate_number: certNumber,
      client_name: selectedClient.name,
      client_phone: selectedClient.phone,
      client_email: selectedClient.email || undefined,
      client_cpf_cnpj: clientCpfCnpj || undefined,
      vehicle_brand: selectedVehicle.brand,
      vehicle_model: selectedVehicle.model,
      vehicle_plate: selectedVehicle.plate || '',
      vehicle_year: selectedVehicle.year || undefined,
      service_name: serviceName,
      issue_date: issueDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      warranty_text: `${warrantyTerms}\n\n[ INSTRUÇÕES DE CUIDADO ]\n${careInstructions}`,
      company_name: companyInfo?.company_name || 'Minha Empresa',
      company_logo_url: companyInfo?.logo_url || undefined,
      company_cnpj: companyInfo?.cnpj || undefined,
      company_phone: companyInfo?.phone || undefined,
      company_email: companyInfo?.email || undefined,
      company_address: companyAddress || undefined,
      sale_date: selectedSale?.sale_date || undefined,
      payment_method: selectedSale?.payment_method || undefined,
      subtotal: selectedSale?.subtotal || undefined,
      discount: selectedSale?.discount || undefined,
      total: selectedSale?.total || undefined,
    };

    generateWarrantyPDF(pdfData, companyId || undefined);
    toast.success("Certificado baixado com sucesso!");
  };

  const isAnyTemplateSelected = selectedSale
    ? Object.values(itemTemplates).some(id => id && id !== "none")
    : !!templateId;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Emitir Garantia</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="config" className="w-full">
            <div className="px-6">
              <TabsList className="w-full">
                <TabsTrigger value="config" className="flex-1">Configurar</TabsTrigger>
                <TabsTrigger value="preview" className="flex-1">Pré-visualizar</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="config" className="px-6 pb-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Venda Relacionada (Opcional)</Label>
                  {selectedSale ? (
                    <Card className="bg-card/50 border-border/50 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                          <span className="text-success font-semibold">💰</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Venda #{selectedSale.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedSale.client?.name || "Sem Nome"} • {selectedSale.vehicle ? `${selectedSale.vehicle.brand} ${selectedSale.vehicle.model}` : "Sem Veículo"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedSale(null);
                            setSaleId("");
                            setSaleServicesText("");
                            setSaleItemsToMap([]);
                            setItemTemplates({});
                            setClientId("");
                            setVehicleId("");
                            if (selectedTemplate) {
                              setWarrantyTerms(combineTermsAndServices("", selectedTemplate));
                            } else {
                              setWarrantyTerms("");
                            }
                          }}
                        >
                          Remover
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setShowSelectSaleModal(true)}
                        >
                          Alterar
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left border-dashed border-muted-foreground/30 hover:border-primary/50 py-6"
                      onClick={() => setShowSelectSaleModal(true)}
                      disabled={!!issuedData}
                    >
                      <Plus className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Vincular uma venda a esta garantia (Auto-preenche cliente, veículo e serviços)</span>
                    </Button>
                  )}
                </div>

                {selectedSale && saleItemsToMap.length > 0 && (
                  <Card className="p-4 border border-border bg-muted/10 space-y-4 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <span>🛡️</span> Modelos de Garantia por Item da Venda
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Selecione o material/modelo de garantia adequado para cada serviço realizado nesta venda.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {saleItemsToMap.map((item) => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              {item.type === 'detailed' ? 'Item Detalhado' : 'Serviço'}
                            </span>
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>

                          <div className="w-full sm:w-[240px]">
                            <Select
                              value={itemTemplates[item.id] || "none"}
                              onValueChange={(val) => handleItemTemplateChange(item.id, val)}
                              disabled={!!issuedData}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Selecione o modelo..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem Garantia</SelectItem>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id.toString()}>
                                    {template.name} ({template.validity_months} meses)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={clientId} onValueChange={handleClientChange} disabled={loading || !!issuedData}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Carregando..." : "Selecione o cliente..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ do Cliente *</Label>
                  <Input
                    placeholder="Digite o CPF ou CNPJ..."
                    value={clientCpfCnpj}
                    onChange={e => setClientCpfCnpj(e.target.value)}
                    disabled={!!issuedData}
                    readOnly={!!selectedSale && !!clientCpfCnpj}
                    className={!!selectedSale && !!clientCpfCnpj ? "opacity-70 cursor-not-allowed" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId} disabled={loading || !clientId || !!issuedData}>
                    <SelectTrigger>
                      <SelectValue placeholder={!clientId ? "Selecione o cliente primeiro" : "Selecione o veículo..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.brand} {vehicle.model} - {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedSale && (
                  <div className="space-y-2">
                    <Label>Modelo de Garantia *</Label>
                    <Select value={templateId} onValueChange={handleTemplateChange} disabled={loading || !!issuedData}>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? "Carregando..." : "Selecione o modelo..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name} ({template.validity_months} meses)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedClient && selectedVehicle && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Cliente:</span> {selectedClient.name}</p>
                    <p><span className="text-muted-foreground">WhatsApp:</span> {selectedClient.phone || 'Não informado'}</p>
                    <p><span className="text-muted-foreground">CPF/CNPJ:</span> {clientCpfCnpj || 'Não informado'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedClient.email || 'Não informado'}</p>
                    <p><span className="text-muted-foreground">Veículo:</span> {selectedVehicle.brand} {selectedVehicle.model} - {selectedVehicle.plate}</p>
                  </div>
                )}

                {(!issuedData && (!!selectedTemplate || (selectedSale && saleItemsToMap.length > 0))) && (
                  <div className="space-y-2">
                    <Label>Termos da Garantia (Editável)</Label>
                    <Textarea
                      value={warrantyTerms}
                      onChange={e => setWarrantyTerms(e.target.value)}
                      rows={6}
                    />
                  </div>
                )}

                {issuedData && (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30 space-y-2">
                    <div className="flex items-center gap-2 text-success">
                      <Shield className="h-5 w-5" />
                      <span className="font-semibold">Garantia emitida com sucesso!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Certificado Nº {issuedData.certNumber} • {issuedData.serviceName}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                    {issuedData ? 'Fechar' : 'Cancelar'}
                  </Button>

                  {!issuedData && (
                    <>
                      <Button variant="outline" onClick={handleDownload} disabled={!isAnyTemplateSelected || !selectedClient || !selectedVehicle}>
                        <Download className="h-4 w-4 mr-2" /> Baixar PDF
                      </Button>
                      <Button
                        onClick={handleIssue}
                        disabled={!isAnyTemplateSelected || !selectedClient || !selectedVehicle || isSubmitting}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Salvando...' : 'Emitir Garantia'}
                      </Button>
                    </>
                  )}

                  {issuedData && (
                    <Button
                      onClick={() => setWhatsappModalOpen(true)}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="px-6 pb-6 mt-0">
              <ScrollArea className="h-[60vh] border rounded-lg bg-[#f5f5f5] text-black">
                <div className="max-w-[700px] mx-auto p-8 bg-white shadow-sm my-6 border rounded-md space-y-5 text-black">
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {companyInfo?.logo_url ? (
                        <img src={companyInfo.logo_url} alt="Logo" className="max-h-12 w-auto object-contain" />
                      ) : (
                        <img src={wfeLogo} alt="WFE" className="h-12 w-auto" />
                      )}
                      <div>
                        <h2 className="font-bold text-lg text-black uppercase tracking-tight">
                          {companyInfo?.company_name || 'WFE EVOLUTION'}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wider">CERTIFICADO DE GARANTIA</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-700">
                        Nº {saleId ? String(saleId) : 'PREV'}
                        {selectedSale?.sale_date && ` - ${new Date(selectedSale.sale_date).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>

                  {/* Accent Line */}
                  <div className="h-[1px] bg-[#007AFF] w-full" />

                  {/* Company Info Bar */}
                  {(companyInfo?.cnpj || companyInfo?.phone || companyInfo?.email || companyInfo) && (
                    <div className="text-center text-[9px] text-gray-500 space-y-1">
                      <p className="font-medium">
                        {[
                          companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}` : null,
                          companyInfo?.phone ? `Tel: ${companyInfo.phone}` : null,
                          companyInfo?.email ? `Email: ${companyInfo.email}` : null
                        ].filter(Boolean).join('  |  ')}
                      </p>
                      {companyInfo && (
                        <p>
                          {[companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* DADOS DO CLIENTE */}
                  <div className="space-y-2">
                    <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                      Dados do Cliente
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-3">
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">Nome</span>
                        <span className="text-[11px] font-semibold text-black">{selectedClient?.name || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">WhatsApp</span>
                        <span className="text-[11px] font-semibold text-black">{selectedClient?.phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">CPF/CNPJ</span>
                        <span className="text-[11px] font-semibold text-black">{clientCpfCnpj || "-"}</span>
                      </div>
                      {selectedClient?.email && (
                        <div>
                          <span className="text-[8px] text-gray-400 block uppercase font-medium">Email</span>
                          <span className="text-[11px] font-semibold text-black">{selectedClient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DADOS DO VEÍCULO */}
                  <div className="space-y-2">
                    <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                      Dados do Veículo
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-3">
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">Veículo</span>
                        <span className="text-[11px] font-semibold text-black">
                          {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}${selectedVehicle.year ? ` (${selectedVehicle.year})` : ''}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">Placa</span>
                        <span className="text-[11px] font-semibold text-black">{selectedVehicle?.plate || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* SERVIÇO REALIZADO */}
                  <div className="space-y-2">
                    <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                      Serviço Realizado
                    </div>
                    <div className="px-3">
                      <span className="text-[8px] text-gray-400 block uppercase font-medium">Tipo de Serviço</span>
                      <span className="text-[11px] font-semibold text-black">
                        {selectedSale && saleItemsToMap.length > 0
                          ? (
                            templates
                              .filter(t => Array.from(new Set(Object.values(itemTemplates))).includes(t.id.toString()))
                              .map(t => t.name)
                              .join(" + ") || "Sem Modelo Selecionado"
                          )
                          : (selectedTemplate?.name || "-")
                        }
                      </span>
                    </div>
                  </div>

                  {/* VALIDADE DA GARANTIA */}
                  <div className="space-y-2">
                    <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                      Validade da Garantia
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-3">
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">Data de Emissão</span>
                        <span className="text-[11px] font-semibold text-black">
                          {new Date().toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400 block uppercase font-medium">Válido Até</span>
                        <span className="text-[11px] font-semibold text-black">
                          {selectedSale && saleItemsToMap.length > 0
                            ? (() => {
                              const activeTplIds = Object.values(itemTemplates).filter(id => id && id !== "none");
                              const activeTpls = templates.filter(t => activeTplIds.includes(t.id.toString()));
                              if (activeTpls.length > 0) {
                                const maxValidity = Math.max(...activeTpls.map(t => t.validity_months || 12));
                                const d = new Date();
                                d.setMonth(d.getMonth() + maxValidity);
                                return d.toLocaleDateString('pt-BR');
                              }
                              return "-";
                            })()
                            : (selectedTemplate ? (() => {
                              const d = new Date();
                              d.setMonth(d.getMonth() + (selectedTemplate.validity_months || 12));
                              return d.toLocaleDateString('pt-BR');
                            })() : "-")
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* VALORES FINAIS */}
                  {selectedSale?.total !== undefined && selectedSale?.total !== null && (
                    <div className="space-y-2">
                      <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                        Valores Finais
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-3">
                        <div>
                          <span className="text-[8px] text-gray-400 block uppercase font-medium">Forma de Pagamento</span>
                          <span className="text-[11px] font-semibold text-black">{selectedSale.payment_method || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 block uppercase font-medium">Subtotal</span>
                          <span className="text-[11px] font-semibold text-black">
                            R$ {(selectedSale.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 block uppercase font-medium">Desconto</span>
                          <span className="text-[11px] font-semibold text-black">
                            R$ {(selectedSale.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 block uppercase font-medium">Total da Venda</span>
                          <span className="text-[11.5px] font-bold text-green-600">
                            R$ {(selectedSale.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TERMOS E CONDIÇÕES */}
                  {(warrantyTerms || careInstructions) && (
                    <div className="space-y-2">
                      <div className="bg-[#f0f0f0] rounded-[2px] px-3 py-1 text-[9px] font-bold text-[#323232] uppercase tracking-wider">
                        Termos e Condições
                      </div>
                      <div className="px-3 text-[10px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {warrantyTerms}
                        {careInstructions && (
                          <>
                            {"\n\n"}[ INSTRUÇÕES DE CUIDADO ]{"\n"}
                            {careInstructions}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OBSERVAÇÃO */}
                  <div className="bg-[#FFFDF6] border border-[#C8AA00] rounded-sm p-2 text-[10px] flex gap-2">
                    <strong className="text-[#8C6E00] uppercase font-bold shrink-0">Observação:</strong>
                    <span className="text-gray-800">
                      Esta garantia é intransferível e válida somente para o veículo e cliente especificados.
                    </span>
                  </div>

                  {/* ASSINATURAS */}
                  <div className="grid grid-cols-2 gap-12 pt-8 pb-4 text-center">
                    <div className="space-y-1">
                      <div className="border-t border-gray-300 w-full pt-1 text-[9px] text-gray-500">
                        <p className="font-semibold text-black">{companyInfo?.company_name || 'HG CUSTOM'}</p>
                        <p>Responsável</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="border-t border-gray-300 w-full pt-1 text-[9px] text-gray-500">
                        <p className="font-semibold text-black">{selectedClient?.name || 'Cliente'}</p>
                        <p>Cliente</p>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="text-center text-[8px] text-gray-400 pt-3 border-t border-gray-100">
                    Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <WarrantyWhatsAppModal
        open={whatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
        data={issuedData}
      />

      <Dialog open={showSelectSaleModal} onOpenChange={setShowSelectSaleModal}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 bg-card border-border/80">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Selecionar Venda</DialogTitle>
            <DialogDescription>
              Selecione uma venda do mês para preencher automaticamente os dados do cliente, veículo e serviços cobrados.
            </DialogDescription>
          </DialogHeader>

          {/* Busca */}
          <div className="px-6 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, placa, modelo ou número da venda..."
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Vendas */}
          <div className="overflow-y-auto flex-1 px-6 pb-6 min-h-0">
            <div className="space-y-2 pt-2">
              {loadingSales ? (
                <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Carregando vendas do mês...</span>
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda encontrada.
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 border rounded-lg bg-card/50 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => {
                      handleSelectSale(sale);
                      setShowSelectSaleModal(false);
                    }}
                  >
                    <div>
                      <p className="font-semibold text-sm">Venda #{sale.id}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Cliente: {sale.client?.name || "Sem Nome"}
                      </p>
                      {sale.vehicle && (
                        <p className="text-xs text-muted-foreground">
                          Veículo: {sale.vehicle.brand} {sale.vehicle.model} - {sale.vehicle.plate || "Sem Placa"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-success">
                        R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {sale.sale_date ? new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR') : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
