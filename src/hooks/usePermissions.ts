import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { moduleViewKey } from "@/lib/permissions";

/**
 * Enforcement das permissões de funcionário.
 *
 * - Privilegiados (master, dono da empresa, ADMIN) têm acesso total e ignoram
 *   qualquer bloqueio.
 * - Demais usuários (FUNCIONARIO) são sujeitos ao deny-list `lockedModules`.
 *
 * Uso:
 *   const { can, canAccessModule } = usePermissions();
 *   {can("vendas_delete") && <BotaoExcluir />}
 */
export function usePermissions() {
    const { user } = useAuth();

    return useMemo(() => {
        const isPrivileged =
            !!user && (user.isMaster || user.isCompanyOwner || user.role === "ADMIN");
        const locked = new Set(user?.lockedModules ?? []);

        /** Ação permitida? (chave "modulo_acao", ex.: "vendas_delete") */
        const can = (key: string): boolean => isPrivileged || !locked.has(key);

        /** Ação bloqueada? */
        const cannot = (key: string): boolean => !can(key);

        /** A aba (módulo) inteira está acessível? */
        const canAccessModule = (moduleId: string): boolean => {
            if (isPrivileged) return true;
            const viewKey = moduleViewKey(moduleId);
            if (!viewKey) return true; // módulo sem toggle de aba: sempre visível
            return !locked.has(viewKey);
        };

        return {
            isPrivileged,
            can,
            cannot,
            canAccessModule,
            lockedModules: user?.lockedModules ?? [],
        };
    }, [user]);
}
