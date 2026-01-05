import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ContractTemplateService, ContractData } from './contract-template.service';

export interface GeneratePdfResult {
  success: boolean;
  pdfUrl?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Servicio para generar y almacenar PDFs de contratos de alquiler
 *
 * Flujo:
 * 1. Obtiene datos del booking (car, renter, owner, dates, amounts)
 * 2. Carga template HTML y hace merge con datos
 * 3. Renderiza HTML a canvas (html2canvas)
 * 4. Convierte canvas a PDF (jsPDF)
 * 5. Sube PDF a Supabase Storage
 * 6. Retorna URL pública del PDF
 */
/**
 * Mapping de aseguradoras argentinas a sus CUITs
 * Fuente: Superintendencia de Seguros de la Nación (SSN)
 */
const INSURANCE_COMPANY_CUITS: Record<string, string> = {
  // Aseguradoras aceptadas para BYOI (con cláusula alquiler sin chofer)
  'rio uruguay seguros': '30-50000618-1',
  'río uruguay seguros': '30-50000618-1',
  'rus': '30-50000618-1',
  'federacion patronal': '30-54619801-2',
  'federación patronal': '30-54619801-2',
  'la segunda': '30-50000261-5',
  'sancor': '30-50003191-0',
  'sancor seguros': '30-50003191-0',
  // Aseguradoras de flota
  'mapfre': '30-59049468-5',
  'mapfre argentina': '30-59049468-5',
  'san cristobal': '30-50003662-9',
  'san cristóbal': '30-50003662-9',
  'allianz': '30-64834298-8',
  'allianz argentina': '30-64834298-8',
  // Otras aseguradoras comunes
  'zurich': '30-50001008-8',
  'zurich argentina': '30-50001008-8',
  'mercantil andina': '30-50001404-0',
  'provincia seguros': '30-50003215-1',
  'sura': '30-50001461-0',
  'seguros sura': '30-50001461-0',
  'berkley': '30-70738065-3',
  'hdi': '30-62712332-1',
  'hdi seguros': '30-62712332-1',
  'integrity': '30-70917091-9',
  'integrity seguros': '30-70917091-9',
  'caja de seguros': '30-62730808-4',
  'prudencia seguros': '30-64869536-6',
  'libra seguros': '30-65049731-0',
  'smg seguros': '30-50001248-0',
};

@Injectable({
  providedIn: 'root',
})
export class ContractPdfService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);
  private readonly templateService = inject(ContractTemplateService);

  /**
   * Genera PDF del contrato y lo sube a Storage
   */
  async generateAndUpload(params: {
    bookingId: string;
    acceptedAt: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<GeneratePdfResult> {
    try {
      this.logger.info('[ContractPdf] Starting PDF generation', { bookingId: params.bookingId });

      // 1. Obtener datos del booking
      const contractData = await this.fetchContractData(params.bookingId);
      if (!contractData) {
        return { success: false, error: 'No se encontraron datos del booking' };
      }

      // Agregar metadata de aceptación
      contractData.renterAcceptedAt = params.acceptedAt;
      contractData.renterIp = params.ipAddress;
      contractData.renterUserAgent = params.userAgent;

      // 2. Cargar y mergear template
      const template = await this.templateService.loadTemplate('v1.0.0', 'es-AR');
      const mergedHtml = this.templateService.mergeData(template, contractData);

      // 3. Generar PDF
      const pdfBlob = await this.htmlToPdf(mergedHtml);

      // 4. Subir a Storage
      const storagePath = `contracts/${params.bookingId}/contrato-${Date.now()}.pdf`;
      const { publicUrl, error: uploadError } = await this.uploadToStorage(pdfBlob, storagePath);

      if (uploadError) {
        this.logger.error('[ContractPdf] Upload failed', uploadError);
        return { success: false, error: uploadError };
      }

      // 5. Actualizar booking_contracts con la URL
      await this.updateContractPdfUrl(params.bookingId, publicUrl, storagePath);

      this.logger.info('[ContractPdf] PDF generated successfully', { pdfUrl: publicUrl });

      return {
        success: true,
        pdfUrl: publicUrl,
        storagePath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('[ContractPdf] Generation failed', error);
      return { success: false, error: message };
    }
  }

  /**
   * Obtiene todos los datos necesarios para el contrato desde la DB
   */
  private async fetchContractData(bookingId: string): Promise<ContractData | null> {
    const client = this.supabase.getClient();

    const { data: booking, error } = await client
      .from('bookings')
      .select(`
        id,
        start_date,
        end_date,
        total_amount,
        created_at,
        renter:renter_id (
          id,
          full_name,
          document_number
        ),
        car:car_id (
          id,
          brand,
          model,
          year,
          plate,
          insurance_policy_number,
          insurance_company,
          owner:owner_id (
            id,
            full_name,
            document_number
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      this.logger.error('[ContractPdf] Booking not found', error);
      return null;
    }

    // Formatear fechas
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const emissionDate = new Date();

    const formatDate = (d: Date) =>
      d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatTime = (d: Date) =>
      d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    // Extraer datos de relaciones
    const renter = booking.renter as { full_name?: string; document_number?: string } | null;
    const car = booking.car as {
      brand?: string;
      model?: string;
      year?: number;
      plate?: string;
      insurance_policy_number?: string;
      insurance_company?: string;
      owner?: { full_name?: string; document_number?: string };
    } | null;

    return {
      bookingId: booking.id,
      emissionDate: formatDate(emissionDate),

      renterName: renter?.full_name || 'No especificado',
      renterDni: renter?.document_number || 'No especificado',
      ownerName: car?.owner?.full_name || 'No especificado',
      ownerDni: car?.owner?.document_number || 'No especificado',

      carBrand: car?.brand || 'No especificado',
      carModel: car?.model || 'No especificado',
      carYear: String(car?.year || 'No especificado'),
      carPlate: car?.plate || 'No especificado',

      insurancePolicyNumber: car?.insurance_policy_number || 'No especificado',
      insuranceCompany: car?.insurance_company || 'No especificada',
      insuranceCuit: this.getInsuranceCuit(car?.insurance_company),
      insuranceValidity: 'Vigente',
      insuranceCoverage: 'Terceros Completo',

      startDate: formatDate(startDate),
      startTime: formatTime(startDate),
      endDate: formatDate(endDate),
      endTime: formatTime(endDate),

      totalArs: new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(booking.total_amount || 0),
    };
  }

  /**
   * Convierte HTML a PDF usando html2canvas + jsPDF
   */
  private async htmlToPdf(html: string): Promise<Blob> {
    // Cargar librerías dinámicamente
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const html2canvas = html2canvasModule.default;
    const jsPDF = jsPDFModule.default;

    // Crear container temporal para renderizar el HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    try {
      // Renderizar a canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in pixels at 96 DPI
      });

      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Primera página
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Páginas adicionales si es necesario
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Convertir a Blob
      return pdf.output('blob');
    } finally {
      // Limpiar container temporal
      document.body.removeChild(container);
    }
  }

  /**
   * Sube el PDF a Supabase Storage
   */
  private async uploadToStorage(
    pdfBlob: Blob,
    path: string
  ): Promise<{ publicUrl: string; error?: string }> {
    const client = this.supabase.getClient();

    const { error: uploadError } = await client.storage
      .from('documents')
      .upload(path, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '31536000', // 1 year cache
        upsert: true,
      });

    if (uploadError) {
      return { publicUrl: '', error: uploadError.message };
    }

    const { data } = client.storage.from('documents').getPublicUrl(path);

    return { publicUrl: data.publicUrl };
  }

  /**
   * Actualiza la tabla booking_contracts con la URL del PDF
   */
  private async updateContractPdfUrl(
    bookingId: string,
    pdfUrl: string,
    storagePath: string
  ): Promise<void> {
    const client = this.supabase.getClient();

    const { error } = await client
      .from('booking_contracts')
      .update({
        pdf_url: pdfUrl,
        pdf_storage_path: storagePath,
        pdf_generated_at: new Date().toISOString(),
        pdf_generation_status: 'ready',
      })
      .eq('booking_id', bookingId);

    if (error) {
      this.logger.warn('[ContractPdf] Failed to update contract record', error);
    }
  }

  /**
   * Obtiene el CUIT de una aseguradora basándose en su nombre
   * Busca en el mapping de aseguradoras argentinas conocidas
   *
   * @param companyName - Nombre de la compañía de seguros
   * @returns CUIT formateado o 'No disponible' si no se encuentra
   */
  private getInsuranceCuit(companyName?: string | null): string {
    if (!companyName) {
      return 'No disponible';
    }

    // Normalizar el nombre para búsqueda (lowercase, sin acentos)
    const normalizedName = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Buscar coincidencia exacta primero
    if (INSURANCE_COMPANY_CUITS[normalizedName]) {
      return INSURANCE_COMPANY_CUITS[normalizedName];
    }

    // Buscar coincidencia parcial
    for (const [key, cuit] of Object.entries(INSURANCE_COMPANY_CUITS)) {
      const normalizedKey = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
        return cuit;
      }
    }

    // Si no se encuentra, retornar valor por defecto
    this.logger.warn(`[ContractPdf] Unknown insurance company: ${companyName}`);
    return 'No disponible';
  }
}
