import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function RestrictedAccess() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 flex flex-col items-center justify-center">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    O recurso que você tentou acessar não está disponível no plano atual da empresa.
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-8">
                    Fale com o administrador ou dono da empresa para solicitar um upgrade de plano.
                </p>
                <Button onClick={() => navigate('/')} className="w-full">
                    Voltar ao Início
                </Button>
            </div>
        </div>
    );
}
