import { useState, useEffect } from "react";
import { Users, Plus, ShieldAlert, Loader2, Building2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FuncionarioFormModal } from "@/pages/Funcionarios/components/FuncionarioFormModal";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Employee {
    id: string;
    name: string;
    role_title: string;
    email: string;
    whatsapp: string;
    locked_modules: string[];
}

export default function Funcionarios() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [limits, setLimits] = useState({ current: 0, max: 0 });

    const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
    const [employeeToUnlink, setEmployeeToUnlink] = useState<Employee | null>(null);
    const [unlinkLoading, setUnlinkLoading] = useState(false);

    const currentPlan = (user?.planCode || 'basic').toLowerCase();
    const isBasic = currentPlan === 'basic' && !user?.isMaster;

    // Limits based on plan
    const maxMembers = user?.isMaster ? 999 : (currentPlan === 'premium' ? 10 : (currentPlan === 'ultra' ? 5 : 0));

    const fetchEmployees = async () => {
        if (!user?.companyId) return;
        if (isBasic) {
            setIsLoading(false);
            return; // Don't fetch if basic since they can't access
        }

        setIsLoading(true);

        try {
            // Using select('*') prevents crash if locked_modules is not yet created in the DB
            const { data: teamData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', Number(user.companyId))

            if (error) {
                console.error("Erro na busca de funcionarios:", error)
            }

            const allMembers = teamData || [];
            const others = allMembers.filter((p: any) => p.id !== user?.id && p.email?.toLowerCase() !== user?.email?.toLowerCase());

            setEmployees(others as Employee[]);
            setLimits({
                current: allMembers.length > 0 ? allMembers.length : 1, // Admin is at least 1
                max: maxMembers
            });
        } catch (err: any) {
            console.error("Exception in fetchEmployees:", err);
            setLimits({ current: 1, max: maxMembers });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [user?.companyId, currentPlan]);

    const openUnlinkModal = (emp: Employee) => {
        setEmployeeToUnlink(emp);
        setUnlinkModalOpen(true);
    };

    const handleUnlinkEmployee = async () => {
        if (!employeeToUnlink) return;

        setUnlinkLoading(true);
        try {
            const { error } = await supabase.rpc('unlink_company_member', {
                target_user_id: employeeToUnlink.id,
            });

            if (error) throw error;

            toast({
                title: 'Membro removido',
                description: `${employeeToUnlink.name} foi desvinculado da empresa.`,
            });

            setUnlinkModalOpen(false);
            setEmployeeToUnlink(null);
            fetchEmployees();
        } catch (error: any) {
            console.error('Error unlinking member:', error);
            toast({
                title: 'Erro ao desvincular',
                description: error.message || 'Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setUnlinkLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isBasic) {
        return (
            <div className="p-6 max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                    A gestão de funcionários e criação de contas para a equipe está disponível a partir do plano Ultra.
                </p>
                <Button onClick={() => navigate('/upgrade')} size="lg">
                    Fazer Upgrade de Plano
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Funcionários
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie o acesso da sua equipe à plataforma.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-muted-foreground">Membros</p>
                        <p className="font-semibold">{limits.current} / {limits.max}</p>
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        disabled={limits.current >= limits.max}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Funcionário
                    </Button>
                </div>
            </div>

            {limits.current >= limits.max && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">
                        Você atingiu o limite de membros do seu plano. Faça upgrade para adicionar mais funcionários.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {/* Admin Card */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                    {user?.profile?.name?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg line-clamp-1">{user?.profile?.name || 'Administrador'}</h3>
                                    <p className="text-sm text-primary font-medium">Administrador</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50 text-sm space-y-2 text-muted-foreground">
                            <p className="truncate" title={user?.email}>{user?.email}</p>

                            <div className="pt-2">
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-foreground/70">Permissões de Módulos</p>
                                <div className="flex flex-wrap gap-1">
                                    <span className="bg-green-500/10 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                        Acesso Completo
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {employees.map(emp => (
                    <Card key={emp.id} className="bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg">
                                        {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1" title={emp.name}>{emp.name}</h3>
                                        <p className="text-sm text-muted-foreground">{emp.role_title || 'Funcionário'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 h-8 w-8"
                                    onClick={() => openUnlinkModal(emp)}
                                    title="Desvincular funcionário"
                                >
                                    <UserMinus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border text-sm space-y-2 text-muted-foreground">
                                <p className="truncate" title={emp.email}>{emp.email}</p>
                                {emp.whatsapp && <p>{emp.whatsapp}</p>}

                                <div className="pt-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-2">Permissões de Módulos</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(!emp.locked_modules || (emp.locked_modules as string[]).length === 0) ? (
                                            <span className="bg-green-500/10 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                Acesso Completo
                                            </span>
                                        ) : (
                                            <span className="bg-amber-500/10 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                {String((emp.locked_modules as string[]).length)} Restrição(ões) Ativa(s)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {employees.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-muted/30 rounded-xl border border-dashed">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-medium">Nenhum funcionário cadastrado</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                            Adicione membros à equipe para que eles possam acessar a plataforma com suas próprias credenciais.
                        </p>
                    </div>
                )}
            </div>

            <FuncionarioFormModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSaved={fetchEmployees}
                companyId={String(user?.companyId || '')}
            />

            {/* Unlink Confirmation Dialog */}
            <AlertDialog open={unlinkModalOpen} onOpenChange={setUnlinkModalOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apagar acesso de funcionário</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover o acesso de <strong>{employeeToUnlink?.name}</strong>?
                            <br /><br />
                            Esta ação excluirá o usuário da equipe e ele perderá o acesso à plataforma imediatamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border" disabled={unlinkLoading}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnlinkEmployee}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={unlinkLoading}
                        >
                            {unlinkLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                'Sim, Remover Acesso'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
