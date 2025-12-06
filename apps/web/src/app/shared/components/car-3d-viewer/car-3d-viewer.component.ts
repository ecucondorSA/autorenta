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

/**
 * ✅ OPTIMIZED: Dynamic imports for Three.js
 * Reduces initial bundle size by ~500KB
 * Three.js is only loaded when the component is rendered
 */
type THREE = typeof import('three');
type GLTFLoaderType = typeof import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader;
type DRACOLoaderType = typeof import('three/examples/jsm/loaders/DRACOLoader.js').DRACOLoader;
type RGBELoaderType = typeof import('three/examples/jsm/loaders/RGBELoader.js').RGBELoader;
type OrbitControlsType =
  typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;

/** Información de una parte del vehículo */
export interface CarPartInfo {
  name: string;
  description: string;
  icon: string;
  category?: 'body' | 'wheel' | 'glass' | 'light' | 'interior';
}

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
    >
      <canvas #rendererCanvas id="webgl-canvas"></canvas>

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
                <path
                  d="M15 30c0-2.8 2.2-5 5-5s5 2.2 5 5H15zm60 0c0-2.8 2.2-5 5-5s5 2.2 5 5H75zM10 25l5-10h25l10-7h20l15 7h10v10l-5 5H15l-5-5z"
                />
              </svg>
            </div>
            <div class="loading-bar">
              <div class="loading-progress"></div>
            </div>
            <p class="loading-text">Cargando modelo 3D...</p>
          </div>
        </div>
      }

      <!-- View Mode Indicator -->
      <div class="view-mode-indicator">
        <span class="mode-icon">{{ getViewModeIcon() }}</span>
        <span>{{ getViewModeLabel() }}</span>
      </div>

      <!-- Swipe Gesture Hint (appears after first click) -->
      @if (showSwipeHint && !isLoading) {
        <div class="swipe-hint" [class.hiding]="swipeHintHiding">
          <div class="swipe-icon">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
              <!-- Hand icon -->
              <path d="M32 48c-8 0-14-6-14-14v-8c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v6"/>
              <path d="M25.2 32v-6c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v6"/>
              <path d="M32.4 32v-8c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v8"/>
              <path d="M39.6 34v-4c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6v4c0 8-6 14-14 14"/>
              <!-- Swipe arrows -->
              <path class="swipe-arrow-left" d="M12 32l-6 0m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/>
              <path class="swipe-arrow-right" d="M52 32l6 0m0 0l-3-3m3 3l-3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="swipe-text">Arrastra para rotar</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .viewer-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        cursor: grab;
        transition: transform 0.3s ease;
      }

      .viewer-container:active {
        cursor: grabbing;
      }

      canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
        outline: none;
      }

      /* Loading Overlay - Autorentar Design */
      .loading-overlay {
        position: absolute;
        inset: 0;
        background: var(--surface-base); /* Use CSS variable */
        backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
      }

      .car-silhouette {
        width: 120px;
        height: 60px;
        color: var(--cta-default); /* Use CSS variable */
        animation: carPulse 2s ease-in-out infinite;
      }

      .car-silhouette svg {
        width: 100%;
        height: 100%;
      }

      @keyframes carPulse {
        0%,
        100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
      }

      .loading-bar {
        width: 200px;
        height: 3px;
        background: var(--border-subtle); /* Use CSS variable */
        border-radius: 10px;
        overflow: hidden;
      }

      .loading-progress {
        height: 100%;
        width: 30%;
        background-color: var(--cta-default);
        border-radius: 10px;
        animation: loadingSlide 1.2s ease-in-out infinite;
      }

      @keyframes loadingSlide {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(400%);
        }
      }

      .loading-text {
        color: var(--text-secondary); /* Use CSS variable */
        font-size: 0.875rem;
        font-weight: 500;
        letter-spacing: 0.05em;
      }

      /* View Mode Indicator - Autorentar Style */
      .view-mode-indicator {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--surface-raised); /* Use CSS variable */
        backdrop-filter: blur(12px);
        border-radius: 9999px;
        border: 1px solid var(--border-default); /* Use CSS variable */
        color: var(--text-primary); /* Use CSS variable */
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        z-index: 5;
        animation: modeSlideIn 0.3s ease-out;
      }

      @keyframes modeSlideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .mode-icon {
        font-size: 1rem;
      }

      /* Hover Glow Effect - Celeste Autorentar */
      .hover-glow {
        display: none;
      }

      /* Part Tooltip */
      .part-tooltip {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        background: var(--surface-raised); /* Use CSS variable */
        backdrop-filter: blur(12px);
        border-radius: 8px;
        border: 1px solid var(--border-default); /* Use CSS variable */
        box-shadow: var(--elevation-3); /* Use CSS variable */
        pointer-events: none;
        z-index: 20;
        transform: translate(-50%, -120%);
        animation: tooltipFadeIn 0.2s ease-out;
        white-space: nowrap;
      }

      @keyframes tooltipFadeIn {
        from {
          opacity: 0;
          transform: translate(-50%, -100%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -120%);
        }
      }

      .tooltip-icon {
        font-size: 1.125rem;
      }

      .tooltip-text {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-primary); /* Use CSS variable */
        letter-spacing: 0.01em;
      }

      /* Selected Part Badge */
      .selected-part-badge {
        position: absolute;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.625rem 1rem;
        background: var(--surface-raised); /* Use CSS variable */
        backdrop-filter: blur(12px);
        border-radius: 9999px;
        border: 2px solid var(--cta-default); /* Use CSS variable */
        box-shadow: var(--elevation-4); /* Use CSS variable */
        z-index: 15;
        animation: badgeSlideUp 0.3s ease-out;
      }

      @keyframes badgeSlideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .badge-icon {
        font-size: 1.25rem;
      }

      .badge-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary); /* Use CSS variable */
      }

      .badge-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-left: 0.25rem;
        padding: 0;
        background: var(--surface-secondary); /* Use CSS variable */
        border: none;
        border-radius: 50%;
        color: var(--text-secondary); /* Use CSS variable */
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .badge-close:hover {
        background: var(--cta-secondary); /* Use CSS variable */
        color: var(--text-primary); /* Use CSS variable */
      }

      /* Swipe Gesture Hint */
      .swipe-hint {
        position: absolute;
        bottom: 50%;
        left: 50%;
        transform: translate(-50%, 50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        background: var(--surface-raised);
        backdrop-filter: blur(12px);
        border-radius: 1rem;
        border: 1px solid var(--border-default);
        box-shadow: var(--elevation-4);
        z-index: 15;
        animation: swipeHintAppear 0.4s ease-out;
        pointer-events: none;
      }

      .swipe-hint.hiding {
        animation: swipeHintDisappear 0.4s ease-out forwards;
      }

      @keyframes swipeHintAppear {
        from {
          opacity: 0;
          transform: translate(-50%, 50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 50%) scale(1);
        }
      }

      @keyframes swipeHintDisappear {
        from {
          opacity: 1;
          transform: translate(-50%, 50%) scale(1);
        }
        to {
          opacity: 0;
          transform: translate(-50%, 50%) scale(0.8);
        }
      }

      .swipe-icon {
        width: 64px;
        height: 64px;
        color: var(--cta-default);
      }

      .swipe-icon svg {
        width: 100%;
        height: 100%;
      }

      .swipe-icon .swipe-arrow-left {
        animation: swipeArrowLeft 1.2s ease-in-out infinite;
      }

      .swipe-icon .swipe-arrow-right {
        animation: swipeArrowRight 1.2s ease-in-out infinite;
      }

      @keyframes swipeArrowLeft {
        0%, 100% {
          transform: translateX(0);
          opacity: 0.5;
        }
        50% {
          transform: translateX(-4px);
          opacity: 1;
        }
      }

      @keyframes swipeArrowRight {
        0%, 100% {
          transform: translateX(0);
          opacity: 0.5;
        }
        50% {
          transform: translateX(4px);
          opacity: 1;
        }
      }

      .swipe-text {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: 0.01em;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .view-mode-indicator {
          top: 1rem;
          right: 1rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.6875rem;
        }

        .swipe-hint {
          padding: 1rem 1.25rem;
        }

        .swipe-icon {
          width: 48px;
          height: 48px;
        }

        .swipe-text {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class Car3dViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() src = 'assets/models/car-model.glb';
  @Input() alt = 'A 3D model of a car';
  @Input() debugMode = false;
  @Input() selectedColor: string | null | undefined;
  @Input() enableInteraction = true;

  @Output() viewModeChange = new EventEmitter<string>();
  @Output() modelClicked = new EventEmitter<void>();
  @Output() modelLoaded = new EventEmitter<void>();
  @Output() partHovered = new EventEmitter<{
    part: string;
    info: CarPartInfo | undefined;
    position: { x: number; y: number };
  }>();
  @Output() partSelected = new EventEmitter<{ part: string; info: CarPartInfo | undefined }>();
  @Output() partDeselected = new EventEmitter<void>();

  @ViewChild('rendererCanvas') rendererCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly ngZone = inject(NgZone);
  private readonly modelCache = inject(Model3DCacheService);

  // ===== MOBILE PERFORMANCE OPTIMIZATION =====
  private readonly isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  private readonly isLowEndDevice =
    typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4;
  private readonly targetFPS = this.isMobile ? 30 : 60;
  private readonly frameInterval = 1000 / this.targetFPS;
  private lastFrameTime = 0;

  isLoading = true;
  isHovered = false;
  currentViewMode: 'default' | 'front' | 'side' | 'interior' | 'top' = 'default';
  headlightsOn = false;
  private headlightSpots: import('three').Object3D[] = [];

  // Swipe hint state (appears after first click to teach interaction)
  showSwipeHint = false;
  swipeHintHiding = false;
  private swipeHintShown = false; // Track if hint was already shown (only show once)
  private swipeHintTimeout: ReturnType<typeof setTimeout> | null = null;

  // Part interaction state (public for template)
  hoveredPartInfo: CarPartInfo | null = null;
  selectedPartInfo: CarPartInfo | null = null;
  tooltipPosition = { x: 0, y: 0 };

  // Camera presets for different views
  private readonly cameraPresets = {
    default: { position: { x: 4, y: 1.5, z: 6 }, target: { x: 0, y: 0.8, z: 0 } },
    front: { position: { x: 0, y: 1.2, z: 8 }, target: { x: 0, y: 0.8, z: 0 } },
    side: { position: { x: 8, y: 1.5, z: 0 }, target: { x: 0, y: 0.8, z: 0 } },
    // Vista interior desde asiento del conductor - mirando hacia adelante
    interior: { position: { x: -0.35, y: 1.0, z: 0.2 }, target: { x: -0.35, y: 1.0, z: 5 } },
    // Vista alternativa desde asiento del copiloto
    passenger: { position: { x: 0.4, y: 1.1, z: -0.3 }, target: { x: 0.4, y: 1.0, z: 5 } },
    top: { position: { x: 0, y: 10, z: 2 }, target: { x: 0, y: 0, z: 0 } },
  };

  // Three.js module reference (lazy loaded)
  private THREE: THREE | null = null;
  private GLTFLoader: GLTFLoaderType | null = null;
  private DRACOLoader: DRACOLoaderType | null = null;
  private RGBELoader: RGBELoaderType | null = null;
  private OrbitControls: OrbitControlsType | null = null;

  // Three.js objects (typed as any since we load dynamically)
  private scene: import('three').Scene | null = null;
  private camera: import('three').PerspectiveCamera | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private carModel: import('three').Group | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mixer: import('three').AnimationMixer | null = null;
  private clock: import('three').Clock | null = null;
  private controls: InstanceType<OrbitControlsType> | null = null;

  // Animation state
  private targetCameraPosition: { x: number; y: number; z: number } | null = null;
  private targetControlsTarget: { x: number; y: number; z: number } | null = null;
  private animatingCamera = false;

  // Car movement animation (adelante/atrás al hacer click)
  private carMovementAnimating = false;
  private carMovementStartTime = 0;
  private carOriginalPosition = { x: 0, y: 0, z: 0 };

  // Raycaster for part detection
  private raycaster: import('three').Raycaster | null = null;
  private mouse: import('three').Vector2 | null = null;
  private hoveredMesh: import('three').Mesh | null = null;
  private selectedMesh: import('three').Mesh | null = null;
  private mouseMoveThrottle: ReturnType<typeof setTimeout> | null = null;
  private lastMouseEvent: MouseEvent | null = null;
  private wheelListener: ((event: WheelEvent) => void) | null = null;

  // Main directional light reference for dynamic shadows
  private mainLight: import('three').DirectionalLight | null = null;

  // Part info mapping - detecta partes por nombre de mesh o características
  private readonly partInfoMap: Map<string, CarPartInfo> = new Map([
    [
      'body',
      {
        name: 'Carroceria',
        description: 'Estructura principal del vehiculo',
        icon: '🚗',
        category: 'body',
      },
    ],
    [
      'chassis',
      {
        name: 'Chasis',
        description: 'Base estructural del vehiculo',
        icon: '🔧',
        category: 'body',
      },
    ],
    ['hood', { name: 'Capo', description: 'Cubierta del motor', icon: '🔲', category: 'body' }],
    [
      'trunk',
      { name: 'Maletero', description: 'Compartimiento de carga', icon: '📦', category: 'body' },
    ],
    ['door', { name: 'Puerta', description: 'Acceso al habitaculo', icon: '🚪', category: 'body' }],
    [
      'wheel',
      { name: 'Rueda', description: 'Sistema de rodamiento', icon: '🛞', category: 'wheel' },
    ],
    [
      'tire',
      { name: 'Neumatico', description: 'Cubierta de caucho', icon: '⚫', category: 'wheel' },
    ],
    ['rim', { name: 'Rin', description: 'Llanta de aleacion', icon: '💿', category: 'wheel' }],
    ['window', { name: 'Ventana', description: 'Cristal lateral', icon: '🪟', category: 'glass' }],
    [
      'windshield',
      { name: 'Parabrisas', description: 'Cristal frontal', icon: '🔳', category: 'glass' },
    ],
    [
      'glass',
      { name: 'Cristal', description: 'Superficie transparente', icon: '✨', category: 'glass' },
    ],
    [
      'headlight',
      { name: 'Faro delantero', description: 'Iluminacion frontal', icon: '💡', category: 'light' },
    ],
    [
      'taillight',
      { name: 'Faro trasero', description: 'Iluminacion posterior', icon: '🔴', category: 'light' },
    ],
    ['mirror', { name: 'Espejo', description: 'Retrovisor lateral', icon: '🪞', category: 'body' }],
    [
      'bumper',
      {
        name: 'Paragolpes',
        description: 'Proteccion frontal/trasera',
        icon: '🛡️',
        category: 'body',
      },
    ],
    ['grille', { name: 'Parrilla', description: 'Rejilla frontal', icon: '▦', category: 'body' }],
    [
      'seat',
      { name: 'Asiento', description: 'Asiento del vehiculo', icon: '🪑', category: 'interior' },
    ],
    [
      'dashboard',
      { name: 'Tablero', description: 'Panel de instrumentos', icon: '📊', category: 'interior' },
    ],
    [
      'steering',
      { name: 'Volante', description: 'Control de direccion', icon: '🎡', category: 'interior' },
    ],
  ]);

  // Colors for mapping
  // Colores alineados a la paleta del sistema de diseño (sin hex legacy)
  colors = [
    { name: 'Celeste', hex: '#a7d8f4' }, // CTA default
    { name: 'Negro Piano', hex: '#050505', metalness: 0.9, roughness: 0.1, envMapIntensity: 2.0 }, // PBR Fotorrealista
    { name: 'Celeste Hover', hex: '#8ec9ec' }, // CTA hover
    { name: 'Marfil', hex: '#f8f4ec' }, // Surface base
    { name: 'Beige', hex: '#dfd2bf' }, // Surface secondary
    { name: 'Blanco', hex: '#ffffff' }, // Surface raised
    { name: 'Gris Claro', hex: '#bcbcbc' }, // Border default
    { name: 'Oliva', hex: '#9db38b' }, // Success token
    { name: 'Óxido', hex: '#b25e5e' }, // Error token
    { name: 'Negro', hex: '#050505' }, // Text primary
  ];

  private themeChangeListener: ((event: Event) => void) | null = null;
  private readonly showHdriBackground = true; // Mostrar el HDRI como fondo (con blur controlado)
  private contactShadowMesh: import('three').Mesh | null = null;
  private readonly hdriPath = '/assets/hdri/goegap_road_2k.hdr'; // nuevo entorno HDR optimized
  // Rotación base del HDRI para alinear la carretera con el Camaro (fase 2)
  private hdriRotationY = 3.85; // Valor estimado para alinear la carretera rural con el eje Z

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) {
      this.isLoading = false;
      return;
    }

    try {
      // Permite ajustar la rotación del HDRI sin recompilar: ?hdriY=90 (grados)
      const params = new URLSearchParams(window.location.search);
      const hdriY = params.get('hdriY');
      if (hdriY) {
        const deg = Number(hdriY);
        if (!Number.isNaN(deg)) {
          this.hdriRotationY = (deg * Math.PI) / 180;
        }
      }

      // Selección de modelo según dispositivo (solo si usa el default)
      if (this.src === 'assets/models/car-model.glb') {
        if (this.isLowEndDevice) {
          this.src = 'assets/models/car-model.glb'; // 623 KB
        } else if (this.isMobile) {
          this.src = 'assets/models/car-3d-model-optimized.glb'; // ~825 KB
        } else {
          this.src = 'assets/models/car-3d-model-pbr-optimized.glb'; // ~4.1 MB
        }
      }

      // ✅ OPTIMIZED: Dynamic import of Three.js with robust error handling
      console.log('[Car3dViewer] Starting dynamic imports...');

      const [threeModule, gltfModule, dracoModule, rgbeModule, orbitModule, exrModule] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/loaders/RGBELoader.js'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/loaders/EXRLoader.js'),
      ]);

      console.log('[Car3dViewer] Modules imported.');

      this.THREE = threeModule;
      this.GLTFLoader = gltfModule.GLTFLoader;
      this.DRACOLoader = dracoModule.DRACOLoader;
      this.RGBELoader = rgbeModule.RGBELoader;
      const EXRLoaderClass = (exrModule as any).EXRLoader;
      (this as any).EXRLoader = EXRLoaderClass;

      // Robust OrbitControls extraction
      // Try named export first, then default
      this.OrbitControls = (orbitModule as any).OrbitControls || (orbitModule as any).default;

      if (!this.OrbitControls) {
        console.error('[Car3dViewer] CRITICAL: Could not find OrbitControls in module:', orbitModule);
      } else {
        console.log('[Car3dViewer] OrbitControls loaded successfully.');
      }

      // Initialize Raycaster for part detection
      this.raycaster = new this.THREE.Raycaster();
      this.mouse = new this.THREE.Vector2();

      this.initScene();
      this.setupOrbitControls();

      // Fix for OrbitControls zoom being blocked by passive listeners
      this.wheelListener = (event: WheelEvent) => {
        event.preventDefault();
      };
      this.rendererCanvas.nativeElement.addEventListener('wheel', this.wheelListener, {
        passive: false,
      });
      this.setupLights();
      this.createRoad();
      this.loadCar();
      this.startAnimationLoop();
      this.setupResizeObserver();

      // Listen for theme changes
      this.themeChangeListener = (_event: Event) => {
        // const customEvent = event as CustomEvent;
        this.updateThemeColors();
      };
      window.addEventListener('autorenta:theme-change', this.themeChangeListener);
    } catch (error) {
      console.error('[Car3dViewer] Failed to load Three.js:', error);
      this.isLoading = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedColor'] && !changes['selectedColor'].firstChange) {
      this.applyColor(this.selectedColor ?? 'Negro Piano'); // Aplica 'Negro Piano' por defecto si no se proporciona color
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.mouseMoveThrottle) {
      clearTimeout(this.mouseMoveThrottle);
    }
    if (this.swipeHintTimeout) {
      clearTimeout(this.swipeHintTimeout);
    }
    if (this.wheelListener && this.rendererCanvas) {
      this.rendererCanvas.nativeElement.removeEventListener('wheel', this.wheelListener);
    }
    if (this.themeChangeListener) {
      window.removeEventListener('autorenta:theme-change', this.themeChangeListener);
    }
  }

  private initScene(): void {
    if (!this.THREE) return;

    this.scene = new this.THREE.Scene();

    // 2. Camera - Vista 3/4 trasera fija (estilo showroom)
    const width = this.rendererCanvas.nativeElement.clientWidth;
    const height = this.rendererCanvas.nativeElement.clientHeight;
    // Avoid zero-sized framebuffer when the canvas is hidden/collapsed
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);
    // FOV más estrecho en móvil (35) para reducir distorsión "ojo de pez" y dar look más "teleobjetivo" premium
    const fov = this.isMobile ? 35 : 45;
    this.camera = new this.THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);

    // Posición de cámara: Vista FRONTAL desde ARRIBA (delante y encima del auto)
    // X = lateral, Y = altura, Z positivo = delante del auto
    if (this.isMobile) {
      this.camera.position.set(0, 4.0, 6.0); // Frente-arriba móvil
      this.camera.lookAt(0, 0.3, 0); // Mirar al centro del auto
    } else {
      this.camera.position.set(0, 3.5, 5.5); // Frente-arriba desktop
      this.camera.lookAt(0, 0.3, 0);
    }

    // 3. Renderer - OPTIMIZED for mobile performance
    this.renderer = new this.THREE.WebGLRenderer({
      canvas: this.rendererCanvas.nativeElement,
      antialias: true, // Reactivado antialias en móvil para bordes suaves (crucial para calidad percibida)
      alpha: false, // fondo opaco para que el HDRI sea visible
      powerPreference: 'high-performance', // Forzar GPU para evitar texturas borrosas
      precision: 'mediump' // Balance calidad/perf
    });
    this.renderer.setSize(safeWidth, safeHeight);
    // Limit pixel ratio: mobile max 2.0 for sharp retina displays (subido de 1.5)
    const maxPixelRatio = Math.min(window.devicePixelRatio, this.isMobile ? 1.25 : 1.5);
    this.renderer.setPixelRatio(maxPixelRatio);

    // Shadows config - ACTIVADO siempre para contact shadows (Grounding)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;

    this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.isMobile ? 1.65 : 1.85; // subir leve para look cálido

    // DEBUG: Add AxesHelper to visualize origin
    if (this.debugMode) {
      const axesHelper = new this.THREE.AxesHelper(5);
      this.scene.add(axesHelper);
    }

    // Initial theme colors + HDRI environment (renderer is ready now)
    this.updateThemeColors();
  }

  private updateThemeColors(): void {
    if (!this.THREE || !this.scene || !this.renderer) return;

    const styles = getComputedStyle(document.documentElement);
    const surfaceBase = styles.getPropertyValue('--surface-base').trim();
    const surfaceSecondary = styles.getPropertyValue('--surface-secondary').trim();

    // Fondo: si showHdriBackground es true, dejamos que el HDRI sea visible; si no, fondo plano
    if (this.showHdriBackground) {
      this.renderer.setClearColor(0x000000, 1); // opaco, no transparente
    } else {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0); // vuelve a modo transparente
    }

    // Update environment for reflections y (opcional) fondo
    this.createStudioEnvironment(surfaceBase, surfaceSecondary);
  }

  private setupOrbitControls(): void {
    if (!this.OrbitControls || !this.camera || !this.renderer) return;

    this.controls = new this.OrbitControls(this.camera, this.renderer.domElement);

    // --- A. EL OBJETIVO (Target) ---
    // La cámara rota alrededor del "corazón" del auto (altura del capó/ventanillas).
    this.controls.target.set(0, 0.85, 0);

    // --- B. EL TACTO (Inercia/Damping) ---
    // CRUCIAL: Esto da la sensación de "peso". Si lo apagas, se siente robótico.
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05; // Valores bajos (0.05 - 0.1) se sienten más "premium".
    this.controls.rotateSpeed = 0.7; // Velocidad de rotación natural.

    // --- C. LOS LÍMITES DE MOVIMIENTO (El Corralito de Inmersión) ---

    // 1. ZOOM (Distancia)
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    // minDistance: Qué tan cerca puedes llegar. Evita atravesar la chapa.
    // 2.5 metros es suficiente para ver el detalle de un faro o rueda.
    this.controls.minDistance = 2.5;
    // maxDistance: Qué tan lejos. Evita que el auto se vuelva un punto lejano.
    // 8 metros mantiene el auto como protagonista del paisaje.
    this.controls.maxDistance = 8.0;

    // 2. ÁNGULO VERTICAL (Polar Angle) - El más importante para el realismo
    // 0 radianes es vista cenital (desde arriba).
    // Math.PI (3.14) es desde abajo del todo.
    // Math.PI / 2 (1.57) es el horizonte exacto.
    this.controls.minPolarAngle = 0.1; // Permite mirar casi desde arriba (vista de dron).

    // maxPolarAngle: EL LÍMITE DEL SUELO.
    // 1.5 radianes es un poco por encima del horizonte (~85 grados).
    // Permite "agacharse" para ver las ruedas, pero impide que la cámara
    // se meta bajo tierra, rompiendo la ilusión.
    this.controls.maxPolarAngle = 1.5;

    // 3. ÁNGULO HORIZONTAL (Azimuth Angle)
    // Permitimos 360 grados de libertad para rodear el auto.
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Desactivar el "Pan" (mover la cámara lateralmente sin rotar)
    // Mantiene el auto siempre en el centro de atención.
    this.controls.enablePan = false;

    // Rotación automática suave (opcional, desactivada al interactuar)
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5; // Velocidad lenta y elegante

    // === DEBUG LOGS ===
    console.log('[OrbitControls] ✅ Initialized successfully');
    console.log('[OrbitControls] enableZoom:', this.controls.enableZoom);
    console.log('[OrbitControls] enableRotate:', this.controls.enableRotate);
    console.log('[OrbitControls] enableDamping:', this.controls.enableDamping);
    console.log('[OrbitControls] minDistance:', this.controls.minDistance);
    console.log('[OrbitControls] maxDistance:', this.controls.maxDistance);
    console.log('[OrbitControls] target:', this.controls.target);
    if (this.camera) {
      const dist = this.camera.position.distanceTo(this.controls.target);
      console.log('[OrbitControls] Camera distance to target:', dist.toFixed(2));
      console.log('[OrbitControls] Camera position:', this.camera.position);
    }

    // Listen for control changes to confirm events are working
    this.controls.addEventListener('change', () => {
      console.log('[OrbitControls] 🎯 change event fired');
    });
    this.controls.addEventListener('start', () => {
      console.log('[OrbitControls] 🟢 interaction START');
    });
    this.controls.addEventListener('end', () => {
      console.log('[OrbitControls] 🔴 interaction END');
    });
  }

  private setupLights(): void {
    if (!this.THREE || !this.scene) return;

    // ===== LIGHTING SETUP (Mobile & Desktop) =====

    // 1. Ambient Light - Base suave
    const ambientLight = new this.THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // 2. Main Key Light (Sol/Estudio principal)
    this.mainLight = new this.THREE.DirectionalLight(0xffffff, 3.0);
    this.mainLight.position.set(6, 12, 6);
    this.mainLight.castShadow = true; // Sombras activas siempre para grounding

    // Configuración de sombras optimizada para contacto
    this.mainLight.shadow.mapSize.width = this.isMobile ? 1024 : 2048;
    this.mainLight.shadow.mapSize.height = this.isMobile ? 1024 : 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 40;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -10;
    this.mainLight.shadow.bias = -0.00025;
    this.mainLight.shadow.radius = 2; // Bordes duros para sol fuerte

    this.scene.add(this.mainLight);

    // 3. Rim Light (Crucial para autos oscuros en fondo oscuro)
    // Luz trasera fuerte para recortar la silueta
    const rimLight = new this.THREE.SpotLight(0xddeeff, 5.0);
    rimLight.position.set(0, 5, -10); // Atrás y arriba
    rimLight.lookAt(0, 0, 0);
    rimLight.penumbra = 0.5;
    this.scene.add(rimLight);

    // 4. Fill Light (Solo desktop o móviles potentes)
    if (!this.isLowEndDevice) {
      const fillLight = new this.THREE.DirectionalLight(0xe8f4ff, 1.0);
      fillLight.position.set(-8, 2, -5);
      this.scene.add(fillLight);
    }
  }

  private createRoad(): void {
    if (!this.THREE || !this.scene) return;

    // Shadow Catcher Plane
    const geometry = new this.THREE.PlaneGeometry(50, 50);
    const material = new this.THREE.ShadowMaterial({
      opacity: 0.65, // Más oscuro porque el asfalto es gris oscuro
      color: 0x000000,
    });

    const plane = new this.THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01; // pequeño offset evita z-fighting
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Contact shadow fakey (radial blur) para mejorar realismo
    const contactSize = 12; // área más amplia (match scale 12)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 1024;
    shadowCanvas.height = 1024;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const mid = shadowCanvas.width / 2;
      const gradient = ctx.createRadialGradient(mid, mid, 20, mid, mid, 360);
      gradient.addColorStop(0.0, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(0.20, 'rgba(0,0,0,0.35)');
      gradient.addColorStop(0.50, 'rgba(0,0,0,0.14)');
      gradient.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);
    }
    const shadowTexture = new this.THREE.CanvasTexture(shadowCanvas);
    shadowTexture.needsUpdate = true;
    const shadowMat = new this.THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    const shadowGeo = new this.THREE.PlaneGeometry(contactSize, contactSize);
    this.contactShadowMesh = new this.THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.y = 0.01; // apenas sobre el ground
    this.scene.add(this.contactShadowMesh);
  }

  /** Apply HDRI rotation to both environment lighting and background */
  private applyHdriRotation(): void {
    if (!this.scene || !this.THREE) return;
    const sceneAny = this.scene as any;
    if (!sceneAny.environmentRotation) {
      sceneAny.environmentRotation = new this.THREE.Euler();
    }
    sceneAny.environmentRotation.y = this.hdriRotationY;

    if (!sceneAny.backgroundRotation) {
      sceneAny.backgroundRotation = new this.THREE.Euler();
    }
    sceneAny.backgroundRotation.y = this.hdriRotationY;
  }

  /** Create procedural studio environment for realistic reflections */
  private createStudioEnvironment(
    baseColor: string = '#f8f4ec',
    _secondaryColor: string = '#dfd2bf',
  ): void {
    if (!this.THREE || !this.scene || !this.renderer || !this.RGBELoader) return;

    // Use HDRI loader (EXR preferred for this map)
    const useExr = this.hdriPath.toLowerCase().endsWith('.exr') && (this as any).EXRLoader;
    const loader = useExr ? new (this as any).EXRLoader() : new this.RGBELoader();
    const hdriPath = this.hdriPath; // '/assets/hdri/rural_asphalt_road_4k.exr';

    console.log('[Car3dViewer] Loading HDRI from:', hdriPath);

    loader.load(
      hdriPath,
      (texture) => {
        console.log('[Car3dViewer] HDRI loaded successfully');
        if (!this.THREE || !this.scene || !this.renderer) return;

        // ✅ CRITICAL: Process HDRI with PMREMGenerator for realistic PBR reflections
        texture.mapping = this.THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;
        const pmremGenerator = new this.THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = envMap;
        const sceneAny = this.scene as any;
        this.applyHdriRotation();

        // Fondo HDRI opcional
        if (this.showHdriBackground) {
          this.scene.background = texture; // mantener resolución completa del backplate
          this.applyHdriRotation();
          this.scene.backgroundBlurriness = 0.02; // Casi nítido para que el cerebro conecte la rueda con la piedra del suelo
        } else {
          this.scene.background = null;
          texture.dispose();
        }

        console.log('[Car3dViewer] HDRI Environment & Background set!');

        // Clean up original texture to save memory
        pmremGenerator.dispose();

        if (this.renderer) {
          this.renderer.toneMappingExposure = this.isMobile ? 1.65 : 1.85;

          // Forzar actualización de materiales
          if (this.carModel) {
            console.log('[Car3dViewer] Updating car materials for HDRI...');
            this.carModel.traverse((child) => {
              if ((child as any).isMesh) {
                const mesh = child as any;
                if (mesh.material) {
                  // Boost environment intensity for visible effect
                  mesh.material.envMapIntensity = 1.8; // más contenido con el nuevo EXR
                  mesh.material.needsUpdate = true;
                }
              }
            });
          }
        }
      },
      undefined,
      (error) => {
        console.error('[Car3dViewer] Error loading HDRI:', error);
        this.createSimpleEnvironment();
      }
    );
  }

  private createSimpleEnvironment(): void {
    if (!this.THREE || !this.scene || !this.renderer) return;

    // Simple solid color environment for basic reflections (Fallback)
    const simpleEnvCanvas = document.createElement('canvas');
    simpleEnvCanvas.width = 64;
    simpleEnvCanvas.height = 32;
    const ctx = simpleEnvCanvas.getContext('2d');
    if (ctx) {
      const grd = ctx.createLinearGradient(0, 32, 0, 0);
      grd.addColorStop(0, '#e0e0e0');
      grd.addColorStop(1, '#ffffff');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 64, 32);
    }
    const simpleEnvTexture = new this.THREE.CanvasTexture(simpleEnvCanvas);
    simpleEnvTexture.mapping = this.THREE.EquirectangularReflectionMapping;

    const pmremGenerator = new this.THREE.PMREMGenerator(this.renderer);
    const renderTarget = pmremGenerator.fromEquirectangular(simpleEnvTexture);
    this.scene.environment = renderTarget.texture;
    simpleEnvTexture.dispose();
    pmremGenerator.dispose();
  }

  private loadCar(): void {
    if (!this.THREE || !this.GLTFLoader || !this.DRACOLoader || !this.scene) return;

    // ===== CHECK CACHE FIRST =====
    // If model is cached, use it immediately for instant display
    const cachedModel = this.modelCache.getCachedModel(this.src);
    if (cachedModel) {
      console.log('[Car3dViewer] Using cached model:', this.src);
      this.setupLoadedModel(cachedModel);
      return;
    }

    console.log('[Car3dViewer] Loading model from network:', this.src);

    // Configure DRACO loader for compressed models
    const dracoLoader = new this.DRACOLoader();
    // Use local path for DRACO decoder instead of CDN to avoid 504 Gateway Timeout
    dracoLoader.setDecoderPath('/libs/draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });

    const loader = new this.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      this.src,
      (gltf) => {
        if (!this.THREE || !this.scene) return;

        // Cache the model for future use
        this.modelCache.setThreeModule(this.THREE);
        this.modelCache.cacheModel(this.src, gltf.scene.clone());

        this.setupLoadedModel(gltf.scene);
      },
      (_xhr) => {
        // Progress callback - could add progress indicator
      },
      (error) => {
        console.error('[Car3dViewer] Error loading car model:', error);
        this.isLoading = false;
      },
    );
  }

  /**
   * Setup a loaded model (either from cache or network)
   * Extracted to avoid code duplication
   */
  private setupLoadedModel(model: import('three').Group): void {
    if (!this.THREE || !this.scene) return;

    this.carModel = model;

    // Center the model
    const box = new this.THREE.Box3().setFromObject(this.carModel);
    const center = box.getCenter(new this.THREE.Vector3());
    const size = box.getSize(new this.THREE.Vector3());

    // Adjust position so it sits on the ground
    this.carModel.position.x += this.carModel.position.x - center.x;
    this.carModel.position.y = 0;
    this.carModel.position.z += this.carModel.position.z - center.z;

    // Escalar el modelo para que ocupe bien el espacio
    // Tamaño objetivo: ~6 unidades para que sea prominente
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 9.0;
    const scale = targetSize / maxDim;
    this.carModel.scale.set(scale, scale, scale);

    // Reposicionar después de escalar para centrar correctamente
    const scaledBox = new this.THREE.Box3().setFromObject(this.carModel);
    const scaledCenter = scaledBox.getCenter(new this.THREE.Vector3());

    this.carModel.position.x = 2.5; // Desplaza a la derecha para dejar espacio al texto
    this.carModel.position.z = -scaledCenter.z; // Centrado en Z
    this.carModel.position.y = -scaledBox.min.y - 2.2; // Bajar 2.2 (extremadamente agresivo)

    // Orientar el frente del auto hacia la cámara (3/4 frontal)
    this.carModel.rotation.y = -Math.PI / 6;

    // Alinear sombra de contacto con el auto
    if (this.contactShadowMesh) {
      this.contactShadowMesh.position.x = this.carModel.position.x;
      this.contactShadowMesh.position.z = this.carModel.position.z;
    }

    // Re-centrar el target de la cámara en el nuevo posicionamiento
    if (this.controls) {
      this.controls.target.set(this.carModel.position.x, 0.9, this.carModel.position.z);
      this.controls.update();
    }

    // Enable shadows, enhance materials
    this.carModel.traverse((child) => {
      if (!this.THREE) return;
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material instanceof this.THREE.MeshStandardMaterial) {
          mesh.material.envMapIntensity = 2.5;
          mesh.material.metalness = Math.max(mesh.material.metalness, 0.6);
          mesh.material.roughness = Math.min(mesh.material.roughness, 0.4);
          mesh.material.needsUpdate = true;
        }
      }
    });

    // Note: Animations are not cached - only the geometry/materials
    // If you need animations, the original loader.load path handles them

    this.scene.add(this.carModel);
    this.isLoading = false;
    this.modelLoaded.emit();

    // Apply initial color if set, or default to Negro Piano
    this.applyColor(this.selectedColor ?? 'Negro Piano');
  }

  private startAnimationLoop(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.ngZone.runOutsideAngular(() => {
      this.clock = new this.THREE!.Clock();
      let isFirstFrame = true;

      const animate = (currentTime: number) => {
        this.animationId = requestAnimationFrame(animate);

        // ===== MOBILE FPS THROTTLE =====
        // On mobile, limit to 30fps for better battery and performance
        if (this.isMobile) {
          const elapsed = currentTime - this.lastFrameTime;
          if (elapsed < this.frameInterval) return;
          this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
        }

        const delta = this.clock.getDelta();

        // Update animations
        if (this.mixer) {
          // On first frame, set the mixer time to sequence 3 (13.91 seconds)
          if (isFirstFrame) {
            this.mixer.setTime(13.91);
            isFirstFrame = false;
          }
          this.mixer.update(delta);
        }

        // Update camera animation (smooth transitions)
        this.updateCameraAnimation();

        // Update car movement animation (adelante/atrás al click)
        this.updateCarMovementAnimation();

        // Update dynamic shadows based on camera angle (skip on mobile)
        if (!this.isMobile) {
          this.updateDynamicShadows();
        }

        // Update orbit controls
        if (this.controls) {
          this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate(0);
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => {
        this.onWindowResize();
      });
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
    }
  }

  private applyColor(colorNameOrHex: string): void {
    if (!this.THREE || !this.carModel) return;

    let hexColor = colorNameOrHex;

    // Check predefined colors
    const predefined = this.colors.find(
      (c) => c.name.toLowerCase() === colorNameOrHex.toLowerCase(),
    );
    if (predefined) {
      hexColor = predefined.hex;
    }

    if (!hexColor.startsWith('#')) return;

    // Get PBR properties from the predefined color, if available
    const applyMetalness = predefined?.metalness;
    const applyRoughness = predefined?.roughness;
    const applyEnvMapIntensity = predefined?.envMapIntensity;

    this.carModel.traverse((child) => {
      if (!this.THREE) return;
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        if (mesh.material instanceof this.THREE.MeshStandardMaterial) {
          const partInfo = this.getPartInfoFromMesh(mesh);

          // Apply color to main body parts
          if (
            partInfo.category === 'body' &&
            mesh.material.opacity > 0.9 &&
            (mesh.material.color.r > 0.1 || mesh.material.color.g > 0.1 || mesh.material.color.b > 0.1)
          ) {
            // ===== MOBILE OPTIMIZATION: Skip MeshPhysicalMaterial upgrade =====
            // On mobile, keep MeshStandardMaterial (no clearcoat) for better performance
            if (!this.isMobile) {
              // UPGRADE to MeshPhysicalMaterial if needed for Clearcoat support (DESKTOP ONLY)
              if (!(mesh.material instanceof this.THREE.MeshPhysicalMaterial)) {
                const newMat = new this.THREE.MeshPhysicalMaterial();
                this.THREE.MeshStandardMaterial.prototype.copy.call(newMat, mesh.material);
                mesh.material = newMat;
              }

              const physMat = mesh.material as import('three').MeshPhysicalMaterial;
              physMat.color.set(hexColor);

              // Apply PBR properties if defined
              if (applyMetalness !== undefined) physMat.metalness = applyMetalness;
              if (applyRoughness !== undefined) physMat.roughness = applyRoughness;
              if (applyEnvMapIntensity !== undefined) physMat.envMapIntensity = applyEnvMapIntensity;

              // Special handling for 'Negro Piano' or high-quality finishes: Enable Clearcoat
              if (hexColor.toLowerCase() === '#050505' || hexColor.toLowerCase() === '#0a0a0a') {
                physMat.clearcoat = 1.0; // Barniz completo
                physMat.clearcoatRoughness = 0.03; // Barniz ultra pulido
              } else {
                physMat.clearcoat = 0.0;
              }
            } else {
              // Mobile: Keep MeshStandardMaterial, just change color
              mesh.material.color.set(hexColor);
              // Apply simplified PBR for mobile
              if (applyMetalness !== undefined) mesh.material.metalness = Math.min(applyMetalness, 0.7);
              if (applyRoughness !== undefined) mesh.material.roughness = Math.max(applyRoughness, 0.2);
              mesh.material.envMapIntensity = 1.5; // Lower env map intensity on mobile
            }

            mesh.material.needsUpdate = true;
          }
        }
      }
    });
  }

  // ===== INTERACTION METHODS =====

  onMouseEnter(): void {
    if (!this.enableInteraction) return;
    this.isHovered = true;

    // Slightly increase auto-rotate speed on hover
    if (this.controls) {
      this.controls.autoRotateSpeed = 0.8;
    }
  }

  onMouseLeave(): void {
    this.isHovered = false;

    // Restore normal auto-rotate speed
    if (this.controls) {
      this.controls.autoRotateSpeed = 0.3;
    }
  }

  onClick(_event: MouseEvent): void {
    if (!this.enableInteraction) return;
    this.modelClicked.emit();

    // Toggle headlights and start car movement animation when clicking on the car
    if (this.hoveredMesh || this.carModel) {
      this.toggleHeadlights();
      this.startCarMovementAnimation();

      // Show swipe hint on first click (only once per session)
      if (!this.swipeHintShown && !this.isLoading) {
        this.showSwipeHintOnClick();
      }
    }
  }

  /** Show swipe gesture hint when user first clicks on the car */
  private showSwipeHintOnClick(): void {
    this.swipeHintShown = true;
    this.showSwipeHint = true;
    this.swipeHintHiding = false;

    // Stop auto-rotate when showing hint
    if (this.controls) {
      this.controls.autoRotate = false;
    }

    // Auto-hide hint after 3 seconds
    this.swipeHintTimeout = setTimeout(() => {
      this.hideSwipeHint();
    }, 3000);
  }

  /** Hide swipe hint with fade animation */
  private hideSwipeHint(): void {
    if (this.swipeHintTimeout) {
      clearTimeout(this.swipeHintTimeout);
      this.swipeHintTimeout = null;
    }

    this.swipeHintHiding = true;

    // Remove from DOM after animation completes
    setTimeout(() => {
      this.showSwipeHint = false;
      this.swipeHintHiding = false;
    }, 400);
  }

  /** Start car forward/backward movement animation (como si arrancara) */
  private startCarMovementAnimation(): void {
    if (!this.carModel || this.carMovementAnimating) return;

    this.carMovementAnimating = true;
    this.carMovementStartTime = performance.now();
    this.carOriginalPosition = {
      x: this.carModel.position.x,
      y: this.carModel.position.y,
      z: this.carModel.position.z,
    };
  }

  /** Update car movement animation in the render loop */
  private updateCarMovementAnimation(): void {
    if (!this.carMovementAnimating || !this.carModel) return;

    const elapsed = performance.now() - this.carMovementStartTime;
    const duration = 800; // 800ms total animation

    if (elapsed >= duration) {
      // Animation complete - return to original position
      this.carModel.position.set(
        this.carOriginalPosition.x,
        this.carOriginalPosition.y,
        this.carOriginalPosition.z
      );
      this.carMovementAnimating = false;
      return;
    }

    // Smooth forward then backward movement using sine wave
    const progress = elapsed / duration;
    // Mueve adelante (Z positivo) y luego regresa - efecto de "arranque"
    const movement = Math.sin(progress * Math.PI * 2) * 0.15; // 0.15 unidades de movimiento

    this.carModel.position.z = this.carOriginalPosition.z + movement;
  }

  onDoubleClick(): void {
    if (!this.enableInteraction) return;

    // Reset to default view
    this.setViewMode('default');
  }

  /** Set camera to a preset view with smooth animation */
  setViewMode(mode: 'default' | 'front' | 'side' | 'interior' | 'top'): void {
    if (!this.camera || !this.controls) return;

    const preset = this.cameraPresets[mode];
    this.targetCameraPosition = preset.position;
    this.targetControlsTarget = preset.target;
    this.animatingCamera = true;
    this.currentViewMode = mode;
    this.viewModeChange.emit(mode);

    // Update part visibility based on mode
    this.updatePartVisibility(mode);

    // Stop auto-rotate during animation
    if (this.controls) {
      this.controls.autoRotate = false;
    }

    // Re-enable auto-rotate after animation (unless in interior mode)
    setTimeout(() => {
      this.animatingCamera = false;
      if (this.controls && mode === 'default') {
        this.controls.autoRotate = true;
      }
    }, 1000);
  }

  /** Update visibility of parts based on view mode */
  private updatePartVisibility(mode: string): void {
    if (!this.carModel || !this.THREE) return;

    const isInterior = mode === 'interior';

    this.carModel.traverse((child) => {
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        const partInfo = this.getPartInfoFromMesh(mesh);

        // If interior mode, hide exterior parts
        if (isInterior) {
          // Hide body, glass, wheels, etc.
          if (
            partInfo.category === 'body' ||
            partInfo.category === 'glass' ||
            partInfo.category === 'wheel' ||
            partInfo.category === 'light'
          ) {
            // Check if it's a door (might want to keep door frames but usually better to hide for clear view)
            mesh.visible = false;
          } else {
            // Ensure interior parts are visible
            mesh.visible = true;
          }
        } else {
          // Show everything in other modes
          mesh.visible = true;
        }
      }
    });
  }

  /** Toggle headlights on/off */
  toggleHeadlights(): void {
    if (!this.carModel || !this.THREE || !this.scene) return;

    this.headlightsOn = !this.headlightsOn;

    // 1. Toggle Emissive Material
    this.carModel.traverse((child) => {
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        const name = mesh.name.toLowerCase();
        // Detect headlights
        if (name.includes('headlight') || name.includes('light_front') || name.includes('lamp')) {
          if (mesh.material instanceof this.THREE!.MeshStandardMaterial) {
            if (this.headlightsOn) {
              // Store original if not exists
              if (!mesh.userData['originalEmissive']) {
                mesh.userData['originalEmissive'] = mesh.material.emissive.clone();
                mesh.userData['originalEmissiveIntensity'] = mesh.material.emissiveIntensity;
              }
              // Turn on
              mesh.material.emissive.set(0xffffee); // Warm white
              mesh.material.emissiveIntensity = 5;
            } else {
              // Restore
              if (mesh.userData['originalEmissive']) {
                mesh.material.emissive.copy(mesh.userData['originalEmissive']);
                mesh.material.emissiveIntensity = mesh.userData['originalEmissiveIntensity'] || 0;
              }
            }
            mesh.material.needsUpdate = true;
          }
        }
      }
    });

    // 2. Manage SpotLights
    if (this.headlightsOn) {
      this.addHeadlightBeams();
    } else {
      this.removeHeadlightBeams();
    }
  }

  private addHeadlightBeams(): void {
    if (!this.THREE || !this.scene || !this.carModel) return;

    // Approximate headlight positions (relative to car)
    // Assuming car faces +Z or -Z. Based on camera presets, front is likely +Z or -Z.
    // Let's guess positions based on car bounds or hardcoded for this model.
    // Front view preset is z=8, target z=0. So front of car is likely +Z.

    const box = new this.THREE.Box3().setFromObject(this.carModel);
    const size = box.getSize(new this.THREE.Vector3());
    const center = box.getCenter(new this.THREE.Vector3());

    // Front is likely at max Z or min Z.
    // Let's assume standard GLTF orientation: +Z is front.
    // Actually, usually +Z is front in Three.js if exported correctly, or -Z.
    // Let's try placing lights at the "front" bounding box face.

    const zPos = box.max.z - 0.5; // Slightly inside
    const yPos = center.y;
    const xOffset = size.x * 0.3; // 30% from center

    const leftLight = new this.THREE.SpotLight(0xffffee, 10);
    leftLight.position.set(center.x + xOffset, yPos, zPos);
    leftLight.target.position.set(center.x + xOffset, yPos, zPos + 10);
    leftLight.angle = Math.PI / 6;
    leftLight.penumbra = 0.2;
    leftLight.distance = 20;
    leftLight.castShadow = true;

    const rightLight = new this.THREE.SpotLight(0xffffee, 10);
    rightLight.position.set(center.x - xOffset, yPos, zPos);
    rightLight.target.position.set(center.x - xOffset, yPos, zPos + 10);
    rightLight.angle = Math.PI / 6;
    rightLight.penumbra = 0.2;
    rightLight.distance = 20;
    rightLight.castShadow = true;

    this.scene.add(leftLight);
    this.scene.add(leftLight.target);
    this.scene.add(rightLight);
    this.scene.add(rightLight.target);

    this.headlightSpots.push(leftLight, leftLight.target, rightLight, rightLight.target);
  }

  private removeHeadlightBeams(): void {
    if (!this.scene) return;

    this.headlightSpots.forEach((obj) => {
      this.scene!.remove(obj);
    });
    this.headlightSpots = [];
  }

  /** Cycle through view modes on click */
  cycleViewMode(): void {
    const modes: Array<'default' | 'front' | 'side' | 'interior' | 'top'> = [
      'default',
      'front',
      'side',
      'interior',
      'top',
    ];
    const currentIndex = modes.indexOf(this.currentViewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setViewMode(modes[nextIndex]);
  }

  getViewModeIcon(): string {
    const icons: Record<string, string> = {
      default: '🎬',
      front: '👁️',
      side: '↔️',
      interior: '🚗',
      top: '🔝',
    };
    return icons[this.currentViewMode] || '🎬';
  }

  getViewModeLabel(): string {
    const labels: Record<string, string> = {
      default: 'Vista General',
      front: 'Vista Frontal',
      side: 'Vista Lateral',
      interior: 'Interior',
      top: 'Vista Superior',
    };
    return labels[this.currentViewMode] || 'Vista General';
  }

  /** Smooth lerp for camera animation */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /** Update camera position smoothly in animation loop */
  private updateCameraAnimation(): void {
    if (!this.animatingCamera || !this.camera || !this.controls) return;
    if (!this.targetCameraPosition || !this.targetControlsTarget) return;

    const lerpFactor = 0.05;

    // Animate camera position
    this.camera.position.x = this.lerp(
      this.camera.position.x,
      this.targetCameraPosition.x,
      lerpFactor,
    );
    this.camera.position.y = this.lerp(
      this.camera.position.y,
      this.targetCameraPosition.y,
      lerpFactor,
    );
    this.camera.position.z = this.lerp(
      this.camera.position.z,
      this.targetCameraPosition.z,
      lerpFactor,
    );

    // Animate controls target
    this.controls.target.x = this.lerp(
      this.controls.target.x,
      this.targetControlsTarget.x,
      lerpFactor,
    );
    this.controls.target.y = this.lerp(
      this.controls.target.y,
      this.targetControlsTarget.y,
      lerpFactor,
    );
    this.controls.target.z = this.lerp(
      this.controls.target.z,
      this.targetControlsTarget.z,
      lerpFactor,
    );
  }

  // ===== RAYCASTER & PART INTERACTION METHODS =====

  /** Handle mouse move for part hover detection */
  onMouseMove(event: MouseEvent): void {
    if (!this.enableInteraction || this.isLoading) return;
    if (!this.raycaster || !this.mouse || !this.camera || !this.carModel) return;

    // Throttle mousemove to 60fps for performance
    if (this.mouseMoveThrottle) return;
    this.lastMouseEvent = event;

    this.mouseMoveThrottle = setTimeout(() => {
      this.mouseMoveThrottle = null;
      if (this.lastMouseEvent) {
        this.performRaycast(this.lastMouseEvent);
      }
    }, 16); // ~60fps
  }

  /** Perform raycast to detect intersected mesh */
  private performRaycast(event: MouseEvent): void {
    if (!this.raycaster || !this.mouse || !this.camera || !this.carModel || !this.renderer) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.carModel, true);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as import('three').Mesh;
      if (mesh.isMesh && mesh !== this.hoveredMesh) {
        this.highlightPart(mesh);

        // Update tooltip position
        this.tooltipPosition = {
          x:
            event.clientX -
            (this.rendererCanvas.nativeElement.parentElement?.getBoundingClientRect().left || 0),
          y:
            event.clientY -
            (this.rendererCanvas.nativeElement.parentElement?.getBoundingClientRect().top || 0),
        };

        // Emit hover event
        const partInfo = this.getPartInfoFromMesh(mesh);
        this.hoveredPartInfo = partInfo;
        this.partHovered.emit({
          part: mesh.name || 'unknown',
          info: partInfo,
          position: this.tooltipPosition,
        });
      } else if (mesh === this.hoveredMesh) {
        // Update tooltip position even when same mesh
        this.tooltipPosition = {
          x:
            event.clientX -
            (this.rendererCanvas.nativeElement.parentElement?.getBoundingClientRect().left || 0),
          y:
            event.clientY -
            (this.rendererCanvas.nativeElement.parentElement?.getBoundingClientRect().top || 0),
        };
      }
    } else {
      this.clearHighlight();
    }
  }

  /** Get part info based on mesh name or material properties */
  private getPartInfoFromMesh(mesh: import('three').Mesh): CarPartInfo {
    const name = mesh.name.toLowerCase();

    // Try to match by mesh name
    for (const [key, info] of this.partInfoMap.entries()) {
      if (name.includes(key)) {
        return info;
      }
    }

    // Fallback: detect by material properties
    if (this.THREE && mesh.material instanceof this.THREE.MeshStandardMaterial) {
      const mat = mesh.material;

      // Dark color = likely wheel/tire
      if (mat.color.r < 0.15 && mat.color.g < 0.15 && mat.color.b < 0.15) {
        return (
          this.partInfoMap.get('wheel') || {
            name: 'Rueda',
            description: 'Parte del sistema de rodamiento',
            icon: '🛞',
          }
        );
      }

      // Transparent = glass
      if (mat.opacity < 0.9 || mat.transparent) {
        return (
          this.partInfoMap.get('glass') || {
            name: 'Cristal',
            description: 'Superficie de vidrio',
            icon: '✨',
          }
        );
      }

      // High metalness = body panels
      if (mat.metalness > 0.5) {
        return (
          this.partInfoMap.get('body') || {
            name: 'Carroceria',
            description: 'Estructura del vehiculo',
            icon: '🚗',
          }
        );
      }
    }

    // Default fallback
    return { name: 'Parte del vehiculo', description: 'Componente del automovil', icon: '🔧' };
  }

  /** Highlight a mesh with glow effect (Celeste Autorentar) */
  private highlightPart(mesh: import('three').Mesh): void {
    if (this.hoveredMesh === mesh) return;

    // Clear previous highlight
    this.clearHighlight();

    this.hoveredMesh = mesh;

    if (this.THREE && mesh.material instanceof this.THREE.MeshStandardMaterial) {
      // Store original values
      mesh.userData['originalEmissive'] = mesh.material.emissive.clone();
      mesh.userData['originalEmissiveIntensity'] = mesh.material.emissiveIntensity;

      // Apply celeste pastel glow (#a7d8f4)
      mesh.material.emissive.set(0xa7d8f4);
      mesh.material.emissiveIntensity = 0.25;
      mesh.material.needsUpdate = true;
    }

    // Change cursor
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'pointer';
    }
  }

  /** Clear highlight from hovered mesh */
  private clearHighlight(): void {
    if (!this.hoveredMesh || !this.THREE) return;

    const mesh = this.hoveredMesh;
    if (mesh.material instanceof this.THREE.MeshStandardMaterial) {
      // Restore original emissive values
      if (mesh.userData['originalEmissive']) {
        mesh.material.emissive.copy(mesh.userData['originalEmissive']);
        mesh.material.emissiveIntensity = mesh.userData['originalEmissiveIntensity'] || 0;
        mesh.material.needsUpdate = true;
      }
    }

    this.hoveredMesh = null;
    this.hoveredPartInfo = null;

    // Restore cursor
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  /** Select a part on click */
  selectPart(mesh: import('three').Mesh): void {
    // Deselect previous
    this.deselectPartInternal();

    this.selectedMesh = mesh;

    if (this.THREE && mesh.material instanceof this.THREE.MeshStandardMaterial) {
      // Store original values if not already stored
      if (!mesh.userData['selectedOriginalEmissive']) {
        mesh.userData['selectedOriginalEmissive'] = mesh.material.emissive.clone();
        mesh.userData['selectedOriginalEmissiveIntensity'] = mesh.material.emissiveIntensity;
      }

      // Apply stronger glow for selection
      mesh.material.emissive.set(0xa7d8f4);
      mesh.material.emissiveIntensity = 0.5;
      mesh.material.needsUpdate = true;
    }

    const partInfo = this.getPartInfoFromMesh(mesh);
    this.selectedPartInfo = partInfo;
    this.partSelected.emit({ part: mesh.name || 'unknown', info: partInfo });

    // Optional: Zoom to selected part
    this.zoomToPart(mesh);
  }

  /** Deselect the currently selected part (internal) */
  private deselectPartInternal(): void {
    if (!this.selectedMesh || !this.THREE) return;

    const mesh = this.selectedMesh;
    if (mesh.material instanceof this.THREE.MeshStandardMaterial) {
      if (mesh.userData['selectedOriginalEmissive']) {
        mesh.material.emissive.copy(mesh.userData['selectedOriginalEmissive']);
        mesh.material.emissiveIntensity = mesh.userData['selectedOriginalEmissiveIntensity'] || 0;
        mesh.material.needsUpdate = true;
        delete mesh.userData['selectedOriginalEmissive'];
        delete mesh.userData['selectedOriginalEmissiveIntensity'];
      }
    }

    this.selectedMesh = null;
    this.selectedPartInfo = null;
  }

  /** Public method to deselect part (called from template) */
  deselectPart(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.deselectPartInternal();
    this.partDeselected.emit();
  }

  /** Zoom camera smoothly to a specific part */
  private zoomToPart(mesh: import('three').Mesh): void {
    if (!this.THREE || !this.camera || !this.controls) return;

    const box = new this.THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new this.THREE.Vector3());
    const size = box.getSize(new this.THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Calculate optimal camera distance
    const distance = Math.max(maxDim * 2.5, 3);

    // Direction from center to current camera
    const direction = new this.THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();

    this.targetCameraPosition = {
      x: center.x + direction.x * distance,
      y: center.y + Math.max(direction.y * distance, 1),
      z: center.z + direction.z * distance,
    };
    this.targetControlsTarget = { x: center.x, y: center.y, z: center.z };
    this.animatingCamera = true;

    // Stop auto-rotate during zoom
    if (this.controls) {
      this.controls.autoRotate = false;
    }

    setTimeout(() => {
      this.animatingCamera = false;
    }, 1200);
  }

  /** Update dynamic shadows based on camera angle */
  private updateDynamicShadows(): void {
    if (!this.mainLight || !this.controls) return;

    const azimuth = this.controls.getAzimuthalAngle();
    const radius = 12;

    // Move light opposite to camera for better shadow definition
    this.mainLight.position.x = Math.cos(azimuth + Math.PI / 4) * radius;
    this.mainLight.position.z = Math.sin(azimuth + Math.PI / 4) * radius;
  }
}
