import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import type { ReceiptData } from '../types';
import { formatCurrency, formatDate, centsToUnits } from '../utils';

export async function generateReceipt(
  data: ReceiptData,
  language: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Page setup - smaller format for receipt
  const page = pdf.addPage([420, 595]); // A5
  const { width, height } = page.getSize();
  const margin = 30;
  let y = height - margin;

  const colors = {
    primary: rgb(0.2, 0.4, 0.6),
    black: rgb(0, 0, 0),
    gray: rgb(0.4, 0.4, 0.4),
    lightGray: rgb(0.95, 0.95, 0.95),
    green: rgb(0.2, 0.6, 0.3),
    red: rgb(0.8, 0.2, 0.2),
  };

  const drawText = (text: string, x: number, yPos: number, size: number, f: PDFFont = font, color = colors.black) => {
    page.drawText(text, { x, y: yPos, size, font: f, color });
  };

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: colors.gray,
    });
  };

  // ==========================================
  // HEADER
  // ==========================================
  drawText('AUTORENTA', margin, y, 20, fontBold, colors.primary);
  y -= 25;
  drawText('Comprobante de Pago', margin, y, 14, fontBold);
  y -= 35;

  // Receipt info box
  page.drawRectangle({
    x: margin,
    y: y - 45,
    width: width - margin * 2,
    height: 50,
    color: colors.lightGray,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });

  y -= 15;
  drawText(`Comprobante N°: ${data.receipt_number}`, margin + 10, y, 10, fontBold);
  drawText(`Fecha: ${formatDate(data.payment_date, true)}`, width - margin - 130, y, 10);
  y -= 15;
  drawText(`Reserva: ${data.booking_id.slice(0, 8).toUpperCase()}`, margin + 10, y, 9);

  // Status badge
  const statusColor = data.status === 'completed' ? colors.green : data.status === 'refunded' ? colors.red : colors.gray;
  const statusText = data.status === 'completed' ? 'PAGADO' : data.status === 'refunded' ? 'REEMBOLSADO' : 'PENDIENTE';
  drawText(statusText, width - margin - 60, y, 9, fontBold, statusColor);

  y -= 40;

  // ==========================================
  // DATOS DEL USUARIO
  // ==========================================
  drawText('DATOS DEL USUARIO', margin, y, 10, fontBold, colors.primary);
  y -= 18;
  drawText(`Nombre: ${data.payer.full_name}`, margin, y, 9);
  y -= 12;
  drawText(`Email: ${data.payer.email}`, margin, y, 9);
  y -= 12;
  if (data.payer.gov_id_number) {
    drawText(`Documento: ${data.payer.gov_id_number}`, margin, y, 9);
    y -= 12;
  }
  y -= 15;

  drawLine(y + 5);
  y -= 10;

  // ==========================================
  // DETALLE DE PAGO
  // ==========================================
  drawText('DETALLE', margin, y, 10, fontBold, colors.primary);
  y -= 20;

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: width - margin * 2,
    height: 18,
    color: colors.lightGray,
  });
  drawText('Descripción', margin + 5, y - 12, 8, fontBold);
  drawText('Monto', width - margin - 60, y - 12, 8, fontBold);
  y -= 20;

  // Line items
  for (const item of data.line_items) {
    drawText(item.description, margin + 5, y, 8);
    drawText(formatCurrency(item.amount_cents, data.currency), width - margin - 60, y, 8);
    y -= 14;
  }

  y -= 5;
  drawLine(y + 10);
  y -= 5;

  // Total
  page.drawRectangle({
    x: margin,
    y: y - 20,
    width: width - margin * 2,
    height: 25,
    color: colors.primary,
  });
  drawText('TOTAL PAGADO', margin + 10, y - 14, 10, fontBold, rgb(1, 1, 1));
  drawText(
    formatCurrency(data.amount_cents, data.currency),
    width - margin - 80,
    y - 14,
    12,
    fontBold,
    rgb(1, 1, 1)
  );
  y -= 35;

  // Exchange rate if applicable
  if (data.fx_rate && data.amount_local_cents) {
    drawText(
      `Equivalente: ${formatCurrency(data.amount_local_cents, 'ARS')} (TC: ${data.fx_rate.toFixed(2)})`,
      margin,
      y,
      8,
      font,
      colors.gray
    );
    y -= 20;
  }

  // ==========================================
  // MÉTODO DE PAGO
  // ==========================================
  drawLine(y + 10);
  y -= 10;

  drawText('MÉTODO DE PAGO', margin, y, 10, fontBold, colors.primary);
  y -= 18;

  drawText(`Método: ${data.payment_method}`, margin, y, 9);
  y -= 12;
  if (data.provider) {
    drawText(`Proveedor: ${data.provider}`, margin, y, 9);
    y -= 12;
  }
  if (data.last_four_digits) {
    drawText(`Tarjeta: ****${data.last_four_digits}`, margin, y, 9);
    y -= 12;
  }
  if (data.provider_reference) {
    drawText(`Referencia: ${data.provider_reference}`, margin, y, 9);
    y -= 12;
  }

  // ==========================================
  // FOOTER
  // ==========================================
  y = 50;
  drawLine(y + 15);

  drawText('Este comprobante es válido como constancia de su transacción.', margin, y, 7, font, colors.gray);
  y -= 10;
  drawText('Conserve este documento para cualquier consulta o reclamo.', margin, y, 7, font, colors.gray);
  y -= 15;
  drawText(`Generado por AutoRenta - ${formatDate(new Date().toISOString())}`, margin, y, 7, font, colors.gray);

  return pdf.save();
}
