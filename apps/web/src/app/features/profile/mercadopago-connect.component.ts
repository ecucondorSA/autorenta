import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  MercadoPagoOAuthService,
  type MercadoPagoConnectionStatus,
} from '../../core/services/mercadopago-oauth.service';

@Component({
  selector: 'app-mercadopago-connect',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mercadopago-connect.component.html',
  styleUrls: ['./mercadopago-connect.component.css'],
})
export class MercadoPagoConnectComponent implements OnInit {
  private oauthService = inject(MercadoPagoOAuthService);
  private router = inject(Router);

  connectionStatus = signal<MercadoPagoConnectionStatus>({ connected: false });
  loading = signal(false);
  disconnecting = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.checkConnection();
  }

  async checkConnection(): Promise<void> {
    try {
      const status = await this.oauthService.checkConnection();
      this.connectionStatus.set(status);
    } catch {
      this.error.set('Error al verificar estado de conexión');
    }
  }

  async connect(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.oauthService.connectMercadoPago();
      // El usuario será redirigido a MercadoPago
      // No hay código después de esto porque se redirige
    } catch (err: unknown) {
      this.error.set((err as Error).message || 'Error al conectar con MercadoPago');
      this.loading.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (
      !confirm(
        '¿Estás seguro de que deseas desconectar tu cuenta de MercadoPago?\n\n' +
        'Nota: No podrás recibir pagos directos hasta que vuelvas a conectarla.',
      )
    ) {
      return;
    }

    this.disconnecting.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const result = await this.oauthService.disconnect();

      if (result) {
        this.success.set('Cuenta desconectada exitosamente');
        await this.checkConnection();
      } else {
        this.error.set('No se pudo desconectar la cuenta');
      }
    } catch (err: unknown) {
      this.error.set((err as Error).message || 'Error al desconectar cuenta');
    } finally {
      this.disconnecting.set(false);
    }
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToPublishCar(): void {
    this.router.navigate(['/cars/publish']);
  }
}
