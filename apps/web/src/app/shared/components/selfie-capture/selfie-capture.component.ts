import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  signal,
  inject,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceVerificationService } from '@core/services/verification/face-verification.service';

@Component({
  selector: 'app-selfie-capture',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <!-- Header -->
      <div
        class="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent"
      >
        <button
          (click)="cancelled.emit()"
          class="p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div class="text-sm font-medium opacity-80">Verificación Biométrica</div>
        <div class="w-10"></div>
        <!-- Spacer -->
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
        <!-- Video Element -->
        <video
          #videoElement
          autoplay
          playsinline
          muted
          [class.scale-x-[-1]]="true"
          class="absolute inset-0 w-full h-full object-cover"
        ></video>

        <!-- Preview Video (Playback) -->
        @if (recordedBlob(); as blob) {
          <video
            [src]="blobUrl()"
            autoplay
            loop
            playsinline
            class="absolute inset-0 w-full h-full object-cover z-20"
          ></video>
        }

        <!-- Oval Overlay (Mask) -->
        <div
          class="absolute inset-0 pointer-events-none z-10 border-[50vw] border-black/50 rounded-[50%]"
          style="border-width: 100vh 20vw;"
        >
          <!-- CSS Hack for inverted border radius hole? Tailwind might be cleaner with SVG mask -->
        </div>

        <!-- Better Mask: SVG Overlay -->
        <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <mask id="hole">
                <rect width="100%" height="100%" fill="white" />
                <ellipse cx="50" cy="45" rx="35" ry="40" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#hole)" />

            <!-- Guide Ring -->
            <ellipse
              cx="50"
              cy="45"
              rx="36"
              ry="41"
              fill="none"
              [attr.stroke]="recording() ? '#ef4444' : recordedBlob() ? '#22c55e' : 'white'"
              stroke-width="0.5"
              stroke-dasharray="2 2"
              class="transition-colors duration-300"
            />
          </svg>

          <div class="absolute top-[15%] text-center px-6">
            <h2 class="text-xl font-bold mb-2 shadow-black drop-shadow-md">
              @if (recording()) {
                <span class="text-red-500 animate-pulse">Grabando...</span>
              } @else if (recordedBlob()) {
                <span class="text-green-500">¡Listo!</span>
              } @else {
                Poné tu cara en el óvalo
              }
            </h2>
            <p class="text-sm opacity-80 drop-shadow-md">
              @if (recording()) {
                Mové ligeramente la cabeza
              } @else if (recordedBlob()) {
                Revisá que se vea bien
              } @else {
                Asegurate de tener buena luz
              }
            </p>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="bg-black p-8 pb-Safe z-20 flex flex-col items-center gap-6">
        @if (!recordedBlob()) {
          <!-- Record Button -->
          <button
            (click)="toggleRecording()"
            [disabled]="!streamReady()"
            class="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              class="w-16 h-16 rounded-full transition-all duration-300"
              [class.bg-red-500]="recording()"
              [class.bg-white]="!recording()"
              [class.scale-75]="recording()"
            ></div>
            @if (recording()) {
              <svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="50%"
                  cy="50%"
                  r="36"
                  fill="none"
                  stroke="red"
                  stroke-width="4"
                  stroke-dasharray="226"
                  [attr.stroke-dashoffset]="226 - (226 * progress()) / 100"
                  class="transition-all duration-100 ease-linear"
                />
              </svg>
            }
          </button>
        } @else {
          <!-- Action Buttons -->
          <div class="flex w-full gap-4">
            <button
              (click)="retake()"
              class="flex-1 py-4 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition-colors"
            >
              Repetir
            </button>
            <button
              (click)="confirmUpload()"
              class="flex-1 py-4 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
            >
              @if (uploading()) {
                <svg
                  class="animate-spin h-5 w-5 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              }
              {{ uploading() ? 'Subiendo...' : 'Enviar Video' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 50;
      }
    `,
  ],
})
export class SelfieCaptureComponent implements AfterViewInit, OnDestroy {
  @Output() cancelled = new EventEmitter<void>();
  @Output() completed = new EventEmitter<string>(); // Emits storage path

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private readonly faceService = inject(FaceVerificationService);

  stream: MediaStream | null = null;
  mediaRecorder: MediaRecorder | null = null;
  chunks: Blob[] = [];

  readonly streamReady = signal(false);
  readonly recording = signal(false);
  readonly recordedBlob = signal<Blob | null>(null);
  readonly blobUrl = signal<string | null>(null);
  readonly progress = signal(0);
  readonly uploading = signal(false);

  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly RECORDING_DURATION = 3000; // 3 seconds

  ngAfterViewInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.blobUrl()) {
      URL.revokeObjectURL(this.blobUrl()!);
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 }, // Vertical/Mobile optimized
          aspectRatio: { ideal: 0.5625 }, // 9:16
        },
        audio: false,
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.streamReady.set(true);
      }
    } catch (err) {
      console.error('Camera error', err);
      // Handle permission error
      alert('Necesitamos acceso a la cámara para verificar tu identidad.');
      this.cancelled.emit();
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  toggleRecording() {
    if (this.recording()) return;
    this.startRecording();
  }

  startRecording() {
    if (!this.stream) return;

    this.chunks = [];
    // Try to use a mobile-friendly mime type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      this.recordedBlob.set(blob);
      this.blobUrl.set(URL.createObjectURL(blob));
      this.recording.set(false);
    };

    this.mediaRecorder.start();
    this.recording.set(true);
    this.progress.set(0);

    // Progress Timer
    const startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / this.RECORDING_DURATION) * 100, 100);
      this.progress.set(p);

      if (elapsed >= this.RECORDING_DURATION) {
        this.stopRecording();
      }
    }, 50);
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      clearInterval(this.timer);
    }
  }

  retake() {
    this.recordedBlob.set(null);
    if (this.blobUrl()) {
      URL.revokeObjectURL(this.blobUrl()!);
      this.blobUrl.set(null);
    }
    // Stream should still be active
  }

  async confirmUpload() {
    const blob = this.recordedBlob();
    if (!blob || this.uploading()) return;

    this.uploading.set(true);
    try {
      // Convert Blob to File
      const file = new File([blob], 'selfie_video.webm', { type: 'video/webm' });

      const { storagePath } = await this.faceService.uploadSelfieVideo(file);
      this.completed.emit(storagePath);
      // Wait a bit to show success? Or parent closes?
    } catch (err) {
      console.error('Upload failed', err);
      alert('Error al subir el video. Por favor intentá de nuevo.');
      this.uploading.set(false);
    }
  }
}
