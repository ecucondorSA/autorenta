import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth/auth.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { ToastService } from '@core/services/ui/toast.service';
import { Router } from '@angular/router';
import { environment } from '@environment';

type DeleteStep = 'confirm' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './delete-account.page.html',
  styleUrls: ['../legal-shared.css'],
})
export class DeleteAccountPage {
  private readonly authService = inject(AuthService);
  private readonly supabase = injectSupabase();
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  // State
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userEmail = this.authService.userEmail;
  readonly step = signal<DeleteStep>('confirm');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // For unauthenticated users
  readonly requestEmail = signal('');
  readonly requestReason = signal('');
  readonly requestSubmitted = signal(false);

  // Confirmation checkbox
  readonly confirmChecked = signal(false);

  readonly canSubmit = computed(() => {
    if (this.isAuthenticated()) {
      return this.confirmChecked();
    }
    return this.requestEmail().includes('@') && this.confirmChecked();
  });

  async deleteAccount(): Promise<void> {
    if (!this.confirmChecked()) return;

    this.isLoading.set(true);
    this.step.set('processing');
    this.errorMessage.set(null);

    try {
      // Call Edge Function to delete account
      const session = await this.supabase.auth.getSession();
      const response = await fetch(`${environment.supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          confirm: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar la cuenta');
      }

      this.step.set('success');

      // Sign out locally
      await this.authService.signOut();

      this.toast.success('Cuenta eliminada', 'Tu cuenta ha sido eliminada correctamente');

      // Redirect after 3 seconds
      setTimeout(() => {
        void this.router.navigate(['/']);
      }, 3000);
    } catch (error) {
      this.step.set('error');
      this.errorMessage.set(error instanceof Error ? error.message : 'Error desconocido');
      this.toast.error('Error', 'No se pudo eliminar la cuenta');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitDeletionRequest(): Promise<void> {
    if (!this.requestEmail() || !this.confirmChecked()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // Call Edge Function to request account deletion
      const response = await fetch(
        `${environment.supabaseUrl}/functions/v1/delete-account-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: environment.supabaseAnonKey,
          },
          body: JSON.stringify({
            email: this.requestEmail(),
            reason: this.requestReason() || 'No especificado',
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar la solicitud');
      }

      this.requestSubmitted.set(true);
      this.toast.success('Solicitud enviada', 'Revisa tu correo para confirmar');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Error desconocido');
      this.toast.error('Error', 'No se pudo enviar la solicitud');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: '/delete-account' },
    });
  }
}
