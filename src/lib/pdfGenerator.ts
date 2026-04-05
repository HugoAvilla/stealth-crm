import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePDFRecord, uploadPDFToStorage } from './pdfStorage';

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
  company_logo_url?: string;
  company_cnpj?: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
}

export interface ReportPDFData {
  title: string;
  period?: { start: string; end: string };
  columns: string[];
  rows: string[][];
  summary?: { label: string; value: string }[];
}

async function saveAndUploadPDF(
  doc: jsPDF,
  filename: string,
  type: any,
  module: any,
  details: string,
  companyId?: number
): Promise<void> {
  // Download locally
  doc.save(filename);

  // Upload to Supabase Storage
  let storagePath: string | undefined;
  if (companyId) {
    const blob = doc.output('blob');
    const path = `${companyId}/${module}/${filename}`;
    const uploaded = await uploadPDFToStorage(blob, path);
    if (uploaded) {
      storagePath = uploaded;
    }
  }

  // Save metadata record
  savePDFRecord({
    filename,
    type,
    module,
    details,
    storagePath,
  });
}

export async function generateSalePDFA4(sale: SalePDFData, options: Record<string, boolean> = {}, companyId?: number): Promise<void> {
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

  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

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

  if (options.vehicle !== false) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Veículo: ${sale.vehicle_brand} ${sale.vehicle_model} (${sale.vehicle_plate})`, 20, y);
    y += 10;
  }

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

  const filename = `venda-${sale.id}-A4.pdf`;
  await saveAndUploadPDF(doc, filename, 'Recibo A4', 'vendas', `Venda #${sale.id} - ${sale.client_name}`, companyId);
}

export async function generateSalePDFReceipt(sale: SalePDFData, size: '80mm' | '58mm', options: Record<string, boolean> = {}, companyId?: number): Promise<void> {
  const width = size === '80mm' ? 80 : 58;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, 200],
  });

  let y = 8;
  const margin = 3;

  doc.setFontSize(size === '80mm' ? 12 : 10);

  if (options.companyName !== false) {
    doc.setFont('helvetica', 'bold');
    doc.text(sale.company_name || 'WFE EVOLUTION', width / 2, y, { align: 'center' });
    y += 6;
  }

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

  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, width - margin, y);
  y += 4;

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

  doc.line(margin, y, width - margin, y);
  y += 4;

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

  doc.line(margin, y, width - margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Obrigado pela preferência!', width / 2, y, { align: 'center' });

  const filename = `venda-${sale.id}-${size}.pdf`;
  await saveAndUploadPDF(doc, filename, size === '80mm' ? 'Notinha 80mm' : 'Notinha 58mm', 'vendas', `Venda #${sale.id} - ${sale.client_name}`, companyId);
}

