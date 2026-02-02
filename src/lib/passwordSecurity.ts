import { supabase } from '@/integrations/supabase/client';

/**
 * Generates SHA-1 hash of a password using Web Crypto API
 */
async function sha1Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export interface PwnedCheckResult {
  isPwned: boolean;
  count: number;
  error?: string;
}

/**
 * Checks if a password has been exposed in known data breaches
 * using the Have I Been Pwned API with k-Anonymity model
 */
export async function checkPwnedPassword(password: string): Promise<PwnedCheckResult> {
  try {
    // Generate SHA-1 hash of the password
    const hash = await sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Call edge function with only the prefix (k-Anonymity)
    const { data, error } = await supabase.functions.invoke('check-pwned-password', {
      body: { hashPrefix: prefix }
    });

    if (error) {
      console.error('Error calling check-pwned-password:', error);
      // Don't block signup on API errors, just log and continue
      return { isPwned: false, count: 0, error: 'Não foi possível verificar a senha' };
    }

    // Check if the suffix exists in the response
    const hashes = data?.hashes as Record<string, number> | undefined;
    if (hashes && suffix in hashes) {
      return { isPwned: true, count: hashes[suffix] };
    }

    return { isPwned: false, count: 0 };
  } catch (error) {
    console.error('Error in checkPwnedPassword:', error);
    // Don't block signup on errors, just log and continue
    return { isPwned: false, count: 0, error: 'Erro ao verificar senha' };
  }
}
