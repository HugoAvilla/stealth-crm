import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, LogOut } from 'lucide-react';
import { CompanySetupForm } from './components/CompanySetupForm';
import { CompanySetupSuccess } from './components/CompanySetupSuccess';

export default function CompanySetup() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [companyCode, setCompanyCode] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if user already has company
    if (user?.companyId) {
      navigate('/');
    }
    // Redirect if subscription not active
    if (user?.subscriptionStatus !== 'active') {
      if (user?.subscriptionStatus === 'pending_payment') {
        if (!user?.planCode) {
          navigate('/planos');
        } else {
          navigate('/assinatura');
        }
      } else if (user?.subscriptionStatus === 'payment_submitted') {
        navigate('/aguardando-liberacao');
      }
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (companyCode) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
        <div className="absolute top-4 right-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Button>
        </div>
        <CompanySetupSuccess companyCode={companyCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Voltar para o Login
        </Button>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Cadastre sua empresa</CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para começar a usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanySetupForm onSuccess={setCompanyCode} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}