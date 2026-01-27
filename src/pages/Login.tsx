import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jetFighterImage from '@/assets/jet-fighter.jpg';
import wfeLogo from '@/assets/wfe-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email e senha para continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      navigate('/');
    } else {
      toast({
        title: "Credenciais inválidas",
        description: "Email ou senha incorretos.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-background relative">
        {/* Logo */}
        <div className="absolute top-8 left-8 md:left-16 lg:left-24">
          <div className="flex items-center gap-3">
            <img 
              src={wfeLogo} 
              alt="WFE Evolution" 
              className="h-12 w-auto object-contain"
            />
            <span className="text-xl font-semibold tracking-tight">WFE EVOLUTION</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-md w-full mx-auto animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-light mb-3">
            Bem-vindo.
          </h1>
          <p className="text-muted-foreground text-lg mb-12">
            Acesse sua conta exclusiva.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@wfe.com.br"
                className="input-underline w-full text-lg"
                disabled={isLoading}
              />
              <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                Email
              </label>
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-underline w-full text-lg pr-12"
                disabled={isLoading}
              />
              <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                Senha
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 text-base font-medium uppercase tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-8">
            <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Esqueceu a senha?
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-12 p-4 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Credenciais de demonstração
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-mono">admin@wfe.com.br / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendedor:</span>
                <span className="font-mono">vendedor1@wfe.com.br / vend123</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
        
        {/* Image */}
        <img
          src={jetFighterImage}
          alt="Fighter jet breaking sound barrier"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Subtle animated glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-pulse" />
      </div>
    </div>
  );
};

export default Login;
