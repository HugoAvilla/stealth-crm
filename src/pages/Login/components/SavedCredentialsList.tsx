import { Loader2, X, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SavedCredential } from '../types';

interface SavedCredentialsListProps {
    credentials: SavedCredential[];
    loadingEmail: string | null;
    onSelectAccount: (credential: SavedCredential) => void;
    onRemoveAccount: (e: React.MouseEvent, email: string) => void;
    onUseOtherAccount: () => void;
}

const getInitials = (email: string) => {
    const name = email.split('@')[0];
    if (name.length <= 2) return name.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const SavedCredentialsList = ({
    credentials,
    loadingEmail,
    onSelectAccount,
    onRemoveAccount,
    onUseOtherAccount
}: SavedCredentialsListProps) => {
    return (
        <div className="space-y-3">
            {credentials.map((credential) => (
                <div
                    key={credential.email}
                    onClick={() => !loadingEmail && onSelectAccount(credential)}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-white/10 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                    style={{ opacity: loadingEmail && loadingEmail !== credential.email ? 0.5 : 1 }}
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
                    {loadingEmail === credential.email ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                    ) : (
                        <button
                            onClick={(e) => onRemoveAccount(e, credential.email)}
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
                onClick={onUseOtherAccount}
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
    );
};
