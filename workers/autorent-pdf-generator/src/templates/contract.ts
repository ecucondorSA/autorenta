import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import type { ContractData } from '../types';
import { formatCurrency, formatDate, centsToUnits } from '../utils';

export async function generateContract(
  data: ContractData,
  language: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Page setup
  let page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const colors = {
    primary: rgb(0.2, 0.4, 0.6),
    black: rgb(0, 0, 0),
    gray: rgb(0.4, 0.4, 0.4),
    lightGray: rgb(0.9, 0.9, 0.9),
  };

  // Helper functions
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
  drawText('Contrato de Comodato de Vehículo', margin, y - 30, 14, fontBold);
  drawText('(Préstamo de Uso - Arts. 1533-1541 CCyC)', margin, y - 45, 9, font, colors.gray);
  y -= 70;

  // Contract number and date
  drawText(`Contrato N°: ${data.booking_id.slice(0, 8).toUpperCase()}`, margin, y, 10);
  drawText(`Fecha: ${formatDate(new Date().toISOString())}`, width - margin - 150, y, 10);
  y -= 30;

  drawLine(y);
  y -= 20;

  // ==========================================
  // PARTES DEL CONTRATO
  // ==========================================
  drawText('1. PARTES DEL CONTRATO', margin, y, 12, fontBold, colors.primary);
  y -= 25;

  // Comodante (quien presta)
  drawText('COMODANTE (quien presta el vehículo):', margin, y, 10, fontBold);
  y -= 15;
  drawText(`Nombre: ${data.comodante.full_name}`, margin + 10, y, 9);
  y -= 12;
  if (data.comodante.gov_id_number) {
    drawText(`Documento: ${data.comodante.gov_id_number}`, margin + 10, y, 9);
    y -= 12;
  }
  if (data.comodante.address) {
    drawText(`Dirección: ${data.comodante.address}${data.comodante.city ? `, ${data.comodante.city}` : ''}`, margin + 10, y, 9);
    y -= 12;
  }
  if (data.comodante.email) {
    drawText(`Email: ${data.comodante.email}`, margin + 10, y, 9);
    y -= 12;
  }
  y -= 10;

  // Comodatario (quien recibe)
  drawText('COMODATARIO (quien recibe el vehículo):', margin, y, 10, fontBold);
  y -= 15;
  drawText(`Nombre: ${data.comodatario.full_name}`, margin + 10, y, 9);
  y -= 12;
  drawText(`Documento: ${data.comodatario.gov_id_number}`, margin + 10, y, 9);
  y -= 12;
  drawText(`Licencia de Conducir: ${data.comodatario.driver_license_number}`, margin + 10, y, 9);
  y -= 12;
  if (data.comodatario.driver_license_expiry) {
    drawText(`Vencimiento Licencia: ${formatDate(data.comodatario.driver_license_expiry)}`, margin + 10, y, 9);
    y -= 12;
  }
  if (data.comodatario.address) {
    drawText(`Dirección: ${data.comodatario.address}${data.comodatario.city ? `, ${data.comodatario.city}` : ''}`, margin + 10, y, 9);
    y -= 12;
  }
  drawText(`Email: ${data.comodatario.email}`, margin + 10, y, 9);
  y -= 12;
  if (data.comodatario.phone) {
    drawText(`Teléfono: ${data.comodatario.phone}`, margin + 10, y, 9);
    y -= 12;
  }
  y -= 15;

  // ==========================================
  // OBJETO DEL COMODATO (VEHÍCULO)
  // ==========================================
  drawText('2. OBJETO DEL COMODATO', margin, y, 12, fontBold, colors.primary);
  y -= 25;

  drawText('El COMODANTE presta al COMODATARIO el siguiente vehículo:', margin, y, 9, font, colors.gray);
  y -= 18;

  const carInfo = [
    ['Vehículo:', `${data.car.brand} ${data.car.model} (${data.car.year})`],
    ['Patente:', data.car.plate],
    ['Color:', data.car.color],
    ['Kilometraje actual:', `${data.car.mileage.toLocaleString()} km`],
  ];

  if (data.car.vin) {
    carInfo.push(['VIN/Chasis:', data.car.vin]);
  }
  if (data.car.fuel_policy) {
    carInfo.push(['Política de combustible:', data.car.fuel_policy]);
  }
  if (data.car.mileage_limit) {
    carInfo.push(['Límite de km:', `${data.car.mileage_limit} km/día`]);
  }
  if (data.car.extra_km_price) {
    carInfo.push(['Costo km extra:', formatCurrency(data.car.extra_km_price * 100, data.currency)]);
  }

  for (const [label, value] of carInfo) {
    drawText(label, margin + 10, y, 9, fontBold);
    drawText(value, margin + 130, y, 9);
    y -= 14;
  }
  y -= 15;

  // ==========================================
  // PERÍODO DEL COMODATO
  // ==========================================
  drawText('3. PERÍODO DEL COMODATO', margin, y, 12, fontBold, colors.primary);
  y -= 25;

  drawText('Fecha de inicio:', margin + 10, y, 9, fontBold);
  drawText(formatDate(data.start_date, true), margin + 130, y, 9);
  y -= 14;
  drawText('Fecha de fin:', margin + 10, y, 9, fontBold);
  drawText(formatDate(data.end_date, true), margin + 130, y, 9);
  y -= 14;
  drawText('Duración:', margin + 10, y, 9, fontBold);
  drawText(`${data.days_count} día${data.days_count > 1 ? 's' : ''}`, margin + 130, y, 9);
  y -= 14;

  if (data.pickup_address) {
    drawText('Lugar de entrega:', margin + 10, y, 9, fontBold);
    drawText(data.pickup_address, margin + 130, y, 9);
    y -= 14;
  }
  if (data.dropoff_address) {
    drawText('Lugar de devolución:', margin + 10, y, 9, fontBold);
    drawText(data.dropoff_address, margin + 130, y, 9);
    y -= 14;
  }
  y -= 15;

  // ==========================================
  // CONTRIBUCIÓN Y GARANTÍAS
  // ==========================================
  if (y < 250) {
    newPage();
  }

  drawText('4. CONTRIBUCIÓN DE USO Y GARANTÍAS', margin, y, 12, fontBold, colors.primary);
  y -= 20;

  drawText('El COMODATARIO abona las siguientes contribuciones:', margin, y, 9, font, colors.gray);
  y -= 18;

  // Tabla de contribuciones
  const priceItems = [
    ['Contribución de uso', formatCurrency(data.contribution_cents, data.currency)],
  ];

  if (data.insurance_cents) {
    priceItems.push(['Contribución FGO (Fondo de Garantía)', formatCurrency(data.insurance_cents, data.currency)]);
  }
  if (data.fees_cents) {
    priceItems.push(['Comisión de servicio AutoRenta', formatCurrency(data.fees_cents, data.currency)]);
  }
  priceItems.push(['TOTAL', formatCurrency(data.total_amount_cents, data.currency)]);
  priceItems.push(['Depósito de garantía (reembolsable)', formatCurrency(data.deposit_amount_cents, data.currency)]);

  // Draw price table
  page.drawRectangle({
    x: margin,
    y: y - (priceItems.length * 18) - 10,
    width: width - margin * 2,
    height: priceItems.length * 18 + 20,
    color: colors.lightGray,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });

  y -= 15;
  for (let i = 0; i < priceItems.length; i++) {
    const [label, value] = priceItems[i];
    const isTotal = label.includes('TOTAL');
    const f = isTotal ? fontBold : font;
    drawText(label, margin + 10, y, 9, f);
    drawText(value, width - margin - 100, y, 9, f);
    y -= 18;
  }
  y -= 20;

  // ==========================================
  // COBERTURA FGO
  // ==========================================
  if (data.fgo) {
    drawText('5. FONDO DE GARANTÍA OPERATIVA (FGO)', margin, y, 12, fontBold, colors.primary);
    y -= 25;

    drawText('El presente comodato cuenta con cobertura del FGO de AutoRenta:', margin, y, 9, font, colors.gray);
    y -= 18;

    if (data.fgo.policy_number) {
      drawText(`Referencia FGO: ${data.fgo.policy_number}`, margin + 10, y, 9);
      y -= 14;
    }
    if (data.fgo.liability_coverage) {
      drawText(`Cobertura máxima: ${formatCurrency(data.fgo.liability_coverage * 100, 'USD')}`, margin + 10, y, 9);
      y -= 14;
    }
    if (data.fgo.deductible) {
      drawText(`Franquicia (responsabilidad del comodatario): ${formatCurrency(data.fgo.deductible * 100, 'USD')}`, margin + 10, y, 9);
      y -= 14;
    }
    y -= 15;
  }

  // ==========================================
  // OBLIGACIONES DEL COMODATARIO
  // ==========================================
  if (y < 300) {
    newPage();
  }

  const obligSection = data.fgo ? '6' : '5';
  drawText(`${obligSection}. OBLIGACIONES DEL COMODATARIO`, margin, y, 12, fontBold, colors.primary);
  y -= 20;

  const obligations = [
    'Usar el vehículo conforme a su destino y conservarlo con la diligencia de un buen padre de familia (Art. 1536 CCyC).',
    'Devolver el vehículo en el mismo estado en que lo recibió, salvo el deterioro normal por el uso.',
    'Responder por la pérdida o deterioro del vehículo, incluso por caso fortuito, si lo usa para fines distintos o por más tiempo del convenido (Art. 1537 CCyC).',
    'No ceder el uso del vehículo a terceros sin autorización expresa del comodante.',
    'Devolver el vehículo con el mismo nivel de combustible con el que fue entregado.',
    'Asumir responsabilidad por todas las multas de tránsito durante el período de uso.',
    'Notificar inmediatamente a AutoRenta y autoridades en caso de accidente o siniestro.',
    'No sacar el vehículo de la provincia/jurisdicción sin autorización previa.',
  ];

  for (let i = 0; i < obligations.length; i++) {
    if (y < 100) {
      newPage();
    }
    const oblig = obligations[i];
    const lines = wrapText(oblig, 80);
    drawText(`${i + 1}.`, margin + 5, y, 8, fontBold);
    for (const line of lines) {
      drawText(line, margin + 20, y, 8, font, colors.gray);
      y -= 11;
    }
    y -= 5;
  }

  // ==========================================
  // CLÁUSULAS ESPECIALES (Ley Argentina)
  // ==========================================
  if (y < 200) {
    newPage();
  }

  y -= 10;
  const clauseSection = data.fgo ? '7' : '6';
  drawText(`${clauseSection}. CLÁUSULAS ESPECIALES`, margin, y, 12, fontBold, colors.primary);
  y -= 20;

  const clauses = [
    {
      title: 'Culpa Grave',
      text: 'El comodatario pierde toda cobertura del FGO si conduce bajo efectos de alcohol, drogas o sustancias prohibidas.',
    },
    {
      title: 'Indemnidad',
      text: 'El comodatario se obliga a mantener indemne al comodante por cualquier daño causado a terceros durante el uso del vehículo.',
    },
    {
      title: 'Retención Indebida (Art. 173 inc. 2 CP)',
      text: 'La no devolución del vehículo en término constituye retención indebida, delito penal perseguible de oficio.',
    },
    {
      title: 'Mora Automática (Art. 886 CCyC)',
      text: 'El comodatario incurre en mora de pleno derecho por el solo vencimiento del plazo sin necesidad de interpelación.',
    },
  ];

  for (const clause of clauses) {
    if (y < 80) {
      newPage();
    }
    drawText(`• ${clause.title}:`, margin + 5, y, 8, fontBold);
    y -= 12;
    const lines = wrapText(clause.text, 85);
    for (const line of lines) {
      drawText(line, margin + 10, y, 8, font, colors.gray);
      y -= 10;
    }
    y -= 8;
  }

  // Additional terms
  if (data.additional_terms && data.additional_terms.length > 0) {
    y -= 10;
    drawText('Términos adicionales:', margin, y, 10, fontBold);
    y -= 15;
    for (const term of data.additional_terms) {
      const lines = wrapText(term, 80);
      drawText('•', margin + 5, y, 8);
      for (const line of lines) {
        drawText(line, margin + 15, y, 8, font, colors.gray);
        y -= 11;
      }
      y -= 3;
    }
  }

  // ==========================================
  // FIRMAS
  // ==========================================
  if (y < 150) {
    newPage();
  }

  y -= 30;
  drawLine(y + 15);
  y -= 10;

  const sigSection = data.fgo ? '8' : '7';
  drawText(`${sigSection}. ACEPTACIÓN Y FIRMAS`, margin, y, 12, fontBold, colors.primary);
  y -= 20;

  drawText('Las partes declaran conocer y aceptar todas las cláusulas del presente contrato de comodato.', margin, y, 8, font, colors.gray);
  y -= 30;

  // Signature boxes
  const sigWidth = (width - margin * 2 - 40) / 2;

  // Comodante
  page.drawRectangle({
    x: margin,
    y: y - 60,
    width: sigWidth,
    height: 60,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });
  drawText('COMODANTE', margin + 10, y - 20, 9, fontBold);
  drawText(data.comodante.full_name, margin + 10, y - 35, 8);
  drawText('Firma: _____________________', margin + 10, y - 55, 8);

  // Comodatario
  page.drawRectangle({
    x: margin + sigWidth + 40,
    y: y - 60,
    width: sigWidth,
    height: 60,
    borderColor: colors.gray,
    borderWidth: 0.5,
  });
  drawText('COMODATARIO', margin + sigWidth + 50, y - 20, 9, fontBold);
  drawText(data.comodatario.full_name, margin + sigWidth + 50, y - 35, 8);
  drawText('Firma: _____________________', margin + sigWidth + 50, y - 55, 8);

  // ==========================================
  // FOOTER
  // ==========================================
  y = 40;
  drawText(
    `Documento generado por AutoRenta el ${formatDate(new Date().toISOString(), true)}`,
    margin,
    y,
    7,
    font,
    colors.gray
  );
  drawText(
    'Este contrato de comodato se rige por los Arts. 1533-1541 del Código Civil y Comercial de la Nación Argentina.',
    margin,
    y - 10,
    7,
    font,
    colors.gray
  );

  return pdf.save();
}

// Helper: wrap text to fit width
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length > maxChars) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
