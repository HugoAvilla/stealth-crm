import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane } from 'lucide-react';
import jetFighter from '@/assets/jet-fighter.jpg';
import { SignUpForm } from './components/SignUpForm';

export default function SignUp() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
                <Plane className="w-9 h-9 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
          </CardContent>
        </Card>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src={jetFighter}
          alt="WFE Evolution"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            WFE Evolution CRM
          </h2>
          <p className="text-xl text-white/80">
            Sistema completo para gestão de vendas, clientes e produção.
          </p>
        </div>
      </div>
    </div>
  );
}
