export interface PDFRecord {
  id: string;
  filename: string;
  type: 'Recibo A4' | 'Notinha 80mm' | 'Notinha 58mm' | 'Garantia' | 'Relatório' | 'Comprovante Vaga A4' | 'Comprovante Vaga 80mm' | 'Comprovante Vaga 58mm';
  module: 'vendas' | 'garantias' | 'relatorios' | 'espaco';
  createdAt: string;
  details: string;
  dataUrl?: string;
}

const STORAGE_KEY = 'wfe_downloaded_pdfs';

export function savePDFRecord(record: Omit<PDFRecord, 'id' | 'createdAt'>): void {
  const records = getPDFRecords();
  records.unshift({
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  // Keep max 30 records (with dataUrl they can be large)
  if (records.length > 30) records.length = 30;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    // If localStorage is full, remove oldest records and retry
    records.length = 15;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Remove dataUrls to save space
      const slim = records.map(({ dataUrl, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
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
