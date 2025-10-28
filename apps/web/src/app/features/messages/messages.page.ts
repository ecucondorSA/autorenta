import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BookingChatComponent } from '../../shared/components/booking-chat/booking-chat.component';
import { AuthService } from '../../core/services/auth.service';
import { CarChatComponent } from './components/car-chat.component';

/**
 * Página de mensajes standalone
 * Soporta dos modos:
 * 1. Chat de reserva: /messages?bookingId=xxx&userId=xxx&userName=xxx
 * 2. Chat de auto: /messages?carId=xxx&userId=xxx&carName=xxx
 */
@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, BookingChatComponent, CarChatComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="flex items-center gap-4">
            <!-- Back button -->
            <button
              (click)="goBack()"
              class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              type="button"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div>
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Mensajes</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                @if (bookingId()) { Conversación sobre reserva } @else if (carId()) { Consulta sobre
                auto } @else { Chat }
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl p-4">
        @if (loading()) {
        <div class="flex h-96 items-center justify-center">
          <div class="text-center">
            <div
              class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
            ></div>
            <p class="text-gray-600 dark:text-gray-400">Cargando chat...</p>
          </div>
        </div>
        } @else if (error()) {
        <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error() }}</p>
          <button
            (click)="goBack()"
            class="mt-2 text-sm text-red-600 underline hover:text-red-800 dark:text-red-400"
            type="button"
          >
            Volver
          </button>
        </div>
        } @else if (bookingId() && recipientId() && recipientName()) {
        <!-- Booking chat -->
        <app-booking-chat
          [bookingId]="bookingId()!"
          [recipientId]="recipientId()!"
          [recipientName]="recipientName()!"
        />
        } @else if (carId() && recipientId() && recipientName()) {
        <!-- Car chat (pre-booking) -->
        <app-car-chat
          [carId]="carId()!"
          [recipientId]="recipientId()!"
          [recipientName]="recipientName()!"
        />
        } @else {
        <div class="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Faltan parámetros para iniciar el chat
          </p>
          <button
            (click)="goBack()"
            class="mt-2 text-sm text-yellow-600 underline hover:text-yellow-800 dark:text-yellow-400"
            type="button"
          >
            Volver
          </button>
        </div>
        }
      </div>
    </div>
  `,
})
export class MessagesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  // Query params
  readonly bookingId = signal<string | null>(null);
  readonly carId = signal<string | null>(null);
  readonly recipientId = signal<string | null>(null);
  readonly recipientName = signal<string | null>(null);

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Verificar autenticación
    const session = this.authService.session$();
    if (!session) {
      this.error.set('Debes iniciar sesión para ver los mensajes');
      this.loading.set(false);
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }, 2000);
      return;
    }

    // Leer query params
    this.route.queryParams.subscribe((params) => {
      this.bookingId.set(params['bookingId'] ?? null);
      this.carId.set(params['carId'] ?? null);
      this.recipientId.set(params['userId'] ?? null);
      this.recipientName.set(params['userName'] ?? params['carName'] ?? 'Usuario');

      // Validar que tenemos al menos booking o car ID
      if (!this.bookingId() && !this.carId()) {
        this.error.set('Falta información para iniciar el chat (booking o car ID)');
      }

      // Validar que tenemos recipient
      if (!this.recipientId()) {
        this.error.set('Falta información del destinatario');
      }

      this.loading.set(false);
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
