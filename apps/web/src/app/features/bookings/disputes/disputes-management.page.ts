import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  DisputesService,
  Dispute,
  DisputeEvidence,
  DisputeKind,
} from '@core/services/admin/disputes.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';
import { DEFAULT_DOCUMENT_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
import { Booking } from '../../../core/models';

@Component({
  selector: 'app-disputes-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, SkeletonLoaderComponent],
  templateUrl: './disputes-management.page.html',
  styleUrls: ['./disputes-management.page.scss'],
})
export class DisputesManagementPage implements OnInit, OnDestroy {
  private readonly disputesService = inject(DisputesService);
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private realtimeChannel: RealtimeChannel | null = null;

  readonly bookingId = signal<string>('');
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(false);
  readonly disputes = signal<Dispute[]>([]);
  readonly selectedDispute = signal<Dispute | null>(null);
  readonly showCreateForm = signal(false); // Inline form instead of modal
  readonly showEvidenceModal = signal(false);
  readonly evidence = signal<DisputeEvidence[]>([]);
  readonly uploadingEvidence = signal(false);
  private readonly maxEvidenceBytes = 2 * 1024 * 1024; // 2MB

  // Separate signals for form fields (fixes ngModel binding issue)
  readonly newDisputeKind = signal<DisputeKind | ''>('');
  readonly newDisputeDescription = signal('');

  readonly evidenceFiles = signal<File[]>([]);
  readonly evidenceNote = signal('');
  readonly newComment = signal('');

  // Role detection
  readonly userRole = computed<'owner' | 'renter' | 'guest'>(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    if (!booking || !currentUser) return 'guest';

    if (booking.owner_id === currentUser.id) return 'owner';
    if (booking.renter_id === currentUser.id) return 'renter';
    return 'guest';
  });

  readonly isOwner = computed(() => this.userRole() === 'owner');
  readonly isRenter = computed(() => this.userRole() === 'renter');

  readonly canCreateDispute = computed(() => {
    const booking = this.booking();
    if (!booking || this.userRole() === 'guest') return false;
    // Only allow disputes in certain statuses
    return ['in_progress', 'pending_review', 'completed'].includes(booking.status);
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastService.error('Error', 'ID de booking no encontrado');
      await this.router.navigate(['/bookings']);
      return;
    }

    this.bookingId.set(id);
    await Promise.all([this.loadBooking(), this.loadDisputes()]);

    // Suscribirse a cambios en tiempo real de disputas
    this.setupRealtimeSubscription(id);
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.realtimeConnection.unsubscribe(this.realtimeChannel.topic);
      this.realtimeChannel = null;
    }
  }

  private setupRealtimeSubscription(bookingId: string): void {
    this.realtimeChannel = this.realtimeConnection.subscribeWithRetry<Dispute>(
      `disputes-booking-${bookingId}`,
      {
        event: '*',
        schema: 'public',
        table: 'disputes',
        filter: `booking_id=eq.${bookingId}`,
      },
      () => {
        // Recargar disputas cuando hay cambios
        void this.loadDisputes();
      },
    );
  }

  async loadBooking(): Promise<void> {
    try {
      const booking = await this.bookingsService.getBookingById(this.bookingId());
      this.booking.set(booking);
    } catch (err) {
      console.error('Error loading booking:', err);
      this.toastService.error('Error', 'No se pudo cargar la reserva');
    }
  }

  async loadDisputes(): Promise<void> {
    this.loading.set(true);
    try {
      const disputesList = await this.disputesService.listByBooking(this.bookingId());
      this.disputes.set(disputesList);
    } catch (err) {
      console.error('Error loading disputes:', err);
      this.toastService.error('Error', 'No se pudieron cargar las disputas');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateForm(): void {
    if (!this.canCreateDispute()) {
      this.toastService.warning('Advertencia', 'No puedes crear disputas en este momento');
      return;
    }
    this.showCreateForm.set(true);
    this.newDisputeKind.set('');
    this.newDisputeDescription.set('');
    this.evidenceFiles.set([]);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.newDisputeKind.set('');
    this.newDisputeDescription.set('');
    this.evidenceFiles.set([]);
  }

  async createDispute(): Promise<void> {
    const kind = this.newDisputeKind();
    const description = this.newDisputeDescription();

    if (!kind || !description.trim()) {
      this.toastService.error('Error', 'Debe completar todos los campos');
      return;
    }

    this.loading.set(true);
    try {
      const dispute = await this.disputesService.createDispute({
        bookingId: this.bookingId(),
        kind: kind as DisputeKind,
        description: description.trim(),
      });

      // Upload evidence if any
      if (this.evidenceFiles().length > 0) {
        await this.uploadEvidenceFiles(dispute.id);
      }

      this.toastService.success('Disputa creada exitosamente', '');
      this.closeCreateForm();
      await this.loadDisputes();
    } catch (err) {
      console.error('Error creating dispute:', err);
      this.toastService.error(
        'Error',
        err instanceof Error ? err.message : 'Error al crear disputa',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async openEvidenceModal(dispute: Dispute): Promise<void> {
    this.selectedDispute.set(dispute);
    this.loading.set(true);
    try {
      const evidenceList = await this.disputesService.listEvidence(dispute.id);
      this.evidence.set(evidenceList);
      this.showEvidenceModal.set(true);
    } catch (err) {
      console.error('Error loading evidence:', err);
      this.toastService.error('Error', 'No se pudieron cargar las evidencias');
    } finally {
      this.loading.set(false);
    }
  }

  closeEvidenceModal(): void {
    this.showEvidenceModal.set(false);
    this.selectedDispute.set(null);
    this.evidence.set([]);
    this.evidenceFiles.set([]);
    this.evidenceNote.set('');
    this.newComment.set(''); // Clear newComment when closing the modal
  }

  onEvidenceFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.evidenceFiles.set(Array.from(input.files));
    }
  }

  async uploadEvidenceFiles(disputeId: string): Promise<void> {
    if (this.evidenceFiles().length === 0) return;

    this.uploadingEvidence.set(true);
    const supabase = this.supabaseService.getClient();

    try {
      for (const file of this.evidenceFiles()) {
        const validation = validateFile(file, {
          maxSizeBytes: this.maxEvidenceBytes,
          allowedMimeTypes: DEFAULT_DOCUMENT_MIME_TYPES,
        });

        if (!validation.valid) {
          this.toastService.error('Error', validation.error || 'Archivo no válido');
          continue;
        }

        // Upload to storage
        const filePath = `disputes/${disputeId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        // Add evidence record
        await this.disputesService.addEvidence(
          disputeId,
          urlData.publicUrl,
          this.evidenceNote() || undefined,
        );
      }

      this.toastService.success('Evidencias subidas exitosamente', '');
      this.evidenceFiles.set([]);
      this.evidenceNote.set('');
      await this.loadDisputes();
    } catch (err) {
      console.error('Error uploading evidence:', err);
      this.toastService.error('Error', 'Error al subir evidencias');
    } finally {
      this.uploadingEvidence.set(false);
    }
  }

  async addEvidenceToSelectedDispute(): Promise<void> {
    const dispute = this.selectedDispute();
    if (!dispute) return;

    await this.uploadEvidenceFiles(dispute.id);
    await this.openEvidenceModal(dispute); // Reload evidence
  }

  async addCommentToSelectedDispute(): Promise<void> {
    const dispute = this.selectedDispute();
    const comment = this.newComment();

    if (!dispute || !comment.trim()) {
      this.toastService.error('Error', 'El comentario no puede estar vacío');
      return;
    }

    this.uploadingEvidence.set(true); // Reusing this for loading state
    try {
      await this.disputesService.addEvidence(
        dispute.id,
        '', // Empty path for text-only comment
        comment.trim(),
      );
      this.toastService.success('Comentario agregado exitosamente', '');
      this.newComment.set(''); // Clear comment input
      await this.openEvidenceModal(dispute); // Reload evidence to show new comment
    } catch (err) {
      console.error('Error adding comment:', err);
      this.toastService.error('Error', 'Error al agregar comentario');
    } finally {
      this.uploadingEvidence.set(false);
    }
  }

  getStatusLabel(status: Dispute['status']): string {
    const labels: Record<Dispute['status'], string> = {
      open: 'Abierta',
      in_review: 'En revisión',
      resolved: 'Resuelta',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  }

  getStatusColor(status: Dispute['status']): string {
    switch (status) {
      case 'open':
        return 'warning';
      case 'in_review':
        return 'primary';
      case 'resolved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getKindLabel(kind: Dispute['kind']): string {
    const labels: Record<Dispute['kind'], string> = {
      damage: 'Daños',
      no_show: 'No se presentó',
      late_return: 'Devolución tardía',
      other: 'Otro',
    };
    return labels[kind] || kind;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isImage(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  }
}
