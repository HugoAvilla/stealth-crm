import { useAuth } from "@/contexts/AuthContext";

type ModuleName = 'estoque' | 'master' | 'equipe' | 'perdas' | 'compras' | 'comissoes' | 'banco' | 'ia' | 'permissoes';

interface GateResult {
  hasAccess: boolean;
  redirectTo: string | null;
  message?: string;
}

export function usePlanGate(moduleName: ModuleName): GateResult {
  const { user } = useAuth();

  if (!user) {
    return { hasAccess: false, redirectTo: '/login' };
  }

  const plan = user.planCode || 'basic';
  const role = user.role;
  const canUpgrade = user.isCompanyOwner || role === 'ADMIN' || role === 'FUNCIONARIO' || role === 'PRODUCAO';

  switch (moduleName) {
    case 'estoque':
    case 'perdas':
    case 'compras':
    case 'comissoes':
    case 'banco':
    case 'permissoes':
      if (plan === 'ultra' || plan === 'premium') {
        return { hasAccess: true, redirectTo: null };
      }

      // Basic plan logic
      if (canUpgrade) {
        return {
          hasAccess: false,
          redirectTo: '/planos?mode=upgrade',
          message: `Faça o upgrade para acessar o módulo restrito.`
        };
      } else {
        return {
          hasAccess: false,
          redirectTo: '/',
          message: 'Seu plano atual não tem acesso a este módulo. Fale com o administrador da empresa.'
        };
      }

    case 'ia':
      if (plan === 'premium') {
        return { hasAccess: true, redirectTo: null };
      }

      if (canUpgrade) {
        return {
          hasAccess: false,
          redirectTo: '/planos?mode=upgrade',
          message: 'A Inteligência Artificial é exclusiva do plano Premium.'
        };
      } else {
        return {
          hasAccess: false,
          redirectTo: '/',
          message: 'O módulo de IA não está disponível.'
        };
      }

    case 'equipe':
      // Basic plan has max 2 users, Ultra has 6. 
      // The limit is checked when adding, but if we want to restrict the whole module...
      // For now, everyone can access the page, but adding is blocked if limit reached.
      return { hasAccess: true, redirectTo: null };

    case 'master':
      if (user.isMaster) {
        return { hasAccess: true, redirectTo: null };
      }
      return { hasAccess: false, redirectTo: '/' };

    default:
      return { hasAccess: true, redirectTo: null };
  }
}
