const IS_DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    const sanitizedArgs = args.map(arg => {
      if (arg && typeof arg === 'object') {
        const copy = { ...arg };
        if ('hint' in copy) delete copy.hint;
        if ('details' in copy) delete copy.details;
        if ('code' in copy) delete copy.code;
        return copy;
      }
      return arg;
    });
    console.error(...sanitizedArgs);
  }
};

export function getFriendlyErrorMessage(error: any, fallback: string = 'Ocorreu um erro. Tente novamente.'): string {
  if (!error) return fallback;
  const msg = typeof error === 'string' ? error : error.message || '';
  
  // Clean database-specific error details
  if (
    msg.includes('violates foreign key') || 
    msg.includes('violates unique constraint') || 
    msg.includes('database') || 
    msg.includes('SQL') || 
    msg.includes('row-level security') || 
    msg.includes('RLS') ||
    msg.includes('fkey') ||
    msg.includes('pkey') ||
    msg.includes('constraint') ||
    msg.includes('new row violates row-level security policy')
  ) {
    return 'Erro de permissão ou consistência de dados. Entre em contato com o suporte.';
  }
  
  if (msg.length > 0 && msg.length < 120) {
    return msg;
  }
  return fallback;
}