export async function generateWarrantyPDF(warranty: WarrantyPDFData, companyId?: number): Promise<void> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 12;

  const companyName = warranty.company_name || 'Minha Empresa';

  // — HEADER: Logo + Company Name + Subtitle —
  let logoLoaded = false;
  let logoWidth = 18;
  if (warranty.company_logo_url) {
    try {
      const response = await fetch(warranty.company_logo_url);
      const blob = await response.blob();
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Detect image format from blob type
      const imgFormat = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG';

      // Load into Image to get natural dimensions for aspect ratio
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Scale proportionally: max height 18mm, width adapts to aspect ratio
      const maxH = 18;
      const maxW = 40; // max width cap
      const ratio = img.naturalWidth / img.naturalHeight;
      let drawW = maxH * ratio;
      let drawH = maxH;
      if (drawW > maxW) {
        drawW = maxW;
        drawH = maxW / ratio;
      }

      doc.addImage(dataUrl, imgFormat, marginLeft, y + (18 - drawH) / 2, drawW, drawH);
      logoWidth = drawW + 4;
      logoLoaded = true;
    } catch (e) {
      console.warn('Não foi possível carregar a logo para o PDF:', e);
    }
  }

  const textStartX = logoLoaded ? marginLeft + logoWidth : marginLeft;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), textStartX, y + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CERTIFICADO DE GARANTIA', textStartX, y + 13);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`Nº ${warranty.certificate_number}`, pageWidth - marginRight, y + 7, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  y += 22;

  // — Accent line —
  doc.setDrawColor(0, 122, 255);
  doc.setLineWidth(1);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 6;

  // — Company info bar —
  const companyInfoParts: string[] = [];
  if (warranty.company_cnpj) companyInfoParts.push(`CNPJ: ${warranty.company_cnpj}`);
  if (warranty.company_phone) companyInfoParts.push(`Tel: ${warranty.company_phone}`);
  if (warranty.company_email) companyInfoParts.push(`Email: ${warranty.company_email}`);

  if (companyInfoParts.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(companyInfoParts.join('  |  '), pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  if (warranty.company_address) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(warranty.company_address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setTextColor(0, 0, 0);
  y += 4;

  // ======= HELPERS =======
  const drawSectionTitle = (title: string, yPos: number): number => {
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(marginLeft, yPos, contentWidth, 7, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(title.toUpperCase(), marginLeft + 4, yPos + 5);
    doc.setTextColor(0, 0, 0);
    return yPos + 11;
  };

  const drawField = (label: string, value: string, xPos: number, yPos: number): void => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, xPos, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(value, xPos, yPos + 4);
  };

  const col1 = marginLeft + 4;
  const col2 = marginLeft + contentWidth / 2;

  // ======= DADOS DO CLIENTE =======
  y = drawSectionTitle('Dados do Cliente', y);
  drawField('Nome', warranty.client_name, col1, y);
  drawField('WhatsApp', warranty.client_phone, col2, y);
  y += 12;
  if (warranty.client_email) {
    drawField('Email', warranty.client_email, col1, y);
    y += 12;
  }

  // ======= DADOS DO VEÍCULO =======
  y = drawSectionTitle('Dados do Veículo', y);
  const vehicleFull = `${warranty.vehicle_brand} ${warranty.vehicle_model}${warranty.vehicle_year ? ` (${warranty.vehicle_year})` : ''}`;
  drawField('Veículo', vehicleFull, col1, y);
  drawField('Placa', warranty.vehicle_plate || 'N/A', col2, y);
  y += 12;

  // ======= SERVIÇO REALIZADO =======
  y = drawSectionTitle('Serviço Realizado', y);
  drawField('Tipo de Serviço', warranty.service_name, col1, y);
  y += 12;

  // ======= VALIDADE =======
  y = drawSectionTitle('Validade da Garantia', y);
  drawField('Data de Emissão', formatDate(warranty.issue_date), col1, y);
  drawField('Válido Até', formatDate(warranty.expiry_date), col2, y);
  y += 14;

  // ======= TERMOS DA GARANTIA =======
  if (warranty.warranty_text) {
    y = drawSectionTitle('Termos e Condições', y);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(warranty.warranty_text, contentWidth - 8);
    const linesHeight = lines.length * 4;
    if (y + linesHeight > pageHeight - 30) {
      const linesPerPage = Math.floor((pageHeight - 30 - y) / 4);
      doc.text(lines.slice(0, linesPerPage), col1, y);
      doc.addPage();
      y = 15;
      const remaining = lines.slice(linesPerPage);
      doc.text(remaining, col1, y);
      y += remaining.length * 4 + 5;
    } else {
      doc.text(lines, col1, y);
      y += linesHeight + 5;
    }
    doc.setTextColor(0, 0, 0);
  }

  // ======= OBSERVAÇÃO =======
  y += 3;
  doc.setDrawColor(200, 170, 0);
  doc.setFillColor(255, 250, 230);
  doc.roundedRect(marginLeft, y, contentWidth, 12, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 110, 0);
  doc.text('OBSERVAÇÃO:', marginLeft + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Esta garantia é intransferível e válida somente para o veículo e cliente especificados.', marginLeft + 28, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 18;

  // ======= ASSINATURAS =======
  if (y < pageHeight - 45) {
    const sigY = pageHeight - 42;
    const sigWidth = 60;
    const sig1X = marginLeft + 15;
    const sig2X = pageWidth - marginRight - sigWidth - 15;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(sig1X, sigY, sig1X + sigWidth, sigY);
    doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(companyName, sig1X + sigWidth / 2, sigY + 5, { align: 'center' });
    doc.text('Responsável', sig1X + sigWidth / 2, sigY + 9, { align: 'center' });
    doc.text(warranty.client_name, sig2X + sigWidth / 2, sigY + 5, { align: 'center' });
    doc.text('Cliente', sig2X + sigWidth / 2, sigY + 9, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // ======= FOOTER =======
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth / 2, pageHeight - 8, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);

  const filename = `garantia-${warranty.certificate_number}.pdf`;
  await saveAndUploadPDF(doc, filename, 'Garantia', 'garantias', `${warranty.client_name} - ${warranty.service_name}`, companyId);
}

export async function generateReportPDF(report: ReportPDFData, companyId?: number): Promise<void> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  if (report.period) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${formatDate(report.period.start)} a ${formatDate(report.period.end)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

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
  await saveAndUploadPDF(doc, filename, 'Relatório', 'relatorios', report.title + (report.period ? ` (${formatDate(report.period.start)} - ${formatDate(report.period.end)})` : ''), companyId);
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

export async function generateSpacePDFA4(space: SpacePDFData, companyId?: number): Promise<void> {
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

  doc.setFont('helvetica', 'bold');
  doc.text(`Veículo: ${space.vehicle_brand} ${space.vehicle_model} (${space.vehicle_plate})`, 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.text(`Entrada: ${space.entry_date ? formatDate(space.entry_date) : '-'} ${space.entry_time ? `às ${space.entry_time}h` : ''}`, 20, y);
  y += 5;
  doc.text(`Saída: ${space.exit_date ? formatDate(space.exit_date) : '-'} ${space.exit_time ? `às ${space.exit_time}h` : ''}`, 20, y);
  y += 10;

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

  const filename = `vaga-${space.id}-A4.pdf`;
  await saveAndUploadPDF(doc, filename, 'Comprovante Vaga A4', 'espaco', `Vaga #${space.id} - ${space.client_name}`, companyId);
}

export async function generateSpacePDFReceipt(space: SpacePDFData, size: '80mm' | '58mm', companyId?: number): Promise<void> {
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

  const filename = `vaga-${space.id}-${size}.pdf`;
  await saveAndUploadPDF(doc, filename, size === '80mm' ? 'Comprovante Vaga 80mm' : 'Comprovante Vaga 58mm', 'espaco', `Vaga #${space.id} - ${space.client_name}`, companyId);
}
