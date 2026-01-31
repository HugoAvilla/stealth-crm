import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/lib/database.types';

export type SubscriptionStatus = 'pending_payment' | 'payment_submitted' | 'active' | 'expired' | 'blocked';

interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  role: AppRole;
  subscriptionStatus: SubscriptionStatus;
  companyId: number | null;
  isMaster: boolean;
  hasPendingJoinRequest: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string): Promise<AuthUser | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('status, company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Error fetching subscription:', subscriptionError);
      }

      // Check for pending join request (only if user has no company)
      let hasPendingJoinRequest = false;
      if (!profile?.company_id) {
        const { data: pendingRequest } = await supabase
          .from('company_join_requests')
          .select('id')
          .eq('requester_user_id', userId)
          .eq('status', 'pending')
          .maybeSingle();
        
        hasPendingJoinRequest = !!pendingRequest;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Check if user is master account
      const isMaster = authUser?.email === 'hg.lavila@gmail.com';

      return {
        id: userId,
        email: authUser?.email || profile?.email || '',
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) || 'NENHUM',
        subscriptionStatus: isMaster ? 'active' : ((subscriptionData?.status as SubscriptionStatus) || 'pending_payment'),
        companyId: profile?.company_id || subscriptionData?.company_id || null,
        isMaster,
        hasPendingJoinRequest
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(async () => {
            const userData = await fetchUserData(currentSession.user.id);
            setUser(userData);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        fetchUserData(existingSession.user.id).then((userData) => {
          setUser(userData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string): Promise<{ error: Error | null }> => {
    try {
      // Validate name before sending to server
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        return { error: new Error('Nome deve ter pelo menos 2 caracteres') };
      }
      if (trimmedName.length > 100) {
        return { error: new Error('Nome deve ter no máximo 100 caracteres') };
      }
      if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
        return { error: new Error('Nome contém caracteres inválidos') };
      }

      // Validate email
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || trimmedEmail.length > 255) {
        return { error: new Error('Email inválido') };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return { error: new Error('Email inválido') };
      }

      // Validate password
      if (!password || password.length < 6) {
        return { error: new Error('Senha deve ter pelo menos 6 caracteres') };
      }

      // Validate phone if provided
      const trimmedPhone = phone?.trim() || null;
      if (trimmedPhone && !/^[\d\s()+\-]+$/.test(trimmedPhone)) {
        return { error: new Error('Telefone inválido') };
      }

      const redirectUrl = `${window.location.origin}/assinatura`;
      
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: trimmedName,
            phone: trimmedPhone
          }
        }
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userData = await fetchUserData(session.user.id);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
