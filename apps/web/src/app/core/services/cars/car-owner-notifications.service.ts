import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { NotificationsService } from '@core/services/infrastructure/user-notifications.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Response type from check-missing-documents-batch Edge Function
 */
interface CarDocumentStatus {
  car_id: string;
  car_title: string;
  plate: string | null;
  missing_documents: string[];
  expiring_soon: string[];
  expired: string[];
  status: 'ok' | 'warning' | 'critical';
}

interface CarDocumentBatchResult {
  cars: CarDocumentStatus[];
  summary: {
    total_cars: number;
    cars_with_issues: number;
    total_missing: number;
    total_expiring: number;
    total_expired: number;
  };
  checked_at: string;
}

/**
 * CarOwnerNotificationsService
 *
 * Servicio especializado para generar notificaciones para locadores (dueños de autos).
 * Proporciona notificaciones contextuales y accionables para diferentes eventos.
 *
 * @example
 * ```typescript
 * // Cuando alguien envía un mensaje
 * carOwnerNotifications.notifyNewChatMessage('Juan Pérez', 'Porsche 911', '/messages?carId=123');
 *
 * // Cuando alguien solicita una reserva
 * carOwnerNotifications.notifyNewBookingRequest('María García', 'Porsche 911', 25000, '/bookings/abc123');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class CarOwnerNotificationsService {
  private readonly logger = inject(LoggerService);
  private readonly notificationManager = inject(NotificationManagerService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly supabase = injectSupabase();

  /**
   * Notificación cuando alguien envía un mensaje en el chat
   *
   * @param senderName - Nombre de quien envía el mensaje
   * @param carName - Nombre del auto (ej: "Porsche 911 Carrera")
   * @param messagePreview - Vista previa del mensaje (primeros 50 caracteres)
   * @param chatUrl - URL para ir al chat
   */
  notifyNewChatMessage(
    senderName: string,
    carName: string,
    messagePreview?: string,
    chatUrl?: string,
  ): void {
    const safePreview = messagePreview?.trim();
    const preview = safePreview
      ? `"${safePreview.substring(0, 50)}${safePreview.length > 50 ? '...' : ''}"`
      : 'Mensaje nuevo';
    const subtitle = carName ? `Sobre ${carName}` : 'Nuevo mensaje';

    this.notificationManager.show({
      title: senderName,
      message: `${subtitle}\n${preview}`,
      type: 'info',
      priority: 'normal',
      duration: 8000,
      sound: true,
      groupKey: chatUrl || `chat:${senderName}:${carName}`,
      data: {
        kind: 'chat',
        senderName,
        subtitle,
        preview,
      },
      actions: chatUrl
        ? [
            {
              label: 'Ver mensaje',
              icon: '💬',
              command: () => {
                if (chatUrl) {
                  this.router.navigateByUrl(chatUrl);
                }
              },
            },
            {
              label: 'Cerrar',
              styleClass: 'p-button-text',
              command: () => {},
            },
          ]
        : undefined,
    });
  }

  /**
   * Notificación cuando alguien solicita una reserva
   *
   * @param renterName - Nombre del locatario
   * @param carName - Nombre del auto
   * @param pricePerDay - Precio por día
   * @param bookingUrl - URL para ver la reserva
   */
  notifyNewBookingRequest(
    renterName: string,
    carName: string,
    pricePerDay: number,
    bookingUrl: string,
  ): void {
    this.notificationManager.show({
      title: '🎉 ¡Nueva solicitud de reserva!',
      message: `${renterName} quiere reservar tu ${carName} por $${pricePerDay.toLocaleString('es-AR')}/día. Revisa los detalles y aprueba o rechaza la solicitud.`,
      type: 'success',
      priority: 'high',
      duration: 10000,
      sound: true,
      actions: [
        {
          label: 'Ver reserva',
          icon: '👁️',
          command: () => {
            this.router.navigateByUrl(bookingUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando alguien está viendo su auto
   * (Útil para mostrar interés, pero no invasivo)
   *
   * @param viewerCount - Cantidad de personas viendo el auto actualmente
   * @param carName - Nombre del auto
   */
  notifyCarViews(carName: string, viewerCount: number): void {
    if (viewerCount === 0) return; // No notificar si no hay vistas

    const message =
      viewerCount === 1
        ? `Una persona está viendo tu ${carName} ahora mismo.`
        : `${viewerCount} personas están viendo tu ${carName} ahora mismo.`;

    this.notificationManager.info('👀 Tu auto está siendo visto', message, 5000);
  }

  /**
   * Notificación cuando se completa una reserva exitosamente
   *
   * @param renterName - Nombre del locatario
   * @param carName - Nombre del auto
   * @param totalAmount - Monto total de la reserva
   * @param bookingUrl - URL para ver la reserva
   */
  notifyBookingConfirmed(
    renterName: string,
    carName: string,
    totalAmount: number,
    bookingUrl: string,
  ): void {
    this.notificationManager.show({
      title: '✅ Reserva confirmada',
      message: `¡${renterName} confirmó la reserva de tu ${carName}! Total: $${totalAmount.toLocaleString('es-AR')}. El pago se procesará automáticamente.`,
      type: 'success',
      priority: 'high',
      duration: 10000,
      sound: true,
      actions: [
        {
          label: 'Ver detalles',
          icon: '📋',
          command: () => {
            this.router.navigateByUrl(bookingUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando se recibe un pago
   *
   * @param amount - Monto recibido
   * @param bookingId - ID de la reserva
   * @param bookingUrl - URL para ver la reserva
   */
  notifyPaymentReceived(amount: number, bookingId: string, bookingUrl: string): void {
    this.notificationManager.show({
      title: '💰 Pago recibido',
      message: `Has recibido $${amount.toLocaleString('es-AR')} por la reserva #${bookingId.substring(0, 8)}. El dinero está disponible en tu wallet.`,
      type: 'success',
      priority: 'high',
      duration: 10000,
      sound: true,
      actions: [
        {
          label: 'Ver wallet',
          icon: '💳',
          command: () => {
            this.router.navigate(['/wallet']);
          },
        },
        {
          label: 'Ver reserva',
          icon: '📋',
          command: () => {
            this.router.navigateByUrl(bookingUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando alguien deja una reseña
   *
   * @param reviewerName - Nombre de quien dejó la reseña
   * @param rating - Calificación (1-5)
   * @param carName - Nombre del auto
   * @param reviewUrl - URL para ver la reseña
   */
  notifyNewReview(reviewerName: string, rating: number, carName: string, reviewUrl?: string): void {
    const stars = '⭐'.repeat(rating);
    const emptyStars = '☆'.repeat(5 - rating);

    this.notificationManager.show({
      title: '⭐ Nueva reseña',
      message: `${reviewerName} dejó una reseña de ${stars}${emptyStars} para tu ${carName}.`,
      type: 'info',
      priority: 'normal',
      duration: 8000,
      sound: false,
      actions: reviewUrl
        ? [
            {
              label: 'Ver reseña',
              icon: '⭐',
              command: () => {
                this.router.navigateByUrl(reviewUrl);
              },
            },
            {
              label: 'Cerrar',
              styleClass: 'p-button-text',
              command: () => {},
            },
          ]
        : undefined,
    });
  }

  /**
   * Notificación cuando se cancela una reserva
   *
   * @param renterName - Nombre del locatario
   * @param carName - Nombre del auto
   * @param reason - Razón de la cancelación (opcional)
   */
  notifyBookingCancelled(renterName: string, carName: string, reason?: string): void {
    const reasonText = reason ? ` Razón: ${reason}` : '';

    this.notificationManager.warning(
      '⚠️ Reserva cancelada',
      `${renterName} canceló la reserva de tu ${carName}.${reasonText}`,
      8000,
    );
  }

  /**
   * Notificación cuando el auto necesita atención (ej: fecha de inspección próxima)
   *
   * @param carName - Nombre del auto
   * @param message - Mensaje específico sobre la atención necesaria
   * @param actionUrl - URL para realizar la acción
   */
  notifyCarNeedsAttention(carName: string, message: string, actionUrl?: string): void {
    this.notificationManager.show({
      title: '🔧 Tu auto necesita atención',
      message: `${carName}: ${message}`,
      type: 'warning',
      priority: 'normal',
      duration: 8000,
      sound: false,
      actions: actionUrl
        ? [
            {
              label: 'Ver detalles',
              icon: '🔧',
              command: () => {
                this.router.navigateByUrl(actionUrl);
              },
            },
            {
              label: 'Cerrar',
              styleClass: 'p-button-text',
              command: () => {},
            },
          ]
        : undefined,
    });
  }

  /**
   * Notificación de logro/milestone (ej: "Tu auto ha sido visto 100 veces")
   *
   * @param achievement - Descripción del logro
   * @param carName - Nombre del auto
   */
  notifyAchievement(achievement: string, carName: string): void {
    this.notificationManager.show({
      title: '🎯 ¡Logro alcanzado!',
      message: `${achievement} para tu ${carName}. ¡Sigue así!`,
      type: 'success',
      priority: 'low',
      duration: 6000,
      sound: false,
    });
  }

  /**
   * Notificación cuando hay una pregunta frecuente sin responder
   *
   * @param questionCount - Cantidad de preguntas sin responder
   * @param carName - Nombre del auto
   * @param chatUrl - URL para ir al chat
   */
  notifyUnansweredQuestions(questionCount: number, carName: string, chatUrl: string): void {
    const message =
      questionCount === 1
        ? `Tienes una pregunta sin responder sobre tu ${carName}.`
        : `Tienes ${questionCount} preguntas sin responder sobre tu ${carName}.`;

    this.notificationManager.show({
      title: '❓ Preguntas pendientes',
      message,
      type: 'info',
      priority: 'normal',
      duration: 8000,
      sound: true,
      actions: [
        {
          label: 'Responder',
          icon: '💬',
          command: () => {
            this.router.navigateByUrl(chatUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando el auto está destacado o promocionado
   *
   * @param carName - Nombre del auto
   * @param promotionDetails - Detalles de la promoción
   */
  notifyCarFeatured(carName: string, promotionDetails: string): void {
    this.notificationManager.show({
      title: '⭐ Tu auto está destacado',
      message: `Tu ${carName} está siendo promocionado: ${promotionDetails}`,
      type: 'success',
      priority: 'normal',
      duration: 8000,
      sound: false,
    });
  }

  /**
   * Notificación cuando falta un documento requerido
   *
   * @param documentType - Tipo de documento (DNI, Cédula, Seguro, etc.)
   * @param carName - Nombre del auto
   * @param documentsUrl - URL para subir documentos
   */
  notifyMissingDocument(documentType: string, carName: string, documentsUrl: string): void {
    const title = '📄 Documento requerido';
    const message = `Para publicar tu ${carName} necesitas subir tu ${documentType}. Es necesario para verificar tu identidad y la propiedad del vehículo.`;

    // Mostrar toast
    this.notificationManager.show({
      title,
      message,
      type: 'warning',
      priority: 'high',
      duration: 10000,
      sound: true,
      actions: [
        {
          label: 'Subir documento',
          icon: '📤',
          command: () => {
            this.router.navigateByUrl(documentsUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });

    // ✅ NUEVO: Guardar en base de datos para que aparezca en el panel de notificaciones
    this.saveNotificationToDatabase(title, message, 'warning', documentsUrl, {
      documentType,
      carName,
    }).catch(() => {
      // Silently fail - toast is more important
    });
  }

  /**
   * Helper para guardar notificación en la base de datos
   */
  private async saveNotificationToDatabase(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    actionUrl?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        console.warn('No user found, cannot save notification');
        return;
      }

      // Mapear tipo de UI a tipo de DB
      const dbType = 'generic_announcement';

      const result = await this.notificationsService.createNotification(
        user.id,
        {
          title,
          message,
          type,
          actionUrl,
          metadata,
        },
        dbType,
      );

      if (result) {
        this.logger.debug('✅ Notificación guardada en BD:', title);
        // Refrescar notificaciones para que aparezcan inmediatamente
        await this.notificationsService.refresh();
      }
    } catch (error) {
      // Log error pero no fallar - toast notification is more important
      console.error('❌ Error al guardar notificación en BD:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
  }

  /**
   * Notificación cuando un documento está próximo a vencer
   *
   * @param documentType - Tipo de documento
   * @param carName - Nombre del auto
   * @param daysUntilExpiry - Días hasta que venza
   * @param documentsUrl - URL para renovar documentos
   */
  notifyDocumentExpiring(
    documentType: string,
    carName: string,
    daysUntilExpiry: number,
    documentsUrl: string,
  ): void {
    const urgency = daysUntilExpiry <= 7 ? 'urgente' : 'próximo';
    const message =
      daysUntilExpiry === 1
        ? `Tu ${documentType} de ${carName} vence mañana. Renuvalo ahora para evitar interrupciones en tus reservas.`
        : `Tu ${documentType} de ${carName} vence en ${daysUntilExpiry} días. Renuvalo para mantener tu auto disponible.`;

    this.notificationManager.show({
      title: `⚠️ ${documentType} ${urgency} a vencer`,
      message,
      type: daysUntilExpiry <= 7 ? 'error' : 'warning',
      priority: daysUntilExpiry <= 7 ? 'critical' : 'high',
      duration: 12000,
      sound: true,
      actions: [
        {
          label: 'Renovar documento',
          icon: '🔄',
          command: () => {
            this.router.navigateByUrl(documentsUrl);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando un documento es verificado o rechazado
   *
   * @param documentType - Tipo de documento
   * @param carName - Nombre del auto
   * @param status - Estado: 'verified' o 'rejected'
   * @param reason - Razón del rechazo (si aplica)
   * @param documentsUrl - URL para ver documentos
   */
  notifyDocumentStatusChanged(
    documentType: string,
    carName: string,
    status: 'verified' | 'rejected',
    reason?: string,
    documentsUrl?: string,
  ): void {
    if (status === 'verified') {
      this.notificationManager.success(
        '✅ Documento verificado',
        `Tu ${documentType} de ${carName} ha sido verificado exitosamente. Tu auto está listo para recibir reservas.`,
        8000,
      );
    } else {
      const message = reason
        ? `Tu ${documentType} de ${carName} fue rechazado: ${reason}. Por favor sube un documento válido.`
        : `Tu ${documentType} de ${carName} fue rechazado. Por favor sube un documento válido.`;

      this.notificationManager.show({
        title: '❌ Documento rechazado',
        message,
        type: 'error',
        priority: 'high',
        duration: 10000,
        sound: true,
        actions: documentsUrl
          ? [
              {
                label: 'Ver detalles',
                icon: '👁️',
                command: () => {
                  this.router.navigateByUrl(documentsUrl);
                },
              },
              {
                label: 'Cerrar',
                styleClass: 'p-button-text',
                command: () => {},
              },
            ]
          : undefined,
      });
    }
  }

  /**
   * Notificación mensual de depreciación del auto
   *
   * @param carName - Nombre del auto
   * @param currentValue - Valor actual del auto
   * @param monthlyDepreciation - Depreciación mensual
   * @param monthlyEarnings - Ganancias mensuales con AutoRenta
   * @param netGain - Ganancia neta (ganancias - depreciación)
   * @param carUrl - URL para ver el auto
   */
  notifyMonthlyDepreciation(
    carName: string,
    currentValue: number,
    monthlyDepreciation: number,
    monthlyEarnings: number,
    netGain: number,
    carUrl: string,
  ): void {
    const isProfitable = netGain > 0;
    const message = isProfitable
      ? `Tu ${carName} se depreció $${monthlyDepreciation.toLocaleString('es-AR')} este mes, pero ganaste $${monthlyEarnings.toLocaleString('es-AR')} con AutoRenta. ¡Ganancia neta de $${netGain.toLocaleString('es-AR')}! 💰`
      : `Tu ${carName} se depreció $${monthlyDepreciation.toLocaleString('es-AR')} este mes. Ganaste $${monthlyEarnings.toLocaleString('es-AR')} con AutoRenta. Optimiza tu precio para aumentar tus ganancias.`;

    this.notificationManager.show({
      title: isProfitable
        ? '💰 Reporte mensual: ¡Estás ganando!'
        : '📊 Reporte mensual de depreciación',
      message,
      type: isProfitable ? 'success' : 'info',
      priority: 'normal',
      duration: 12000,
      sound: false,
      actions: [
        {
          label: 'Ver detalles',
          icon: '📈',
          command: () => {
            this.router.navigateByUrl(carUrl);
          },
        },
        {
          label: 'Optimizar precio',
          icon: '⚡',
          command: () => {
            this.router.navigate([carUrl, 'edit']);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación educativa sobre cómo ganar dinero con AutoRenta
   *
   * @param carName - Nombre del auto
   * @param tips - Array de tips personalizados
   */
  notifyHowToEarnMoney(carName: string, tips?: string[]): void {
    const defaultTips = [
      'Aumenta tu precio en temporada alta para maximizar ganancias',
      'Mantén tu auto disponible los fines de semana (mayor demanda)',
      'Completa tu perfil y documentos para aumentar confianza',
      'Responde rápido a los mensajes para cerrar más reservas',
      'Usa fotos profesionales para destacar tu auto',
    ];

    const tipsToShow = tips || defaultTips;
    const randomTip = tipsToShow[Math.floor(Math.random() * tipsToShow.length)];

    this.notificationManager.show({
      title: '💡 Consejo para ganar más',
      message: `Con tu ${carName}: ${randomTip}. ¡Sigue así y aumenta tus ganancias con AutoRenta!`,
      type: 'info',
      priority: 'low',
      duration: 10000,
      sound: false,
      actions: [
        {
          label: 'Ver más consejos',
          icon: '📚',
          command: () => {
            this.router.navigate(['/help', 'earning-tips']);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando el auto no está generando suficientes ganancias
   *
   * @param carName - Nombre del auto
   * @param monthlyEarnings - Ganancias mensuales
   * @param recommendedPrice - Precio recomendado
   * @param carUrl - URL para editar el auto
   */
  notifyLowEarnings(
    carName: string,
    monthlyEarnings: number,
    recommendedPrice: number,
    carUrl: string,
  ): void {
    this.notificationManager.show({
      title: '📉 Oportunidad de mejorar',
      message: `Tu ${carName} generó $${monthlyEarnings.toLocaleString('es-AR')} este mes. Te recomendamos ajustar el precio a $${recommendedPrice.toLocaleString('es-AR')}/día para aumentar tus ganancias y contrarrestar la depreciación.`,
      type: 'warning',
      priority: 'normal',
      duration: 12000,
      sound: false,
      actions: [
        {
          label: 'Ajustar precio',
          icon: '💰',
          command: () => {
            this.router.navigate([carUrl, 'edit']);
          },
        },
        {
          label: 'Ver análisis',
          icon: '📊',
          command: () => {
            this.router.navigate([carUrl, 'analytics']);
          },
        },
        {
          label: 'Cerrar',
          styleClass: 'p-button-text',
          command: () => {},
        },
      ],
    });
  }

  /**
   * Notificación cuando el auto está generando excelentes ganancias
   *
   * @param carName - Nombre del auto
   * @param monthlyEarnings - Ganancias mensuales
   * @param monthlyDepreciation - Depreciación mensual
   * @param netGain - Ganancia neta
   */
  notifyExcellentEarnings(
    carName: string,
    monthlyEarnings: number,
    monthlyDepreciation: number,
    netGain: number,
  ): void {
    this.notificationManager.show({
      title: '🎉 ¡Excelente mes!',
      message: `Tu ${carName} generó $${monthlyEarnings.toLocaleString('es-AR')} este mes, superando la depreciación de $${monthlyDepreciation.toLocaleString('es-AR')}. ¡Ganancia neta de $${netGain.toLocaleString('es-AR')}! Sigue así.`,
      type: 'success',
      priority: 'normal',
      duration: 10000,
      sound: false,
    });
  }

  /**
   * Método público para verificar y notificar documentos faltantes para todos los autos del usuario
   * Utiliza el Edge Function check-missing-documents-batch para evitar N+1 queries
   *
   * @returns CarDocumentStatus[] | null - Array con el estado de documentos de cada auto
   */
  async checkAndNotifyMissingDocumentsForAllCars(): Promise<CarDocumentBatchResult | null> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        this.logger.warn('No session found, cannot check missing documents');
        return null;
      }

      // Use Edge Function for batch query (fixes N+1 problem)
      const { data, error } = await this.supabase.functions.invoke<CarDocumentBatchResult>(
        'check-missing-documents-batch',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        this.logger.error('Error calling check-missing-documents-batch:', error);
        return null;
      }

      if (!data || !data.cars || data.cars.length === 0) {
        this.logger.debug('No cars found for user');
        return data ?? null;
      }

      // Notify for cars with issues
      for (const car of data.cars) {
        if (car.status === 'ok') continue;

        const carName = car.car_title || 'tu auto';
        const documentsUrl = `/cars/${car.car_id}/documents`;

        // Notify about missing documents
        for (const docKind of car.missing_documents) {
          const documentType = this.getDocumentKindLabel(docKind);
          this.notifyMissingDocument(documentType, carName, documentsUrl);
          // Small pause between notifications
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Notify about expiring documents
        for (const docKind of car.expiring_soon) {
          const documentType = this.getDocumentKindLabel(docKind);
          this.notifyDocumentExpiring(documentType, carName, 30, documentsUrl);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Notify about expired documents (high priority)
        for (const docKind of car.expired) {
          const documentType = this.getDocumentKindLabel(docKind);
          this.notifyDocumentExpiring(documentType, carName, 0, documentsUrl);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Error checking missing documents for all cars:', error);
      return null;
    }
  }

  /**
   * Get document status summary without notifications (useful for UI components)
   * Uses the batch Edge Function for optimal performance
   */
  async getDocumentStatusBatch(): Promise<CarDocumentBatchResult | null> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        return null;
      }

      const { data, error } = await this.supabase.functions.invoke<CarDocumentBatchResult>(
        'check-missing-documents-batch',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        this.logger.error('Error fetching document status batch:', error);
        return null;
      }

      return data ?? null;
    } catch (error) {
      this.logger.error('Error in getDocumentStatusBatch:', error);
      return null;
    }
  }

  /**
   * Helper para obtener el label de un tipo de documento
   */
  private getDocumentKindLabel(kind: string): string {
    const labels: Record<string, string> = {
      // Legacy document kinds
      registration: 'Registro / Título de Propiedad',
      insurance: 'Póliza de Seguro',
      technical_inspection: 'Inspección Técnica Vehicular',
      circulation_permit: 'Permiso de Circulación',
      ownership_proof: 'Comprobante de Titularidad',
      // Brazilian/Argentine document kinds
      cedula_verde: 'Cédula Verde',
      cedula_azul: 'Cédula Azul',
      vtv: 'VTV (Verificación Técnica Vehicular)',
      seguro: 'Póliza de Seguro',
      titulo: 'Título de Propiedad',
    };
    return labels[kind] || kind;
  }
}
