import { useState, useRef, useEffect } from "react";
import { Phone, Mail, MapPin, Upload, MessageCircle, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditCompanyModal } from "@/components/empresa/EditCompanyModal";
import { CompanyCodeDisplay } from "@/components/team/CompanyCodeDisplay";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CompanyData {
  company_name: string;
  cnpj: string | null;
  phone: string;
  email: string | null;
  logo_url: string | null;
  company_code: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

export default function Empresa() {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.companyId) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("company_name, cnpj, phone, email, logo_url, company_code, street, number, neighborhood, city, state, cep")
        .eq("id", user.companyId)
        .single();

      if (!error && data) {
        setCompany(data);
      }
      setIsLoading(false);
    };

    fetchCompany();
  }, [user?.companyId]);

  const handleSupportClick = () => {
    toast.success("Chat de suporte iniciado!");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.companyId) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.companyId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', user.companyId);

      if (updateError) throw updateError;

      setCompany(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      toast.success('Logo atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setIsUploading(false);
    }
  };

  const formatAddress = () => {
    if (!company) return 'Endereço não cadastrado';
    const parts = [
      company.street,
      company.number,
      company.neighborhood,
      company.city,
      company.state,
      company.cep
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Endereço não cadastrado';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sua Empresa</h1>
          <p className="text-muted-foreground">Configure os dados da empresa</p>
        </div>
        <Button onClick={() => setShowEditModal(true)}>
          <Edit className="h-4 w-4 mr-2" /> Editar Dados
        </Button>
      </div>

      {/* Company Logo & Name */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors overflow-hidden"
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : company?.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{company?.company_name || 'Empresa'}</h2>
              <p className="text-muted-foreground">{company?.cnpj || 'CNPJ não cadastrado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Code - Only for Admin */}
      {user?.role === 'ADMIN' && company?.company_code && (
        <CompanyCodeDisplay code={company.company_code} />
      )}

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{company?.phone || 'Não cadastrado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{company?.email || 'Não cadastrado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{formatAddress()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAB Support Button */}
      <button
        onClick={handleSupportClick}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Modal */}
      <EditCompanyModal open={showEditModal} onOpenChange={setShowEditModal} />
    </div>
  );
}