import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@core/services/auth/auth.service';
import { BreakpointService } from '@core/services/ui/breakpoint.service';
import { ChatThreadComponent } from './components/chat-thread.component';

/**
 * Página de mensajes standalone
 * Soporta dos modos:
 * 1. Chat de reserva: /messages/chat?bookingId=xxx&userId=xxx&userName=xxx
 * 2. Chat de auto: /messages/chat?carId=xxx&userId=xxx&carName=xxx
 * En desktop se redirige a /messages con los mismos query params (split view).
 */
@Component({
  selector: 'app-messages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatThreadComponent],
  hostDirectives: [],
  template: `
    <div class="h-[100dvh] flex flex-col bg-surface-base overflow-hidden">
      <!-- Header -->
      <div class="flex-shrink-0 bg-surface-raised shadow z-10">
        <div class="mx-auto max-w-4xl px-4 py-3">
          <div class="flex items-center gap-4">
            <!-- Back button -->
            <button
              (click)="goBack()"
              class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-hover"
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
              <h1 class="text-xl font-semibold text-text-primary">Mensajes</h1>
              <p class="text-sm text-text-secondary">
                @if (bookingId()) {
                  Conversación sobre reserva
                } @else if (carId()) {
                  Consulta sobre auto
                } @else {
                  Chat
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content - fills remaining height -->
      <div
        class="flex-1 min-h-0 overflow-hidden w-full p-0 pb-[env(safe-area-inset-bottom,0px)] sm:mx-auto sm:max-w-4xl sm:p-4"
      >
        @if (error()) {
          <div class="rounded-lg bg-error-bg p-4">
            <p class="text-sm text-error-strong">{{ error() }}</p>
            <button
              (click)="goBack()"
              class="mt-2 text-sm text-error-text underline hover:text-error-strong"
              type="button"
            >
              Volver
            </button>
          </div>
        } @else {
          <app-chat-thread
            [bookingId]="bookingId()"
            [carId]="carId()"
            [recipientId]="recipientId()"
            [recipientName]="recipientName()"
            [showEmptyState]="false"
          />
        }
      </div>
    </div>
  `,
})
export class MessagesPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly breakpoint = inject(BreakpointService);

  // ✅ P0-006 FIX: Destroy subject para limpiar subscriptions
  private readonly destroy$ = new Subject<void>();

  // Query params
  readonly bookingId = signal<string | null>(null);
  readonly carId = signal<string | null>(null);
  readonly recipientId = signal<string | null>(null);
  readonly recipientName = signal<string | null>(null);

  // State
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Verificar autenticación
    const session = this.authService.session$();
    if (!session) {
      this.error.set('Debes iniciar sesión para ver los mensajes');
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }, 2000);
      return;
    }

    if (typeof window !== 'undefined' && this.breakpoint.isDesktop()) {
      void this.router.navigate(['/messages'], {
        queryParams: this.route.snapshot.queryParams,
        replaceUrl: true,
      });
      return;
    }

    // Leer query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.bookingId.set(params['bookingId'] ?? null);
      this.carId.set(params['carId'] ?? null);
      this.recipientId.set(params['userId'] ?? null);
      this.recipientName.set(params['userName'] ?? params['carName'] ?? 'Usuario');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/messages']);
  }
}
