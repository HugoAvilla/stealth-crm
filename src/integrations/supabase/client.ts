import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast as sonnerToast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const rawSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

let isReadOnlyMode = false;

// Global monkey patch for Sonner Toast to intercept and override error messages in read-only mode
try {
  const rawToast = sonnerToast as any;
  if (rawToast && typeof rawToast === 'function') {
    const originalError = rawToast.error;
    if (typeof originalError === 'function') {
      rawToast.error = function (message: any, options?: any) {
        if (isReadOnlyMode) {
          return originalError.call(
            rawToast,
            "Modo de leitura ativo: Regularize sua assinatura pelo WhatsApp no topo da tela para realizar alterações.",
            options
          );
        }
        return originalError.call(rawToast, message, options);
      };
    }
  }
} catch (e) {
  console.error("Erro ao aplicar patch no sonner toast:", e);
}

export const setSupabaseReadOnly = (readOnly: boolean) => {
  isReadOnlyMode = readOnly;
};

export const getSupabaseReadOnly = () => {
  return isReadOnlyMode;
};

// Create a Proxy handler to block write operations when in read-only mode
const createWriteBlocker = () => {
  return () => {
    const errorResult = {
      data: null,
      error: {
        message: "Assinatura pendente: Regularize o pagamento pelo WhatsApp no topo da página para liberar a alteração de dados.",
        details: "Assinatura pendente de pagamento",
        hint: "read-only-mode",
        code: "READ_ONLY_BLOCK"
      }
    };

    const blockerPromise = Promise.resolve(errorResult);

    const builderProxy = new Proxy(blockerPromise, {
      get(target, prop, receiver) {
        if (['then', 'catch', 'finally'].includes(prop as string)) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
        return builderProxy;
      }
    });

    return builderProxy;
  };
};

const queryBuilderHandler: ProxyHandler<any> = {
  get(target, prop, receiver) {
    if (isReadOnlyMode && ['insert', 'update', 'delete', 'upsert'].includes(prop as string)) {
      return createWriteBlocker();
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
};

export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    // Intercept client.from(...)
    if (prop === 'from') {
      return (relation: string) => {
        const queryBuilder = target.from(relation);
        return new Proxy(queryBuilder, queryBuilderHandler);
      };
    }
    // Intercept client.rpc(...)
    if (prop === 'rpc') {
      return (fn: string, args?: any, options?: any) => {
        const allowedRpcs = ['check_is_master'];
        if (isReadOnlyMode && !allowedRpcs.includes(fn)) {
          return createWriteBlocker()();
        }
        return target.rpc(fn, args, options);
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
}) as typeof rawSupabase;