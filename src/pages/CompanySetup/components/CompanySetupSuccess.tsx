import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { CompanyCodeDisplay } from '@/components/team/CompanyCodeDisplay';
import { useAuth } from '@/contexts/AuthContext';

interface CompanySetupSuccessProps {
    companyCode: string;
}

export function CompanySetupSuccess({ companyCode }: CompanySetupSuccessProps) {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();

    const handleGoToDashboard = async () => {
        await refreshUser();
        navigate('/');
    };

    return (
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">Empresa Cadastrada!</CardTitle>
                    <CardDescription>
                        Você é o administrador desta empresa
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <CompanyCodeDisplay
                        code={companyCode}
                        showCard={false}
                    />

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            <strong>⚠️ Importante!</strong> Compartilhe este código com membros da sua equipe para que eles possam solicitar acesso. Você precisará aprovar cada solicitação.
                        </p>
                    </div>

                    <Button onClick={handleGoToDashboard} className="w-full" size="lg">
                        Ir para o Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
