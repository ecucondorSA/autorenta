import { LoggerService } from '@core/services/infrastructure/logger.service';
import {Injectable, inject} from '@angular/core';

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
 * Las librerías se cargan bajo demanda (Lazy Loading) para no afectar
 * el tiempo de carga inicial de la aplicación.
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
  private readonly logger = inject(LoggerService);
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

      // 2. Cargar librerías dinámicamente
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // 3. Capturar el HTML como canvas
      this.logger.debug('📸 Capturando HTML como imagen...');
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true, // Permitir imágenes de otros dominios
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        allowTaint: false,
      });

      // 4. Obtener dimensiones del canvas
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 5. Dimensiones del PDF (mm)
      const pdfWidth = format === 'a4' ? 210 : 215.9; // A4 o Letter
      const pdfHeight = format === 'a4' ? 297 : 279.4;

      // 6. Calcular ratio para mantener proporción
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      // 7. Dimensiones finales de la imagen en el PDF
      const imgPdfWidth = imgWidth * ratio;
      const imgPdfHeight = imgHeight * ratio;

      // 8. Crear documento PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
        compress: true,
      });

      // 9. Agregar imagen al PDF
      const imgData = canvas.toDataURL('image/jpeg', quality);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgPdfWidth, imgPdfHeight);

      // 10. Descargar PDF
      this.logger.debug('✅ PDF generado exitosamente');
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

      // 2. Cargar librerías dinámicamente
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // 3. Capturar HTML como canvas
      this.logger.debug('📸 Capturando HTML como imagen...');
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      });

      // 4. Dimensiones del PDF (mm)
      const pdfWidth = format === 'a4' ? 210 : 215.9;
      const pdfHeight = format === 'a4' ? 297 : 279.4;

      // 5. Crear documento PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
        compress: true,
      });

      // 6. Convertir canvas a imagen
      const imgData = canvas.toDataURL('image/jpeg', quality);

      // 7. Dimensiones de la imagen
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 8. Calcular cuántas páginas se necesitan
      const ratio = pdfWidth / imgWidth;
      const imgPdfHeight = imgHeight * ratio;
      const pageHeight = pdfHeight;

      let heightLeft = imgPdfHeight;
      let position = 0;

      // 9. Agregar primera página
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pageHeight;

      // 10. Agregar páginas adicionales si es necesario
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pageHeight;
      }

      // 11. Descargar PDF
      this.logger.debug(`✅ PDF multipágina generado (${pdf.getNumberOfPages()} páginas)`);
      pdf.save(filename);
    } catch (error) {
      console.error('❌ Error generando PDF multipágina:', error);
      throw new Error('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
  }
}
