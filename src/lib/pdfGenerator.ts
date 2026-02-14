import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePDFRecord } from './pdfStorage';

export interface SalePDFData {
  id: number;
  date: string;
  client_name: string;
  client_phone: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_year?: number;
  services: Array<{ name: string; description?: string; price: number }>;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  company_name?: string;
}

export interface WarrantyPDFData {
  certificate_number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_year?: number;
  service_name: string;
  issue_date: string;
  expiry_date: string;
  warranty_text?: string;
  company_name?: string;
}

export interface ReportPDFData {
  title: string;
  period?: { start: string; end: string };
  columns: string[];
  rows: string[][];
  summary?: { label: string; value: string }[];
}

export function generateSalePDFA4(sale: SalePDFData, options: Record<string, boolean> = {}): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  if (options.companyName !== false) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(sale.company_name || 'WFE EVOLUTION', pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  if (options.receiptText !== false) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprovante de Serviço', pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  if (options.saleNumber !== false) {
    doc.setFontSize(10);
    doc.text(`Venda Nº ${sale.id} - ${formatDate(sale.date)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Client Info
  if (options.clientName !== false || options.clientWhatsApp !== false) {
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y - 2, pageWidth - 30, 18, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Cliente', 20, y + 4);
    y += 10;
    doc.setFont('helvetica', 'normal');
    if (options.clientName !== false) {
      doc.text(`Nome: ${sale.client_name}`, 20, y);
      y += 5;
    }
    if (options.clientWhatsApp !== false) {
      doc.text(`WhatsApp: ${sale.client_phone}`, 20, y);
      y += 8;
    }
  }

  // Vehicle
  if (options.vehicle !== false) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Veículo: ${sale.vehicle_brand} ${sale.vehicle_model} (${sale.vehicle_plate})`, 20, y);
    y += 10;
  }

  // Services Table
  if (options.serviceName !== false) {
    const tableData = sale.services.map(s => [
      s.name,
      options.serviceDescription !== false && s.description ? s.description : '',
      options.servicePrice !== false ? `R$ ${s.price.toFixed(2)}` : ''
    ].filter((_, i) => i === 0 || (i === 1 && options.serviceDescription !== false) || (i === 2 && options.servicePrice !== false)));

    const columns = ['Serviço'];
    if (options.serviceDescription !== false) columns.push('Descrição');
    if (options.servicePrice !== false) columns.push('Valor');

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50] },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Totals
  if (options.subtotal !== false) {
    doc.text(`Subtotal: R$ ${sale.subtotal.toFixed(2)}`, pageWidth - 60, y);
    y += 6;
  }
  if (options.discount !== false && sale.discount > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text(`Desconto: - R$ ${sale.discount.toFixed(2)}`, pageWidth - 60, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }
  if (options.total !== false) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`TOTAL: R$ ${sale.total.toFixed(2)}`, pageWidth - 60, y);
    y += 8;
  }
  if (options.paymentMethod !== false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Forma de Pagamento: ${sale.payment_method}`, pageWidth - 60, y);
  }

  const dataUrl = doc.output('datauristring');
  doc.save(`venda-${sale.id}-A4.pdf`);
  savePDFRecord({
    filename: `venda-${sale.id}-A4.pdf`,
    type: 'Recibo A4',
    module: 'vendas',
    details: `Venda #${sale.id} - ${sale.client_name}`,
    dataUrl,
  });
}

