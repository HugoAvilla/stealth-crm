import { useState } from "react";
import { Phone, Mail, MapPin, Upload, MessageCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { companySettings } from "@/lib/mockData";
import { EditCompanyModal } from "@/components/empresa/EditCompanyModal";
import { toast } from "sonner";

export default function Empresa() {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSupportClick = () => {
    toast.success("Chat de suporte iniciado!");
  };

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
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
              {companySettings.logo_url ? (
                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{companySettings.name}</h2>
              <p className="text-muted-foreground">{companySettings.cnpj}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p className="font-medium">{companySettings.phone}</p>
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
                <p className="font-medium">{companySettings.email}</p>
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
              <p className="font-medium">{companySettings.address}</p>
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
