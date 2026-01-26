import { useState } from "react";
import { Building, Phone, Mail, MapPin, Upload, Palette, MessageCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companySettings } from "@/lib/mockData";
import { EditCompanyModal } from "@/components/empresa/EditCompanyModal";
import { toast } from "sonner";

// Color palette
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

export default function Empresa() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(companySettings.primary_color);

  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    toast.success("Cor primária atualizada!");
  };

  const handleSupportClick = () => {
    toast.success("Chat de suporte iniciado!");
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sua Empresa</h1>
          <p className="text-muted-foreground">Configure os dados e personalização</p>
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

      {/* Color Palette */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" /> Personalização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha a cor primária do sistema
          </p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: primaryColor === color ? 'white' : 'transparent'
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cor atual:</span>
            <div
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="font-mono text-sm">{primaryColor}</span>
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
