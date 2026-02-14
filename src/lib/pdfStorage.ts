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

export async function getPDFSignedUrl(storagePath: string, expiresIn = 600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error('Error getting signed URL:', e);
    return null;
  }
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
