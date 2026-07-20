import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import wfeLogo from '@/assets/wfe-logo.png';
import { ResetPasswordForm } from './components/ResetPasswordForm';

export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/login">
              <img src={wfeLogo} alt="WFE Evolution" className="h-12 w-auto object-contain cursor-pointer" />
            </Link>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Redefinir Senha
            </CardTitle>
            <CardDescription>
              Crie uma nova senha segura para sua conta.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}