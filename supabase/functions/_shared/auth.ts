/**
 * Shared tenant resolution for authenticated edge functions.
 * Reads the caller's JWT, resolves their company_id, and returns a
 * service-role client for writes that must bypass RLS.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Tenant {
  userId: string;
  companyId: number;
  /** service-role client (bypasses RLS) */
  service: SupabaseClient;
}

export async function resolveTenant(req: Request): Promise<Tenant> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader) throw new HttpError(401, "Missing Authorization header");

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) throw new HttpError(401, "Unauthorized");

  const service = createClient(url, serviceKey);
  const { data: profile } = await service
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.company_id) throw new HttpError(400, "User has no company linked");

  return { userId: user.id, companyId: profile.company_id, service };
}

/** Deterministic session name per company (used as webhook identifier). */
export function sessionNameFor(companyId: number): string {
  return `company_${companyId}`;
}
