# Video Damage Detection - UI Components

## ✅ Componentes Creados

### 1. **VideoInspectionRecorderComponent**
**Ubicación:** `apps/web/src/app/shared/components/video-inspection-recorder/`

**Características:**
- ✅ Grabación de video en tiempo real
- ✅ Preview de cámara
- ✅ Timer con mínimo de 90 segundos
- ✅ Guías visuales de qué partes grabar
- ✅ Checklist de áreas del auto
- ✅ Validación de calidad (duración, iluminación)
- ✅ Upload automático a GCP
- ✅ Barra de progreso

**Uso:**
```typescript
// booking-checkin.page.ts
import { VideoInspectionRecorderComponent } from '@shared/components/video-inspection-recorder/video-inspection-recorder.component';

@Component({
  imports: [VideoInspectionRecorderComponent],
  template: `
    <app-video-inspection-recorder
      [bookingId]="booking.id"
      [carId]="booking.car_id"
      [inspectionType]="'checkin'"
      (videoUploaded)="onVideoUploaded($event)"
      (error)="handleError($event)">
    </app-video-inspection-recorder>
  `
})
export class BookingCheckinPage {
  onVideoUploaded(videoPath: string) {
    console.log('Video uploaded:', videoPath);
    // Esperar análisis...
  }
  
  handleError(error: string) {
    // Mostrar toast de error
  }
}
```

---

### 2. **DamageReportComponent**
**Ubicación:** `apps/web/src/app/shared/components/damage-report/`

**Características:**
- ✅ Muestra daños detectados por IA
- ✅ Lista con iconos por tipo de daño
- ✅ Badges de severidad (minor/moderate/severe)
- ✅ Confianza del análisis
- ✅ Alerta de comportamiento sospechoso
- ✅ Video player integrado
- ✅ Timestamps de cada daño

**Uso:**
```typescript
// booking-detail.page.ts
import { DamageReportComponent } from '@shared/components/damage-report/damage-report.component';

@Component({
  imports: [DamageReportComponent],
  template: `
    <app-damage-report [analysis]="analysisResult()">
    </app-damage-report>
  `
})
export class BookingDetailPage {
  private videoService = inject(VideoDamageDetectionService);
  analysisResult = signal<VideoDamageAnalysis | null>(null);
  
  async ngOnInit() {
    const result = await this.videoService.getAnalysisResults(
      this.bookingId(),
      'checkin'
    );
    this.analysisResult.set(result);
  }
}
```

---

### 3. **InspectionComparisonModalComponent**
**Ubicación:** `apps/web/src/app/shared/components/inspection-comparison-modal/`

**Características:**
- ✅ Compara check-in vs check-out
- ✅ Detecta daños nuevos
- ✅ Calcula costo total
- ✅ Opción de abrir disputa
- ✅ Opción de aceptar cargos
- ✅ Resumen ejecutivo

**Uso:**
```typescript
// booking-completion.page.ts
import { InspectionComparisonModalComponent } from '@shared/components/inspection-comparison-modal/inspection-comparison-modal.component';

@Component({})
export class BookingCompletionPage {
  private modalCtrl = inject(ModalController);
  
  async showComparison() {
    const modal = await this.modalCtrl.create({
      component: InspectionComparisonModalComponent,
      componentProps: {
        bookingId: this.booking.id
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    
    if (data?.action === 'dispute') {
      // Abrir flujo de disputa
    } else if (data?.action === 'accept') {
      // Procesar cargo: data.amount
    }
  }
}
```

---

## 🎨 Ejemplo Completo: Flujo de Inspección

### **Paso 1: Check-In (Owner graba video)**

