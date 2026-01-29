import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

// Input validation for name
const validateName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return "Nome é obrigatório";
  if (trimmed.length < 2) return "Nome deve ter pelo menos 2 caracteres";
  if (trimmed.length > 100) return "Nome deve ter no máximo 100 caracteres";
  // Allow letters (including accented), spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) {
    return "Nome contém caracteres inválidos";
  }
  return null;
};

// Input validation for email
const validateEmail = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "Email é obrigatório";
  if (trimmed.length > 255) return "Email muito longo";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return "Email inválido";
  return null;
};

export function NewUserModal({ open, onOpenChange, onUserCreated }: NewUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate inputs
    const nameError = validateName(name);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      toast.error(emailError);
      return;
    }

    if (!role) {
      toast.error("Selecione um papel para o usuário");
      return;
    }

    setIsLoading(true);

    try {
      // Create user via Supabase Auth signup
      // The user will receive an email to set their own password
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: crypto.randomUUID(), // Temporary password - user will reset via email
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('already registered')) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error("Erro ao criar usuário: " + error.message);
        }
        return;
      }

      if (!data.user) {
        toast.error("Erro ao criar usuário");
        return;
      }

      // Update user role (the trigger creates NENHUM by default)
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: role.toUpperCase() as 'ADMIN' | 'VENDEDOR' | 'PRODUCAO' | 'NENHUM' })
        .eq('user_id', data.user.id);

      if (roleError) {
        console.error('Role update error:', roleError);
        // User was created but role wasn't updated - admin can fix this later
        toast.warning("Usuário criado, mas houve erro ao definir o papel. Atualize manualmente.");
      } else {
        toast.success(
          "Usuário criado com sucesso! Um email de confirmação foi enviado para " + email.trim()
        );
      }

      onOpenChange(false);
      resetForm();
      onUserCreated?.();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("Erro inesperado ao criar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="Nome do usuário"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={255}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="+55 (00) 00000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              maxLength={20}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Papel *</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            O usuário receberá um email para confirmar sua conta e definir sua senha.
          </p>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
