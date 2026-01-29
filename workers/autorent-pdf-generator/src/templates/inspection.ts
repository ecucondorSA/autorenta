import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import type { InspectionData } from '../types';
import { formatDate } from '../utils';

export async function generateInspection(
  data: InspectionData,
  language: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const colors = {
    primary: rgb(0.2, 0.4, 0.6),
    black: rgb(0, 0, 0),
    gray: rgb(0.4, 0.4, 0.4),
    lightGray: rgb(0.95, 0.95, 0.95),
    green: rgb(0.2, 0.7, 0.3),
    yellow: rgb(0.9, 0.7, 0.1),
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

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = height - margin;
    return page;
  };

  // ==========================================
  // HEADER
  // ==========================================
  drawText('AUTORENTA', margin, y, 24, fontBold, colors.primary);
  y -= 30;

  const inspectionType = data.type === 'delivery' ? 'ENTREGA' : 'DEVOLUCIÓN';
  drawText(`Acta de Inspección - ${inspectionType}`, margin, y, 14, fontBold);
  y -= 40;

  // Info box
  page.drawRectangle({
    x: margin,
    y: y - 55,
    width: width - margin * 2,
    height: 60,
    color: colors.lightGray,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });

  y -= 15;
  drawText(`Inspección N°: ${data.inspection_id.slice(0, 8).toUpperCase()}`, margin + 10, y, 10, fontBold);
  drawText(`Reserva: ${data.booking_id.slice(0, 8).toUpperCase()}`, width / 2, y, 10);
  y -= 15;
  drawText(`Fecha: ${formatDate(data.inspection_date, true)}`, margin + 10, y, 9);
  drawText(`Inspector: ${data.inspector_name}`, width / 2, y, 9);
  y -= 15;
  drawText(`Comodatario: ${data.comodatario_name}`, margin + 10, y, 9);
  if (data.comodante_name) {
    drawText(`Comodante: ${data.comodante_name}`, width / 2, y, 9);
  }
  y -= 35;

  // ==========================================
  // DATOS DEL VEHÍCULO
  // ==========================================
  drawText('DATOS DEL VEHÍCULO', margin, y, 11, fontBold, colors.primary);
  y -= 20;

  const carDetails = [
    ['Vehículo:', data.car.title],
    ['Patente:', data.car.plate],
    ['Kilometraje:', `${data.car.mileage_at_inspection.toLocaleString()} km`],
    ['Nivel de combustible:', getFuelLevelText(data.car.fuel_level)],
  ];

  for (const [label, value] of carDetails) {
    drawText(label, margin, y, 9, fontBold);
    drawText(value, margin + 120, y, 9);
    y -= 14;
  }
  y -= 15;

  drawLine(y + 10);
  y -= 15;

  // ==========================================
  // CHECKLIST
  // ==========================================
  drawText('CHECKLIST DE INSPECCIÓN', margin, y, 11, fontBold, colors.primary);
  y -= 25;

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: width - margin * 2,
    height: 20,
    color: colors.primary,
  });
  drawText('Item', margin + 10, y - 11, 8, fontBold, rgb(1, 1, 1));
  drawText('Estado', width - margin - 120, y - 11, 8, fontBold, rgb(1, 1, 1));
  drawText('Notas', width - margin - 60, y - 11, 8, fontBold, rgb(1, 1, 1));
  y -= 22;

  for (let i = 0; i < data.checklist.length; i++) {
    if (y < 100) {
      newPage();
      drawText('CHECKLIST (continuación)', margin, y, 11, fontBold, colors.primary);
      y -= 25;
    }

    const item = data.checklist[i];
    const bgColor = i % 2 === 0 ? colors.lightGray : rgb(1, 1, 1);

    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: width - margin * 2,
      height: 16,
      color: bgColor,
    });

    drawText(item.item, margin + 10, y - 9, 8);

    // Status with color
    const statusColor = getStatusColor(item.status, colors);
    const statusText = getStatusText(item.status);
    drawText(statusText, width - margin - 120, y - 9, 8, fontBold, statusColor);

    if (item.notes) {
      drawText(item.notes.slice(0, 15), width - margin - 60, y - 9, 7, font, colors.gray);
    }

    y -= 16;
  }
  y -= 15;

  // ==========================================
  // DAÑOS (si existen)
  // ==========================================
  if (data.damages && data.damages.length > 0) {
    if (y < 200) {
      newPage();
    }

    drawLine(y + 10);
    y -= 15;

    drawText('DAÑOS DETECTADOS', margin, y, 11, fontBold, colors.red);
    y -= 25;

    for (const damage of data.damages) {
      if (y < 120) {
        newPage();
        drawText('DAÑOS (continuación)', margin, y, 11, fontBold, colors.red);
        y -= 25;
      }

      // Damage box
      page.drawRectangle({
        x: margin,
        y: y - 55,
        width: width - margin * 2,
        height: 60,
        borderColor: getSeverityColor(damage.severity, colors),
        borderWidth: 1.5,
      });

      y -= 15;
      drawText(`Ubicación: ${damage.location}`, margin + 10, y, 9, fontBold);

      const severityColor = getSeverityColor(damage.severity, colors);
      const severityText = getSeverityText(damage.severity);
      drawText(`Severidad: ${severityText}`, width - margin - 100, y, 9, fontBold, severityColor);

      y -= 14;
      drawText(`Descripción: ${damage.description}`, margin + 10, y, 8);
      y -= 12;

      if (damage.estimated_cost_cents) {
        drawText(
          `Costo estimado: $${(damage.estimated_cost_cents / 100).toFixed(2)} USD`,
          margin + 10,
          y,
          8,
          font,
          colors.gray
        );
      }

      y -= 25;
    }
    y -= 10;
  }

  // ==========================================
  // NOTAS
  // ==========================================
  if (data.notes) {
    if (y < 150) {
      newPage();
    }

    drawLine(y + 10);
    y -= 15;

    drawText('OBSERVACIONES', margin, y, 11, fontBold, colors.primary);
    y -= 20;

    // Wrap notes text
    const words = data.notes.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).length > 90) {
        drawText(line, margin, y, 9);
        y -= 12;
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) {
      drawText(line, margin, y, 9);
      y -= 12;
    }
    y -= 10;
  }

  // ==========================================
  // FIRMAS
  // ==========================================
  if (y < 180) {
    newPage();
  }

  y -= 20;
  drawLine(y + 15);
  y -= 15;

  drawText('FIRMAS DE CONFORMIDAD', margin, y, 11, fontBold, colors.primary);
  y -= 40;

  const sigWidth = (width - margin * 2 - 40) / 2;

  // Inspector signature
  page.drawRectangle({
    x: margin,
    y: y - 50,
    width: sigWidth,
    height: 50,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });
  drawText('Inspector', margin + 10, y - 15, 9, fontBold);
  drawText(data.inspector_name, margin + 10, y - 30, 8);
  drawText('Firma: _____________________', margin + 10, y - 45, 8);

  // Comodatario signature
  page.drawRectangle({
    x: margin + sigWidth + 40,
    y: y - 50,
    width: sigWidth,
    height: 50,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });
  drawText('Comodatario', margin + sigWidth + 50, y - 15, 9, fontBold);
  drawText(data.comodatario_name, margin + sigWidth + 50, y - 30, 8);
  drawText('Firma: _____________________', margin + sigWidth + 50, y - 45, 8);

  // ==========================================
  // FOOTER
  // ==========================================
  y = 40;
  drawText(
    `Acta de inspección generada por AutoRenta el ${formatDate(new Date().toISOString(), true)}`,
    margin,
    y,
    7,
    font,
    colors.gray
  );
  drawText(
    'Ambas partes declaran estar de acuerdo con el estado documentado del vehículo.',
    margin,
    y - 10,
    7,
    font,
    colors.gray
  );

  return pdf.save();
}