```typescript
// pages/booking-checkin/booking-checkin.page.ts
import { Component, inject, signal } from '@angular/core';
import { VideoInspectionRecorderComponent } from '@shared/components/video-inspection-recorder/video-inspection-recorder.component';
import { DamageReportComponent } from '@shared/components/damage-report/damage-report.component';
import { VideoDamageDetectionService } from '@core/services/video-damage-detection.service';

@Component({
  standalone: true,
  imports: [VideoInspectionRecorderComponent, DamageReportComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Check-In: Inspección del Vehículo</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      @if (!videoUploaded()) {
        <!-- Grabar video -->
        <app-video-inspection-recorder
          [bookingId]="bookingId"
          [carId]="carId"
          [inspectionType]="'checkin'"
          (videoUploaded)="onVideoUploaded($event)"
          (error)="onError($event)">
        </app-video-inspection-recorder>
      } @else {
        <!-- Esperar resultados -->
        <ion-card>
          <ion-card-content>
            <div class="waiting">
              <ion-spinner></ion-spinner>
              <p>Analizando video con IA...</p>
              <p class="small">Esto tomará 30-60 segundos</p>
            </div>
          </ion-card-content>
        </ion-card>
        
        <!-- Mostrar resultados cuando estén listos -->
        @if (analysisResult()) {
          <app-damage-report [analysis]="analysisResult()"></app-damage-report>
          
          <div class="actions">
            <ion-button expand="block" (click)="confirmInspection()">
              Confirmar Inspección
            </ion-button>
          </div>
        }
      }
    </ion-content>
  `
})
export class BookingCheckinPage {
  private videoService = inject(VideoDamageDetectionService);
  
  bookingId = 'booking_123';
  carId = 'car_456';
  
  videoUploaded = signal(false);
  analysisResult = signal<VideoDamageAnalysis | null>(null);
  
  onVideoUploaded(videoPath: string) {
    this.videoUploaded.set(true);
    
    // Suscribirse a resultados en tiempo real
    this.videoService.subscribeToAnalysisResults(
      this.bookingId,
      (analysis) => {
        this.analysisResult.set(analysis);
      }
    );
  }
  
  onError(error: string) {
    // Toast
  }
  
  confirmInspection() {
    // Completar check-in
  }
}
```

### **Paso 2: Check-Out (Renter graba video)**

```typescript
// pages/booking-checkout/booking-checkout.page.ts
// Similar a check-in pero con inspectionType="checkout"
```

### **Paso 3: Comparación Automática**

```typescript
// pages/booking-completion/booking-completion.page.ts
import { InspectionComparisonModalComponent } from '@shared/components/inspection-comparison-modal/inspection-comparison-modal.component';

@Component({})
export class BookingCompletionPage {
  private modalCtrl = inject(ModalController);
  
  async ngOnInit() {
    // Auto-abrir comparación cuando checkout esté listo
    setTimeout(() => {
      this.showComparison();
    }, 1000);
  }
  
  async showComparison() {
    const modal = await this.modalCtrl.create({
      component: InspectionComparisonModalComponent,
      componentProps: { bookingId: this.booking.id }
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    
    if (data?.action === 'accept') {
      // Procesar cargo
      await this.processCharge(data.amount);
    } else if (data?.action === 'dispute') {
      // Abrir disputa
      await this.openDispute();
    }
  }
}
```

---

## 📁 Estructura de Archivos

```
apps/web/src/app/
├── core/
│   └── services/
│       └── video-damage-detection.service.ts  ✅
├── shared/
│   └── components/
│       ├── video-inspection-recorder/
│       │   └── video-inspection-recorder.component.ts  ✅
│       ├── damage-report/
│       │   └── damage-report.component.ts  ✅
│       └── inspection-comparison-modal/
│           └── inspection-comparison-modal.component.ts  ✅
└── features/
    └── bookings/
        ├── booking-checkin/
        │   └── booking-checkin.page.ts  ⏳ Crear
        ├── booking-checkout/
        │   └── booking-checkout.page.ts  ⏳ Crear
        └── booking-completion/
            └── booking-completion.page.ts  ⏳ Actualizar
```

---

## 🚀 Próximos Pasos

1. ✅ **Componentes UI creados**
2. ⏳ **Integrar en páginas de booking**
3. ⏳ **Deploy arquitectura GCP**
4. ⏳ **Testing con videos reales**

---

## 💡 Tips de Uso

### **Personalizar guías de grabación:**
```typescript
// En video-inspection-recorder.component.ts
const guides = [
  { time: 0, text: 'Tu texto custom', area: 'front' },
  // ...
];
```

### **Cambiar duración mínima:**
```typescript
// Línea 89 (approx)
if (this.recordingDuration() < 60) { // Era 90
  // ...
}
```

### **Agregar más tipos de daños:**
```typescript
// En damage-report.component.ts
const labels: Record<string, string> = {
  scratch: 'Rayón',
  paint_chip: 'Pintura Saltada', // Nuevo
  // ...
};
```
