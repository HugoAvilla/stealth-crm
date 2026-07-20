import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import PhoneInputWithDDI from '@/components/ui/PhoneInputWithDDI';
import { supabase } from '@/integrations/supabase/client';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export function SignUpForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingPassword, setIsCheckingPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const { signUp } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: 'Erro',
                description: 'As senhas não coincidem',
                variant: 'destructive',
            });
            return;
        }

        if (!acceptedTerms) {
            toast({
                title: 'Termos obrigatórios',
                description: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        setIsCheckingPassword(true);

        const { error, isPwnedPassword } = await signUp(email, password, name, phone, captchaToken);

        setIsCheckingPassword(false);

        if (error) {
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
            toast({
                title: isPwnedPassword ? 'Senha comprometida' : 'Erro ao criar conta',
                description: error.message,
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        // Save terms acceptance
        try {
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
                await supabase.from('terms_acceptances' as any).insert({
                    user_id: newUser.id,
                    user_email: email,
                    user_name: name,
                    terms_version: '1.0',
                });
            }
        } catch (err) {
            console.error('Error saving terms acceptance:', err);
        }

        toast({
            title: 'Conta criada!',
            description: 'Escolha o plano ideal para você.',
        });

        navigate('/planos');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <PhoneInputWithDDI
                    value={phone}
                    onChange={setPhone}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Sua senha será verificada contra vazamentos conhecidos
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>

            {/* Terms Acceptance Checkbox */}
            <div className="flex items-start space-x-2 py-2">
                <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                />
                <label
                    htmlFor="terms"
                    className="text-sm leading-snug text-muted-foreground cursor-pointer"
                >
                    Li e aceito os{' '}
                    <span className="text-primary underline font-medium">Termos de Uso</span>,{' '}
                    <span className="text-primary underline font-medium">Política de Privacidade</span>{' '}
                    e{' '}
                    <span className="text-primary underline font-medium">Política de Segurança de Dados</span>{' '}
                    da plataforma.
                </label>
            </div>

            {/* hCaptcha Component */}
            <div className="flex justify-center py-2">
                <HCaptcha
                    ref={captchaRef}
                    sitekey="34724568-8f44-4a36-adba-60c843d04452"
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !acceptedTerms || !captchaToken}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isCheckingPassword ? 'Verificando senha...' : 'Criando conta...'}
                    </>
                ) : (
                    'Criar conta'
                )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                    Fazer login
                </Link>
            </p>
        </form>
    );
}
