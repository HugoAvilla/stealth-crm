import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, X, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jetFighterImage from '@/assets/jet-fighter.jpg';
import wfeLogo from '@/assets/wfe-logo.png';

interface SavedCredential {
  email: string;
  savedAt: string;
}

const STORAGE_KEY = 'wfe_saved_credentials';

const getSavedCredentials = (): SavedCredential[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const creds = JSON.parse(raw);
    return creds.map((c: any) => {
      // remove password if it exists from older versions
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = c;
      return rest;
    });
  } catch {
    return [];
  }
};

const saveCredential = (email: string) => {
  const existing = getSavedCredentials().filter(c => c.email !== email);
  existing.unshift({ email, savedAt: new Date().toISOString() });
  // Máximo de 5 contas salvas
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 5)));
};

const removeCredential = (email: string) => {
  const existing = getSavedCredentials().filter(c => c.email !== email);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

const getInitials = (email: string) => {
  const name = email.split('@')[0];
  if (name.length <= 2) return name.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [showSavedAccounts, setShowSavedAccounts] = useState(true);
  const [loadingCredentialEmail, setLoadingCredentialEmail] = useState<string | null>(null);
  const {
    signIn
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  useEffect(() => {
    const creds = getSavedCredentials();
    setSavedCredentials(creds);
    setShowSavedAccounts(creds.length > 0);
  }, []);

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
    const {
      error
    } = await signIn(email, password);
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
      // Salvar credenciais no localStorage
      saveCredential(email);
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso."
      });
      navigate('/');
    }
  };

  const handleSavedLogin = (credential: SavedCredential) => {
    setEmail(credential.email);
    setPassword('');
    setShowSavedAccounts(false);
  };

  const handleRemoveCredential = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    removeCredential(email);
    const updated = getSavedCredentials();
    setSavedCredentials(updated);
    if (updated.length === 0) {
      setShowSavedAccounts(false);
    }
  };

  const handleUseOtherAccount = () => {
    setShowSavedAccounts(false);
    setEmail('');
    setPassword('');
  };

  return <div className="min-h-screen flex">
    {/* Left Panel - Login Form */}
    <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-background relative">
      {/* Logo */}
      <div className="absolute top-8 left-8 md:left-16 lg:left-24">
        <div className="flex items-center gap-3">
          <Link to="/login">
            <img src={wfeLogo} alt="WFE Evolution" className="h-12 w-auto object-contain cursor-pointer" />
          </Link>
          <span className="text-xl font-semibold tracking-tight">
          </span>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-md w-full mx-auto animate-fade-in">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-light mb-3">
              {showSavedAccounts && savedCredentials.length > 0 ? 'Escolha uma conta.' : 'Bem-vindo.'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {showSavedAccounts && savedCredentials.length > 0
                ? 'Selecione uma conta salva para entrar.'
                : 'Acesse sua conta exclusiva.'}
            </p>
          </div>

          {showSavedAccounts && savedCredentials.length > 0 ? (
            /* ─── Saved Accounts Cards ─── */
            <div className="space-y-3">
              {savedCredentials.map((credential) => (
                <div
                  key={credential.email}
                  onClick={() => !loadingCredentialEmail && handleSavedLogin(credential)}
                  className="group relative flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-white/10 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  style={{ opacity: loadingCredentialEmail && loadingCredentialEmail !== credential.email ? 0.5 : 1 }}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-sm font-semibold text-black select-none">
                    {getInitials(credential.email)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {credential.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conta lembrada • Clique para inserir a senha
                    </p>
                  </div>

                  {/* Loading or Remove */}
                  {loadingCredentialEmail === credential.email ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <button
                      onClick={(e) => handleRemoveCredential(e, credential.email)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-all duration-200"
                      title="Remover conta salva"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              {/* Usar outra conta */}
              <div
                onClick={handleUseOtherAccount}
                className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/5 hover:border-white/20"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <UserCircle2 size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Usar outra conta
                </p>
              </div>

              <div className="text-center pt-2">
                <p className="text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link to="/cadastro" className="text-primary hover:underline font-medium">
                    Criar conta
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* ─── Normal Login Form ─── */
            <>
              <form onSubmit={handleLogin} className="space-y-8">
                {/* Email Field */}
                <div className="relative">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="wfe@gmail.com" className="input-underline w-full text-lg" disabled={isLoading} />
                  <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                    Email
                  </label>
                </div>

                {/* Password Field */}
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-underline w-full text-lg pr-12" disabled={isLoading} />
                  <label className="absolute -top-2 left-0 text-xs text-muted-foreground uppercase tracking-wider">
                    Senha
                  </label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 bottom-3 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full h-14 text-base font-medium uppercase tracking-wider" disabled={isLoading}>
                  {isLoading ? <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Entrando...
                  </> : 'Entrar'}
                </Button>
              </form>

              <div className="text-center space-y-2">
                {savedCredentials.length > 0 && (
                  <button
                    onClick={() => setShowSavedAccounts(true)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    ← Voltar para contas salvas
                  </button>
                )}
                <Link to="/esqueci-senha" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Esqueci minha senha
                </Link>
                <p className="text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link to="/cadastro" className="text-primary hover:underline font-medium">
                    Criar conta
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Right Panel - Image */}
    <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />

      {/* Image */}
      <img src={jetFighterImage} alt="Fighter jet breaking sound barrier" className="absolute inset-0 w-full h-full object-cover object-center" />

      {/* Subtle animated glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-pulse" />
    </div>
  </div>;
};
export default Login;