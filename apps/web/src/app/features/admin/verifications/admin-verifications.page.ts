import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminService,
  VerificationQueueItem,
  VerificationStats,
} from '@core/services/admin/admin.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { TranslateModule } from '@ngx-translate/core';

type VerificationFilterType = 'all' | 'level_2' | 'level_3';
type VerificationFilterStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';

@Component({
  selector: 'autorenta-admin-verifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-verifications.page.html',
  styleUrl: './admin-verifications.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVerificationsPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(NotificationManagerService);

  // State signals
  private readonly verificationsSignal = signal<VerificationQueueItem[]>([]);
  private readonly statsSignal = signal<VerificationStats | null>(null);
  private readonly loadingSignal = signal<boolean>(true);
  private readonly statsLoadingSignal = signal<boolean>(true);
  private readonly filterTypeSignal = signal<VerificationFilterType>('all');
  private readonly filterStatusSignal = signal<VerificationFilterStatus>('PENDING');
  private readonly selectedVerificationSignal = signal<VerificationQueueItem | null>(null);
  private readonly documentFrontUrlSignal = signal<string | null>(null);
  private readonly documentBackUrlSignal = signal<string | null>(null);
  private readonly selfieUrlSignal = signal<string | null>(null);
  private readonly actionNotesSignal = signal<string>('');
  private readonly rejectionReasonSignal = signal<string>('');
  private readonly currentPageSignal = signal<number>(0);
  private readonly pageSize = 20;

  // Computed signals
  readonly verifications = computed(() => this.verificationsSignal());
  readonly stats = computed(() => this.statsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly statsLoading = computed(() => this.statsLoadingSignal());
  readonly filterType = computed(() => this.filterTypeSignal());
  readonly filterStatus = computed(() => this.filterStatusSignal());
  readonly selectedVerification = computed(() => this.selectedVerificationSignal());
  readonly documentFrontUrl = computed(() => this.documentFrontUrlSignal());
  readonly documentBackUrl = computed(() => this.documentBackUrlSignal());
  readonly selfieUrl = computed(() => this.selfieUrlSignal());
  readonly actionNotes = computed(() => this.actionNotesSignal());
  readonly rejectionReason = computed(() => this.rejectionReasonSignal());
  readonly currentPage = computed(() => this.currentPageSignal());

  readonly pendingCount = computed(() => this.statsSignal()?.pending_reviews ?? 0);
  readonly canLoadMore = computed(() => this.verificationsSignal().length >= this.pageSize);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadVerifications(), this.loadStats()]);
  }

  async loadVerifications(append: boolean = false): Promise<void> {
    if (!append) {
      this.loadingSignal.set(true);
      this.currentPageSignal.set(0);
    }

    try {
      const type = this.filterTypeSignal();
      const status = this.filterStatusSignal();
      const offset = this.currentPageSignal() * this.pageSize;

      const verifications = await this.adminService.getPendingVerifications(
        type === 'all' ? undefined : type,
        status === 'all' ? '' : status,
        this.pageSize,
        offset,
      );

      if (append) {
        this.verificationsSignal.update((current) => [...current, ...verifications]);
      } else {
        this.verificationsSignal.set(verifications);
      }
    } catch (error) {
      console.error('Error loading verifications:', error);
      if (!append) {
        this.verificationsSignal.set([]);
      }
      this.toastService.error('Error al cargar', 'No se pudieron cargar las verificaciones', 4000);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async loadStats(): Promise<void> {
    this.statsLoadingSignal.set(true);
    try {
      const stats = await this.adminService.getVerificationStats();
      this.statsSignal.set(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      this.statsLoadingSignal.set(false);
    }
  }

  async filterByType(type: VerificationFilterType): Promise<void> {
    this.filterTypeSignal.set(type);
    await this.loadVerifications();
  }

  async filterByStatus(status: VerificationFilterStatus): Promise<void> {
    this.filterStatusSignal.set(status);
    await this.loadVerifications();
  }

  async loadMore(): Promise<void> {
    this.currentPageSignal.update((page) => page + 1);
    await this.loadVerifications(true);
  }

  selectVerification(verification: VerificationQueueItem): void {
    this.selectedVerificationSignal.set(verification);
    this.actionNotesSignal.set('');
    this.rejectionReasonSignal.set('');
    void this.loadDocumentUrls(verification);
  }

  closeModal(): void {
    this.selectedVerificationSignal.set(null);
    this.actionNotesSignal.set('');
    this.rejectionReasonSignal.set('');
    this.documentFrontUrlSignal.set(null);
    this.documentBackUrlSignal.set(null);
    this.selfieUrlSignal.set(null);
  }

  updateActionNotes(notes: string): void {
    this.actionNotesSignal.set(notes);
  }

  updateRejectionReason(reason: string): void {
    this.rejectionReasonSignal.set(reason);
  }

  async approveVerification(verification: VerificationQueueItem): Promise<void> {
    const level = this.getVerificationLevel(verification);
    const levelName = level === 2 ? 'Nivel 2 (Participante)' : 'Nivel 3 (Verificado Full)';

    if (!confirm(`¿Aprobar verificación de ${verification.full_name} para ${levelName}?`)) {
      return;
    }

    try {
      const notes = this.actionNotesSignal();
      await this.adminService.approveVerification(verification.user_id, level, notes || undefined);

      this.toastService.success(
        'Verificación aprobada',
        'El usuario ha sido notificado por email',
        4000,
      );

      this.closeModal();
      await Promise.all([this.loadVerifications(), this.loadStats()]);
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Error al aprobar la verificación. Por favor, intenta nuevamente.');
    }
  }

  async rejectVerification(verification: VerificationQueueItem): Promise<void> {
    const reason = this.rejectionReasonSignal().trim();

    if (!reason) {
      alert('Por favor, ingresa el motivo del rechazo.');
      return;
    }

    const level = this.getVerificationLevel(verification);

    if (!confirm(`¿Rechazar verificación de ${verification.full_name}?`)) {
      return;
    }

    try {
      await this.adminService.rejectVerification(verification.user_id, level, reason);

      this.toastService.warning(
        'Verificación rechazada',
        'El usuario ha sido notificado por email',
        4000,
      );

      this.closeModal();
      await Promise.all([this.loadVerifications(), this.loadStats()]);
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('Error al rechazar la verificación. Por favor, intenta nuevamente.');
    }
  }

  private async loadDocumentUrls(verification: VerificationQueueItem): Promise<void> {
    this.documentFrontUrlSignal.set(null);
    this.documentBackUrlSignal.set(null);
    this.selfieUrlSignal.set(null);

    const [front, back, selfie] = await Promise.all([
      verification.document_front_url
        ? this.adminService.getIdentityDocumentUrl(verification.document_front_url)
        : Promise.resolve(''),
      verification.document_back_url
        ? this.adminService.getIdentityDocumentUrl(verification.document_back_url)
        : Promise.resolve(''),
      verification.selfie_url
        ? this.adminService.getIdentityDocumentUrl(verification.selfie_url)
        : Promise.resolve(''),
    ]);

    this.documentFrontUrlSignal.set(front || null);
    this.documentBackUrlSignal.set(back || null);
    this.selfieUrlSignal.set(selfie || null);
  }

  async flagSuspicious(verification: VerificationQueueItem): Promise<void> {
    const notes = prompt('Motivo para marcar como sospechoso:');

    if (!notes || notes.trim() === '') {
      return;
    }

    try {
      await this.adminService.flagVerificationSuspicious(verification.user_id, notes);

      alert('🚩 Verificación marcada como sospechosa para investigación.');

      this.closeModal();
      await Promise.all([this.loadVerifications(), this.loadStats()]);
    } catch (error) {
      console.error('Error flagging verification:', error);
      alert('Error al marcar la verificación. Por favor, intenta nuevamente.');
    }
  }

  async requestAdditionalDocs(verification: VerificationQueueItem): Promise<void> {
    const requestedDocs = prompt('Documentos adicionales requeridos:');

    if (!requestedDocs || requestedDocs.trim() === '') {
      return;
    }

    try {
      await this.adminService.requestAdditionalDocuments(verification.user_id, requestedDocs);

      alert('📄 Solicitud de documentos adicionales enviada al usuario.');

      this.closeModal();
      await Promise.all([this.loadVerifications(), this.loadStats()]);
    } catch (error) {
      console.error('Error requesting additional documents:', error);
      alert('Error al solicitar documentos. Por favor, intenta nuevamente.');
    }
  }

  getVerificationLevel(verification: VerificationQueueItem): number {
    // If has selfie, it's Level 3 verification
    if (verification.selfie_url) {
      return 3;
    }
    // If has documents, it's Level 2 verification
    if (verification.document_front_url) {
      return 2;
    }
    return 1; // Fallback
  }

  getVerificationLevelName(verification: VerificationQueueItem): string {
    const level = this.getVerificationLevel(verification);
    if (level === 3) return 'Nivel 3 (Verificado Full)';
    if (level === 2) return 'Nivel 2 (Participante)';
    return 'Nivel 1 (Explorador)';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getScoreColor(score: number | undefined): string {
    if (!score) return 'text-text-secondary';
    if (score >= 80) return 'text-success-strong';
    if (score >= 60) return 'text-warning-text';
    return 'text-error-text';
  }

  getScoreBadge(score: number | undefined): string {
    if (!score) return 'N/A';
    return `${score.toFixed(1)}%`;
  }

  isSuspicious(verification: VerificationQueueItem): boolean {
    return verification.manual_review_notes?.startsWith('[SUSPICIOUS]') ?? false;
  }

  needsAdditionalDocs(verification: VerificationQueueItem): boolean {
    return verification.manual_review_notes?.startsWith('[ADDITIONAL DOCS REQUIRED]') ?? false;
  }
}
