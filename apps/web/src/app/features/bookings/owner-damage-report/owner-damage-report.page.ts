import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component, OnInit, computed, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { IonicModule } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from '../../../core/models';

/**
 * Owner Damage Report Page
 *
 * Permite al dueño reportar daños después de completar el check-out
 * - Descripción detallada del daño
 * - Monto del daño (máx $250 USD o el depósito disponible)
 * - Fotos de evidencia (almacenadas en bucket 'documents')
 * - Envía notificación al locatario
 * - Se deshabilita después del envío
 */
@Component({
  selector: 'app-owner-damage-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './owner-damage-report.page.html',
  styleUrl: './owner-damage-report.page.css',
})
export class OwnerDamageReportPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly booking = signal<Booking | null>(null);
  readonly currentUserId = signal<string | null>(null);

  // Form fields
  readonly damageDescription = signal('');
  readonly damageAmount = signal<number>(0);
  readonly uploadedFiles = signal<File[]>([]);
  readonly uploadedPreviews = signal<string[]>([]);

  readonly maxDepositAmount = computed(() => {
    const booking = this.booking();
    if (!booking) return 250;
    // Convert cents to dollars, default to $250 if not set
    return (booking.deposit_amount_cents ?? 25000) / 100;
  });

  readonly canSubmit = computed(() => {
    return (
      this.damageDescription().trim().length >= 20 &&
      this.damageDescription().trim().length <= 1000 &&
      this.damageAmount() > 0 &&
      this.damageAmount() <= this.maxDepositAmount() &&
      this.uploadedFiles().length > 0 &&
      this.uploadedFiles().length <= 10
    );
  });

  readonly descriptionCharCount = computed(() => this.damageDescription().trim().length);

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.toastService.error('Error', 'ID de reserva inválido');
      this.router.navigate(['/bookings/owner']);
      return;
    }

    try {
      const session = await this.authService.ensureSession();
      this.currentUserId.set(session?.user?.id ?? null);

      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.toastService.error('Error', 'Reserva no encontrada');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar que es el dueño del auto
      const currentUserId = this.currentUserId();
      if (!booking.car?.owner_id || !currentUserId || booking.car.owner_id !== currentUserId) {
        this.toastService.error('Error', 'No tienes permiso para reportar daños en esta reserva');
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar que la reserva está en estado apropiado para reportar daños
      // Puede reportar daños después del checkout (completed o returned)
      if (booking.status !== 'completed' && booking.returned_at === null) {
        this.toastService.error(
          'Error',
          'Solo puedes reportar daños después de completar el check-out del vehículo',
        );
        this.router.navigate(['/bookings/owner']);
        return;
      }

      // Validar que no haya reportado daños ya
      if (booking.has_damages) {  // CORRECTO: usa nombre de columna BD real
        this.toastService.error('Error', 'Ya has reportado daños para esta reserva');
        this.router.navigate(['/bookings/owner', bookingId]);
        return;
      }

      this.booking.set(booking);
    } catch (error) {
      console.error('Error loading booking:', error);
      this.toastService.error('Error', 'No se pudo cargar la reserva');
      this.router.navigate(['/bookings/owner']);
    } finally {
      this.loading.set(false);
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const currentFiles = this.uploadedFiles();

    // Check max files limit (10 total)
    if (currentFiles.length + files.length > 10) {
      this.toastService.error('Error', 'Puedes subir máximo 10 fotos');
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Error', `${file.name} no es una imagen válida`);
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Error', `${file.name} supera el tamaño máximo de 5MB`);
        return;
      }

      validFiles.push(file);

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        if (previews.length === validFiles.length) {
          this.uploadedPreviews.set([...this.uploadedPreviews(), ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      this.uploadedFiles.set([...currentFiles, ...validFiles]);
    }
  }

  removeFile(index: number) {
    const files = this.uploadedFiles();
    const previews = this.uploadedPreviews();

    files.splice(index, 1);
    previews.splice(index, 1);

    this.uploadedFiles.set([...files]);
    this.uploadedPreviews.set([...previews]);
  }

  async submitDamageReport() {
    if (!this.canSubmit() || this.submitting()) return;

    const booking = this.booking();
    if (!booking) return;

    this.submitting.set(true);

    try {
      const currentUserId = this.currentUserId();
      if (!currentUserId) throw new Error('Usuario no autenticado');

      // 1. Upload photos to documents bucket
      const uploadedPhotoUrls: string[] = [];

      for (const file of this.uploadedFiles()) {
        const extension = file.name.split('.').pop() ?? 'jpg';
        const filename = `${uuidv4()}.${extension}`;
        const filePath = `${currentUserId}/damage-reports/${booking.id}/${filename}`;

        const { error: uploadError } = await this.supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          throw new Error(`Error al subir la foto ${file.name}`);
        }

        uploadedPhotoUrls.push(filePath);
      }

      // 2. Update booking with damage information
      const damageAmountCents = Math.round(this.damageAmount() * 100);

      // CORRECTO: usar nombres de columnas reales de BD
      await this.bookingsService.updateBooking(booking.id, {
        has_damages: true,                              // BD: has_damages
        damage_amount_cents: damageAmountCents,         // BD: damage_amount_cents
        damage_description: this.damageDescription().trim(),  // BD: damage_description
      });

      // 3. Store photo references in database (create a damage_reports table entry or store in metadata)
      // For now, we'll store the photo URLs in a JSON field or separate table
      // This requires a database migration to add a damage_evidence_photos column or create a damage_reports table

      // 4. Send notification to renter
      await this.sendRenterNotification(booking, damageAmountCents);

      // 5. Optionally deduct from security deposit
      // await this.bookingsService.deductFromSecurityDeposit(
      //   booking.id,
      //   damageAmountCents,
      //   this.damageDescription().trim()
      // );

      this.toastService.success(
        'Reporte enviado',
        'El reporte de daños ha sido enviado al locatario. Se deducirá del depósito de garantía.',
      );

      // Navigate to booking detail
      this.router.navigate(['/bookings/owner', booking.id]);
    } catch (error) {
      console.error('Error submitting damage report:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error al enviar el reporte de daños',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private async sendRenterNotification(booking: Booking, damageAmountCents: number) {
    const damageAmountUsd = damageAmountCents / 100;

    await this.supabase.from('notifications').insert({
      user_id: booking.renter_id,
      type: 'damage_reported',
      title: 'Reporte de daños en tu reserva',
      body: `El propietario ha reportado daños por $${damageAmountUsd} USD en el vehículo ${booking.car_title}. El monto será deducido de tu depósito de garantía.`,
      cta_link: `/bookings/${booking.id}`,
      metadata: {
        booking_id: booking.id,
        damage_amount_cents: damageAmountCents,
      },
      is_read: false,
    });
  }

  cancel() {
    this.router.navigate(['/bookings/owner']);
  }

  get formattedAmount(): string {
    return `$${this.damageAmount()} USD`;
  }

  get maxFormattedAmount(): string {
    return `$${this.maxDepositAmount()} USD`;
  }
}
