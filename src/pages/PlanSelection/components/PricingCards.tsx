import { Button } from "@/components/ui/button";

interface PricingCardsProps {
    isAnnual: boolean;
    basicPrice: number;
    ultraPrice: number;
    ultraMonthlyEq: number;
    currentPlan: string;
    hasPendingUpgrade: boolean;
    isUpgrade: boolean;
    handleSelectPlan: (planCode: string) => void;
    formatPrice: (price: number) => string;
}

export function PricingCards({
    isAnnual,
    basicPrice,
    ultraPrice,
    ultraMonthlyEq,
    currentPlan,
    hasPendingUpgrade,
    isUpgrade,
    handleSelectPlan,
    formatPrice,
}: PricingCardsProps) {
    return (
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {/* Basic Plan */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm flex flex-col relative overflow-hidden">
                {isAnnual && (
                    <div className="absolute inset-0 z-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                            <p className="font-bold text-gray-900 dark:text-white text-lg">Apenas Mensal</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">O plano básico está disponível somente na assinatura mensal.</p>
                        </div>
                    </div>
                )}
                <div className={`flex flex-col flex-1 transition-all duration-300 ${isAnnual ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Básico</h3>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para profissionais independentes e pequenos negócios.</p>
                    <div className="mt-8 flex-1">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(basicPrice)}</span>
                        <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
                    </div>
                    <Button
                        className="mt-8 w-full"
                        variant="outline"
                        disabled={isUpgrade && currentPlan === 'basic'}
                        onClick={() => handleSelectPlan('basic')}
                    >
                        {isUpgrade && currentPlan === 'basic' ? "Seu Plano Atual" : "Começar com Básico"}
                    </Button>
                </div>
            </div>

            {/* Ultra Plan */}
            <div className="rounded-2xl border-2 border-primary bg-white dark:bg-gray-800 p-8 shadow-md relative flex flex-col">
                <div className="absolute top-0 right-6 -translate-y-1/2 transform">
                    <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold tracking-wider text-primary-foreground uppercase">
                        Recomendado
                    </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ultra</h3>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para equipes em crescimento que precisam de mais poder.</p>
                <p className="mt-8">
                    {!isAnnual && (
                        <span className="text-sm line-through text-gray-400 mr-2">De R$ 159,90</span>
                    )}
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(isAnnual ? ultraMonthlyEq : ultraPrice)}</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
                </p>
                {isAnnual && (
                    <p className="mt-1 text-sm text-gray-500">Cobrado {formatPrice(ultraPrice)} anualmente</p>
                )}
                <Button
                    className="mt-8 w-full"
                    disabled={hasPendingUpgrade || (isUpgrade && currentPlan === 'ultra')}
                    onClick={() => handleSelectPlan('ultra')}
                >
                    {hasPendingUpgrade
                        ? "Upgrade em análise"
                        : isUpgrade && currentPlan === 'ultra'
                            ? "Seu Plano Atual"
                            : isUpgrade
                                ? "Fazer Upgrade para Ultra"
                                : "Assinar Ultra"}
                </Button>
                {hasPendingUpgrade && (
                    <p className="mt-2 text-xs text-yellow-600 text-center font-medium">
                        Seu upgrade já foi solicitado e está aguardando aprovação.
                    </p>
                )}
            </div>

            {/* Premium Plan */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 flex flex-col opacity-60">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Premium</h3>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para operações avançadas e grandes volumes.</p>
                <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">R$ 359,90</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês + Tokens</span>
                </p>
                <Button
                    className="mt-8 w-full cursor-not-allowed"
                    variant="secondary"
                    disabled
                >
                    Em breve
                </Button>
            </div>
        </div>
    );
}
