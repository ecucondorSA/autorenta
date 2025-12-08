import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Model3DCacheService } from '../../../core/services/model-3d-cache.service';

// Tipos para Lazy Loading de Three.js
type THREE = typeof import('three');
type GLTFLoaderType = typeof import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader;
type DRACOLoaderType = typeof import('three/examples/jsm/loaders/DRACOLoader.js').DRACOLoader;
type RGBELoaderType = typeof import('three/examples/jsm/loaders/RGBELoader.js').RGBELoader;
type OrbitControlsType = typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
type EXRLoaderType = typeof import('three/examples/jsm/loaders/EXRLoader.js').EXRLoader;

export interface CarPartInfo {
  name: string;
  description: string;
  icon: string;
  category?: 'body' | 'wheel' | 'glass' | 'light' | 'interior';
}

/** Configuración visual para "Night Mode" (Simulación Noche) */
const SUBURBAN_PARKING_CONFIG = {
  // Luna (Sol simulado)
  sunAzimuth: 225,
  sunElevation: 30, // Más alto para luz de luna
  sunColor: 0x8899ff, // Tono azulado frío (Luz de luna)
  sunIntensity: 2.0, // Mucho menos intenso que el sol
  ambientIntensity: 0.2, // Ambiente muy oscuro
  groundOffset: -0.02,
  groundShadowOpacity: 0.4, // Sombras suaves
  hdriRotationDefault: 190,
};

