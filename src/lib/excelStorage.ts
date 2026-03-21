import { supabase } from '@/integrations/supabase/client';

export interface ExcelRecord {
  id: string;
  filename: string;
  type: string;
  module: 'relatorios';
  createdAt: string;
  details: string;
  storagePath?: string;
}

const STORAGE_KEY = 'wfe_downloaded_excels';

export async function uploadExcelToStorage(blob: Blob, storagePath: string): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from('pdfs') // Reuse pdfs bucket for storage since it's already configured
      .upload(storagePath, blob, {
        contentType: 'application/vnd.ms-excel',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading Excel to storage:', error);
      return null;
    }

    return storagePath;
  } catch (e) {
    console.error('Error uploading Excel:', e);
    return null;
  }
}

export async function getExcelDownloadUrl(storagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(storagePath, 60 * 5); // 5 minutes

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error('Error getting Excel url:', e);
    return null;
  }
}

export function saveExcelRecord(record: Omit<ExcelRecord, 'id' | 'createdAt'>): void {
  const records = getExcelRecords();
  records.unshift({
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  
  if (records.length > 50) records.length = 50;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    records.length = 25;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      console.error('Failed to save Excel record to localStorage');
    }
  }
}

export function getExcelRecords(module?: ExcelRecord['module']): ExcelRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records: ExcelRecord[] = raw ? JSON.parse(raw) : [];
    return module ? records.filter(r => r.module === module) : records;
  } catch {
    return [];
  }
}

export function deleteExcelRecord(id: string): void {
  const records = getExcelRecords().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearExcelRecords(module?: ExcelRecord['module']): void {
  if (module) {
    const records = getExcelRecords().filter(r => r.module !== module);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
