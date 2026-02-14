import { supabase } from '@/integrations/supabase/client';

export interface PDFRecord {
  id: string;
  filename: string;
  type: 'Recibo A4' | 'Notinha 80mm' | 'Notinha 58mm' | 'Garantia' | 'Relatório' | 'Comprovante Vaga A4' | 'Comprovante Vaga 80mm' | 'Comprovante Vaga 58mm';
  module: 'vendas' | 'garantias' | 'relatorios' | 'espaco';
  createdAt: string;
  details: string;
  storagePath?: string;
}

const STORAGE_KEY = 'wfe_downloaded_pdfs';

const SUPABASE_PROJECT_URL = "https://msdpmhtdjyoqdmjwunkm.supabase.co";

export async function uploadPDFToStorage(blob: Blob, storagePath: string): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading PDF to storage:', error);
      return null;
    }

    return storagePath;
  } catch (e) {
    console.error('Error uploading PDF:', e);
    return null;
  }
}

/**
 * Returns the Edge Function proxy URL for a PDF.
 * This URL is NOT blocked by ad blockers (unlike signed URLs).
 * The Edge Function fetches the PDF server-side and returns it with proper headers.
 */
export function getPDFProxyUrl(storagePath: string): string {
  const encodedPath = encodeURIComponent(storagePath);
  return `${SUPABASE_PROJECT_URL}/functions/v1/serve-pdf?path=${encodedPath}`;
}

export function savePDFRecord(record: Omit<PDFRecord, 'id' | 'createdAt'>): void {
  const records = getPDFRecords();
  records.unshift({
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  // Keep max 50 records (no base64 data, just metadata)
  if (records.length > 50) records.length = 50;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    records.length = 25;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Last resort
      console.error('Failed to save PDF record to localStorage');
    }
  }
}

export function getPDFRecords(module?: PDFRecord['module']): PDFRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records: PDFRecord[] = raw ? JSON.parse(raw) : [];
    return module ? records.filter(r => r.module === module) : records;
  } catch {
    return [];
  }
}

export function deletePDFRecord(id: string): void {
  const records = getPDFRecords().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearPDFRecords(module?: PDFRecord['module']): void {
  if (module) {
    const records = getPDFRecords().filter(r => r.module !== module);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
