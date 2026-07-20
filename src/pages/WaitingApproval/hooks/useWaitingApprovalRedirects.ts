import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function useWaitingApprovalRedirects(user: any, refreshUser: () => Promise<void>) {
    const navigate = useNavigate();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user?.subscriptionStatus === 'active') {
            if (user.companyId) {
                navigate('/');
            } else {
                navigate('/empresa/cadastro');
            }
            return;
        }

        if (user?.subscriptionStatus === 'pending_payment') {
            if (!user?.planCode) {
                navigate('/planos');
            } else {
                navigate('/assinatura');
            }
            return;
        }

        if (user?.subscriptionStatus === 'blocked') {
            navigate('/login');
            return;
        }

        intervalRef.current = setInterval(async () => {
            await refreshUser();
        }, 30000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user, refreshUser, navigate]);

    useEffect(() => {
        if (user?.subscriptionStatus === 'active') {
            if (user.companyId) {
                navigate('/');
            } else {
                navigate('/empresa/cadastro');
            }
        }
    }, [user?.subscriptionStatus, user?.companyId, navigate]);
}
