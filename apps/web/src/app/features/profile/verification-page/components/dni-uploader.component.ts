import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { VerificationService } from '@core/services/verification/verification.service';

type Country = 'AR' | 'EC';

interface OcrResultDisplay {
  success: boolean;
  confidence: number;
  extractedName?: string;
  extractedNumber?: string;
  errors: string[];
  warnings: string[];
  profileUpdated?: boolean;
}

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  verified: boolean;
}

@Component({
  selector: 'app-dni-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="space-y-5">
      <!-- Country Selector - Segmented Control -->
      <div class="relative flex p-1 rounded-xl bg-surface-secondary/80">
        <!-- Animated background pill -->
        <div
          class="absolute inset-y-1 rounded-lg bg-cta-default shadow-md transition-all duration-300 ease-out"
          [style.left]="selectedCountry() === 'AR' ? '4px' : 'calc(50% + 2px)'"
          [style.width]="'calc(50% - 6px)'"
        ></div>
        <button
          (click)="selectCountry('AR')"
          class="relative z-10 flex-1 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
          [class]="
            selectedCountry() === 'AR'
              ? 'text-cta-text'
              : 'text-text-secondary hover:text-text-primary'
          "
        >
          <span class="text-base">🇦🇷</span> Argentina
        </button>
        <button
          (click)="selectCountry('EC')"
          class="relative z-10 flex-1 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
          [class]="
            selectedCountry() === 'EC'
              ? 'text-cta-text'
              : 'text-text-secondary hover:text-text-primary'
          "
        >
          <span class="text-base">🇪🇨</span> Ecuador
        </button>
      </div>

      <!-- Document Title -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-cta-default/10 flex items-center justify-center">
          <svg
            class="w-5 h-5 text-cta-default"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-text-primary">
            {{ selectedCountry() === 'AR' ? 'DNI Argentina' : 'Cédula Ecuador' }}
          </h3>
          <p class="text-xs text-text-muted">Documento de identidad</p>
        </div>
      </div>

      <!-- Upload Grid - ID Card Aspect Ratio -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- FRENTE -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">Frente</span>
            @if (frontUploaded() && !uploadingFront()) {
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700"
                >Listo</span
              >
            }
          </div>

          <!-- Drop Zone with ID Card Aspect Ratio -->
          <div
            class="relative w-full rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group"
            style="aspect-ratio: 85.6 / 54;"
            [class]="getFrontZoneClass()"
            (click)="frontGalleryInput.click()"
            (dragover)="onDragOver($event, 'front')"
            (dragleave)="onDragLeave('front')"
            (drop)="onDrop($event, 'dni_front')"
          >
            <!-- Placeholder State -->
            @if (!frontPreview() && !uploadingFront()) {
              <div
                class="absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-200"
              >
                <div
                  class="w-14 h-14 rounded-full bg-surface-hover/50 flex items-center justify-center mb-3 group-hover:bg-cta-default/10 group-hover:scale-110 transition-all"
                >
                  <svg
                    class="w-7 h-7 text-text-muted group-hover:text-cta-default transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"
                    />
                  </svg>
                </div>
                <span
                  class="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors"
                  >Frente del documento</span
                >
                <span class="text-xs text-text-muted mt-1">Arrastra o haz clic para subir</span>
              </div>
            }

            <!-- Image Preview -->
            @if (frontPreview() && !uploadingFront()) {
              <img [src]="frontPreview()" class="w-full h-full object-cover" alt="Frente DNI" />
              <!-- Hover Overlay -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <span class="text-xs text-white/80">Clic para cambiar</span>
                  <div class="flex gap-2">
                    <button
                      (click)="$event.stopPropagation(); frontCameraInput.click()"
                      class="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition-colors shadow-lg md:hidden"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <!-- Success Badge -->
              <div
                class="absolute top-3 right-3 w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center shadow-lg animate-scale-in"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            }

            <!-- Upload Progress Overlay -->
            @if (uploadingFront()) {
              <div
                class="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <!-- Circular Progress -->
                <div class="relative w-16 h-16">
                  <svg class="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke-width="4"
                      class="fill-none stroke-surface-hover"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke-width="4"
                      class="fill-none stroke-cta-default transition-all duration-300"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="176"
                      [attr.stroke-dashoffset]="176 - (176 * frontProgress()) / 100"
                    />
                  </svg>
                  <span
                    class="absolute inset-0 flex items-center justify-center text-sm font-bold text-cta-default"
                  >
                    {{ frontProgress() }}%
                  </span>
                </div>
                <span class="mt-3 text-sm text-text-secondary">Procesando...</span>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <!-- Camera Button (Mobile Only) -->
            <label class="flex-1 md:hidden">
              <input
                #frontCameraInput
                type="file"
                accept="image/*"
                capture="environment"
                (change)="onFileSelected($event, 'dni_front')"
                class="hidden"
              />
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cta-default text-cta-text font-medium text-sm cursor-pointer hover:bg-cta-hover active:scale-[0.98] transition-all"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Cámara
              </div>
            </label>
            <!-- Gallery Button -->
            <label class="flex-1">
              <input
                #frontGalleryInput
                type="file"
                accept="image/*"
                (change)="onFileSelected($event, 'dni_front')"
                class="hidden"
              />
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm cursor-pointer active:scale-[0.98] transition-all"
                [class]="
                  frontPreview()
                    ? 'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default'
                    : 'bg-cta-default text-cta-text hover:bg-cta-hover md:bg-cta-default'
                "
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ frontPreview() ? 'Cambiar' : 'Galería' }}
              </div>
            </label>
          </div>
        </div>

        <!-- DORSO -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">Dorso</span>
            @if (backUploaded() && !uploadingBack()) {
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700"
                >Listo</span
              >
            }
          </div>

          <!-- Drop Zone -->
          <div
            class="relative w-full rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group"
            style="aspect-ratio: 85.6 / 54;"
            [class]="getBackZoneClass()"
            (click)="backGalleryInput.click()"
            (dragover)="onDragOver($event, 'back')"
            (dragleave)="onDragLeave('back')"
            (drop)="onDrop($event, 'dni_back')"
          >
            <!-- Placeholder State -->
            @if (!backPreview() && !uploadingBack()) {
              <div
                class="absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-200"
              >
                <div
                  class="w-14 h-14 rounded-full bg-surface-hover/50 flex items-center justify-center mb-3 group-hover:bg-cta-default/10 group-hover:scale-110 transition-all"
                >
                  <svg
                    class="w-7 h-7 text-text-muted group-hover:text-cta-default transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <span
                  class="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors"
                  >Dorso del documento</span
                >
                <span class="text-xs text-text-muted mt-1">Arrastra o haz clic para subir</span>
              </div>
            }

            <!-- Image Preview -->
            @if (backPreview() && !uploadingBack()) {
              <img [src]="backPreview()" class="w-full h-full object-cover" alt="Dorso DNI" />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <span class="text-xs text-white/80">Clic para cambiar</span>
                </div>
              </div>
              <div
                class="absolute top-3 right-3 w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center shadow-lg animate-scale-in"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            }

            <!-- Upload Progress Overlay -->
            @if (uploadingBack()) {
              <div
                class="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <div class="relative w-16 h-16">
                  <svg class="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke-width="4"
                      class="fill-none stroke-surface-hover"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke-width="4"
                      class="fill-none stroke-cta-default transition-all duration-300"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="176"
                      [attr.stroke-dashoffset]="176 - (176 * backProgress()) / 100"
                    />
                  </svg>
                  <span
                    class="absolute inset-0 flex items-center justify-center text-sm font-bold text-cta-default"
                  >
                    {{ backProgress() }}%
                  </span>
                </div>
                <span class="mt-3 text-sm text-text-secondary">Procesando...</span>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <label class="flex-1 md:hidden">
              <input
                #backCameraInput
                type="file"
                accept="image/*"
                capture="environment"
                (change)="onFileSelected($event, 'dni_back')"
                class="hidden"
              />
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cta-default text-cta-text font-medium text-sm cursor-pointer hover:bg-cta-hover active:scale-[0.98] transition-all"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Cámara
              </div>
            </label>
            <label class="flex-1">
              <input
                #backGalleryInput
                type="file"
                accept="image/*"
                (change)="onFileSelected($event, 'dni_back')"
                class="hidden"
              />
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm cursor-pointer active:scale-[0.98] transition-all"
                [class]="
                  backPreview()
                    ? 'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default'
                    : 'bg-cta-default text-cta-text hover:bg-cta-hover md:bg-cta-default'
                "
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ backPreview() ? 'Cambiar' : 'Galería' }}
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Tips Section -->
      <details class="group">
        <summary
          class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer list-none select-none hover:text-text-primary transition-colors py-2"
        >
          <svg
            class="w-4 h-4 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span>Tips para mejores resultados</span>
        </summary>
        <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 animate-fade-in">
          <div class="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <div class="text-xl mb-1">💡</div>
            <p class="text-xs text-text-muted">Buena iluminación</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <div class="text-xl mb-1">📐</div>
            <p class="text-xs text-text-muted">Documento plano</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <div class="text-xl mb-1">🔍</div>
            <p class="text-xs text-text-muted">Texto legible</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <div class="text-xl mb-1">✨</div>
            <p class="text-xs text-text-muted">Sin reflejos</p>
          </div>
        </div>
      </details>

      <!-- OCR Results Card -->
      @if (frontOcrResult() || backOcrResult()) {
        <div
          class="rounded-xl border border-border-default overflow-hidden bg-gradient-to-br from-surface-raised to-surface-base animate-fade-in-up"
        >
          <!-- Header with Confidence Meter -->
          <div
            class="p-4 border-b border-border-default/50 bg-gradient-to-r from-transparent to-surface-secondary/30"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  [class]="getConfidenceIconClass()"
                >
                  @if (isAutoVerified()) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  }
                </div>
                <div>
                  <h4 class="font-semibold text-text-primary">Datos Extraídos</h4>
                  <p class="text-xs text-text-secondary">Verificación automática OCR</p>
                </div>
              </div>

              <!-- Circular Confidence Meter -->
              <div class="relative w-14 h-14">
                <svg class="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke-width="5"
                    class="fill-none stroke-surface-hover"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke-width="5"
                    class="fill-none transition-all duration-1000 ease-out"
                    stroke-linecap="round"
                    [class]="getConfidence() >= 70 ? 'stroke-success-500' : 'stroke-warning-500'"
                    [attr.stroke-dasharray]="150.8"
                    [attr.stroke-dashoffset]="150.8 - (150.8 * getConfidence()) / 100"
                  />
                </svg>
                <span
                  class="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  [class]="getConfidence() >= 70 ? 'text-success-600' : 'text-warning-600'"
                >
                  {{ getConfidence() | number: '1.0-0' }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Extracted Data Grid -->
          <div class="p-4 grid grid-cols-2 gap-4">
            @for (field of extractedFields(); track field.key; let i = $index) {
              <div class="animate-fade-in-up" [style.animation-delay]="i * 100 + 'ms'">
                <span class="text-xs text-text-muted uppercase tracking-wide">{{
                  field.label
                }}</span>
                <p class="mt-1 font-semibold text-text-primary flex items-center gap-2">
                  {{ field.value }}
                  @if (field.verified) {
                    <svg class="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  }
                </p>
              </div>
            }
          </div>

          <!-- Warnings Section -->
          @if (hasWarnings()) {
            <div class="px-4 pb-4">
              <div class="p-3 rounded-lg bg-warning-100/50 border border-warning-200">
                <div class="flex items-start gap-2">
                  <svg
                    class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div class="space-y-1">
                    @for (warning of getAllWarnings(); track $index) {
                      <p class="text-sm text-warning-700">{{ warning }}</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Status Message -->
        <div class="p-3 rounded-xl text-sm flex items-center gap-3" [class]="getStatusClass()">
          @if (isProfileLocked()) {
            <div
              class="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          } @else if (isAutoVerified()) {
            <div
              class="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          } @else {
            <div
              class="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          }
          <span class="font-medium">{{ getStatusMessage() }}</span>
        </div>
      }
    </div>
  `,
})
export class DniUploaderComponent {
  private verificationService = inject(VerificationService);

  // Country selection
  selectedCountry = signal<Country>('AR');

  // Upload states
  uploadingFront = signal(false);
  uploadingBack = signal(false);

  // Previews
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  // Upload status
  frontUploaded = signal(false);
  backUploaded = signal(false);

  // Progress (simulated for UX)
  frontProgress = signal(0);
  backProgress = signal(0);

  // Drag states
  isDraggingFront = signal(false);
  isDraggingBack = signal(false);

  // OCR Results
  frontOcrResult = signal<OcrResultDisplay | null>(null);
  backOcrResult = signal<OcrResultDisplay | null>(null);

  // Computed: Extracted fields for display
  extractedFields = computed<ExtractedField[]>(() => {
    const fields: ExtractedField[] = [];
    const front = this.frontOcrResult();
    const back = this.backOcrResult();
    const isVerified = this.isAutoVerified();

    if (front?.extractedName) {
      fields.push({
        key: 'name',
        label: 'Nombre',
        value: front.extractedName,
        verified: isVerified,
      });
    }

    const docNumber = front?.extractedNumber || back?.extractedNumber;
    if (docNumber) {
      fields.push({
        key: 'number',
        label: this.selectedCountry() === 'AR' ? 'DNI' : 'Cédula',
        value: docNumber,
        verified: isVerified,
      });
    }

    return fields;
  });

  selectCountry(country: Country): void {
    this.selectedCountry.set(country);
    // Reset state when country changes
    this.frontPreview.set(null);
    this.backPreview.set(null);
    this.frontUploaded.set(false);
    this.backUploaded.set(false);
    this.frontOcrResult.set(null);
    this.backOcrResult.set(null);
    this.frontProgress.set(0);
    this.backProgress.set(0);
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent, zone: 'front' | 'back'): void {
    event.preventDefault();
    event.stopPropagation();
    if (zone === 'front') {
      this.isDraggingFront.set(true);
    } else {
      this.isDraggingBack.set(true);
    }
  }

  onDragLeave(zone: 'front' | 'back'): void {
    if (zone === 'front') {
      this.isDraggingFront.set(false);
    } else {
      this.isDraggingBack.set(false);
    }
  }

  onDrop(event: DragEvent, type: 'dni_front' | 'dni_back'): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingFront.set(false);
    this.isDraggingBack.set(false);

    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.processFile(file, type);
    }
  }

  // Zone class getters
  getFrontZoneClass(): string {
    if (this.isDraggingFront()) {
      return 'border-2 border-dashed border-cta-default bg-cta-default/10 ring-4 ring-cta-default/20';
    }
    if (this.frontPreview()) {
      return 'border-2 border-solid border-success-400 bg-success-50/30';
    }
    return 'border-2 border-dashed border-border-default bg-gradient-to-br from-surface-secondary/50 to-surface-elevated/30 hover:border-cta-default hover:from-cta-default/5 hover:to-cta-default/10';
  }

  getBackZoneClass(): string {
    if (this.isDraggingBack()) {
      return 'border-2 border-dashed border-cta-default bg-cta-default/10 ring-4 ring-cta-default/20';
    }
    if (this.backPreview()) {
      return 'border-2 border-solid border-success-400 bg-success-50/30';
    }
    return 'border-2 border-dashed border-border-default bg-gradient-to-br from-surface-secondary/50 to-surface-elevated/30 hover:border-cta-default hover:from-cta-default/5 hover:to-cta-default/10';
  }

  /**
   * Determina si el documento está verificado automáticamente
   */
  isAutoVerified(): boolean {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const profileUpdated = this.frontOcrResult()?.profileUpdated;

    return profileUpdated === true || frontConf >= 70 || frontSuccess === true;
  }

  isProfileLocked(): boolean {
    return this.frontOcrResult()?.profileUpdated === true;
  }

  getConfidence(): number {
    return this.frontOcrResult()?.confidence || this.backOcrResult()?.confidence || 0;
  }

  getConfidenceIconClass(): string {
    if (this.isAutoVerified()) {
      return 'bg-success-100 text-success-600';
    }
    return 'bg-warning-100 text-warning-600';
  }

  hasWarnings(): boolean {
    const frontWarnings = this.frontOcrResult()?.warnings?.length || 0;
    const backWarnings = this.backOcrResult()?.warnings?.length || 0;
    return frontWarnings > 0 || backWarnings > 0;
  }

  getAllWarnings(): string[] {
    const warnings: string[] = [];
    if (this.frontOcrResult()?.warnings) {
      warnings.push(...this.frontOcrResult()!.warnings);
    }
    if (this.backOcrResult()?.warnings) {
      warnings.push(...this.backOcrResult()!.warnings);
    }
    return warnings;
  }

  getStatusClass(): string {
    if (this.isAutoVerified()) {
      return 'bg-success-50 border border-success-200 text-success-700';
    }
    if (this.frontOcrResult() || this.backOcrResult()) {
      return 'bg-warning-50 border border-warning-200 text-warning-700';
    }
    return 'bg-info-50 border border-info-200 text-info-700';
  }

  getStatusMessage(): string {
    const docName = this.selectedCountry() === 'AR' ? 'DNI' : 'Cédula';
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const backConf = this.backOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const backSuccess = this.backOcrResult()?.success;
    const profileLocked = this.isProfileLocked();

    if (profileLocked) {
      if (!this.backOcrResult()) {
        return `Identidad verificada. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `Identidad verificada y protegida.`;
      }
      return `Identidad verificada. Dorso requiere mejor foto.`;
    }

    if (frontSuccess === true || frontConf >= 70) {
      if (!this.backOcrResult()) {
        return `${docName} verificado. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `${docName} verificado correctamente.`;
      }
      return `${docName} frente verificado. Mejora la foto del dorso.`;
    }

    if (this.frontOcrResult() && frontConf > 0 && frontConf < 70) {
      return `Baja confianza (${frontConf}%). Intenta con mejor foto.`;
    }

    if (this.backOcrResult() && !this.frontOcrResult()) {
      return `Dorso procesado. Falta subir el frente.`;
    }

    return `Procesando verificación...`;
  }

  async onFileSelected(event: Event, type: 'dni_front' | 'dni_back'): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    await this.processFile(file, type);

    // Clear input for re-selection of same file
    if (input) input.value = '';
  }

  private async processFile(file: File, type: 'dni_front' | 'dni_back'): Promise<void> {
    const docType = type === 'dni_front' ? 'gov_id_front' : 'gov_id_back';
    const isFront = type === 'dni_front';

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (isFront) this.frontPreview.set(result);
      else this.backPreview.set(result);
    };
    reader.readAsDataURL(file);

    // Set uploading state
    if (isFront) {
      this.uploadingFront.set(true);
      this.frontProgress.set(0);
    } else {
      this.uploadingBack.set(true);
      this.backProgress.set(0);
    }

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      const current = isFront ? this.frontProgress() : this.backProgress();
      if (current < 90) {
        const increment = Math.random() * 15 + 5;
        const newProgress = Math.min(current + increment, 90);
        if (isFront) this.frontProgress.set(Math.round(newProgress));
        else this.backProgress.set(Math.round(newProgress));
      }
    }, 200);

    try {
      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry(),
      );

      // Complete progress
      clearInterval(progressInterval);
      if (isFront) this.frontProgress.set(100);
      else this.backProgress.set(100);

      // Mark as uploaded
      if (isFront) {
        this.frontUploaded.set(true);
        if (result.ocrResult) {
          const profileUpdated =
            result.ocrResult.warnings?.some((w: string) =>
              w.includes('Identidad verificada automaticamente'),
            ) || false;

          this.frontOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings:
              result.ocrResult.warnings?.filter(
                (w: string) => !w.includes('Identidad verificada automaticamente'),
              ) || [],
            profileUpdated,
          });
        }
      } else {
        this.backUploaded.set(true);
        if (result.ocrResult) {
          this.backOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings: result.ocrResult.warnings || [],
          });
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error uploading document:', error);

      // Clear preview on error
      if (isFront) {
        this.frontPreview.set(null);
        this.frontProgress.set(0);
      } else {
        this.backPreview.set(null);
        this.backProgress.set(0);
      }
    } finally {
      if (isFront) this.uploadingFront.set(false);
      else this.uploadingBack.set(false);
    }
  }
}
