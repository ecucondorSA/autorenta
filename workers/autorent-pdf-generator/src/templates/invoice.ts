import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import type { InvoiceData } from '../types';
import { formatCurrency, formatDate, centsToUnits } from '../utils';

export async function generateInvoice(
  data: InvoiceData,
  language: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const colors = {
    primary: rgb(0.2, 0.4, 0.6),
    black: rgb(0, 0, 0),
    gray: rgb(0.4, 0.4, 0.4),
    lightGray: rgb(0.95, 0.95, 0.95),
    green: rgb(0.2, 0.6, 0.3),
    gold: rgb(0.8, 0.6, 0.2),
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
  drawText('AUTORENTA', margin, y, 24, fontBold, colors.primary);
  y -= 25;
  drawText('Liquidación de Rewards', margin, y, 14, fontBold);
  drawText('(Programa de Recompensas Comunitarias)', margin, y - 15, 10, font, colors.gray);
  y -= 50;

  // Invoice info
  page.drawRectangle({
    x: width - margin - 180,
    y: y - 40,
    width: 180,
    height: 55,
    color: colors.lightGray,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });

  drawText(`Liquidación N°: ${data.invoice_number}`, width - margin - 170, y - 15, 10, fontBold);
  drawText(`Fecha: ${formatDate(data.invoice_date)}`, width - margin - 170, y - 30, 9);

  // ==========================================
  // DATOS DEL COMODANTE
  // ==========================================
  drawText('COMODANTE (Receptor de Rewards)', margin, y, 11, fontBold, colors.primary);
  y -= 18;
  drawText(data.comodante.full_name, margin, y, 10, fontBold);
  y -= 14;
  if (data.comodante.gov_id_number) {
    drawText(`Documento: ${data.comodante.gov_id_number}`, margin, y, 9);
    y -= 12;
  }
  if (data.comodante.email) {
    drawText(`Email: ${data.comodante.email}`, margin, y, 9);
    y -= 12;
  }
  if (data.comodante.address) {
    drawText(`${data.comodante.address}${data.comodante.city ? `, ${data.comodante.city}` : ''}`, margin, y, 9);
    y -= 12;
  }
  if (data.comodante.mercadopago_account) {
    drawText(`Cuenta MercadoPago: ${data.comodante.mercadopago_account}`, margin, y, 9);
    y -= 12;
  }
  y -= 20;

  drawLine(y + 10);
  y -= 15;

  // ==========================================
  // PERÍODO DE REWARDS
  // ==========================================
  drawText('PERÍODO DE LIQUIDACIÓN', margin, y, 11, fontBold, colors.primary);
  y -= 25;

  drawText(`Desde: ${formatDate(data.period_start)}`, margin, y, 9);
  drawText(`Hasta: ${formatDate(data.period_end)}`, margin + 150, y, 9);
  y -= 20;

  // Activity summary if available
  if (data.activity_summary) {
    drawText('Resumen de actividad:', margin, y, 9, fontBold);
    y -= 14;
    drawText(`• Comodatos completados: ${data.activity_summary.total_bookings}`, margin + 10, y, 8);
    y -= 12;
    drawText(`• Días compartidos: ${data.activity_summary.total_days_shared}`, margin + 10, y, 8);
    y -= 12;
    drawText(`• Vehículos activos: ${data.activity_summary.vehicles_count}`, margin + 10, y, 8);
    y -= 20;
  }

  drawLine(y + 10);
  y -= 15;

  // ==========================================
  // PUNTOS DE PARTICIPACIÓN
  // ==========================================
  if (data.points) {
    drawText('PUNTOS DE PARTICIPACIÓN COMUNITARIA', margin, y, 11, fontBold, colors.gold);
    y -= 25;

    const pointsTable = [
      ['Disponibilidad (30%)', data.points.availability],
      ['Rating (20%)', data.points.rating],
      ['Antigüedad (15%)', data.points.seniority],
      ['Referidos (15%)', data.points.referrals],
      ['Tiempo de respuesta (10%)', data.points.response_time],
      ['Participación (10%)', data.points.participation],
    ];

    if (data.points.bonus > 0) {
      pointsTable.push(['Bonus', data.points.bonus]);
    }
    if (data.points.penalties < 0) {
      pointsTable.push(['Penalizaciones', data.points.penalties]);
    }

    // Points table
    page.drawRectangle({
      x: margin,
      y: y - (pointsTable.length * 16) - 25,
      width: 250,
      height: pointsTable.length * 16 + 30,
      color: colors.lightGray,
      borderColor: colors.gold,
      borderWidth: 1,
    });

    for (const [label, value] of pointsTable) {
      drawText(label, margin + 10, y, 8);
      drawText(String(value), margin + 200, y, 8, fontBold);
      y -= 16;
    }

    y -= 5;
    drawText('TOTAL PUNTOS', margin + 10, y, 9, fontBold);
    drawText(String(data.points.total), margin + 200, y, 10, fontBold, colors.gold);
    y -= 30;
  }

  // ==========================================
  // DESGLOSE FINANCIERO
  // ==========================================
  drawText('DESGLOSE FINANCIERO', margin, y, 11, fontBold, colors.primary);
  y -= 25;

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 18,
    width: width - margin * 2,
    height: 22,
    color: colors.primary,
  });
  drawText('Concepto', margin + 10, y - 13, 9, fontBold, rgb(1, 1, 1));
  drawText('Monto', width - margin - 80, y - 13, 9, fontBold, rgb(1, 1, 1));
  y -= 25;

  // Line items
  for (const item of data.line_items) {
    drawText(item.description, margin + 10, y, 9);
    drawText(formatCurrency(item.amount_cents, data.currency), width - margin - 80, y, 9);
    y -= 16;
  }

  y -= 5;
  drawLine(y + 10);

  // Gross pool share
  y -= 10;
  drawText('Participación en Reward Pool (75%)', margin + 10, y, 9, fontBold);
  drawText(formatCurrency(data.gross_pool_share_cents, data.currency), width - margin - 80, y, 9, fontBold);
  y -= 18;

  // Deductions
  drawText('(-) Comisión plataforma (ya descontada)', margin + 10, y, 9);
  drawText(`- ${formatCurrency(data.platform_fee_cents, data.currency)}`, width - margin - 80, y, 9, font, colors.gray);
  y -= 14;

  if (data.fgo_contribution_cents) {
    drawText('(-) Contribución FGO (10%)', margin + 10, y, 9);
    drawText(`- ${formatCurrency(data.fgo_contribution_cents, data.currency)}`, width - margin - 80, y, 9, font, colors.gray);
    y -= 14;
  }

  y -= 10;
  drawLine(y + 10);

  // Net amount (highlighted)
  y -= 5;
  page.drawRectangle({
    x: margin,
    y: y - 25,
    width: width - margin * 2,
    height: 30,
    color: colors.green,
  });
  drawText('REWARDS NETOS A RECIBIR', margin + 10, y - 18, 11, fontBold, rgb(1, 1, 1));
  drawText(
    formatCurrency(data.net_amount_cents, data.currency),
    width - margin - 100,
    y - 18,
    14,
    fontBold,
    rgb(1, 1, 1)
  );
  y -= 45;

  // ==========================================
  // INFORMACIÓN DE PAGO
  // ==========================================
  drawText('INFORMACIÓN DE TRANSFERENCIA', margin, y, 11, fontBold, colors.primary);
  y -= 20;

  drawText(`Método: ${data.payment_method}`, margin, y, 9);
  y -= 14;
  if (data.payment_reference) {
    drawText(`Referencia: ${data.payment_reference}`, margin, y, 9);
    y -= 14;
  }
  if (data.payment_date) {
    drawText(`Fecha de transferencia: ${formatDate(data.payment_date)}`, margin, y, 9);
    y -= 14;
  }

  // ==========================================
  // FOOTER
  // ==========================================
  y = 60;
  drawLine(y + 20);

  drawText('NOTA: Esta liquidación detalla los rewards del programa de participación comunitaria.', margin, y, 7, font, colors.gray);
  y -= 10;
  drawText('Los rewards se calculan según criterios de disponibilidad, rating, antigüedad y participación.', margin, y, 7, font, colors.gray);
  y -= 10;
  drawText('El comodante NO recibe "renta" directa sino participación en el reward pool comunitario.', margin, y, 7, font, colors.gray);
  y -= 15;
  drawText(`Generado por AutoRenta - ${formatDate(new Date().toISOString())}`, margin, y, 7, font, colors.gray);

  return pdf.save();
}
