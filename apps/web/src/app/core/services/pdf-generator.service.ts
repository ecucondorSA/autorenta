import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  scale?: number;
  quality?: number;
}

/**
 * Servicio para generar PDFs desde elementos HTML
 *
 * Usa html2canvas para capturar el HTML como imagen y
 * jsPDF para generar el archivo PDF final.
 *
 * Uso:
 * ```typescript
 * await this.pdfGenerator.generateFromElement('#pdf-content', {
 *   filename: 'reserva-123.pdf',
 *   format: 'a4',
 *   orientation: 'portrait'
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  /**
   * Genera un PDF a partir de un elemento HTML
   *
   * @param elementOrSelector - Elemento HTML o selector CSS
   * @param options - Opciones de configuración del PDF
   */
  async generateFromElement(
    elementOrSelector: HTMLElement | string,
    options: PdfOptions = {},
  ): Promise<void> {
    const {
      filename = 'document.pdf',
      format = 'a4',
      orientation = 'portrait',
      scale = 2, // Mayor escala = mejor calidad (pero más pesado)
      quality = 0.95,
    } = options;

    try {
      // 1. Obtener el elemento HTML
      const element =
        typeof elementOrSelector === 'string'
          ? document.querySelector<HTMLElement>(elementOrSelector)
          : elementOrSelector;

      if (!element) {
        throw new Error(
          `Element not found: ${typeof elementOrSelector === 'string' ? elementOrSelector : 'provided element'}`,
        );
      }

      // 2. Capturar el HTML como canvas
      console.log('📸 Capturando HTML como imagen...');
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true, // Permitir imágenes de otros dominios
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        allowTaint: false,
      });

      // 3. Obtener dimensiones del canvas
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 4. Dimensiones del PDF (mm)
      const pdfWidth = format === 'a4' ? 210 : 215.9; // A4 o Letter
      const pdfHeight = format === 'a4' ? 297 : 279.4;

      // 5. Calcular ratio para mantener proporción
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      // 6. Dimensiones finales de la imagen en el PDF
      const imgPdfWidth = imgWidth * ratio;
      const imgPdfHeight = imgHeight * ratio;

      // 7. Crear documento PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
        compress: true,
      });

      // 8. Agregar imagen al PDF
      const imgData = canvas.toDataURL('image/jpeg', quality);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgPdfWidth, imgPdfHeight);

      // 9. Descargar PDF
      console.log('✅ PDF generado exitosamente');
      pdf.save(filename);
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw new Error('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
  }

  /**
   * Genera un PDF multipágina si el contenido es muy largo
   *
   * @param elementOrSelector - Elemento HTML o selector CSS
   * @param options - Opciones de configuración del PDF
   */
  async generateMultiPagePdf(
    elementOrSelector: HTMLElement | string,
    options: PdfOptions = {},
  ): Promise<void> {
    const {
      filename = 'document.pdf',
      format = 'a4',
      orientation = 'portrait',
      scale = 2,
      quality = 0.95,
    } = options;

    try {
      // 1. Obtener el elemento HTML
      const element =
        typeof elementOrSelector === 'string'
          ? document.querySelector<HTMLElement>(elementOrSelector)
          : elementOrSelector;

      if (!element) {
        throw new Error('Element not found');
      }

      // 2. Capturar HTML como canvas
      console.log('📸 Capturando HTML como imagen...');
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      });

      // 3. Dimensiones del PDF (mm)
      const pdfWidth = format === 'a4' ? 210 : 215.9;
      const pdfHeight = format === 'a4' ? 297 : 279.4;

      // 4. Crear documento PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
        compress: true,
      });

      // 5. Convertir canvas a imagen
      const imgData = canvas.toDataURL('image/jpeg', quality);

      // 6. Dimensiones de la imagen
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 7. Calcular cuántas páginas se necesitan
      const ratio = pdfWidth / imgWidth;
      const imgPdfHeight = imgHeight * ratio;
      const pageHeight = pdfHeight;

      let heightLeft = imgPdfHeight;
      let position = 0;

      // 8. Agregar primera página
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pageHeight;

      // 9. Agregar páginas adicionales si es necesario
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pageHeight;
      }

      // 10. Descargar PDF
      console.log(`✅ PDF multipágina generado (${pdf.getNumberOfPages()} páginas)`);
      pdf.save(filename);
    } catch (error) {
      console.error('❌ Error generando PDF multipágina:', error);
      throw new Error('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
  }
}
