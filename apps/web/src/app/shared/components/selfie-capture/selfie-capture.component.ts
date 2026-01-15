import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  effect,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FaceVerificationService } from '@core/services/verification/face-verification.service';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

@Component({
  standalone: true,
  selector: 'app-selfie-capture',
  imports: [TranslateModule],
  template: `
    <div class="bg-surface-raised rounded-lg border border-border-default p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors"
            [class]="getStatusBadgeClass()"
          >
            {{ getStatusIcon() }}
          </div>
          <div>
            <h4 class="font-semibold text-text-primary">Biometría Facial</h4>
            <p class="text-sm text-text-secondary">Prueba de vida y validación de identidad</p>
          </div>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full" [class]="getStatusLabelClass()">
          {{ getStatusLabel() }}
        </span>
      </div>

      <!-- Verified State -->
      @if (status().isVerified) {
        <div class="p-4 bg-success-light/10 border border-success-light/40 rounded-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center gap-2 text-success-strong">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm font-medium">Identidad validada</span>
          </div>
          <div class="mt-3 space-y-1 text-sm pl-7">
            <p class="text-text-secondary">Tu rostro coincide con tu documento.</p>
          </div>
        </div>
      }

      <!-- Level 2 Required -->
      @if (status().requiresLevel2) {
        <div class="p-4 bg-warning-light/10 border border-warning-light/40 rounded-lg">
          <p class="text-sm text-warning-strong">
            ⚠️ Debes validar tu documento (Level 2) antes de realizar la prueba de vida.
          </p>
        </div>
      }

      <!-- Capture / Analysis UI -->
      @if (!status().isVerified && !status().requiresLevel2) {
        <div class="space-y-4">
          
          <!-- Instructions Panel (Changes dynamically) -->
          @if (isModelLoaded() && (isCameraActive() || isRecording())) {
             <div 
              class="p-3 rounded-lg text-center font-medium transition-all duration-300"
              [class.bg-cta-default]="instructionState() === 'good'"
              [class.text-white]="instructionState() === 'good'"
              [class.bg-surface-base]="instructionState() !== 'good'"
              [class.text-text-primary]="instructionState() !== 'good'"
              [class.border]="instructionState() !== 'good'"
              [class.border-cta-default]="instructionState() !== 'good'"
             >
               @switch (instructionState()) {
                 @case ('no-face') { 🔍 Coloca tu rostro frente a la cámara }
                 @case ('too-far') { 🔍 Acércate más }
                  @case ('too-close') { ↔️ Aléjate un poco }
                  @case ('center') { 🎯 Centra tu rostro en el óvalo }
                  @case ('good') { ✨ ¡Perfecto! Mantente así... }
                  @case ('action-required') { 
                    @if (currentChallenge() === 'smile') { 😃 ¡Sonríe! }
                    @else if (currentChallenge() === 'blink') { 😉 Parpadea }
                  }
                  @case ('recording') { 🎥 Grabando... }
                }
             </div>
          } @else if (!hasVideo()) {
             <div class="p-4 bg-surface-base border border-border-muted rounded-lg space-y-2">
              <p class="text-sm font-medium text-text-primary">Instrucciones:</p>
              <ul class="text-sm text-text-secondary space-y-1 ml-4 list-disc">
                <li>Busca un lugar iluminado</li>
                <li>Quítate gorras o gafas oscuras</li>
                <li>Sigue las instrucciones en pantalla</li>
              </ul>
            </div>
          }

          <!-- Camera Container -->
          <div class="relative rounded-xl overflow-hidden bg-black shadow-inner aspect-[3/4] max-w-sm mx-auto border-2 border-border-muted">
            
            <!-- Video Element -->
            <video
              #videoPreview
              [hidden]="!isCameraActive() && !hasVideo()"
              [class.opacity-50]="!isCameraActive() && !hasVideo()"
              autoplay
              playsinline
              muted
              class="w-full h-full object-cover transform scale-x-[-1]"
            ></video>

            <!-- Analysis Canvas (Oval & Landmarks) -->
            <canvas 
              #canvasOutput
              class="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
              [hidden]="hasVideo() || !isCameraActive()"
            ></canvas>

              <!-- Oval Guide (SVG Overlay for cleaner look) -->
            @if (isCameraActive() && !hasVideo()) {
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <mask id="face-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <ellipse cx="50" cy="45" rx="35" ry="45" fill="black" />
                    </mask>
                  </defs>
                  <!-- Dimmed background outside oval -->
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#face-mask)" />
                  
                  <!-- Oval Border - Changes color based on state -->
                  <ellipse 
                    cx="50" cy="45" rx="35" ry="45" 
                    fill="none" 
                    stroke-width="2"
                    [attr.stroke]="getOvalColor()"
                    class="transition-colors duration-300"
                  />
                  
                  <!-- Challenge Icon Overlay (Centered at bottom of oval) -->
                  @if (instructionState() === 'action-required') {
                    <foreignObject x="40" y="80" width="20" height="20">
                      <div class="flex justify-center items-center w-full h-full text-2xl animate-bounce">
                        @if (currentChallenge() === 'smile') { 😃 }
                        @else { 😉 }
                      </div>
                    </foreignObject>
                  }
                </svg>
              </div>
            }

            <!-- Loading Spinner -->
            @if (!isModelLoaded() && !hasVideo() && !error()) {
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised z-20">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cta-default mb-4"></div>
                <p class="text-sm text-text-secondary">Cargando inteligencia artificial...</p>
              </div>
            }

            <!-- Start Button Overlay -->
            @if (isModelLoaded() && !isCameraActive() && !hasVideo()) {
              <div class="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                <button
                  (click)="startSmartCamera()"
                  class="px-6 py-3 bg-cta-default text-white rounded-full font-semibold shadow-lg hover:scale-105 transition-transform"
                >
                  Iniciar Reconocimiento
                </button>
              </div>
            }

            <!-- Recording Indicator -->
            @if (isRecording()) {
              <div class="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-error-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm font-medium animate-pulse">
                <span class="w-2 h-2 bg-white rounded-full"></span>
                <span>{{ recordingSeconds() }}s</span>
              </div>
            }
          </div>

          <!-- Action Buttons (Post-Capture) -->
          @if (hasVideo()) {
            <div class="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="button"
                (click)="submitVideo()"
                [disabled]="processing()"
                class="w-full px-6 py-3 bg-cta-default text-white rounded-lg font-medium hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                @if (processing()) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </span>
                } @else {
                  Confirmar y Enviar
                }
              </button>
              
              <button
                type="button"
                (click)="retake()"
                [disabled]="processing()"
                class="w-full px-6 py-3 bg-surface-base border border-border-default text-text-primary rounded-lg font-medium hover:bg-surface-raised transition-all"
              >
                Intentar de nuevo
              </button>
            </div>
          }

          <!-- Error Message -->
          @if (error()) {
            <div class="p-4 bg-error-bg border border-error-border rounded-lg flex gap-3 items-start animate-in fade-in">
              <span class="text-error-strong text-lg">⚠️</span>
              <div class="flex-grow">
                <p class="text-sm text-error-strong font-medium">{{ error() }}</p>
                @if (hasVideo()) {
                   <button (click)="retake()" class="text-xs text-error-strong underline mt-1">Reintentar</button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    canvas { transform: scaleX(-1); } /* Mirror effect */
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfieCaptureComponent implements OnInit, OnDestroy {
  private readonly faceVerificationService = inject(FaceVerificationService);
  private readonly identityLevelService = inject(IdentityLevelService);
  private readonly supabase = injectSupabase();

  @ViewChild('videoPreview') videoPreview!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasOutput') canvasOutput!: ElementRef<HTMLCanvasElement>;

  // Signals
  readonly status = this.faceVerificationService.status;
  readonly processing = this.faceVerificationService.processing;
  readonly error = this.faceVerificationService.error;
  
  readonly isModelLoaded = signal(false);
  readonly isCameraActive = signal(false);
  readonly isRecording = signal(false);
  readonly hasVideo = signal(false);
  readonly recordingSeconds = signal(0);
  
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
  private recordingInterval: any = null;

  async ngOnInit(): Promise<void> {
    await this.faceVerificationService.checkFaceVerificationStatus();
    await this.identityLevelService.loadIdentityLevel();
    
    // Preload MediaPipe model
    this.initializeFaceLandmarker();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Initialize MediaPipe Face Landmarker
   */
  async initializeFaceLandmarker() {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
      
      this.isModelLoaded.set(true);
      console.log('FaceLandmarker loaded');
    } catch (err) {
      console.error('Failed to load FaceLandmarker', err);
      this.faceVerificationService.error.set('No se pudo cargar el módulo de IA. Recarga la página.');
    }
  }

  /**
   * Start Camera and Analysis Loop
   */
  async startSmartCamera() {
    this.faceVerificationService.clearError();
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user' 
        },
        audio: false,
      });

      const video = this.videoPreview.nativeElement;
      video.srcObject = this.mediaStream;
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      this.isCameraActive.set(true);
      this.predictWebcam();
    } catch (err) {
      console.error('Camera Error:', err);
      this.faceVerificationService.error.set('Permiso de cámara denegado. Habilítalo en tu navegador.');
    }
  }

  /**
   * Main Prediction Loop
   */
  async predictWebcam() {
    if (!this.isCameraActive() || !this.faceLandmarker) return;

    const video = this.videoPreview.nativeElement;
    const canvas = this.canvasOutput.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Resize canvas to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

      const startTimeMs = performance.now();
      
      if (this.lastVideoTime !== video.currentTime) {
        this.lastVideoTime = video.currentTime;
        
        const results = this.faceLandmarker.detectForVideo(video, startTimeMs);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const blendshapes = results.faceBlendshapes ? results.faceBlendshapes[0] : null;
          
          // Analyze Geometry & Expressions
          this.analyzeFace(landmarks, blendshapes, canvas.width, canvas.height);
          
          // Optional: Draw landmarks for "tech" feel (subtle)
          // this.drawLandmarks(ctx, landmarks); 
        } else {
          this.instructionState.set('no-face');
          this.goodStateStartTime = null;
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
  private analyzeFace(landmarks: any[], blendshapes: any | null, width: number, height: number) {
    if (this.isRecording()) return; 

    // 1. Geometry Check
    const geometryState = this.checkFaceGeometry(landmarks);
    
    if (geometryState !== 'good') {
      // If face moves out of position, reset everything
      this.instructionState.set(geometryState);
      this.resetChallenge();
      return;
    }

    // 2. Position is GOOD. 
    // If we haven't started a challenge yet, verify stability first
    if (this.currentChallenge() === 'none') {
      this.instructionState.set('good');
      
      if (!this.goodStateStartTime) {
        this.goodStateStartTime = Date.now();
      } else {
        const timeInGoodState = Date.now() - this.goodStateStartTime;
        // Hold still for 1s before challenge
        if (timeInGoodState > 1000) { 
          this.startChallenge();
        }
      }
    } 
    // 3. Challenge Active (Smile or Blink)
    else if (!this.challengeCompleted()) {
      this.instructionState.set('action-required');
      
      if (blendshapes && this.checkChallenge(blendshapes)) {
        this.challengeCompleted.set(true);
        // Small delay to register the success visually before recording
        setTimeout(() => this.startRecording(), 500); 
      }
    }
  }

  private checkFaceGeometry(landmarks: any[]): string {
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // const minY = Math.min(...ys);
    // const maxY = Math.max(...ys);

    const faceWidth = maxX - minX;
    const faceCenterX = (minX + maxX) / 2;
    const faceCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;

    // Rules
    const isCenteredX = faceCenterX > 0.35 && faceCenterX < 0.65;
    const isCenteredY = faceCenterY > 0.30 && faceCenterY < 0.70;
    const isTooFar = faceWidth < 0.35;
    const isTooClose = faceWidth > 0.65;

    if (isTooFar) return 'too-far';
    if (isTooClose) return 'too-close';
    if (!isCenteredX || !isCenteredY) return 'center';
    
    return 'good';
  }

  private startChallenge() {
    // Randomly pick Smile or Blink
    const challenges: ('smile' | 'blink')[] = ['smile', 'blink'];
    const next = challenges[Math.floor(Math.random() * challenges.length)];
    
    this.currentChallenge.set(next);
    
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(50);
  }

  private checkChallenge(blendshapes: any): boolean {
    const categories = blendshapes.categories;
    if (!categories) return false;

    // Helper to get score
    const getScore = (name: string) => categories.find((c: any) => c.categoryName === name)?.score || 0;

    if (this.currentChallenge() === 'smile') {
      const smileScore = (getScore('mouthSmileLeft') + getScore('mouthSmileRight')) / 2;
      return smileScore > 0.5; // Threshold for smile
    }
    
    if (this.currentChallenge() === 'blink') {
      const blinkScore = (getScore('eyeBlinkLeft') + getScore('eyeBlinkRight')) / 2;
      return blinkScore > 0.5; // Threshold for blink
    }

    return false;
  }

  private resetChallenge() {
    this.goodStateStartTime = null;
    this.currentChallenge.set('none');
    this.challengeCompleted.set(false);
  }

  startRecording() {
    if (this.isRecording() || !this.mediaStream) return;
    
    this.isRecording.set(true);
    this.instructionState.set('recording');
    this.goodStateStartTime = null;

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.videoPreview.nativeElement.srcObject = null;
        this.videoPreview.nativeElement.src = URL.createObjectURL(blob);
        this.hasVideo.set(true);
        this.stopCamera();
      };

      this.mediaRecorder.start();
      this.recordingSeconds.set(0);

      // Record for 3 seconds (MercadoPago usually does short clips)
      this.recordingInterval = setInterval(() => {
        const sec = this.recordingSeconds() + 1;
        this.recordingSeconds.set(sec);
        if (sec >= 3) {
          this.stopRecording();
        }
      }, 1000);

    } catch (e) {
      console.error('Recorder error:', e);
      this.faceVerificationService.error.set('Error al iniciar grabación.');
      this.isRecording.set(false);
    }
  }

  stopRecording() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  retake() {
    if (this.videoPreview?.nativeElement?.src) {
      URL.revokeObjectURL(this.videoPreview.nativeElement.src);
    }
    this.hasVideo.set(false);
    this.recordedChunks = [];
    this.instructionState.set('no-face');
    this.resetChallenge(); // Reset logic
    
    // Restart camera
    if (this.isModelLoaded()) {
      this.startSmartCamera();
    }
  }

  getOvalColor(): string {
    const state = this.instructionState();
    if (state === 'good') return '#10B981'; // Green
    if (state === 'recording') return '#EF4444'; // Red for recording
    if (state === 'action-required') return '#3B82F6'; // Blue for action
    if (state === 'center') return '#ffffff';
    return '#F59E0B'; // Orange/Yellow for adjustments
  }

  async submitVideo() {
    if (!this.recordedChunks.length) return;
    
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const file = new File([blob], `selfie_${Date.now()}.webm`, { type: 'video/webm' });

      // Current flow: Upload video -> Backend verifies
      // Step 3 (Backend) will assume this video is good because we validated it here.
      
      const videoUrl = await this.faceVerificationService.uploadSelfieVideo(file);

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get user document to compare against
      const { data: docs } = await this.supabase
        .from('user_documents')
        .select('storage_path')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .limit(1);

      if (!docs?.length) throw new Error('No tienes documentos verificados (Level 2)');

      const { data: urlData } = this.supabase.storage
        .from('verification-docs') // or 'documents' depending on your bucket struct
        .getPublicUrl(docs[0].storage_path);

      await this.faceVerificationService.verifyFace(videoUrl, urlData.publicUrl);
      
    } catch (e) {
      console.error(e);
      // Error is handled by service signal
    }
  }

  getStatusIcon(): string { return this.status().isVerified ? '✓' : '👤'; }
  getStatusBadgeClass(): string { 
    return this.status().isVerified 
      ? 'bg-success-light/20 text-success-strong' 
      : 'bg-surface-raised border border-border-default text-text-secondary';
  }
  getStatusLabel(): string { return this.status().isVerified ? 'Verificado' : 'Requerido'; }
  getStatusLabelClass(): string {
    return this.status().isVerified 
      ? 'bg-success-light/10 text-success-strong' 
      : 'bg-surface-base border border-border-default text-text-secondary';
  }
}