// Helper functions
function getFuelLevelText(level: string): string {
  const levels: Record<string, string> = {
    empty: 'Vacío',
    '1/4': '1/4 de tanque',
    '1/2': '1/2 tanque',
    '3/4': '3/4 de tanque',
    full: 'Tanque lleno',
  };
  return levels[level] || level;
}

function getStatusColor(status: string, colors: Record<string, ReturnType<typeof rgb>>) {
  switch (status) {
    case 'ok':
      return colors.green;
    case 'damaged':
      return colors.red;
    case 'missing':
      return colors.red;
    default:
      return colors.gray;
  }
}

function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    ok: 'OK',
    damaged: 'DAÑADO',
    missing: 'FALTANTE',
    na: 'N/A',
  };
  return statuses[status] || status;
}

function getSeverityColor(severity: string, colors: Record<string, ReturnType<typeof rgb>>) {
  switch (severity) {
    case 'minor':
      return colors.yellow;
    case 'moderate':
      return rgb(1, 0.5, 0);
    case 'severe':
      return colors.red;
    default:
      return colors.gray;
  }
}

function getSeverityText(severity: string): string {
  const severities: Record<string, string> = {
    minor: 'Menor',
    moderate: 'Moderado',
    severe: 'Grave',
  };
  return severities[severity] || severity;
}
