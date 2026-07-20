import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface UpgradeCardsProps {
    ultraMonthly: number;
    pendingUpgrade: boolean;
    onSelectUpgrade: (planCode: string) => void;
    formatPrice: (price: number) => string;
}

export function UpgradeCards({
    ultraMonthly,
    pendingUpgrade,
    onSelectUpgrade,
    formatPrice
}: UpgradeCardsProps) {
    return (
        <>
            {pendingUpgrade && (
                <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Upgrade em processamento</h3>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                            Identificamos que você já possui uma solicitação de upgrade em andamento.
                            Aguarde a compensação do pagamento e a liberação pelo administrador do sistema.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 justify-center max-w-4xl mx-auto">
                {/* Ultra Plan */}
                <div className="rounded-2xl border-2 border-primary bg-white dark:bg-gray-800 p-8 shadow-md relative flex flex-col">
                    <div className="absolute top-0 right-6 -translate-y-1/2 transform">
                        <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold tracking-wider text-primary-foreground uppercase">
                            Recomendado
                        </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ultra</h3>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Tenha acesso completo ao Controle de Estoque, suporte prioritário e até 3 usuários base.
                    </p>
                    <p className="mt-8">
                        <span className="text-sm line-through text-gray-400 mr-2">De R$ 159,90</span>
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(ultraMonthly)}</span>
                        <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
                    </p>

                    <ul className="mt-8 space-y-4 flex-1">
                        <li className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-300">Controle de Estoque Completo</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-300">3 Usuários Inclusos (Adicionais R$49,90)</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-300">Suporte Prioritário</span>
                        </li>
                    </ul>

                    <Button
                        className="mt-8 w-full"
                        onClick={() => onSelectUpgrade('ultra')}
                        disabled={pendingUpgrade}
                    >
                        Fazer Upgrade para Ultra
                    </Button>
                </div>

                {/* Premium Plan */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 flex flex-col opacity-60">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Premium</h3>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Para operações avançadas, grandes equipes e necessidades de integração via API.
                    </p>
                    <p className="mt-8">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">R$ 359,90</span>
                        <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês + Tokens</span>
                    </p>

                    <ul className="mt-8 space-y-4 flex-1">
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">Até 10 Usuários Inclusos</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">Acesso ao Painel Master</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">API de Integração</span>
                        </li>
                    </ul>

                    <Button
                        className="mt-8 w-full cursor-not-allowed"
                        variant="secondary"
                        disabled
                    >
                        Em breve
                    </Button>
                </div>
            </div>
        </>
    );
}
