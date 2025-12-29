import {Component, OnInit, inject, input, output, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DisputesService, Dispute, DisputeEvidence, DisputeStatus } from '@core/services/admin/disputes.service';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { EvidenceUploaderComponent } from '../evidence-uploader/evidence-uploader.component';

@Component({
  selector: 'app-dispute-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, EvidenceUploaderComponent],
  templateUrl: './dispute-detail.component.html',
  styleUrls: ['./dispute-detail.component.css']
})
export class DisputeDetailComponent implements OnInit {
  private readonly disputesService = inject(DisputesService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private readonly walletService = inject(WalletService);
  private readonly profileService = inject(ProfileService);

  readonly disputeId = input.required<string>();
  readonly closeDetail = output<void>();

  readonly dispute = signal<Dispute | null>(null);
  readonly evidence = signal<DisputeEvidence[]>([]);
  readonly loading = signal(true);
  readonly sendingMessage = signal(false);
  readonly currentUserId = signal<string | null>(null);
  readonly isAdmin = signal(false);

  // Mensaje de respuesta
  newMessage = '';

  // Admin Resolution Form
  adminResolutionAmount: number | null = null;
  adminResolutionParty: 'renter' | 'owner' | '' = '';

  readonly canAcceptResolution = computed(() => {
    const dispute = this.dispute();
    if (!dispute || dispute.status !== 'in_review') return false;
    return dispute.responsible_party_id === this.currentUserId();
  });

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    this.currentUserId.set(user?.id || null);
    
    if (user) {
      try {
        const profile = await this.profileService.getProfileById(user.id);
        this.isAdmin.set(!!profile?.is_admin);
      } catch (e) {
        console.warn('Error checking admin status', e);
      }
    }

    await this.loadDisputeDetails();
  }

  async loadDisputeDetails(): Promise<void> {
    this.loading.set(true);
    try {
      const disputeData = await this.disputesService.getDisputeById(this.disputeId());
      this.dispute.set(disputeData || null);

      const evidenceData = await this.disputesService.listEvidence(this.disputeId());
      this.evidence.set(evidenceData);
    } catch (error) {
      console.error('Error loading dispute details:', error);
      this.toastService.error('Error al cargar la disputa', 'Por favor intenta nuevamente.');
      this.closeDetail.emit();
    } finally {
      this.loading.set(false);
    }
  }

  // Enviar mensaje o respuesta a la disputa
  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.sendingMessage()) return;

    this.sendingMessage.set(true);
    try {
      await this.disputesService.addEvidence(this.disputeId(), '', this.newMessage);
      this.newMessage = '';
      await this.loadDisputeDetails();
      this.toastService.success('Mensaje enviado', '');
    } catch (error) {
      console.error('Error sending message:', error);
      this.toastService.error('Error al enviar mensaje', '');
    } finally {
      this.sendingMessage.set(false);
    }
  }

  async acceptResolution(): Promise<void> {
    const dispute = this.dispute();
    if (!dispute || !this.canAcceptResolution()) return;

    if (dispute.resolution_amount && dispute.resolution_amount > 0) {
      this.router.navigate(['/wallet/deposit'], {
        queryParams: { amount: dispute.resolution_amount, purpose: 'dispute_resolution', disputeId: dispute.id }
      });
      this.toastService.info('Redirigiendo para pagar resolución', 'Completa el pago en tu wallet.');
      this.closeDetail.emit();
    } else {
      if (confirm('¿Confirmas que aceptas la resolución de esta disputa?')) {
        this.loading.set(true);
        try {
          await this.disputesService.resolveDispute(dispute.id, 'resolved');
          this.toastService.success('Resolución aceptada', 'La disputa ha sido marcada como resuelta.');
          this.closeDetail.emit();
        } catch (error) {
          console.error('Error accepting dispute resolution:', error);
          this.toastService.error('Error al aceptar resolución', 'Por favor intenta nuevamente.');
        } finally {
          this.loading.set(false);
        }
      }
    }
  }

  async resolveAsAdmin(status: DisputeStatus): Promise<void> {
    if (!this.isAdmin()) return;
    if (status === 'resolved' && !this.adminResolutionParty) {
      this.toastService.error('Debes seleccionar la parte responsable', '');
      return;
    }

    if (confirm(`¿Confirmas resolver esta disputa como ${status === 'resolved' ? 'Aprobada' : 'Rechazada'}?`)) {
      this.loading.set(true);
      try {
        const dispute = this.dispute();
        if (!dispute) return;

        // Determinar responsiblePartyId
        let responsiblePartyId: string | null = null;
        if (this.adminResolutionParty === 'renter') {
          // Necesitamos el ID del renter. Lo sacamos de la reserva o asumiendo roles.
          // Para simplificar, si el creador es owner, el renter es el otro ID en la reserva (no tenemos acceso directo aquí sin cargar la reserva).
          // Por ahora, asumiremos que disputesService.resolveDispute puede manejar la lógica o necesitamos cargar la reserva.
          // Mejor: Cargar la reserva para obtener los IDs correctos.
          // WORKAROUND: Asignar el ID basándonos en quien abrió la disputa.
          // Si opened_by es renter, y party es renter -> responsible = opened_by
          // Si opened_by es owner, y party es owner -> responsible = opened_by
          // Esto es frágil. Lo ideal es obtener la reserva.
          // Vamos a cargar la reserva en ngOnInit o aquí.
        }
        
        // Simplemente pasamos lo que tenemos, la lógica completa de admin debería ser más robusta
        // Para este MVP, si el admin elige 'renter', intentaremos inferirlo o dejarlo nulo si no podemos.
        // Pero necesitamos IDs reales.
        
        // REVISIÓN: El backend o el servicio deberían encargarse de esto, o traer la reserva completa.
        // Asumiremos que el admin conoce los IDs o que el componente carga la reserva.
        // Vamos a modificar loadDisputeDetails para traer la reserva si es necesario, o hacer un fetch rápido aquí.
        
        // Fetch booking to get participants
        const { data: booking } = await this.disputesService['supabase'].from('bookings').select('owner_id, renter_id').eq('id', dispute.booking_id).single();
        
        if (booking) {
           if (this.adminResolutionParty === 'owner') responsiblePartyId = booking.owner_id;
           if (this.adminResolutionParty === 'renter') responsiblePartyId = booking.renter_id;
        }

        await this.disputesService.resolveDispute(
          dispute.id,
          status,
          this.adminResolutionAmount,
          'USD', // Default currency
          responsiblePartyId
        );
        
        this.toastService.success('Disputa resuelta por admin', '');
        this.closeDetail.emit();
      } catch (error) {
        console.error('Error resolving as admin:', error);
        this.toastService.error('Error al resolver', '');
      } finally {
        this.loading.set(false);
      }
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

  getKindLabel(kind: Dispute['kind']): string {
    const labels: Record<Dispute['kind'], string> = {
      damage: 'Daños',
      no_show: 'No se presentó',
      late_return: 'Devolución tardía',
      other: 'Otro',
    };
    return labels[kind] || kind;
  }

  isMyMessage(evidence: DisputeEvidence): boolean {
    return !evidence.path; 
  }
}