export function generateSalePDFReceipt(sale: SalePDFData, size: '80mm' | '58mm', options: Record<string, boolean> = {}): void {
  const width = size === '80mm' ? 80 : 58;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, 200],
  });

  let y = 8;
  const margin = 3;
  const contentWidth = width - margin * 2;

  doc.setFontSize(size === '80mm' ? 12 : 10);

  // Header
  if (options.companyName !== false) {
    doc.setFont('helvetica', 'bold');
    doc.text(sale.company_name || 'WFE EVOLUTION', width / 2, y, { align: 'center' });
    y += 6;
  }

  // Date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(sale.date), width / 2, y, { align: 'center' });
  y += 4;

  if (options.saleNumber !== false) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Venda Nº ${sale.id}`, width / 2, y, { align: 'center' });
    y += 6;
  }

  // Dashed line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, width - margin, y);
  y += 4;

  // Client
  if (options.clientName !== false || options.clientWhatsApp !== false) {
    doc.setFontSize(7);
    doc.text('CLIENTE', margin, y);
    y += 3;
    doc.setFontSize(8);
    if (options.clientName !== false) {
      doc.text(sale.client_name, margin, y);
      y += 3;
    }
    if (options.clientWhatsApp !== false) {
      doc.text(`Tel: ${sale.client_phone}`, margin, y);
      y += 4;
    }
  }

  // Vehicle
  if (options.vehicle !== false) {
    doc.setFontSize(7);
    doc.text('VEÍCULO', margin, y);
    y += 3;
    doc.setFontSize(8);
    doc.text(`${sale.vehicle_brand} ${sale.vehicle_model}`, margin, y);
    y += 3;
    doc.text(`Placa: ${sale.vehicle_plate}`, margin, y);
    y += 4;
  }

  // Services
  if (options.serviceName !== false) {
    doc.setFontSize(7);
    doc.text('SERVIÇOS', margin, y);
    y += 3;
    doc.setFontSize(8);
    sale.services.forEach((s, i) => {
      const priceText = options.servicePrice !== false ? `R$ ${s.price.toFixed(2)}` : '';
      doc.text(`${i + 1}. ${s.name}`, margin, y);
      if (priceText) {
        doc.text(priceText, width - margin, y, { align: 'right' });
      }
      y += 4;
    });
  }

  // Dashed line
  doc.line(margin, y, width - margin, y);
  y += 4;

  // Totals
  doc.setFontSize(7);
  doc.text('VALORES', margin, y);
  y += 3;
  doc.setFontSize(8);
  if (options.subtotal !== false) {
    doc.text('Subtotal:', margin, y);
    doc.text(`R$ ${sale.subtotal.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 3;
  }
  if (options.discount !== false && sale.discount > 0) {
    doc.text('Desconto:', margin, y);
    doc.text(`- R$ ${sale.discount.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 3;
  }
  if (options.total !== false) {
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', margin, y);
    doc.text(`R$ ${sale.total.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 4;
  }
  if (options.paymentMethod !== false) {
    doc.setFont('helvetica', 'normal');
    doc.text('Pagamento:', margin, y);
    doc.text(sale.payment_method, width - margin, y, { align: 'right' });
    y += 6;
  }

  // Footer
  doc.line(margin, y, width - margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Obrigado pela preferência!', width / 2, y, { align: 'center' });

  const dataUrl = doc.output('datauristring');
  doc.save(`venda-${sale.id}-${size}.pdf`);
  savePDFRecord({
    filename: `venda-${sale.id}-${size}.pdf`,
    type: size === '80mm' ? 'Notinha 80mm' : 'Notinha 58mm',
    module: 'vendas',
    details: `Venda #${sale.id} - ${sale.client_name}`,
    dataUrl,
  });
}

export function generateWarrantyPDF(warranty: WarrantyPDFData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE GARANTIA', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Certificate number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${warranty.certificate_number}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Line
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Client Info
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y, pageWidth - 40, 25, 'F');
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Cliente', 25, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${warranty.client_name}`, 25, y);
  y += 5;
  doc.text(`Telefone: ${warranty.client_phone}`, 25, y);
  if (warranty.client_email) {
    y += 5;
    doc.text(`Email: ${warranty.client_email}`, 25, y);
  }
  y += 15;

  // Vehicle Info
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y, pageWidth - 40, 20, 'F');
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Veículo', 25, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`${warranty.vehicle_brand} ${warranty.vehicle_model} - Placa: ${warranty.vehicle_plate}`, 25, y);
  if (warranty.vehicle_year) {
    doc.text(` (${warranty.vehicle_year})`, 145, y);
  }
  y += 15;

  // Service
  doc.setFont('helvetica', 'bold');
  doc.text('Serviço Realizado:', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(warranty.service_name, 70, y);
  y += 10;

  // Dates
  doc.setFont('helvetica', 'bold');
  doc.text('Data de Emissão:', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(warranty.issue_date), 70, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Válido Até:', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(warranty.expiry_date), 70, y);
  y += 15;

  // Warranty Terms
  if (warranty.warranty_text) {
    doc.setFont('helvetica', 'bold');
    doc.text('Termos da Garantia:', 25, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(warranty.warranty_text, pageWidth - 50);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.text('Este certificado é intransferível e válido apenas para o veículo especificado.', pageWidth / 2, 280, { align: 'center' });

  const dataUrl = doc.output('datauristring');
  doc.save(`garantia-${warranty.certificate_number}.pdf`);
  savePDFRecord({
    filename: `garantia-${warranty.certificate_number}.pdf`,
    type: 'Garantia',
    module: 'garantias',
    details: `${warranty.client_name} - ${warranty.service_name}`,
    dataUrl,
  });
}

export function generateReportPDF(report: ReportPDFData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Period
  if (report.period) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${formatDate(report.period.start)} a ${formatDate(report.period.end)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  // Table
  autoTable(doc, {
    startY: y,
    head: [report.columns],
    body: report.rows,
    theme: 'striped',
    headStyles: { fillColor: [50, 50, 50] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Summary
  if (report.summary && report.summary.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 15, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    report.summary.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, 20, y);
      y += 5;
    });
  }

  const filename = `${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  const dataUrl = doc.output('datauristring');
  doc.save(filename);
  savePDFRecord({
    filename,
    type: 'Relatório',
    module: 'relatorios',
    details: report.title + (report.period ? ` (${formatDate(report.period.start)} - ${formatDate(report.period.end)})` : ''),
    dataUrl,
  });
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

// ===== Space PDF Functions =====

export interface SpacePDFData {
  id: number;
  client_name: string;
  client_phone: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  entry_date: string;
  entry_time: string;
  exit_date: string;
  exit_time: string;
  services: Array<{ name: string; price: number }>;
  subtotal: number;
  discount: number;
  total: number;
}

export function generateSpacePDFA4(space: SpacePDFData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprovante de Vaga', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vaga Nº ${space.id}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Client
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 2, pageWidth - 30, 18, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente', 20, y + 4);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${space.client_name}`, 20, y);
  y += 5;
  doc.text(`Telefone: ${space.client_phone}`, 20, y);
  y += 8;

  // Vehicle
  doc.setFont('helvetica', 'bold');
  doc.text(`Veículo: ${space.vehicle_brand} ${space.vehicle_model} (${space.vehicle_plate})`, 20, y);
  y += 10;

  // Dates
  doc.setFont('helvetica', 'normal');
  doc.text(`Entrada: ${space.entry_date ? formatDate(space.entry_date) : '-'} ${space.entry_time ? `às ${space.entry_time}h` : ''}`, 20, y);
  y += 5;
  doc.text(`Saída: ${space.exit_date ? formatDate(space.exit_date) : '-'} ${space.exit_time ? `às ${space.exit_time}h` : ''}`, 20, y);
  y += 10;

  // Services
  if (space.services.length > 0) {
    const tableData = space.services.map(s => [s.name, `R$ ${s.price.toFixed(2)}`]);
    autoTable(doc, {
      startY: y,
      head: [['Serviço', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Totals
  doc.text(`Subtotal: R$ ${space.subtotal.toFixed(2)}`, pageWidth - 60, y);
  y += 6;
  if (space.discount > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text(`Desconto: - R$ ${space.discount.toFixed(2)}`, pageWidth - 60, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`TOTAL: R$ ${space.total.toFixed(2)}`, pageWidth - 60, y);

  const dataUrl = doc.output('datauristring');
  doc.save(`vaga-${space.id}-A4.pdf`);
  savePDFRecord({
    filename: `vaga-${space.id}-A4.pdf`,
    type: 'Comprovante Vaga A4',
    module: 'espaco',
    details: `Vaga #${space.id} - ${space.client_name}`,
    dataUrl,
  });
}

export function generateSpacePDFReceipt(space: SpacePDFData, size: '80mm' | '58mm'): void {
  const width = size === '80mm' ? 80 : 58;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, 200] });
  let y = 8;
  const margin = 3;

  doc.setFontSize(size === '80mm' ? 12 : 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprovante de Vaga', width / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vaga Nº ${space.id}`, width / 2, y, { align: 'center' });
  y += 5;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, width - margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.text('CLIENTE', margin, y);
  y += 3;
  doc.setFontSize(8);
  doc.text(space.client_name, margin, y);
  y += 3;
  doc.text(`Tel: ${space.client_phone}`, margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.text('VEÍCULO', margin, y);
  y += 3;
  doc.setFontSize(8);
  doc.text(`${space.vehicle_brand} ${space.vehicle_model}`, margin, y);
  y += 3;
  doc.text(`Placa: ${space.vehicle_plate}`, margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.text('PERÍODO', margin, y);
  y += 3;
  doc.setFontSize(8);
  doc.text(`Entrada: ${space.entry_date ? formatDate(space.entry_date) : '-'} ${space.entry_time || ''}`, margin, y);
  y += 3;
  doc.text(`Saída: ${space.exit_date ? formatDate(space.exit_date) : '-'} ${space.exit_time || ''}`, margin, y);
  y += 4;

  if (space.services.length > 0) {
    doc.setFontSize(7);
    doc.text('SERVIÇOS', margin, y);
    y += 3;
    doc.setFontSize(8);
    space.services.forEach((s, i) => {
      doc.text(`${i + 1}. ${s.name}`, margin, y);
      doc.text(`R$ ${s.price.toFixed(2)}`, width - margin, y, { align: 'right' });
      y += 4;
    });
  }

  doc.line(margin, y, width - margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.text('VALORES', margin, y);
  y += 3;
  doc.setFontSize(8);
  doc.text('Subtotal:', margin, y);
  doc.text(`R$ ${space.subtotal.toFixed(2)}`, width - margin, y, { align: 'right' });
  y += 3;
  if (space.discount > 0) {
    doc.text('Desconto:', margin, y);
    doc.text(`- R$ ${space.discount.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 3;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', margin, y);
  doc.text(`R$ ${space.total.toFixed(2)}`, width - margin, y, { align: 'right' });
  y += 6;

  doc.line(margin, y, width - margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Obrigado pela preferência!', width / 2, y, { align: 'center' });

  const dataUrl = doc.output('datauristring');
  doc.save(`vaga-${space.id}-${size}.pdf`);
  savePDFRecord({
    filename: `vaga-${space.id}-${size}.pdf`,
    type: size === '80mm' ? 'Comprovante Vaga 80mm' : 'Comprovante Vaga 58mm',
    module: 'espaco',
    details: `Vaga #${space.id} - ${space.client_name}`,
    dataUrl,
  });
}
