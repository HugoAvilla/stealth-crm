// @ts-nocheck
import { useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WhatsAppSession {
  id: string;
  company_id: number;
  session_name: string;
  status: string;
  provider: string;
  instance_id: string | null;
  phone_number: string | null;
  qr_code: string | null;
  connected_at: string | null;
}

export function isConnected(status?: string): boolean {
  return !!status && /connect|open|online/i.test(status);
}

/** Reads the tenant's WhatsApp session and exposes connect/status actions. */
export function useWhatsAppSession() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const qc = useQueryClient();
  const channelId = useId();

  const query = useQuery({
    queryKey: ["whatsapp-session", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppSession | null;
    },
    enabled: !!companyId,
  });

  // Live status/QR updates (webhook updates whatsapp_sessions).
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`whatsapp_session_${companyId}_${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessions", filter: `company_id=eq.${companyId}` },
        () => qc.invalidateQueries({ queryKey: ["whatsapp-session", companyId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  const connect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-connect", { body: { action: "connect" } });
      if (error) throw error;
      return data as { status: string; qrcode: string | null; pairCode: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-session", companyId] }),
  });

  const checkStatus = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-connect", { body: { action: "status" } });
      if (error) throw error;
      return data as { status: string; connected: boolean; phoneNumber?: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-session", companyId] }),
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    connected: isConnected(query.data?.status),
    connect,
    checkStatus,
  };
}
