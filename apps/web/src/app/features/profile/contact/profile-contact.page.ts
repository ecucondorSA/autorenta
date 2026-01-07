import {Component, inject, OnInit,
  ChangeDetectionStrategy} from '@angular/core';

import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ProfileStore } from '@core/stores/profile.store';
import { ProfileContactSectionComponent } from '../components/sections/contact/profile-contact-section.component';

/**
 * Profile Contact Page
 *
 * Dedicated page for managing contact information:
 * - Phone number
 * - WhatsApp number
 * - Full address
 *
 * Uses ProfileContactSectionComponent with auto-save
 */
@Component({
  selector: 'app-profile-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ProfileContactSectionComponent],
  template: `
    <ion-header>
      <ion-toolbar
        class="bg-surface-raised border-b border-border-default"
        >
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/profile"
            text="Perfil"
            class="text-text-primary"
          ></ion-back-button>
        </ion-buttons>
        <ion-title class="text-text-primary">
          Información de Contacto
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary mb-2">
            Contacto y Dirección
          </h1>
          <p class="text-sm text-text-secondary">
            Mantén tu información de contacto actualizada para una mejor comunicación.
          </p>
        </div>
    
        <!-- Loading State -->
        @if (loading()) {
          <div class="flex justify-center py-12">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cta-default border-r-transparent"
            ></div>
          </div>
        }
    
        <!-- Contact Section Component -->
        @if (!loading()) {
          <app-profile-contact-section [profile]="profile()" />
        }
    
        <!-- Help Text -->
        <div class="mt-8 p-4 rounded-lg bg-info-bg border border-info-border">
          <h4 class="text-sm font-semibold text-info-text mb-2 flex items-center gap-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            ¿Por qué necesitamos esta información?
          </h4>
          <ul class="text-xs text-info-text space-y-1.5">
            <li class="flex gap-2">
              <span>•</span>
              <span
                ><strong>Teléfono:</strong> Para coordinar entregas y devoluciones de
                vehículos</span
                >
              </li>
              <li class="flex gap-2">
                <span>•</span>
                <span><strong>WhatsApp:</strong> Comunicación rápida durante las reservas</span>
              </li>
              <li class="flex gap-2">
                <span>•</span>
                <span
                  ><strong>Dirección:</strong> Para servicios de entrega a domicilio (cuando estén
                  disponibles)</span
                  >
                </li>
              </ul>
            </div>
          </div>
        </ion-content>
    `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      ion-content {
        --padding-bottom: 24px;
        min-height: 100vh;
      }
    `,
  ],
})
export class ProfileContactPage implements OnInit {
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;

  ngOnInit(): void {
    // Load profile if not already loaded
    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }
  }
}
