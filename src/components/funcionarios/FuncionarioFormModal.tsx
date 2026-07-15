import { useState } from "react";
import { User, Phone, Briefcase, Calendar, MapPin, Mail, Key, Shield, AlertTriangle, Search, X, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FuncionarioFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    companyId: string;
}

const PERMISSION_MODULES = [
    {
        id: "painel", label: "Aba Painel (Dashboard)", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "preencher_vagas", label: "Preencher vaga" },
            { id: "add_cliente", label: "Adicionar novo cliente" },
            { id: "ver_financeiro", label: "Ver financeiro completo" },
            { id: "editar_meta", label: "Editar meta do mês" },
        ]
    },
    {
        id: "vendas", label: "Aba Vendas", actions: [
            { id: "view_numeros", label: "Ver números de venda" },
            { id: "add", label: "Adicionar venda" },
            { id: "edit", label: "Editar venda" },
            { id: "delete", label: "Excluir venda" },
            { id: "emitir_garantia", label: "Emitir garantia" },
            { id: "imprimir", label: "Imprimir notinha" },
            { id: "enviar_wpp", label: "Enviar mensagem no WhatsApp" },
            { id: "ver_pdf", label: "Ver sub-aba PDFs baixados" },
            { id: "ver_lixeira", label: "Ver sub-aba de lixeira" },
        ]
    },
    {
        id: "espaco", label: "Aba Espaço", actions: [
            { id: "add", label: "Adicionar vaga" },
            { id: "edit", label: "Editar vaga" },
            { id: "delete", label: "Excluir vaga" },
            { id: "concluir_vaga", label: "Concluir vaga e liberar espaço" },
            { id: "exportar_venda", label: "Exportar venda" },
            { id: "enviar_msg", label: "Enviar mensagem de entrada/saída" },
            { id: "baixar_pdf", label: "Baixar PDF" },
            { id: "configurar_total", label: "Configurar total de vagas" },
            { id: "alterar_limite", label: "Alterar limite de vagas" },
            { id: "ver_pagos", label: "Ver sub-aba Veículos Pagos" },
            { id: "ver_nao_pagos", label: "Ver sub-aba Veículos Não Pagos" },
            { id: "ver_pdf", label: "Ver sub-aba PDFs Baixados" },
            { id: "ver_lixeira", label: "Ver sub-aba de Lixeira" },
        ]
    },
    {
        id: "financeiro", label: "Aba Financeiro", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add_entrada", label: "Adicionar entrada" },
            { id: "add_saida", label: "Adicionar saída" },
            { id: "transferencia", label: "Fazer transferência" },
            { id: "add_conta", label: "Adicionar conta" },
            { id: "add_categoria", label: "Adicionar categoria" },
            { id: "gerenciar_categoria", label: "Gerenciar categoria" },
            { id: "ver_cac", label: "Visualizar aba de CAC" },
            { id: "add_gasto_ads", label: "Adicionar gastos por ADS" },
            { id: "add_gasto_vendedor", label: "Adicionar gastos por Vendedor" },
        ]
    },
    {
        id: "compras", label: "Aba Compras", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add", label: "Adicionar compra" },
            { id: "edit", label: "Editar compra" },
            { id: "delete", label: "Excluir compra" },
            { id: "add_fornecedor", label: "Adicionar fornecedor" },
        ]
    },
    {
        id: "contas", label: "Aba Contas", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add_entrada", label: "Adicionar entrada" },
            { id: "add_saida", label: "Adicionar saída" },
            { id: "transferencia", label: "Fazer transferência" },
            { id: "add_conta", label: "Adicionar conta" },
            { id: "add_categoria", label: "Adicionar categoria" },
            { id: "gerenciar_categoria", label: "Gerenciar categoria" },
            { id: "ver_maquininha", label: "Visualizar aba de Maquininha" },
            { id: "add_maquininha", label: "Adicionar nova maquininha" },
            { id: "edit_maquininha", label: "Editar maquininha" },
            { id: "delete_maquininha", label: "Excluir maquininha" },
            { id: "marcar_paga", label: "Marcar venda como paga" },
            { id: "reverter_maquininha", label: "Reverter venda das maquininhas" },
            { id: "ver_boletos", label: "Visualizar aba de Boletos" },
            { id: "pagar_boleto", label: "Fazer pagamento de boletos" },
            { id: "reverter_boleto", label: "Reverter pagamento de boletos" },
        ]
    },
    {
        id: "clientes", label: "Aba Clientes", actions: [
            { id: "add", label: "Adicionar novo cliente" },
            { id: "add_veiculo", label: "Adicionar veículo" },
            { id: "edit", label: "Editar cliente" },
            { id: "delete", label: "Excluir cliente" },
            { id: "criar_venda", label: "Criar nova venda com cliente" },
            { id: "criar_vaga", label: "Criar nova vaga com cliente" },
            { id: "enviar_wpp", label: "Enviar mensagem WhatsApp do cliente" },
        ]
    },
    {
        id: "relatorios", label: "Aba Relatórios", actions: [
            { id: "dfc", label: "DFC - Demonstração de Fluxo de Caixa" },
            { id: "saidas_fin", label: "Saídas Financeiro (Pagos e Pendentes)" },
            { id: "dre", label: "DRE - Demonstração de Resultado" },
            { id: "extrato", label: "Extrato de Conta" },
            { id: "vendas_periodo", label: "Vendas por Período (Fechadas)" },
            { id: "vendas_servico", label: "Vendas por Serviço" },
            { id: "vendas_vendedor", label: "Vendas por Vendedor" },
            { id: "vendas_pelicula", label: "Vendas por Película" },
            { id: "clientes_ativos", label: "Clientes Ativos" },
            { id: "clientes_inativos", label: "Clientes Inativos" },
            { id: "marketing", label: "Lista de Marketing" },
            { id: "backup", label: "Lista Completa (Backup)" },
            { id: "ocupacao", label: "Ocupação de Vagas" },
            { id: "mov_estoque", label: "Movimentação de Estoque" },
            { id: "perdas_mat", label: "Perdas de Material" },
        ]
    },
    {
        id: "comissoes", label: "Aba Comissões", actions: [
            { id: "view", label: "Visualizar aba de comissões" },
            { id: "add", label: "Adicionar novo comissionado" },
            { id: "edit", label: "Editar comissionado" },
            { id: "delete", label: "Excluir comissionado" },
        ]
    },
    {
        id: "garantias", label: "Aba Garantias", actions: [
            { id: "view", label: "Visualizar aba de garantia" },
            { id: "add", label: "Criar uma nova garantia" },
            { id: "edit", label: "Editar garantia" },
            { id: "delete", label: "Excluir garantia" },
            { id: "emitir", label: "Emitir garantia" },
            { id: "ver_pdf", label: "Visualizar PDFs baixados" },
        ]
    },
    {
        id: "servicos", label: "Aba Serviços", actions: [
            { id: "view", label: "Visualizar aba de serviços" },
            { id: "add", label: "Adicionar novo serviço" },
            { id: "edit", label: "Editar serviços" },
            { id: "delete", label: "Excluir serviços" },
            { id: "ver_regras", label: "Visualizar aba regras de consumo" },
            { id: "regras_consumo", label: "Alterar regras de consumo" },
        ]
    },
    {
        id: "estoque", label: "Aba Estoque", actions: [
            { id: "add", label: "Adicionar novo material" },
            { id: "edit", label: "Editar material" },
            { id: "delete", label: "Excluir material" },
            { id: "toggle_ativo", label: "Ativar / Desativar material" },
            { id: "add_metros", label: "Adicionar metros" },
            { id: "edit_metros", label: "Editar metros" },
            { id: "del_metros", label: "Excluir metros" },
            { id: "entrada_metros", label: "Dar entrada em metros de material" },
            { id: "saida_metros", label: "Dar saída em metros de material" },
            { id: "fechar_bobina", label: "Encerrar bobina aberta de material" },
            { id: "ver_tipos", label: "Ver aba Tipos de Materiais" },
            { id: "ver_metragem", label: "Ver aba Metragem de Materiais" },
            { id: "ver_historico", label: "Ver aba Histórico de Material" },
        ]
    },
    {
        id: "perdas", label: "Aba Perdas", actions: [
            { id: "add", label: "Adicionar nova perda" },
            { id: "edit", label: "Editar perda" },
            { id: "delete", label: "Excluir perda" },
            { id: "alterar_limite", label: "Alterar limite de perda" },
        ]
    },
    {
        id: "perfil", label: "Aba Perfil", actions: [
            { id: "view", label: "Visualizar aba de perfil" },
        ]
    },
    {
        id: "empresa", label: "Aba Empresa", actions: [
            { id: "view", label: "Visualizar aba de empresa" },
        ]
    },
    {
        id: "funcionarios", label: "Aba Funcionários", actions: [
            { id: "add", label: "Adicionar funcionários" },
            { id: "edit", label: "Editar funcionários" },
            { id: "delete", label: "Excluir funcionário" },
        ]
    }
];

export function FuncionarioFormModal({ open, onOpenChange, onSaved, companyId }: FuncionarioFormModalProps) {
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
                        Adicionar Novo Funcionário
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
                                        <Input name="name" value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cargo / Ocupação*</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="role_title" value={formData.role_title} onChange={handleChange} className="pl-9" placeholder="Ex: Vendedor, Instalador..." required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="pl-9" placeholder="(00) 00000-0000" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data de Nascimento</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} className="pl-9" />
                                        </div>
                                    </div>
                                </div>
                            </div>

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

                            {/* Permissions */}
                            <div className="space-y-6 pt-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Permissões de Módulos (Ações)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Marque com um <strong className="text-destructive font-bold">'X'</strong> vermelho as ações que este funcionário <strong className="text-foreground">NÃO</strong> deve ter acesso.
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
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Funcionário"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
