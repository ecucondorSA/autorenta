import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { FaceVerificationService } from '@core/services/verification/face-verification.service';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { ToastService } from '@core/services/ui/toast.service';
import { AuthService } from '@core/services/auth/auth.service'; // Added for session check
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/** MediaPipe FaceLandmarker normalized landmark point */
interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** MediaPipe blendshape category */
interface BlendshapeCategory {
  categoryName: string;
  score: number;
  index: number;
}

/** MediaPipe face blendshapes result */
interface FaceBlendshapes {
  categories: BlendshapeCategory[];
}

@Component({
  standalone: true,
  selector: 'app-selfie-capture',
  imports: [TranslateModule],
  template: `
    <!-- Top Status Bar (Only when verified) -->
    @if (status().isVerified) {
      <div class="mb-6 rounded-2xl bg-success-50 border border-success-200 p-4 animate-in slide-in-from-top-4 fade-in duration-500">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-full bg-success-100 flex items-center justify-center text-success-600 shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-gray-900">Identidad Verificada</h3>
            <p class="text-sm text-gray-600">Tu rostro ha sido validado correctamente.</p>
          </div>
        </div>
      </div>
    }

    @if (!status().isVerified) {
      <div class="relative flex flex-col items-center w-full max-w-md mx-auto">
        
        <!-- Main Camera Container -->
        <div class="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden bg-black shadow-2xl border-4 border-gray-900 ring-1 ring-white/10 group">
          
          <!-- Video Feed -->
          <video
            #videoPreview
            [hidden]="!isCameraActive() && !hasVideo()"
            class="w-full h-full object-cover transform scale-x-[-1]"
            autoplay
            playsinline
            muted
          ></video>

          <!-- Overlay UI Layer (Mask & Guides) -->
          @if (isCameraActive() && !hasVideo() && !useSimpleMode()) {
            <div class="absolute inset-0 pointer-events-none z-10">
              <!-- Dark Overlay with Oval Cutout -->
              <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <mask id="face-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <ellipse cx="50" cy="45" rx="32" ry="42" fill="black" />
                  </mask>
                </defs>
                
                <!-- Dimmed Background -->
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#face-mask)" />
                
                <!-- Guide Oval Ring -->
                <ellipse
                  cx="50"
                  cy="45"
                  rx="32"
                  ry="42"
                  fill="none"
                  stroke-width="1.5"
                  [attr.stroke]="getOvalColor()"
                  class="transition-colors duration-300"
                  [class.animate-pulse]="instructionState() === 'good'"
                />
              </svg>

              <!-- Scanning Line Animation (When 'good' state) -->
              @if (instructionState() === 'good' || instructionState() === 'recording' || instructionState() === 'action-required') {
                <div class="absolute top-[10%] left-[18%] w-[64%] h-1 bg-gradient-to-r from-transparent via-cta-default to-transparent shadow-[0_0_15px_rgba(var(--color-cta-default),0.8)] animate-scan opacity-80"></div>
              }

              <!-- Instruction Text Overlay -->
              <div class="absolute bottom-8 left-0 right-0 text-center px-4">
                <div class="inline-block px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg transform transition-all duration-300">
                  <span class="text-white font-medium text-lg tracking-wide flex items-center justify-center gap-2">
                    @switch (instructionState()) {
                      @case ('no-face') { 🔍 Encuadra tu rostro }
                      @case ('too-far') { 🔍 Acércate más }
                      @case ('too-close') { ↔️ Aléjate un poco }
                      @case ('center') { 🎯 Centra tu cara }
                      @case ('good') { ✨ Perfecto, no te muevas... }
                      @case ('recording') { 🎥 Grabando... }
                      @case ('action-required') { 
                        @if (currentChallenge() === 'smile') { 😃 ¡Sonríe! }
                        @else { 😉 Parpadea }
                      }
                    }
                  </span>
                </div>
              </div>
            </div>
          }

          <!-- Initial State / Start Button -->
          @if (!isCameraActive() && !hasVideo()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised z-20 p-6 text-center">
              <div class="w-20 h-20 rounded-full bg-cta-default/10 flex items-center justify-center mb-6 animate-pulse">
                <svg class="w-10 h-10 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-text-primary mb-2">Prueba de Vida</h3>
              <p class="text-text-secondary mb-8 max-w-xs">Necesitamos verificar que eres tú. Sigue las instrucciones para tomar una video-selfie rápida.</p>
              
              <button (click)="startSmartCamera()" class="w-full max-w-xs py-4 bg-cta-default text-white rounded-xl font-bold text-lg shadow-lg shadow-cta-default/30 hover:shadow-cta-default/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span>Comenzar Cámara</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
              
              <button (click)="triggerNativeInput()" class="mt-6 text-sm text-text-muted hover:text-text-primary underline decoration-dotted">
                ¿Problemas? Usar cámara del sistema
              </button>
            </div>
          }

          <!-- Recording Timer -->
          @if (isRecording()) {
             <div class="absolute top-6 right-6 z-30 flex items-center gap-2 bg-red-500/90 backdrop-blur px-4 py-1.5 rounded-full text-white font-mono text-sm shadow-lg animate-pulse">
               <div class="w-2 h-2 bg-white rounded-full"></div>
               REC {{ recordingSeconds() }}s
             </div>
          }

          <!-- Review Mode (Video Recorded) -->
          @if (hasVideo()) {
             <div class="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <div class="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <p class="text-white font-bold text-lg mb-8">Video Capturado</p>
             </div>
          }
        </div>

        <!-- Hidden canvas for AI processing -->
        <canvas #canvasOutput class="hidden"></canvas>

        <!-- Hidden Native Input fallback -->
        <input #nativeInput type="file" accept="video/*" capture="user" (change)="submitNativeVideo($event)" class="hidden" />

        <!-- Controls (Bottom Sheet Style) -->
        @if (hasVideo()) {
          <div class="w-full mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
             <button
                (click)="submitVideo()"
                [disabled]="processing()"
                class="w-full py-4 bg-cta-default text-white rounded-xl font-bold text-lg shadow-xl shadow-cta-default/20 hover:bg-cta-hover disabled:opacity-70 disabled:cursor-wait transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                @if (processing()) {
                  <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Validando...</span>
                } @else {
                  <span>Confirmar y Enviar</span>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                }
             </button>

             <button
                (click)="retake()"
                [disabled]="processing()"
                class="w-full py-3 bg-surface-base text-text-secondary border border-border-default rounded-xl font-medium hover:bg-surface-secondary transition-colors"
              >
                Grabar nuevamente
             </button>
          </div>
        }

        <!-- Error Toast -->
        @if (error()) {
          <div class="w-full mt-4 p-4 bg-error-50 border border-error-100 rounded-xl flex items-start gap-3 animate-pulse">
            <svg class="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div class="flex-1">
              <p class="text-sm font-semibold text-error-900">Algo salió mal</p>
              <p class="text-sm text-error-700">{{ error() }}</p>
              @if (isAuthError()) {
                <button (click)="refreshSessionAndRetry()" class="mt-2 text-xs font-bold text-error-800 underline">Recargar Sesión</button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    
    @keyframes scan {
      0% { top: 10%; opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.8; }
      100% { top: 90%; opacity: 0; }
    }
    .animate-scan {
      animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfieCaptureComponent implements OnInit, OnDestroy {
  private readonly faceVerificationService = inject(FaceVerificationService);
  private readonly identityLevelService = inject(IdentityLevelService);
  private readonly authService = inject(AuthService); // Injected AuthService
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('SelfieCapture');
  private readonly toastService = inject(ToastService);

  @ViewChild('videoPreview') videoPreview!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasOutput') canvasOutput!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nativeInput') nativeInput!: ElementRef<HTMLInputElement>;

  // Signals
  readonly status = this.faceVerificationService.status;
  readonly processing = this.faceVerificationService.processing;
  readonly error = this.faceVerificationService.error;

  readonly isModelLoaded = signal(false);
  readonly isCameraActive = signal(false);
  readonly isRecording = signal(false);
  readonly hasVideo = signal(false);
  readonly recordingSeconds = signal(0);
  readonly useSimpleMode = signal(false);

  // Auth Error State helper
  readonly isAuthError = signal(false);

  // 'no-face' | 'too-far' | 'too-close' | 'center' | 'good' | 'recording' | 'action-required'
  readonly instructionState = signal<string>('no-face');
  readonly currentChallenge = signal<'none' | 'smile' | 'blink'>('none');
  readonly challengeCompleted = signal(false);

  private faceLandmarker: FaceLandmarker | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Loop control
  private lastVideoTime = -1;
  private animationFrameId: number | null = null;
  private goodStateStartTime: number | null = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.faceVerificationService.checkFaceVerificationStatus();
    await this.identityLevelService.loadIdentityLevel();

    // Check auth status on init
    const session = await this.authService.ensureSession();
    if (!session) {
      this.error.set('Sesión expirada. Por favor recarga la página.');
      this.isAuthError.set(true);
    }

    // Start loading AI immediately
    void this.initializeFaceLandmarker();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  async refreshSessionAndRetry(): Promise<void> {
    this.processing.set(true);
    try {
      const session = await this.authService.refreshSession();
      if (!session) throw new Error('No session after refresh');

      this.isAuthError.set(false);
      this.error.set(null);
      this.toastService.success('Sesión restaurada');
    } catch (err) {
      this.logger.error('Failed to refresh session', err);
      // Force logout if critical
      this.authService.signOut();
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Helper for Oval Color based on state
   */
  getOvalColor(): string {
    const s = this.instructionState();
    if (s === 'good' || s === 'recording') return '#10B981'; // Success Green
    if (s === 'no-face') return '#EF4444'; // Error Red
    if (s === 'action-required') return '#F59E0B'; // Warning Amber
    return '#E5E7EB'; // Neutral Gray
  }

  /**
   * Initialize MediaPipe Face Landmarker
   */
  async initializeFaceLandmarker(): Promise<void> {
    try {
      this.logger.info('Loading FaceLandmarker...');

      const loadPromise = async () => {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
        );

        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      };

      // Timeout after 6 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout loading AI model')), 6000),
      );

      await Promise.race([loadPromise(), timeoutPromise]);

      this.isModelLoaded.set(true);
      this.logger.info('FaceLandmarker loaded');
    } catch (error: unknown) {
      this.logger.error('Failed to load FaceLandmarker - Switching to Simple Mode', error);
      this.useSimpleMode.set(true);
      this.isModelLoaded.set(true);
    }
  }

  /**
   * Start Camera and Analysis Loop
   */
  async startSmartCamera(): Promise<void> {
    this.faceVerificationService.clearError();
    this.isAuthError.set(false);

    if (!this.faceLandmarker && !this.useSimpleMode()) {
      await this.initializeFaceLandmarker();
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      const video = this.videoPreview.nativeElement;
      video.srcObject = this.mediaStream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          void video.play();
          resolve();
        };
      });

      this.isCameraActive.set(true);

      if (!this.useSimpleMode()) {
        this.predictWebcam();
      } else {
        this.instructionState.set('good');
        // Auto-start recording in simple mode after 1s
        setTimeout(() => this.startRecording(), 1000);
      }
    } catch (error) {
      this.logger.error('Camera error', error);
      this.faceVerificationService.error.set(
        'Permiso de cámara denegado. Intenta usar el botón "Usar cámara del sistema".',
      );
    }
  }

  /**
   * Main Prediction Loop
   */
  async predictWebcam(): Promise<void> {
    if (!this.isCameraActive() || !this.faceLandmarker || this.useSimpleMode()) return;

    const video = this.videoPreview.nativeElement;
    const startTimeMs = performance.now();

    if (this.lastVideoTime !== video.currentTime) {
      this.lastVideoTime = video.currentTime;
      const results = this.faceLandmarker.detectForVideo(video, startTimeMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const blendshapes = results.faceBlendshapes ? results.faceBlendshapes[0] : null;
        this.analyzeFace(landmarks, blendshapes);
      } else {
        this.instructionState.set('no-face');
        this.resetChallenge();
      }
    }

    if (this.isCameraActive()) {
      this.animationFrameId = requestAnimationFrame(() => this.predictWebcam());
    }
  }

  /**
   * Main Analysis Logic: Geometry + Liveness
   */
  private analyzeFace(
    landmarks: NormalizedLandmark[],
    blendshapes: FaceBlendshapes | null,
  ): void {
    if (this.isRecording()) return;

    // 1. Geometry Check
    const geometryState = this.checkFaceGeometry(landmarks);

    if (geometryState !== 'good') {
      this.instructionState.set(geometryState);
      this.resetChallenge();
      return;
    }

    // 2. Position is GOOD.
    if (this.currentChallenge() === 'none') {
      this.instructionState.set('good');

      if (!this.goodStateStartTime) {
        this.goodStateStartTime = Date.now();
      } else {
        const timeInGoodState = Date.now() - this.goodStateStartTime;
        // Hold still for 1s before challenge
        if (timeInGoodState > 1200) {
          this.startChallenge();
        }
      }
    }
    // 3. Challenge Active (Smile or Blink)
    else if (!this.challengeCompleted()) {
      this.instructionState.set('action-required');

      if (blendshapes && this.checkChallenge(blendshapes)) {
        this.challengeCompleted.set(true);
        // Haptic Success
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        // Delay recording start for better UX
        setTimeout(() => this.startRecording(), 600);
      }
    }
  }

  private checkFaceGeometry(landmarks: NormalizedLandmark[]): string {
    const xs = landmarks.map((l) => l.x);
    const ys = landmarks.map((l) => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const faceWidth = maxX - minX;
    const faceCenterX = (minX + maxX) / 2;
    const faceCenterY = (minY + maxY) / 2;

    const isCenteredX = faceCenterX > 0.35 && faceCenterX < 0.65;
    const isCenteredY = faceCenterY > 0.3 && faceCenterY < 0.7;
    const isTooFar = faceWidth < 0.30; // Relaxed a bit
    const isTooClose = faceWidth > 0.75;

    if (isTooFar) return 'too-far';
    if (isTooClose) return 'too-close';
    if (!isCenteredX || !isCenteredY) return 'center';

    return 'good';
  }

  private startChallenge(): void {
    const challenges: ('smile' | 'blink')[] = ['smile', 'blink'];
    const next = challenges[Math.floor(Math.random() * challenges.length)];
    this.currentChallenge.set(next);
  }

  private checkChallenge(blendshapes: FaceBlendshapes): boolean {
    const categories = blendshapes.categories;
    if (!categories) return false;

    const getScore = (name: string) => categories.find((c) => c.categoryName === name)?.score ?? 0;

    if (this.currentChallenge() === 'smile') {
      const smileScore = (getScore('mouthSmileLeft') + getScore('mouthSmileRight')) / 2;
      return smileScore > 0.4; // Valid smile threshold
    }

    if (this.currentChallenge() === 'blink') {
      const blinkScore = (getScore('eyeBlinkLeft') + getScore('eyeBlinkRight')) / 2;
      return blinkScore > 0.4; // Valid blink threshold
    }

    return false;
  }

  private resetChallenge(): void {
    this.goodStateStartTime = null;
    this.currentChallenge.set('none');
    this.challengeCompleted.set(false);
  }

  startRecording(): void {
    if (this.isRecording() || !this.mediaStream) return;

    this.isRecording.set(true);
    this.instructionState.set('recording');
    this.goodStateStartTime = null;

    try {
      let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: '' }; // Let browser choose default
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.recordedChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const type = this.recordedChunks[0]?.type || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type });
        this.videoPreview.nativeElement.srcObject = null;
        this.videoPreview.nativeElement.src = URL.createObjectURL(blob);
        this.hasVideo.set(true);
        this.stopCamera();

        // Auto submit check if needed, but manual confirm is better
      };

      this.mediaRecorder.start();
      this.recordingSeconds.set(0);

      this.recordingInterval = setInterval(() => {
        const sec = this.recordingSeconds() + 1;
        this.recordingSeconds.set(sec);
        if (sec >= 3) {
          this.stopRecording();
        }
      }, 1000);
    } catch (error) {
      this.logger.error('Recorder error', error);
      this.triggerNativeInput();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  stopCamera(): void {
    this.isCameraActive.set(false);
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    if (this.recordingInterval) clearInterval(this.recordingInterval);
  }

  triggerNativeInput(): void {
    this.nativeInput.nativeElement.click();
    this.stopCamera();
    this.useSimpleMode.set(true);
  }

  submitNativeVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Just simulate we have a video and create a blob URL for preview
      this.recordedChunks = [file];
      this.videoPreview.nativeElement.srcObject = null;
      this.videoPreview.nativeElement.src = URL.createObjectURL(file);
      this.hasVideo.set(true);
      this.stopCamera();
    }
  }

  retake(): void {
    this.hasVideo.set(false);
    this.recordedChunks = [];
    this.error.set(null);
    this.instructionState.set('no-face');
    this.resetChallenge();
    // Restart camera automatically
    this.startSmartCamera();
  }

  async submitVideo(): Promise<void> {
    if (this.recordedChunks.length === 0) return;

    // Double check auth before submit
    const session = await this.authService.ensureSession();
    if (!session) {
      this.isAuthError.set(true);
      this.error.set('Tu sesión expiró. Por favor recarga para continuar.');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type: this.recordedChunks[0].type });
    const file = new File([blob], `selfie_${Date.now()}.webm`, { type: blob.type });

    // Use Service to Upload
    await this.faceVerificationService.uploadSelfieVideo(file);
  }
}
