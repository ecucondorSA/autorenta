import { Component, signal, inject, output, input, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { VideoDamageDetectionService } from '@core/services/verification/video-damage-detection.service';

/**
 * Video Inspection Recorder Component
 * 
 * Permite grabar video de inspección vehicular con guías visuales
 */
@Component({
  selector: 'app-video-inspection-recorder',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="video-recorder-container">
      <!-- Video Preview -->
      <div class="video-preview" [class.recording]="isRecording()">
        <video #videoElement autoplay playsinline muted></video>
        
        <!-- Recording indicator -->
        @if (isRecording()) {
          <div class="recording-indicator">
            <ion-icon name="ellipse" color="danger"></ion-icon>
            <span>{{ formatTime(recordingDuration()) }}</span>
          </div>
        }
        
        <!-- Inspection guide -->
        @if (isRecording()) {
          <div class="inspection-guide">
            <div class="guide-text">{{ currentGuide().text }}</div>
            <div class="guide-checklist">
              @for (area of inspectionAreas; track area.id) {
                <div class="area-item" [class.completed]="area.completed">
                  <ion-icon 
                    [name]="area.completed ? 'checkmark-circle' : 'ellipse-outline'"
                    [color]="area.completed ? 'success' : 'medium'">
                  </ion-icon>
                  <span>{{ area.label }}</span>
                </div>
              }
            </div>
          </div>
        }
        
        <!-- Quality warning -->
        @if (qualityWarning()) {
          <div class="quality-warning">
            <ion-icon name="warning" color="warning"></ion-icon>
            <span>{{ qualityWarning() }}</span>
          </div>
        }
      </div>
      
      <!-- Controls -->
      <div class="controls">
        @if (!isRecording() && !isProcessing()) {
          <ion-button expand="block" color="danger" (click)="startRecording()">
            <ion-icon slot="start" name="videocam"></ion-icon>
            Iniciar Inspección
          </ion-button>
        }
        
        @if (isRecording()) {
          <ion-button 
            expand="block" 
            color="success"
            [disabled]="recordingDuration() < 90"
            (click)="stopRecording()">
            <ion-icon slot="start" name="stop-circle"></ion-icon>
            Finalizar (mín. 90s)
          </ion-button>
        }
        
        @if (isProcessing()) {
          <div class="upload-progress">
            <ion-progress-bar [value]="uploadProgress() / 100"></ion-progress-bar>
            <p>Subiendo video... {{ uploadProgress() }}%</p>
          </div>
        }
      </div>
      
      <!-- Instructions -->
      @if (!isRecording() && !isProcessing()) {
        <ion-card class="instructions">
          <ion-card-header>
            <ion-card-title>Instrucciones de Inspección</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li>Graba en buena iluminación (evita sombras)</li>
              <li>Muestra TODO el auto en 360° (90 segundos mínimo)</li>
              <li>Incluye: 4 puertas, capó, cajuela, techo, 4 llantas, luces</li>
              <li>Acércate a daños existentes (rayones, abolladuras)</li>
              <li>No tapes partes del auto con manos u objetos</li>
              <li>Graba también el interior (asientos, tablero)</li>
            </ul>
          </ion-card-content>
        </ion-card>
      }
    </div>
  `,
  styles: [`
    .video-recorder-container {
      padding: 16px;
    }
    .video-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .video-preview.recording {
      border: 3px solid var(--ion-color-danger);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { border-color: var(--ion-color-danger); }
      50% { border-color: rgba(var(--ion-color-danger-rgb), 0.5); }
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .recording-indicator {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-weight: bold;
    }
    .inspection-guide {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.8);
      padding: 16px;
      border-radius: 8px;
      max-width: 250px;
    }
    .guide-text {
      color: white;
      font-size: 14px;
      margin-bottom: 12px;
      font-weight: 500;
    }
    .guide-checklist {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .area-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
    }
    .area-item.completed {
      color: var(--ion-color-success);
    }
    .quality-warning {
      position: absolute;
      bottom: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 193, 7, 0.9);
      padding: 12px 16px;
      border-radius: 8px;
      color: #000;
      font-weight: 500;
    }
    .upload-progress {
      padding: 16px;
      text-align: center;
    }
    .upload-progress p {
      margin-top: 8px;
      color: var(--ion-color-medium);
    }
    .instructions ul {
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  `]
})
export class VideoInspectionRecorderComponent {
  private readonly videoService = inject(VideoDamageDetectionService);
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  bookingId = input.required<string>();
  carId = input.required<string>();
  inspectionType = input<'checkin' | 'checkout'>('checkin');
  
  videoUploaded = output<string>();
  error = output<string>();
  
  readonly isRecording = signal(false);
  readonly isProcessing = signal(false);
  readonly recordingDuration = signal(0);
  readonly uploadProgress = this.videoService.uploadProgress;
  readonly qualityWarning = signal<string | null>(null);
  
  inspectionAreas = [
    { id: 'front', label: 'Frente', completed: false },
    { id: 'left', label: 'Lateral Izq', completed: false },
    { id: 'rear', label: 'Parte Trasera', completed: false },
    { id: 'right', label: 'Lateral Der', completed: false },
    { id: 'hood', label: 'Capó', completed: false },
    { id: 'roof', label: 'Techo', completed: false },
    { id: 'interior', label: 'Interior', completed: false }
  ];
  
  currentGuide = signal({ text: 'Comienza por el frente del vehículo' });
  
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recordingTimer: any = null;
  
  async ngAfterViewInit() {
    await this.initCamera();
  }
  
  ngOnDestroy() {
    this.stopCamera();
  }
  
  private async initCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true
      });
      
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
    } catch (err) {
      this.error.emit('No se pudo acceder a la cámara');
    }
  }
  
  async startRecording() {
    if (!this.stream) await this.initCamera();
    
    try {
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.recordedChunks.push(event.data);
      };
      
      this.mediaRecorder.onstop = () => this.processRecording();
      this.mediaRecorder.start(1000);
      this.isRecording.set(true);
      this.recordingDuration.set(0);
      
      this.recordingTimer = setInterval(() => {
        const duration = this.recordingDuration() + 1;
        this.recordingDuration.set(duration);
        this.updateGuide(duration);
        this.checkQuality();
      }, 1000);
    } catch (err) {
      this.error.emit('Error al iniciar grabación');
    }
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      if (this.recordingTimer) clearInterval(this.recordingTimer);
    }
  }
  
  private async processRecording() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const file = new File([blob], `inspection_${Date.now()}.webm`, { type: 'video/webm' });
    
    if (this.recordingDuration() < 90) {
      this.error.emit('El video debe durar al menos 90 segundos');
      return;
    }
    
    try {
      this.isProcessing.set(true);
      
      const videoPath = await this.videoService.uploadInspectionVideo({
        bookingId: this.bookingId(),
        inspectionType: this.inspectionType(),
        videoFile: file,
        carId: this.carId(),
        userId: 'current-user-id'
      });
      
      this.videoUploaded.emit(videoPath);
    } catch (err) {
      this.error.emit('Error al subir video');
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  private updateGuide(duration: number) {
    const guides = [
      { time: 0, text: 'Comienza por el frente del vehículo', area: 'front' },
      { time: 15, text: 'Ahora lateral izquierdo', area: 'left' },
      { time: 30, text: 'Parte trasera y cajuela', area: 'rear' },
      { time: 45, text: 'Lateral derecho', area: 'right' },
      { time: 60, text: 'Capó y motor', area: 'hood' },
      { time: 75, text: 'Techo del vehículo', area: 'roof' },
      { time: 90, text: 'Interior: asientos y tablero', area: 'interior' }
    ];
    
    const currentGuideItem = [...guides].reverse().find(g => duration >= g.time);
    if (currentGuideItem) {
      this.currentGuide.set({ text: currentGuideItem.text });
      const area = this.inspectionAreas.find(a => a.id === currentGuideItem.area);
      if (area) area.completed = true;
    }
  }
  
  private checkQuality() {
    if (this.recordingDuration() < 30) {
      this.qualityWarning.set('Asegúrate de grabar al menos 90 segundos');
    } else {
      this.qualityWarning.set(null);
    }
  }
  
  private stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
  
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
