import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast({
                title: "Email obrigatório",
                description: "Por favor, insira seu email para continuar.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const redirectUrl = `${window.location.origin}/redefinir-senha`;
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
                captchaToken: captchaToken || undefined
            });

            if (error) {
                throw error;
            }

            setEmailSent(true);
            toast({
                title: "Email enviado!",
                description: "Verifique sua caixa de entrada para redefinir sua senha."
            });
        } catch (error: any) {
            console.error('Error sending reset email:', error);
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
            toast({
                title: "Erro ao enviar email",
                description: error.message || "Tente novamente mais tarde.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-success/20">
                        <CheckCircle className="h-12 w-12 text-success" />
                    </div>
                </div>
                <div className="space-y-2 text-center text-sm text-muted-foreground">
                    <p>Um email foi enviado para:</p>
                    <p className="font-medium text-foreground">{email}</p>
                    <p className="pt-4">
                        Não recebeu o email? Verifique sua pasta de spam ou{' '}
                        <button onClick={() => setEmailSent(false)} className="text-primary hover:underline">
                            tente novamente
                        </button>
                    </p>
                </div>
                <Link to="/login">
                    <Button variant="outline" className="w-full gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para o login
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* hCaptcha Component */}
            <div className="flex justify-center py-2">
                <HCaptcha
                    ref={captchaRef}
                    sitekey="34724568-8f44-4a36-adba-60c843d04452"
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    theme="dark"
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !captchaToken}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                    </>
                ) : (
                    'Enviar link de recuperação'
                )}
            </Button>

            <Link to="/login" className="block">
                <Button variant="ghost" className="w-full gap-2" type="button">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                </Button>
            </Link>
        </form>
    );
}
