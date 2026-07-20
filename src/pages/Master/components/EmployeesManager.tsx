import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Users,
    Building,
    Mail,
    Calendar,
    Loader2,
    Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmployeeRow {
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
    created_at: string | null;
    company_id: number;
    role: string | null;
    company_name: string;
    owner_id: string | null;
    plan_code: string | null;
    status: string | null;
}

export default function EmployeesManager() {
    const { toast } = useToast();
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch profiles with company_id not null
            const { data: profiles, error: pError } = await supabase
                .from("profiles")
                .select("user_id, name, email, phone, created_at, company_id")
                .not("company_id", "is", null)
                .order("created_at", { ascending: false });

            if (pError) throw pError;
            if (!profiles || profiles.length === 0) {
                setEmployees([]);
                return;
            }

            const userIds = profiles.map((p) => p.user_id);
            const companyIds = [...new Set(profiles.map((p) => p.company_id))];

            // 2. Fetch user_roles
            const { data: roles, error: rError } = await supabase
                .from("user_roles")
                .select("user_id, role")
                .in("user_id", userIds);

            if (rError) console.error("Error fetching roles:", rError);

            // 3. Fetch companies
            const { data: companies, error: cError } = await supabase
                .from("companies")
                .select("id, company_name, owner_id")
                .in("id", companyIds);

            if (cError) console.error("Error fetching companies:", cError);

            const ownerIds = companies ? [...new Set(companies.map((c) => c.owner_id))] : [];

            // 4. Fetch subscriptions for those owners
            const { data: subs, error: sError } = await supabase
                .from("subscriptions")
                .select("user_id, plan_code, status")
                .in("user_id", ownerIds);

            if (sError) console.error("Error fetching subscriptions:", sError);

            const enriched: EmployeeRow[] = profiles.map((p) => {
                const role = roles?.find((r) => r.user_id === p.user_id)?.role || "NENHUM";
                const company = companies?.find((c) => c.id === p.company_id);
                const sub = subs?.find((s) => s.user_id === company?.owner_id);

                return {
                    user_id: p.user_id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                    created_at: p.created_at,
                    company_id: p.company_id as number,
                    role,
                    company_name: company?.company_name || "Desconhecida",
                    owner_id: company?.owner_id || null,
                    plan_code: sub?.plan_code || "basic",
                    status: sub?.status || "active",
                };
            });

            // Optionally filter out owners so we only see true "employees"
            // Or keep them but mark them if they show up here. Let's filter out owners.
            const employeesOnly = enriched.filter((e) => e.user_id !== e.owner_id);

            setEmployees(employeesOnly);
        } catch (error) {
            console.error("Error fetching employees:", error);
            toast({
                title: "Erro ao buscar funcionários",
                description: "Não foi possível carregar a lista.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleBadge = (role: string | null) => {
        switch (role) {
            case "ADMIN":
                return <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>;
            case "FUNCIONARIO":
            case "VENDEDOR":
                return <Badge className="bg-blue-500/20 text-blue-400">Funcionário</Badge>;
            case "PRODUCAO":
                return <Badge className="bg-orange-500/20 text-orange-400">Produção</Badge>;
            default:
                return <Badge variant="secondary">Pendente</Badge>;
        }
    };

    const filteredEmployees = employees.filter((emp) => {
        const term = searchTerm.toLowerCase();
        return (
            (emp.name || "").toLowerCase().includes(term) ||
            (emp.email || "").toLowerCase().includes(term) ||
            (emp.company_name || "").toLowerCase().includes(term)
        );
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Controle de Funcionários
                            </CardTitle>
                            <CardDescription>
                                Visão geral de todos os funcionários e respectivas empresas parceiras
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Funcionário</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Empresa Vinculada</TableHead>
                                <TableHead>Plano da Empresa</TableHead>
                                <TableHead>Data de Entrada</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees.map((emp) => (
                                <TableRow key={emp.user_id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{emp.name || "—"}</p>
                                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getRoleBadge(emp.role)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            {emp.company_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="capitalize font-medium flex items-center gap-1.5">
                                            <Crown className="h-4 w-4 text-primary" />
                                            {emp.plan_code}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {emp.created_at ? format(new Date(emp.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        Nenhum funcionário encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
