import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FaceVerificationService } from '../../../core/services/face-verification.service';
import { IdentityLevelService } from '../../../core/services/identity-level.service';

@Component({
  standalone: true,
  selector: 'app-selfie-capture',
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            [class]="getStatusBadgeClass()"
          >
            {{ getStatusIcon() }}
          </div>
          <div>
            <h4 class="font-semibold text-gray-900">Verificación Facial (Level 3)</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">Verifica tu identidad con un selfie en video</p>
          </div>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full" [class]="getStatusLabelClass()">
          {{ getStatusLabel() }}
        </span>
      </div>

      <!-- Verified State -->
      <div *ngIf="status().isVerified" class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span class="text-sm font-medium">Identidad verificada exitosamente</span>
        </div>
        <div class="mt-3 space-y-1 text-sm">
          <p class="text-green-700">✓ Face Match: {{ status().faceMatchScore }}%</p>
          <p class="text-green-700">✓ Liveness: {{ status().livenessScore }}%</p>
        </div>
      </div>

      <!-- Level 2 Required -->
      <div *ngIf="status().requiresLevel2" class="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <p class="text-sm text-orange-800">
          ⚠️ Debes completar Level 2 (documentos) antes de verificar tu identidad con selfie.
        </p>
      </div>

      <!-- Capture State -->
      <div *ngIf="!status().isVerified && !status().requiresLevel2" class="space-y-4">
        <!-- Instructions -->
        <div *ngIf="!isRecording() && !hasVideo()" class="p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-2">
          <p class="text-sm font-medium text-sky-700">Instrucciones:</p>
          <ul class="text-sm text-sky-600 space-y-1 ml-4 list-disc">
            <li>Asegúrate de estar en un lugar bien iluminado</li>
            <li>Mira directamente a la cámara</li>
            <li>Mantén tu rostro centrado en el recuadro</li>
            <li>La grabación durará 3-5 segundos</li>
          </ul>
        </div>

        <!-- Camera Preview / Video Preview -->
        <div class="relative rounded-lg overflow-hidden bg-gray-900" style="aspect-ratio: 4/3;">
          <video
            #videoPreview
            [hidden]="!isRecording() && !hasVideo()"
            [autoplay]="isRecording()"
            [muted]="isRecording()"
            [controls]="hasVideo()"
            playsinline
            class="w-full h-full object-cover"
          ></video>

          <!-- Recording Indicator -->
          <div *ngIf="isRecording()" class="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full text-sm font-medium animate-pulse">
            <span class="w-2 h-2 bg-white rounded-full"></span>
            <span>REC {{ recordingSeconds() }}s</span>
          </div>

          <!-- Face Frame Overlay -->
          <div *ngIf="isRecording()" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="border-4 border-white rounded-full" style="width: 200px; height: 250px;"></div>
          </div>

          <!-- Placeholder -->
          <div *ngIf="!isRecording() && !hasVideo()" class="absolute inset-0 flex flex-col items-center justify-center text-white">
            <svg class="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <p class="text-sm opacity-75">Cámara lista para grabar</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <!-- Start Recording -->
          <button
            *ngIf="!isRecording() && !hasVideo()"
            type="button"
            (click)="startRecording()"
            [disabled]="processing()"
            class="flex-grow px-6 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
              <span>Iniciar Grabación</span>
            </span>
          </button>

          <!-- Submit Video -->
          <button
            *ngIf="hasVideo() && !processing()"
            type="button"
            (click)="submitVideo()"
            class="flex-grow px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
          >
            <span class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Verificar Identidad</span>
            </span>
          </button>

          <!-- Retake -->
          <button
            *ngIf="hasVideo() && !processing()"
            type="button"
            (click)="retake()"
            class="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            Volver a Grabar
          </button>
        </div>

        <!-- Processing State -->
        <div *ngIf="processing()" class="p-4 bg-sky-50 border border-sky-200 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
            <div class="flex-grow">
              <p class="text-sm font-medium text-sky-700">Procesando verificación facial...</p>
              <p class="text-xs text-sky-700 mt-1">Esto puede tardar unos segundos</p>
            </div>
          </div>
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage()" class="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {{ successMessage() }}
        </div>

        <!-- Error Message -->
        <div *ngIf="error()" class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {{ error() }}
          <button *ngIf="hasVideo()" type="button" (click)="retake()" class="mt-2 text-sm font-medium underline">
            Intentar nuevamente
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfieCaptureComponent implements OnInit, OnDestroy {
  private readonly faceVerificationService = inject(FaceVerificationService);
  private readonly identityLevelService = inject(IdentityLevelService);

  @ViewChild('videoPreview', { static: false }) videoPreview!: ElementRef<HTMLVideoElement>;

  readonly status = this.faceVerificationService.status;
  readonly processing = this.faceVerificationService.processing;
  readonly error = this.faceVerificationService.error;

  readonly isRecording = signal(false);
  readonly hasVideo = signal(false);
  readonly recordingSeconds = signal(0);
  readonly successMessage = signal<string | null>(null);

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingInterval: any = null;

  async ngOnInit(): Promise<void> {
    await this.faceVerificationService.checkFaceVerificationStatus();
    await this.identityLevelService.loadIdentityLevel();
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.stopMediaStream();
  }

  async startRecording(): Promise<void> {
    try {
      this.faceVerificationService.clearError();
      this.successMessage.set(null);

      // Request camera access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false,
      });

      const video = this.videoPreview.nativeElement;
      video.srcObject = this.mediaStream;
      await video.play();

      // Start recording
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'video/webm;codecs=vp8',
      });

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        video.srcObject = null;
        video.src = URL.createObjectURL(blob);
        this.hasVideo.set(true);
        this.stopMediaStream();
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingSeconds.set(0);

      // Auto-stop after 5 seconds
      this.recordingInterval = setInterval(() => {
        const seconds = this.recordingSeconds() + 1;
        this.recordingSeconds.set(seconds);

        if (seconds >= 5) {
          this.stopRecording();
        }
      }, 1000);
    } catch (_error) {
      console.error('Failed to start recording:', _error);
      this.error.set('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    }
  }

  stopRecording(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.isRecording.set(false);
  }

  stopMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  async submitVideo(): Promise<void> {
    if (this.recordedChunks.length === 0) return;

    try {
      this.faceVerificationService.clearError();
      this.successMessage.set(null);

      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const file = new File([blob], `selfie_${Date.now()}.webm`, { type: 'video/webm' });

      // Upload video
      const videoUrl = await this.faceVerificationService.uploadSelfieVideo(file);

      // Get document URL for face matching
      const identityLevel = await this.identityLevelService.loadIdentityLevel();
      const documentUrl = identityLevel?.document_front_url || identityLevel?.driver_license_url;

      if (!documentUrl) {
        throw new Error('No se encontró documento para comparar. Completa Level 2 primero.');
      }

      // Verify face
      await this.faceVerificationService.verifyFace(videoUrl, documentUrl);

      this.successMessage.set('¡Identidad verificada exitosamente! Ahora tienes acceso Level 3.');
      this.hasVideo.set(false);
      this.recordedChunks = [];

      // Reload status
      await this.faceVerificationService.checkFaceVerificationStatus();
    } catch (_error) {
      console.error('Failed to verify face:', _error);
    }
  }

  retake(): void {
    const video = this.videoPreview.nativeElement;
    if (video.src) {
      URL.revokeObjectURL(video.src);
    }

    video.src = '';
    video.srcObject = null;
    this.hasVideo.set(false);
    this.recordedChunks = [];
    this.faceVerificationService.clearError();
    this.successMessage.set(null);
  }

  getStatusIcon(): string {
    return this.status().isVerified ? '✓' : '○';
  }

  getStatusBadgeClass(): string {
    return this.status().isVerified
      ? 'bg-green-100 text-green-600'
      : 'bg-sky-100 text-sky-600';
  }

  getStatusLabel(): string {
    return this.status().isVerified ? 'Verificado' : 'Pendiente';
  }

  getStatusLabelClass(): string {
    return this.status().isVerified
      ? 'bg-green-100 text-green-800'
      : 'bg-sky-100 text-sky-800';
  }
}
