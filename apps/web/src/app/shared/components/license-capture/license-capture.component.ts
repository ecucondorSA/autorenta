import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  signal,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-license-capture',
  standalone: true,
  imports: [],
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
        <div class="text-sm font-medium opacity-80">Escanear Licencia (Frente)</div>
        <div class="w-10"></div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
        <!-- Video Element -->
        <video
          #videoElement
          autoplay
          playsinline
          muted
          class="absolute inset-0 w-full h-full object-cover"
        ></video>

        <!-- Preview Image -->
        @if (capturedImage(); as img) {
          <img
            [src]="img"
            class="absolute inset-0 w-full h-full object-cover z-20"
            alt="Captured License"
          />
        }

        <!-- Rectangular Overlay (Mask) -->
        <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <mask id="rect-hole">
                <rect width="100%" height="100%" fill="white" />
                <!-- Standard ID Card Ratio ~ 85.60 × 53.98 mm (1.58:1) -->
                <!-- x=10, width=80 -> aspect ratio heavily depends on container, but let's approximate landscape -->
                <rect x="5" y="30" width="90" height="40" rx="2" ry="2" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#rect-hole)" />

            <!-- Guide Frame -->
            <rect
              x="5"
              y="30"
              width="90"
              height="40"
              rx="2"
              ry="2"
              fill="none"
              stroke="white"
              stroke-width="0.5"
              stroke-dasharray="4 2"
              class="transition-colors duration-300"
            />
          </svg>

          <div class="absolute top-[10%] text-center px-6 drop-shadow-md">
            <h2 class="text-xl font-bold mb-2">
              @if (capturedImage()) {
                <span class="text-green-500">¡Capturada!</span>
              } @else {
                Enuadrá el frente de tu licencia
              }
            </h2>
            <p class="text-sm opacity-80">
              @if (capturedImage()) {
                Revisá que el texto sea legible
              } @else {
                Evitá reflejos y sombras
              }
            </p>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="bg-black p-8 pb-Safe z-20 flex flex-col items-center gap-6">
        @if (!capturedImage()) {
          <!-- Shutter Button -->
          <button
            (click)="capturePhoto()"
            [disabled]="!streamReady()"
            class="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-white/20 hover:bg-white/30"
          >
            <div class="w-16 h-16 rounded-full bg-white"></div>
          </button>
        } @else {
          <!-- Action Buttons -->
          <div class="flex w-full gap-4">
            <button
              (click)="retake()"
              class="flex-1 py-4 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition-colors text-white"
            >
              Repetir
            </button>
            <button
              (click)="confirm()"
              class="flex-1 py-4 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors"
            >
              Usar Foto
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
export class LicenseCaptureComponent implements AfterViewInit, OnDestroy {
  @Output() cancelled = new EventEmitter<void>();
  @Output() completed = new EventEmitter<Blob>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  stream: MediaStream | null = null;
  readonly streamReady = signal(false);
  readonly capturedImage = signal<string | null>(null);

  private blob: Blob | null = null;

  ngAfterViewInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    try {
      // Request rear camera for documents (better resolution/autofocus)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        // Wait for metadata to ensure size is correct?
        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.streamReady.set(true);
        };
      }
    } catch (err) {
      console.error('Camera error', err);
      alert('Necesitamos acceso a la cámara para escanear el documento.');
      this.cancelled.emit();
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  capturePhoto() {
    if (!this.videoElement || !this.streamReady()) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      this.capturedImage.set(dataUrl);

      canvas.toBlob(
        (b) => {
          this.blob = b;
        },
        'image/jpeg',
        0.9,
      );

      // Pause stream to save battery? Or keep running?
      // Typically keep running under the overlay image is standard behavior or stop it.
      // Let's keep it simple.
    }
  }

  retake() {
    this.capturedImage.set(null);
    this.blob = null;
  }

  confirm() {
    if (this.blob) {
      this.completed.emit(this.blob);
    }
  }
}