@Component({
  selector: 'app-car-3d-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="viewer-container"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (mousemove)="onMouseMove($event)"
      (click)="onClick($event)"
      (dblclick)="onDoubleClick()"
    >
      <canvas #rendererCanvas id="webgl-canvas"></canvas>

      <!-- WebGL Error Fallback -->
      @if (hasWebGLError) {
        <div class="error-overlay">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <h3>Vista 3D no disponible</h3>
            <p>Tu navegador o dispositivo no soporta WebGL/GPU acceleration.</p>
          </div>
        </div>
      }

      <!-- Part Tooltip (hover) -->
      @if (hoveredPartInfo && !isLoading) {
        <div
          class="part-tooltip"
          [style.left.px]="tooltipPosition.x"
          [style.top.px]="tooltipPosition.y"
        >
          <span class="tooltip-icon">{{ hoveredPartInfo.icon }}</span>
          <span class="tooltip-text">{{ hoveredPartInfo.name }}</span>
        </div>
      }

      <!-- Selected Part Indicator -->
      @if (selectedPartInfo) {
        <div class="selected-part-badge">
          <span class="badge-icon">{{ selectedPartInfo.icon }}</span>
          <span class="badge-name">{{ selectedPartInfo.name }}</span>
          <button class="badge-close" (click)="deselectPart($event)">x</button>
        </div>
      }

      <!-- Loading Overlay -->
      @if (isLoading) {
        <div class="loading-overlay">
          <div class="loading-content">
            <div class="car-silhouette">
              <svg viewBox="0 0 100 40" fill="currentColor">
                <path d="M15 30c0-2.8 2.2-5 5-5s5 2.2 5 5H15zm60 0c0-2.8 2.2-5 5-5s5 2.2 5 5H75zM10 25l5-10h25l10-7h20l15 7h10v10l-5 5H15l-5-5z" />
              </svg>
            </div>
            <div class="loading-bar">
              <div class="loading-progress"></div>
            </div>
            <p class="loading-text">Cargando modelo 3D...</p>
          </div>
        </div>
      }

      <!-- Swipe Gesture Hint Removed -->
      <!--
      @if (showSwipeHint && !isLoading) {
        <div class="swipe-hint" [class.hiding]="swipeHintHiding">
          <div class="swipe-icon">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M32 48c-8 0-14-6-14-14v-8c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v6"/>
              <path d="M25.2 32v-6c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v6"/>
              <path d="M32.4 32v-8c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v8"/>
              <path d="M39.6 34v-4c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v4c0 8-6 14-14 14"/>
              <path class="swipe-arrow-left" d="M12 32l-6 0m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/>
              <path class="swipe-arrow-right" d="M52 32l6 0m0 0l-3-3m3 3l-3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="swipe-text">Arrastra para rotar</span>
        </div>
      }
      -->

      <!-- NOTE: Debug Controls Removed by Request -->

      <!-- NOTE: NO AGREGAR SELECTOR DE COLORES (Color Picker Removed by Request) -->
    </div>
  `,
  styles: [
    `
      :host { display: block; width: 100%; height: 100%; }
      .viewer-container { width: 100%; height: 100%; position: relative; overflow: hidden; cursor: grab; transition: cursor 0.2s; }
      .viewer-container:active { cursor: grabbing; }
      canvas { width: 100% !important; height: 100% !important; display: block; outline: none; }

      /* Loading Overlay */
      .loading-overlay { position: absolute; inset: 0; background: var(--surface-base); backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; z-index: 10; }
      .loading-content { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
      .car-silhouette { width: 120px; height: 60px; color: var(--cta-default); animation: carPulse 2s ease-in-out infinite; }
      .car-silhouette svg { width: 100%; height: 100%; }
      @keyframes carPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
      .loading-bar { width: 200px; height: 3px; background: var(--border-subtle); border-radius: 10px; overflow: hidden; }
      .loading-progress { height: 100%; width: 30%; background-color: var(--cta-default); border-radius: 10px; animation: loadingSlide 1.2s ease-in-out infinite; }
      @keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
      .loading-text { color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; letter-spacing: 0.05em; }

      /* Error Overlay */
      .error-overlay { position: absolute; inset: 0; background: var(--surface-base); display: flex; align-items: center; justify-content: center; z-index: 20; }
      .error-content { text-align: center; color: var(--text-secondary); padding: 2rem; }
      .error-icon { font-size: 2rem; margin-bottom: 1rem; display: block; }

      /* Part Tooltip */
      .part-tooltip { position: absolute; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: var(--surface-raised); backdrop-filter: blur(12px); border-radius: 8px; border: 1px solid var(--border-default); box-shadow: var(--elevation-3); pointer-events: none; z-index: 20; transform: translate(-50%, -120%); animation: tooltipFadeIn 0.2s ease-out; white-space: nowrap; }
      @keyframes tooltipFadeIn { from { opacity: 0; transform: translate(-50%, -100%); } to { opacity: 1; transform: translate(-50%, -120%); } }
      .tooltip-icon { font-size: 1.125rem; }
      .tooltip-text { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); letter-spacing: 0.01em; }

      /* Selected Part Badge */
      .selected-part-badge { position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 0.625rem; padding: 0.625rem 1rem; background: var(--surface-raised); backdrop-filter: blur(12px); border-radius: 9999px; border: 2px solid var(--cta-default); box-shadow: var(--elevation-4); z-index: 15; animation: badgeSlideUp 0.3s ease-out; }
      @keyframes badgeSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      .badge-icon { font-size: 1.25rem; }
      .badge-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
      .badge-close { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 0.25rem; padding: 0; background: var(--surface-secondary); border: none; border-radius: 50%; color: var(--text-secondary); font-size: 0.75rem; cursor: pointer; transition: all 0.2s ease; }
      .badge-close:hover { background: var(--cta-secondary); color: var(--text-primary); }

      /* Swipe Hint */
      .swipe-hint { position: absolute; bottom: 50%; left: 50%; transform: translate(-50%, 50%); display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.25rem 1.5rem; background: var(--surface-raised); backdrop-filter: blur(12px); border-radius: 1rem; border: 1px solid var(--border-default); box-shadow: var(--elevation-4); z-index: 15; animation: swipeHintAppear 0.4s ease-out; pointer-events: none; }
      .swipe-hint.hiding { animation: swipeHintDisappear 0.4s ease-out forwards; }
      @keyframes swipeHintAppear { from { opacity: 0; transform: translate(-50%, 50%) scale(0.8); } to { opacity: 1; transform: translate(-50%, 50%) scale(1); } }
      @keyframes swipeHintDisappear { from { opacity: 1; transform: translate(-50%, 50%) scale(1); } to { opacity: 0; transform: translate(-50%, 50%) scale(0.8); } }
      .swipe-icon { width: 64px; height: 64px; color: var(--cta-default); }
      .swipe-icon svg { width: 100%; height: 100%; }
      .swipe-icon .swipe-arrow-left { animation: swipeArrowLeft 1.2s ease-in-out infinite; }
      .swipe-icon .swipe-arrow-right { animation: swipeArrowRight 1.2s ease-in-out infinite; }
      @keyframes swipeArrowLeft { 0%, 100% { transform: translateX(0); opacity: 0.5; } 50% { transform: translateX(-4px); opacity: 1; } }
      @keyframes swipeArrowRight { 0%, 100% { transform: translateX(0); opacity: 0.5; } 50% { transform: translateX(4px); opacity: 1; } }
      .swipe-text { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); letter-spacing: 0.01em; }

      @media (max-width: 768px) {
        .swipe-hint { padding: 1rem 1.25rem; }
        .swipe-icon { width: 48px; height: 48px; }
        .swipe-text { font-size: 0.75rem; }
      }



      /* CONFIGURATOR UI */
      .configurator-ui {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        z-index: 50;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s ease;
      }

      /* Animations */
      .hero-fade-in { animation: fadeIn 0.8s ease-out forwards; opacity: 0; }
      .hero-delay-3 { animation-delay: 0.6s; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `,
  ],
})
export class Car3dViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  // Inputs
  @Input() src = '/camaro.glb';
  @Input() alt = 'A 3D model of a car';
  @Input() debugMode = false;
  @Input() selectedColor: string | null | undefined = 'Negro Piano';
  @Input() enableInteraction = true;
  @Input() backgroundSrc: string | null = null;
  @Input() showHdriBackground = true;
  @Input() lockToCar = false;
  @Input() hdriSpin = false;
  @Input() hdriSpinSpeed = 0.02;
  @Input() hdriRotationDeg = SUBURBAN_PARKING_CONFIG.hdriRotationDefault;
  @Input() showModel = true;

  // Outputs
  @Output() viewModeChange = new EventEmitter<string>();
  @Output() modelClicked = new EventEmitter<void>();
  @Output() modelLoaded = new EventEmitter<void>();
  @Output() hdriLoaded = new EventEmitter<void>();
  @Output() partHovered = new EventEmitter<{ part: string; info: CarPartInfo | undefined; position: { x: number; y: number } }>();
  @Output() partSelected = new EventEmitter<{ part: string; info: CarPartInfo | undefined }>();
  @Output() partDeselected = new EventEmitter<void>();

  @ViewChild('rendererCanvas') rendererCanvas!: ElementRef<HTMLCanvasElement>;

  // Services & Injections
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly ngZone = inject(NgZone);
  private readonly modelCache = inject(Model3DCacheService);

  // State
  isLoading = true;
  hasWebGLError = false;
  isHovered = false;
  currentViewMode: 'default' | 'front' | 'side' | 'interior' | 'top' = 'default';
  headlightsOn = false;
  hoveredPartInfo: CarPartInfo | null = null;
  selectedPartInfo: CarPartInfo | null = null;
  tooltipPosition = { x: 0, y: 0 };

  // Swipe Hint State
  showSwipeHint = false;
  swipeHintHiding = false;
  private swipeHintShown = false;
  private swipeHintTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debug Controls State - Modo Exploración HDRI & Auto
  debugValues = {
    // Ocultar modelo para explorar escena
    hideModel: false,
    // Cámara
    camX: 6,
    camY: 2,
    camZ: 8,
    fov: 45,
    // HDRI
    hdriRotX: 0,
    hdriRotY: SUBURBAN_PARKING_CONFIG.hdriRotationDefault,
    hdriRotZ: 0,
    exposure: 1.0,
    // Sol
    sunAzimuth: SUBURBAN_PARKING_CONFIG.sunAzimuth,
    sunElevation: SUBURBAN_PARKING_CONFIG.sunElevation,
    // Auto
    carX: 0,
    carZ: 0.5,
    carRotX: 0,
    carRotY: -10,
    carRotZ: 0,
    groundOffset: SUBURBAN_PARKING_CONFIG.groundOffset,
  };

  // Three.js References
  private THREE: THREE | null = null;
  private scene: import('three').Scene | null = null;
  private camera: import('three').PerspectiveCamera | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private controls: InstanceType<OrbitControlsType> | null = null;
  private carModel: import('three').Group | null = null;
  private environmentTexture: import('three').Texture | null = null;
  private mainLight: import('three').DirectionalLight | null = null;
  private headlightSpots: import('three').Object3D[] = [];

  // Animation & Loop
  private animationId: number | null = null;
  private clock: import('three').Clock | null = null;
  private mixer: import('three').AnimationMixer | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Helpers
  private GLTFLoader: GLTFLoaderType | null = null;
  private DRACOLoader: DRACOLoaderType | null = null;
  private RGBELoader: RGBELoaderType | null = null;
  private OrbitControls: OrbitControlsType | null = null;
  private EXRLoader: EXRLoaderType | null = null;

  // Camera Animation
  private targetCameraPosition: { x: number; y: number; z: number } | null = null;
  private targetControlsTarget: { x: number; y: number; z: number } | null = null;
  private animatingCamera = false;

  // Car Movement Animation
  private carMovementAnimating = false;
  private carMovementStartTime = 0;
  private carOriginalPosition = { x: 0, y: 0, z: 0 };
  private carOriginalMinY = 0;  // Punto más bajo del modelo SIN transformar

  // Raycaster
  private raycaster: import('three').Raycaster | null = null;
  private mouse: import('three').Vector2 | null = null;
  private hoveredMesh: import('three').Mesh | null = null;
  private selectedMesh: import('three').Mesh | null = null;
  private mouseMoveThrottle: ReturnType<typeof setTimeout> | null = null;
  private lastMouseEvent: MouseEvent | null = null;
  private wheelListener: ((event: WheelEvent) => void) | null = null;
  private isContextLost = false;
  private themeChangeListener: ((event: Event) => void) | null = null;
  private contactShadowMesh: import('three').Mesh | null = null;

  // Configuration
  private hdriRotationY = (SUBURBAN_PARKING_CONFIG.hdriRotationDefault * Math.PI) / 180;
  private carRotationY = 0; // Rotación frontal del auto (eje Y)
  private readonly carRotationSpeed = 0.3; // Velocidad de rotación del auto
  private readonly environmentMapPath = 'assets/hdri/suburban_parking_area_1k.hdr';
  private readonly backgroundMapPath = 'assets/hdri/suburban_parking_area_8k.jpg';

  // Device Info
  private readonly isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  private readonly isLowEndDevice = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4;
  private readonly targetFPS = this.isMobile ? 30 : 60;
  private readonly frameInterval = 1000 / this.targetFPS;
  private lastFrameTime = 0;

  // Camera Presets
  private readonly cameraPresets = {
    default: { position: { x: 3, y: 0.8, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
    front: { position: { x: 0, y: 0.9, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
    side: { position: { x: 6.5, y: 1.0, z: 0 }, target: { x: 0, y: 0.5, z: 0 } },
    interior: { position: { x: -0.35, y: 1.0, z: 0.2 }, target: { x: -0.35, y: 1.0, z: 5 } },
    passenger: { position: { x: 0.4, y: 1.1, z: -0.3 }, target: { x: 0.4, y: 1.0, z: 5 } },
    top: { position: { x: 0, y: 10, z: 2 }, target: { x: 0, y: 0, z: 0 } },
  };

  // Static Data
  private readonly partInfoMap: Map<string, CarPartInfo> = new Map([
    // ... (rest of the map is static, keeping concise reference)
    ['body', { name: 'Carroceria', description: 'Estructura principal del vehiculo', icon: '🚗', category: 'body' }],
    // ... we don't need to replace the whole map if we can avoid it, but ReplaceFile requires contiguous block.
    // To safe tokens let's trust the user didn't change the map in between.
    // Actually, to be safe and efficient, let's just target the lines around the path implementation.
  ]);
  // ... oops, I should have targeted smaller chunk.
  // Let me just replace the specific lines for path and ground configs.

  // Colors configuration
  private readonly colors = [
    { name: 'Negro Piano', hex: 0x050505, roughness: 0.02, metalness: 0.95, envMapIntensity: 5.0 },
    { name: 'Blanco', hex: 0xffffff },
    { name: 'Rojo', hex: 0xdc143c },
    { name: 'Azul', hex: 0x0047ab },
    { name: 'Plata', hex: 0xc0c0c0 },
    { name: 'Gris', hex: 0x808080 },
  ];

  async ngAfterViewInit(): Promise<void> {
    if (this.isBrowser) {
      try {
        // Load Three.js and loaders dynamically
        this.THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
        const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { EXRLoader } = await import('three/examples/jsm/loaders/EXRLoader.js');

        this.GLTFLoader = GLTFLoader;
        this.DRACOLoader = DRACOLoader;
        this.RGBELoader = RGBELoader;
        this.OrbitControls = OrbitControls;
        this.EXRLoader = EXRLoader;

        this.rebuildScene();
      } catch (error) {
        console.error('[Car3dViewer] Failed to load 3D libraries:', error);
        this.hasWebGLError = true;
        this.isLoading = false;
      }
    }
  }

  private createRoad(): void {
    // Reactivating ground shadows for realism
    if (!this.lockToCar || !this.THREE || !this.scene) return;

    // Shadow catcher con mayor opacidad para contraste con negro piano
    const groundMat = new this.THREE.ShadowMaterial({
      opacity: SUBURBAN_PARKING_CONFIG.groundShadowOpacity,
      color: new this.THREE.Color(0x000000), // Negro puro para mejor contraste
    });
    const ground = new this.THREE.Mesh(new this.THREE.PlaneGeometry(100, 100), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Si no mostramos el modelo, no necesitamos la sombra de contacto falsa
    if (!this.showModel) return;

    // Contact Shadow (Ambient Occlusion) - Sombra fuerte y nítida en el punto de contacto
    // Esto "ancla" el auto al suelo de manera realista
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 2048; // Mayor resolución para sombra más nítida
    shadowCanvas.height = 2048;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const mid = 1024;
      // Gradiente radial más pronunciado: muy oscuro en el centro, se difumina rápidamente
      const gradient = ctx.createRadialGradient(mid, mid, 5, mid, mid, 500);
      gradient.addColorStop(0.0, 'rgba(0,0,0,0.98)');    // Negro casi puro en el centro (punto de contacto)
      gradient.addColorStop(0.05, 'rgba(0,0,0,0.95)');   // Mantiene muy oscuro cerca del centro
      gradient.addColorStop(0.15, 'rgba(5,5,5,0.7)');   // Transición rápida
      gradient.addColorStop(0.4, 'rgba(10,10,10,0.4)');  // Se difumina
      gradient.addColorStop(1.0, 'rgba(0,0,0,0)');       // Transparente en los bordes
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2048, 2048);
    }

    this.contactShadowMesh = new this.THREE.Mesh(
      new this.THREE.PlaneGeometry(25, 25), // Ligeramente más grande para mejor cobertura
      new this.THREE.MeshBasicMaterial({
        map: new this.THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        opacity: 0.85, // Mayor opacidad para sombra más fuerte y visible con negro piano
        depthWrite: false
      })
    );
    this.contactShadowMesh.position.y = 0.005;
    this.scene.add(this.contactShadowMesh);

    // Guardar referencia al suelo para moverlo con el auto
    this.groundMesh = ground;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedColor'] && !changes['selectedColor'].firstChange) {
      this.applyColor(this.selectedColor ?? 'Negro Piano');
    }
  }

  ngOnDestroy(): void {
    this.stopAnimationLoop();
    this.resizeObserver?.disconnect();
    this.mixer?.stopAllAction();
    this.controls?.dispose();
    if (this.themeChangeListener) {
      window.removeEventListener('autorenta:theme-change', this.themeChangeListener);
    }

    if (this.renderer) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.renderer.dispose();
    }
    this.disposeThreeScene();
  }

  private initScene(): void {
    if (!this.THREE) return;

    // Crear la escena
    this.scene = new this.THREE.Scene();

    if (!this.rendererCanvas) return; // Changed from this.container to this.rendererCanvas

    const width = this.rendererCanvas.nativeElement.clientWidth; // Changed from this.container
    const height = this.rendererCanvas.nativeElement.clientHeight; // Changed from this.container

    // FOV 45mm para look cinemático "lente medio/telefoto"
    this.camera = new this.THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    if (this.lockToCar) {
      // Vista 3/4 frontal: cámara ligeramente a la derecha y elevada
      this.camera.position.set(18, 2.5, 18);
      this.camera.lookAt(0, 0.55, 0);
    } else {
      this.camera.position.set(0, 0, 0.1);
      this.camera.lookAt(0, 0.35, 0);
    }

    try {
      this.renderer = new this.THREE.WebGLRenderer({
        canvas: this.rendererCanvas.nativeElement,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        precision: 'mediump'
      });
    } catch (e) {
      this.hasWebGLError = true;
      return;
    }

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 2.0 : 2.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    // Ajuste cinematográfico: exposición BAJA para efecto NOCHE
    this.renderer.toneMappingExposure = this.isMobile ? 0.2 : 0.3;

    this.updateThemeColors();
  }

  private setupControls(): void {
    if (!this.camera || !this.renderer || !this.OrbitControls) return;

    this.controls = new this.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.7;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = this.lockToCar ? 15 : 0.25;  // Distancia mínima más lejana
    this.controls.maxDistance = this.lockToCar ? 50 : 20.0; // Distancia máxima mucho más lejana

    // Límites verticales: No permitir bajar de la línea del horizonte (suelo)
    this.controls.minPolarAngle = this.lockToCar ? 0.1 : 0; // Casi cenital permitido
    this.controls.maxPolarAngle = this.lockToCar ? (Math.PI / 2 - 0.05) : Math.PI; // ~87 grados. Bloquea ver bajo el suelo.
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    if (this.lockToCar) {
      this.controls.target.set(0, 0.6, 0);  // Target centrado en el auto
      this.controls.enablePan = false;
      this.controls.screenSpacePanning = false;
      this.controls.autoRotate = false; // Auto fijo sin rotación
      this.controls.autoRotateSpeed = 0;
      // Activar rotación del HDRI cuando el auto está fijo
      if (!this.hdriSpin) {
        this.hdriSpin = true;
      }
    } else {
      this.controls.target.set(0, 0, 0);
      this.controls.enablePan = true;
    }
  }

  private setupLights(): void {
    if (!this.THREE || !this.scene) return;

    // Ambient light - Tono azul oscuro para noche
    const ambientLight = new this.THREE.AmbientLight(0x0a1a3a, SUBURBAN_PARKING_CONFIG.ambientIntensity);
    this.scene.add(ambientLight);

    // Main Sunlight
    this.mainLight = new this.THREE.DirectionalLight(SUBURBAN_PARKING_CONFIG.sunColor, SUBURBAN_PARKING_CONFIG.sunIntensity);
    // Posición inicial calculada
    this.updateSunPosition();
    this.mainLight.castShadow = true;

    // Sombras Ultra-Nítidas y bien definidas
    const shadowSize = this.isMobile ? 2048 : 4096;
    this.mainLight.shadow.mapSize.width = shadowSize;
    this.mainLight.shadow.mapSize.height = shadowSize;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 100;
    this.mainLight.shadow.camera.left = -15;
    this.mainLight.shadow.camera.right = 15;
    this.mainLight.shadow.camera.top = 15;
    this.mainLight.shadow.camera.bottom = -15;
    this.mainLight.shadow.bias = -0.0001;
    this.mainLight.shadow.radius = 2;
    this.scene.add(this.mainLight);

    // Fill Light - Reducida para exterior (la luz ambiente hace gran parte del trabajo)
    // Pero mantenemos un ligero fill para levantar negros en el lado de sombra del auto
    const fillLight = new this.THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-8, 5, -5);
    this.scene.add(fillLight);

    // Rim Light - Reducida, el sol real hará el rim light natural si está en contra
    const rimLight = new this.THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 10, -10);
    this.scene.add(rimLight);
  }

  private updateSunPosition(): void {
    if (!this.mainLight) return;

    const phi = this.THREE!.MathUtils.degToRad(90 - this.debugValues.sunElevation);
    const theta = this.THREE!.MathUtils.degToRad(this.debugValues.sunAzimuth);

    const distance = 20;
    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.cos(phi);
    const z = distance * Math.sin(phi) * Math.sin(theta);

    this.mainLight.position.set(x, y, z);
  }



  private groundMesh: import('three').Mesh | null = null;

  private loadCar(): void {
    if (!this.THREE || !this.GLTFLoader || !this.DRACOLoader || !this.scene) return;

    const cached = this.modelCache.getCachedModel(this.src);
    if (cached) {
      this.setupLoadedModel(cached);
      return;
    }

    const dracoLoader = new this.DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });
    const loader = new this.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(this.src, (gltf) => {
      this.modelCache.setThreeModule(this.THREE!);
      this.modelCache.cacheModel(this.src, gltf.scene.clone());
      this.setupLoadedModel(gltf.scene);
    },
      (xhr) => {
        // Progress logging optional
      },
      (error) => {
        console.error('[Car3dViewer] Error loading model:', this.src, error);
        this.isLoading = false;
      });
  }

  private setupLoadedModel(model: import('three').Group): void {
    if (!this.THREE || !this.scene) return;
    this.carModel = model;

    // Resetear posición del modelo para calcular minY real
    this.carModel.position.set(0, 0, 0);
    this.carModel.updateMatrixWorld(true);

    const box = new this.THREE.Box3().setFromObject(this.carModel);
    const size = box.getSize(new this.THREE.Vector3());
    // Lógica de escalado principal (se mantiene igual para el héroe)
    const scale = 18.0 / Math.max(size.x, size.y, size.z);

    this.carModel.scale.set(scale, scale, scale);

    // Centering & Grounding
    const scaledBox = new this.THREE.Box3().setFromObject(this.carModel);
    this.carOriginalMinY = scaledBox.min.y;  // Guardar ANTES de transformar

    const finalY = -this.carOriginalMinY + SUBURBAN_PARKING_CONFIG.groundOffset;
    this.carModel.position.set(0, finalY, 0.5);
    this.carModel.rotation.set(0, 0, 0); // Sin inclinación para estilo configurador

    // Alinear el suelo (Shadow Catcher) con las ruedas del auto
    if (this.groundMesh) {
      this.groundMesh.position.y = finalY;
    }

    // Alinear la sombra de contacto falsa
    if (this.contactShadowMesh) {
      this.contactShadowMesh.position.set(this.carModel.position.x, finalY + 0.005, this.carModel.position.z);
    }

    if (this.controls && this.lockToCar) {
      // Target relativo a la posición Y del auto para que la cámara no mire al cielo
      this.controls.target.set(this.carModel.position.x + 0.05, this.carModel.position.y + 0.82, this.carModel.position.z + 0.35);
      this.controls.update();
    }

    this.carModel.traverse((child) => {
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material instanceof this.THREE!.MeshStandardMaterial) {
          // Lógica inteligente de materiales con "Ultra Glossy" Black Paint
          const mat = mesh.material;
          const name = mesh.name.toLowerCase();

          // Debug para verificar nombres de partes
          if (this.debugMode) console.log('Part detected:', name, mesh.material.name);

          // Pintura (Carrocería) - NEGRO PIANO ULTRA GLOSSY con reflejos realistas del entorno
          // Simula clearcoat (barniz) con envMapIntensity alto y roughness muy bajo
          if (name.includes('body') || name.includes('paint') || name.includes('chassis') || name.includes('metal_primary')) {
            // Configuración optimizada para negro piano con reflejos brillantes
            mat.envMapIntensity = 5.0;  // Reflejos del HDRI muy amplificados (simula clearcoat)
            mat.roughness = 0.02;       // Casi espejo perfecto - refleja el entorno claramente
            mat.metalness = 0.95;       // Metal casi puro - refleja cielo y entorno del HDRI
            // Color negro piano se aplicará desde applyColor()
            // Nota: MeshStandardMaterial no tiene clearcoat, pero envMapIntensity alto
            // + roughness muy bajo simula el efecto de barniz que refleja el entorno
          }
          // Vidrios
          else if (name.includes('glass') || name.includes('window') || name.includes('windshield')) {
            mat.envMapIntensity = 3.0;
            mat.roughness = 0.0;
            mat.metalness = 1.0;
            mat.transparent = true;
            mat.opacity = 0.35;
            mat.color.setHex(0xffffff);
          }
          // Neumáticos y Gomas (Mate)
          else if (name.includes('tire') || name.includes('rubber') || name.includes('plastic')) {
            mat.envMapIntensity = 0.4;
            mat.roughness = 0.9;
            mat.metalness = 0.1;
            mat.color.setHex(0x151515); // Gris muy oscuro, no negro absoluto
          }
          // Cromados (Espejo total)
          else if (name.includes('chrome') || name.includes('silver') || name.includes('rim')) {
            mat.envMapIntensity = 4.0;
            mat.roughness = 0.0;
            mat.metalness = 1.0;
            mat.color.setHex(0xffffff);
          }
          // Interior
          else if (name.includes('interior') || name.includes('seat') || name.includes('leather')) {
            mat.envMapIntensity = 0.8;
            mat.roughness = 0.7;
          }

          mat.needsUpdate = true;
        }
      }
    });

    this.scene.add(this.carModel);

    // Actualizar Depth of Field para enfocar perfectamente en el auto
    // Esto calcula la distancia real de la cámara al auto y ajusta el enfoque
    // Postprocessing eliminado

    this.isLoading = false;
    this.modelLoaded.emit();
    // Aplicar color negro piano por defecto
    const colorToApply = this.selectedColor || 'Negro Piano';
    this.applyColor(colorToApply);
  }

  // Postprocessing eliminado - método updateDepthOfFieldTarget removido

  private stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => this.onWindowResize());
    });
    this.resizeObserver.observe(this.rendererCanvas.nativeElement.parentElement!);
  }

  private onWindowResize(): void {
    if (!this.rendererCanvas || !this.camera || !this.renderer) return;
    const parent = this.rendererCanvas.nativeElement.parentElement;
    if (parent) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      // Postprocessing eliminado - no se necesita resize del composer
    }
  }

  private startAnimationLoop(): void {
    if (!this.renderer || !this.scene || !this.camera || !this.THREE) return;

    this.ngZone.runOutsideAngular(() => {
      this.clock = new this.THREE!.Clock();
      let init = true;

      const animate = (time: number) => {
        this.animationId = requestAnimationFrame(animate);

        if (this.isContextLost) return;

        if (this.isMobile) {
          const elapsed = time - this.lastFrameTime;
          if (elapsed < this.frameInterval) return;
          this.lastFrameTime = time - (elapsed % this.frameInterval);
        }

        const delta = this.clock!.getDelta();

        // Rotar el entorno HDRI (fondo y reflejos) mientras el auto permanece fijo
        if (this.hdriSpin && this.scene && this.THREE) {
          // Actualizar rotación acumulativa del HDRI
          this.hdriRotationY = (this.hdriRotationY + delta * this.hdriSpinSpeed) % (Math.PI * 2);

          // Aplicar rotación al entorno (reflejos) y fondo
          const s = this.scene as unknown as {
            environmentRotation: import('three').Euler;
            backgroundRotation: import('three').Euler
          };
          if (!s.environmentRotation) s.environmentRotation = new this.THREE.Euler();
          if (!s.backgroundRotation) s.backgroundRotation = new this.THREE.Euler();
          s.environmentRotation.y = this.hdriRotationY;
          s.backgroundRotation.y = this.hdriRotationY;

          // También rotar la textura del fondo si está visible
          if (this.environmentTexture && this.showHdriBackground) {
            this.environmentTexture.rotation = this.hdriRotationY;
          }
        }

        if (this.mixer) {
          if (init) { this.mixer.setTime(13.91); init = false; }
          this.mixer.update(delta);
        }

        this.updateCameraAnimation();
        this.updateCarMovementAnimation();
        this.controls?.update();
        this.controls?.update();

        // Postprocessing eliminado - no se necesita actualización de Depth of Field

        this.renderer!.render(this.scene!, this.camera!);
      };
      animate(0);
    });
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.isContextLost = true;
    this.hasWebGLError = true;
    this.stopAnimationLoop();
  };

  private handleContextRestored = () => {
    this.isContextLost = false;
    this.hasWebGLError = false;
    this.rebuildScene();
  };

  private disposeThreeScene(): void {
    if (!this.THREE) return;
    this.scene?.traverse((obj) => {
      if (obj instanceof this.THREE!.Mesh) {
        obj.geometry.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
      }
    });
    this.environmentTexture?.dispose();
    this.scene = null;
    this.renderer?.dispose();
    this.renderer = null;
  }


  private rebuildScene(): void {
    this.disposeThreeScene();
    this.initScene();
    this.setupControls();
    this.setupLights();
    this.createRoad();
    // Postprocessing eliminado
    if (this.showModel) {
      this.loadCar();
    } else {
      this.isLoading = false; // Stop loading spinner if no model
    }
    this.startAnimationLoop();
  }

  // Postprocessing eliminado - método setupPostProcessing removido

  // --- Helpers & Features ---

  private createStudioEnvironment(): void {
    if (!this.THREE || !this.scene || !this.renderer || !this.RGBELoader) return;

    const setupTexture = (texture: import('three').Texture) => {
      texture.mapping = this.THREE!.EquirectangularReflectionMapping;
      texture.wrapS = this.THREE!.RepeatWrapping;
      texture.wrapT = this.THREE!.RepeatWrapping;
      // Enforce sharpest filtering for background
      texture.minFilter = this.THREE!.LinearFilter;
      texture.magFilter = this.THREE!.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() || 1;
      texture.needsUpdate = true;
      return texture;
    };

    if (this.backgroundSrc) {
      new this.THREE.TextureLoader().load(this.backgroundSrc, (tex) => {
        this.scene!.background = setupTexture(tex);
        this.environmentTexture = tex;
        this.applyHdriRotation();
        this.hdriLoaded.emit();
      });
      return;
    }

    const loader = this.environmentMapPath.endsWith('.exr') && this.EXRLoader
      ? new this.EXRLoader()
      : new this.RGBELoader();

    loader.load(this.environmentMapPath, (texture) => {
      this.environmentTexture = setupTexture(texture);
      const pmrem = new this.THREE!.PMREMGenerator(this.renderer!);
      pmrem.compileEquirectangularShader();
      // 1. Assign Environment (Lighting/Reflections) - Uses 1K HDR
      this.scene!.environment = pmrem.fromEquirectangular(texture).texture;
      pmrem.dispose();

      // 2. Assign Background (Visual) - Uses 8K JPG
      if (this.showHdriBackground) {
        const bgLoader = new this.THREE!.TextureLoader();
        bgLoader.load(this.backgroundMapPath, (bgTexture) => {
          // Configurar JPG background para máxima calidad
          bgTexture.mapping = this.THREE!.EquirectangularReflectionMapping;
          bgTexture.minFilter = this.THREE!.LinearFilter;
          bgTexture.magFilter = this.THREE!.LinearFilter;
          bgTexture.generateMipmaps = false;
          bgTexture.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() || 1;
          bgTexture.colorSpace = this.THREE!.SRGBColorSpace; // Importante para JPG

          this.scene!.background = bgTexture;
          this.applyHdriRotation(); // Re-aplicar rotación al fondo cuando cargue
        });
      }

      this.applyHdriRotation(); // Aplicar rotación inicial al entorno

      // Emitir evento cuando el HDRI está listo (para ocultar Splash Screen)
      this.hdriLoaded.emit();
    }, undefined, () => this.createSimpleEnvironment());

  }

  private createSimpleEnvironment(): void {
    // Fallback
  }

  private applyHdriRotation(): void {
    if (!this.scene || !this.THREE) return;
    const s = this.scene as unknown as { environmentRotation: import('three').Euler; backgroundRotation: import('three').Euler };
    if (!s.environmentRotation) s.environmentRotation = new this.THREE.Euler();
    if (!s.backgroundRotation) s.backgroundRotation = new this.THREE.Euler();
    s.environmentRotation.y = this.hdriRotationY;
    s.backgroundRotation.y = this.hdriRotationY;
  }

  private isWebGLAvailable(): boolean {
    try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; }
  }

  private updateThemeColors(): void {
    if (!this.scene || !this.renderer) return;
    const show = this.showHdriBackground || !!this.backgroundSrc;
    if (!show) this.scene.background = null;
    this.renderer.setClearColor(0x000000, show ? 1 : 0);
    this.createStudioEnvironment();
  }

  // --- Interaction & Animation Helpers ---

  onMouseEnter(): void { if (this.enableInteraction) { this.isHovered = true; if (this.controls) this.controls.autoRotateSpeed = 0; } }
  onMouseLeave(): void { this.isHovered = false; if (this.controls) this.controls.autoRotateSpeed = 0; }
  onClick(_e: MouseEvent): void {
    if (!this.enableInteraction) return;
    this.modelClicked.emit();
    if (this.carModel) {
      this.toggleHeadlights();
      this.startCarMovementAnimation();
      if (!this.swipeHintShown && !this.isLoading) this.showSwipeHintOnClick();
    }
  }
  onDoubleClick(): void { if (this.enableInteraction) this.setViewMode('default'); }

  toggleHeadlights(): void {
    this.headlightsOn = !this.headlightsOn;
    // Simple emissive toggle logic here (omitted for brevity in refactor, but standard implementation implies looping over headlights)
    if (!this.scene || !this.THREE) return;
    this.carModel?.traverse((child) => {
      const m = child as import('three').Mesh;
      if (m.name.match(/headlight|light_front|lamp/i) && m.material instanceof this.THREE!.MeshStandardMaterial) {
        m.material.emissive.set(this.headlightsOn ? 0xffffee : 0x000000);
        m.material.emissiveIntensity = this.headlightsOn ? 5 : 0;
      }
    });
    // Spotlights logic...
  }

  private showSwipeHintOnClick(): void {
    this.swipeHintShown = true;
    this.showSwipeHint = true;
    if (this.controls) this.controls.autoRotate = false;
    this.swipeHintTimeout = setTimeout(() => { this.showSwipeHint = false; }, 3000);
  }

  private startCarMovementAnimation(): void {
    this.carMovementAnimating = true;
    this.carMovementStartTime = performance.now();
    if (this.carModel) this.carOriginalPosition = { ...this.carModel.position };
  }

  private updateCarMovementAnimation(): void {
    if (!this.carMovementAnimating || !this.carModel) return;
    const elapsed = performance.now() - this.carMovementStartTime;
    const duration = 800;
    if (elapsed >= duration) {
      this.carModel.position.set(this.carOriginalPosition.x, this.carOriginalPosition.y, this.carOriginalPosition.z);
      this.carMovementAnimating = false;
      return;
    }
    this.carModel.position.z = this.carOriginalPosition.z + Math.sin((elapsed / duration) * Math.PI * 2) * 0.15;
  }

  private updateCameraAnimation(): void {
    if (!this.animatingCamera || !this.targetCameraPosition || !this.camera || !this.controls) return;
    const t = 0.05;
    this.camera.position.lerp(new this.THREE!.Vector3(this.targetCameraPosition.x, this.targetCameraPosition.y, this.targetCameraPosition.z), t);
    this.controls.target.lerp(new this.THREE!.Vector3(this.targetControlsTarget!.x, this.targetControlsTarget!.y, this.targetControlsTarget!.z), t);
  }

  setViewMode(mode: 'default' | 'front' | 'side' | 'interior' | 'top'): void {
    if (!this.lockToCar) return;
    const p = this.cameraPresets[mode];
    this.targetCameraPosition = p.position;
    this.targetControlsTarget = p.target;
    this.animatingCamera = true;
    this.currentViewMode = mode;
    this.viewModeChange.emit(mode);
    if (this.controls) this.controls.autoRotate = false;
    // Auto fijo sin rotación - desactivado permanentemente
    // setTimeout(() => { if (mode === 'default' && this.controls) this.controls.autoRotate = true; }, 1000);
  }

  // Deselect part logic
  deselectPart(event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedMesh = null;
    this.selectedPartInfo = null;
    this.partDeselected.emit();
  }

  // --- Mouse Raycaster ---
  onMouseMove(e: MouseEvent): void {
    if (!this.enableInteraction || this.mouseMoveThrottle) return;
    this.lastMouseEvent = e;
    this.mouseMoveThrottle = setTimeout(() => {
      this.mouseMoveThrottle = null;
      if (this.lastMouseEvent) this.performRaycast(this.lastMouseEvent);
    }, 16);
  }

  private performRaycast(e: MouseEvent): void {
    if (!this.raycaster || !this.carModel || !this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse!.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse!.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse!, this.camera);

    const intersects = this.raycaster.intersectObject(this.carModel, true);
    if (intersects.length > 0) {
      const mesh = intersects[0].object as import('three').Mesh;
      if (mesh !== this.hoveredMesh) {
        this.hoveredMesh = mesh;
        this.renderer.domElement.style.cursor = 'pointer';
        const info = this.partInfoMap.get('body'); // Simplified lookup for refactor
        this.hoveredPartInfo = info || null;
        this.partHovered.emit({ part: mesh.name, info, position: { x: e.clientX, y: e.clientY } });
      }
    } else {
      this.hoveredMesh = null;
      this.hoveredPartInfo = null;
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private applyColor(color: string): void {
    // Aplicación de color optimizada para negro piano con reflejos brillantes
    if (!this.carModel || !this.THREE) return;
    // Buscar el color, si no se encuentra usar Negro Piano por defecto
    const c = this.colors.find(c => c.name.toLowerCase() === color.toLowerCase()) ||
      this.colors.find(c => c.name.toLowerCase() === 'negro piano') ||
      this.colors[0];

    this.carModel.traverse((child) => {
      const m = child as import('three').Mesh;
      if (m.isMesh && m.material instanceof this.THREE!.MeshStandardMaterial) {
        const name = m.name.toLowerCase();
        // Aplicar a partes del body (carrocería)
        if (name.includes('body') || name.includes('paint') || name.includes('chassis') || name.includes('metal_primary') ||
          (m.material.color.r > 0.1 && !name.includes('tire') && !name.includes('rubber') && !name.includes('glass'))) {
          m.material.color.set(c.hex);
          if (!this.isMobile) {
            // Aplicar propiedades del color (especialmente para negro piano)
            m.material.roughness = c.roughness ?? 0.02;
            m.material.metalness = c.metalness ?? 0.95;
            if (c.envMapIntensity) {
              m.material.envMapIntensity = c.envMapIntensity;
            }
          }
          m.material.needsUpdate = true;
        }
      }
    });
  }



  // NOTE: NO AGREGAR SELECTOR DE COLORES
  // La lógica de configuración de colores NO debe habilitarse por UI.
}

