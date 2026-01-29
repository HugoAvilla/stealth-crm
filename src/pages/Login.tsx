import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jetFighterImage from '@/assets/jet-fighter.jpg';
import wfeLogo from '@/assets/wfe-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
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
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      let errorMessage = "Email ou senha incorretos.";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Email ou senha incorretos.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Por favor, confirme seu email antes de fazer login.";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar sua conta.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e a confirmação devem ser iguais.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    setIsLoading(false);

    if (error) {
      let errorMessage = "Erro ao criar conta.";
      
      if (error.message.includes('User already registered')) {
        errorMessage = "Este email já está cadastrado.";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Conta criada!",
        description: "Sua conta foi criada e está aguardando aprovação do administrador.",
      });
      // Stay on page, user will see pending approval modal after login
      setActiveTab('login');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
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
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetForm(); }}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-light mb-3">
                  Bem-vindo.
                </h1>
                <p className="text-muted-foreground text-lg">
                  Acesse sua conta exclusiva.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
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
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-light mb-3">
                  Criar conta.
                </h1>
                <p className="text-muted-foreground text-lg">
                  Solicite acesso ao sistema.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-6">
                {/* Name Field */}
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="input-underline w-full text-lg"
                    disabled={isLoading}
                  />
                  <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                    Nome
                  </label>
                </div>

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
                    placeholder="Mínimo 6 caracteres"
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

                {/* Confirm Password Field */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua senha"
                    className="input-underline w-full text-lg"
                    disabled={isLoading}
                  />
                  <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                    Confirmar Senha
                  </label>
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
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground text-center">
                Após criar sua conta, um administrador precisará aprovar seu acesso.
              </p>
            </TabsContent>
          </Tabs>
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
