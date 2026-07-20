import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createExpenseTransaction } from "@/lib/financialTransactions";
import { toast } from "sonner";

interface SellerExpenseFormProps {
    companyId?: number;
    sellers: any[];
    accounts: any[];
    onSuccess: () => void;
}

export function SellerExpenseForm({ companyId, sellers, accounts, onSuccess }: SellerExpenseFormProps) {
    const [sellerId, setSellerId] = useState("");
    const [sellerAmount, setSellerAmount] = useState("");
    const [sellerDate, setSellerDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [sellerDescription, setSellerDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [accountId, setAccountId] = useState("");

    // Auto-select main account when accounts load if none is selected
    useEffect(() => {
        if (accounts.length > 0 && !accountId) {
            const mainAcc = accounts.find(a => a.is_main);
            setAccountId(mainAcc ? mainAcc.id.toString() : accounts[0].id.toString());
        }
    }, [accounts, accountId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) {
            toast.error("Empresa não vinculada");
            return;
        }
        if (!sellerId) {
            toast.error("Selecione um vendedor");
            return;
        }

        const valorInvestido = parseFloat(sellerAmount.replace(",", "."));
        if (isNaN(valorInvestido) || valorInvestido <= 0) {
            toast.error("Digite um valor válido maior que 0");
            return;
        }

        if (!accountId) {
            toast.error("Selecione uma conta financeira");
            return;
        }

        setSubmitting(true);
        try {
            const selectedSeller = sellers.find(s => s.id.toString() === sellerId);
            const sellerName = selectedSeller ? selectedSeller.name : "Vendedor";

            const result = await createExpenseTransaction({
                name: sellerDescription ? `Comissão - ${sellerDescription}` : `Gasto Vendedor - ${sellerName}`,
                amount: valorInvestido,
                transactionDate: sellerDate,
                companyId: companyId,
                accountId: parseInt(accountId),
                isPaid: true,
                description: `Gasto Vendedor: ${sellerName}${sellerDescription ? ` - ${sellerDescription}` : ''}`,
                originType: "manual",
            });

            if (!result) throw new Error("Falha ao criar transação");

            const { error: updateError } = await supabase
                .from("transactions")
                .update({
                    include_in_cac: true,
                    cac_bucket: "vendas",
                    cac_origin: "Geral",
                })
                .eq("id", result.id);

            if (updateError) throw updateError;
            toast.success(`Gasto com ${sellerName} registrado com sucesso!`);

            setSellerAmount("");
            setSellerDescription("");
            setSellerId("");
            setSellerDate(format(new Date(), "yyyy-MM-dd"));

            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro ao registrar gasto: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card id="quick-seller-expense-card" className="lg:col-span-1 p-5 relative overflow-hidden flex flex-col justify-between border-blue-500/15 dark:border-blue-500/30 bg-gradient-to-br from-background via-background to-blue-500/[0.03] dark:to-blue-500/[0.015] shadow-sm transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Users className="w-20 h-20 text-blue-500" />
            </div>
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                        <Users className="w-4 h-4 text-blue-500" />
                        Registrar Gasto com Vendedor
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Lançamento de comissões/despesas de vendas para cálculo de CAC.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="sellerId" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vendedor *</Label>
                            {sellers.length > 0 ? (
                                <Select value={sellerId} onValueChange={setSellerId}>
                                    <SelectTrigger id="sellerId" className="h-9 text-xs bg-background">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sellers.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input placeholder="Sem vendedores..." disabled className="h-9 text-xs bg-background" />
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sellerAmount" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$) *</Label>
                            <Input
                                id="sellerAmount"
                                type="number"
                                step="0.01"
                                required
                                placeholder="Ex: 150.00"
                                value={sellerAmount}
                                onChange={(e) => setSellerAmount(e.target.value)}
                                className="h-9 text-xs bg-background"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="sellerDate" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data *</Label>
                            <Input
                                id="sellerDate"
                                type="date"
                                required
                                value={sellerDate}
                                onChange={(e) => setSellerDate(e.target.value)}
                                className="h-9 text-xs bg-background"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="accountId" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conta Financeira *</Label>
                            {accounts.length > 0 ? (
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger id="accountId" className="h-9 text-xs bg-background">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((a) => (
                                            <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                                                {a.name} {a.is_main && "(Principal)"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input placeholder="Sem contas..." disabled className="h-9 text-xs bg-background" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="sellerDescription" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição Opcional</Label>
                        <Input
                            id="sellerDescription"
                            placeholder="Ex: Comissão, Bônus..."
                            value={sellerDescription}
                            onChange={(e) => setSellerDescription(e.target.value)}
                            className="h-9 text-xs bg-background"
                        />
                    </div>

                    <Button
                        type="submit"
                        size="sm"
                        className="w-full h-9 mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                        disabled={submitting || sellers.length === 0}
                    >
                        {submitting ? "Registrando..." : "Registrar Gasto"}
                    </Button>

                    {sellers.length === 0 && (
                        <p className="text-[10px] text-amber-500 font-medium text-center mt-1">
                            ⚠️ Cadastre vendedores na aba de Comissões para habilitar.
                        </p>
                    )}
                </form>
            </div>
        </Card>
    );
}
