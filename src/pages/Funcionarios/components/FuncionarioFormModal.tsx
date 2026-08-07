import { useState, useEffect } from "react";
import { User, Phone, Briefcase, Calendar, MapPin, Mail, Key, Shield, AlertTriangle, Search, X, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PERMISSION_MODULES, DEFAULT_LOCKED_MODULES } from "@/lib/permissions";

export interface EmployeeForEdit {
    user_id: string;
    name: string;
    role_title: string;
    whatsapp: string;
    email: string;
    locked_modules: string[];
}

interface FuncionarioFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    companyId: string;
    employee?: EmployeeForEdit | null;
}

export function FuncionarioFormModal({ open, onOpenChange, onSaved, companyId, employee = null }: FuncionarioFormModalProps) {
    const isEditMode = !!employee;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearchingCep, setIsSearchingCep] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        role_title: "",
        whatsapp: "",
        birth_date: "",
        cep: "",
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        email: "",
        password: generatePassword(),
    });

    const [lockedModules, setLockedModules] = useState<string[]>([]);

    function generatePassword() {
        return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
    }

    // Prefill em modo edição; reset em modo criação. Roda ao abrir/trocar de funcionário.
    useEffect(() => {
        if (!open) return;
        if (employee) {
            setFormData({
                name: employee.name || "",
                role_title: employee.role_title || "",
                whatsapp: employee.whatsapp || "",
                birth_date: "",
                cep: "", street: "", number: "", neighborhood: "", city: "", state: "",
                email: employee.email || "",
                password: "",
            });
            setLockedModules(Array.isArray(employee.locked_modules) ? employee.locked_modules : []);
        } else {
            setFormData({
                name: "", role_title: "", whatsapp: "", birth_date: "",
                cep: "", street: "", number: "", neighborhood: "", city: "", state: "",
                email: "", password: generatePassword(),
            });
            // Novo funcionário nasce com as abas sensíveis (financeiras) já bloqueadas.
            setLockedModules([...DEFAULT_LOCKED_MODULES]);
        }
    }, [open, employee]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCepSearch = async () => {
        const cleanCep = formData.cep.replace(/\D/g, "");
        if (cleanCep.length !== 8) {
            toast.error("CEP inválido");
            return;
        }

        setIsSearchingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();

            if (data.erro) {
                toast.error("CEP não encontrado");
                return;
            }

            setFormData(prev => ({
                ...prev,
                street: data.logradouro || "",
                neighborhood: data.bairro || "",
                city: data.localidade || "",
                state: data.uf || "",
            }));
            toast.success("Endereço preenchido");
        } catch (error) {
            toast.error("Erro ao buscar CEP");
        } finally {
            setIsSearchingCep(false);
        }
    };

    const togglePermission = (permissionKey: string) => {
        setLockedModules(prev =>
            prev.includes(permissionKey)
                ? prev.filter(k => k !== permissionKey)
                : [...prev, permissionKey]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Modo edição: atualiza apenas as permissões via RPC segura.
        if (isEditMode && employee) {
            setIsSubmitting(true);
            try {
                const { error } = await supabase.rpc("update_member_locked_modules", {
                    target_user_id: employee.user_id,
                    modules: lockedModules,
                });
                if (error) throw error;
                toast.success("Permissões atualizadas com sucesso!");
                onSaved();
                onOpenChange(false);
            } catch (error: any) {
                console.error(error);
                toast.error(error.message || "Erro ao atualizar permissões.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (!formData.name || !formData.email || !formData.password || !formData.role_title) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("create-employee-user", {
                body: {
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role_title: formData.role_title,
                    whatsapp: formData.whatsapp,
                    birth_date: formData.birth_date,
                    companyId: companyId,
                    locked_modules: lockedModules,
                    address: {
                        cep: formData.cep,
                        street: formData.street,
                        number: formData.number,
                        neighborhood: formData.neighborhood,
                        city: formData.city,
                        state: formData.state,
                    }
                }
            });

            if (error) {
                console.error("Function Error:", error);
                let errorMessage = error.message;
                try {
                    // Mapeia o erro customizado JSON retornado pela Edge Function em caso de erro 400
                    if (error.context) {
                        const errorData = await error.context.json();
                        if (errorData?.error) errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Ignore parse errors
                }
                throw new Error(errorMessage);
            }
            if (data?.error) throw new Error(data.error);

            toast.success("Funcionário criado com sucesso!");
            onSaved();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao criar funcionário. Verifique se o e-mail já existe.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col min-h-0">
                <DialogHeader className="p-6 pb-4 border-b border-border">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        {isEditMode ? "Editar Permissões do Funcionário" : "Adicionar Novo Funcionário"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
                        <div className="space-y-8 pb-6 pt-6">

                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <User className="w-4 h-4" /> Dados Pessoais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome Completo*</Label>
                                        <Input name="name" value={formData.name} onChange={handleChange} required disabled={isEditMode} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cargo / Ocupação*</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="role_title" value={formData.role_title} onChange={handleChange} className="pl-9" placeholder="Ex: Vendedor, Instalador..." required disabled={isEditMode} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="pl-9" placeholder="(00) 00000-0000" disabled={isEditMode} />
                                        </div>
                                    </div>
                                    {!isEditMode && (
                                    <div className="space-y-2">
                                        <Label>Data de Nascimento</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} className="pl-9" />
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>

                            {!isEditMode && (<>
                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Endereço
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>CEP</Label>
                                        <div className="flex gap-2">
                                            <Input name="cep" value={formData.cep} onChange={handleChange} placeholder="00000-000" />
                                            <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={isSearchingCep}>
                                                {isSearchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Endereço</Label>
                                        <Input name="street" value={formData.street} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Número</Label>
                                        <Input name="number" value={formData.number} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bairro</Label>
                                        <Input name="neighborhood" value={formData.neighborhood} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cidade / Estado</Label>
                                        <Input value={`${formData.city} ${formData.state ? `- ${formData.state}` : ""}`} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-border w-full my-4" />

                            {/* Login Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Acesso ao Sistema
                                </h3>

                                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-yellow-700 dark:text-yellow-500 text-sm">LOGIN DO FUNCIONÁRIO</h4>
                                        <p className="text-xs text-yellow-700/80 dark:text-yellow-500/80 mt-1">
                                            Esses são os dados que o funcionário usará para entrar na plataforma.
                                            <strong className="block mt-1">COPIE A SENHA ANTES DE SALVAR - ela não fica armazenada visível depois.</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>E-mail de Acesso*</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input type="email" name="email" value={formData.email} onChange={handleChange} className="pl-9" required />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Senha Gerada*</Label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, password: generatePassword() }))}
                                                className="text-xs text-primary font-medium hover:underline"
                                            >
                                                Gerar Nova
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="pl-9 pr-10 font-mono tracking-wider"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </>)}

                            {/* Permissions */}
                            <div className="space-y-6 pt-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Permissões de Módulos (Ações)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Marque com um <strong className="text-destructive font-bold">'X'</strong> vermelho as ações que este funcionário <strong className="text-foreground">NÃO</strong> deve ter acesso.
                                        {!isEditMode && <span className="block mt-1">As abas financeiras já começam bloqueadas por segurança — desmarque para liberar.</span>}
                                    </p>
                                </div>
                                <div className="space-y-6">
                                    {PERMISSION_MODULES.map(mod => (
                                        <div key={mod.id} className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/50">
                                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                                                {mod.label}
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {mod.actions.map(act => {
                                                    const permKey = `${mod.id}_${act.id}`;
                                                    const isLocked = lockedModules.includes(permKey);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={act.id}
                                                            onClick={() => togglePermission(permKey)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isLocked
                                                                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                                                                : 'bg-card border-border hover:border-primary/50 text-foreground'
                                                                }`}
                                                        >
                                                            {act.label}
                                                            {isLocked ? <X className="w-3.5 h-3.5 flex-shrink-0" /> : <Check className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50 rounded-b-lg">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditMode ? "Salvar Permissões" : "Salvar Funcionário")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
