import { LoggerService } from '@core/services/infrastructure/logger.service';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

/**
 * HDRI Background Component
 *
 * Renders an equirectangular HDRI/panorama image as a 3D background using pure WebGL.
 * Much lighter than Three.js (~150KB saved) while providing the same visual effect.
 *
 * Features:
 * - Auto-rotation for ambient movement
 * - Touch/mouse drag for manual rotation
 * - Responsive resize handling
 * - Fade-in transition on load
 * - Subtle vignette effect
 *
 * Performance Optimizations (Industry Best Practices):
 * - LQIP Pattern: Loads 1K placeholder (~23KB) first, then swaps to 8K (~5.8MB)
 * - FPS Throttling: 30fps instead of 60fps (50% CPU reduction)
 * - IntersectionObserver: Pauses render loop when not visible
 * - Idle Detection: Pauses when no interaction for 3s (if autoRotate=false)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
 * @see https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
 */
@Component({
  selector: 'app-hdri-background',
  standalone: true,
  template: `
    <canvas
      #canvas
      class="w-full h-full block transition-opacity duration-1000"
      [class.opacity-0]="!isLoaded"
      [class.opacity-100]="isLoaded"
      [style.background-image]="backgroundImage"
    ></canvas>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      canvas {
        background-size: cover;
        background-position: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HdriBackgroundComponent implements AfterViewInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Day HDRI (default, used 6am - 6pm)
  /** Low quality placeholder for day (LQIP pattern) */
  @Input() srcLowDay = '/assets/hdri/suburban_parking_area_1k.webp';
  /** High quality day image loaded in background */
  @Input() srcHighDay = '/assets/hdri/suburban_parking_area_8k.webp';

  // Night HDRI (used 6pm - 6am)
  /** Low quality placeholder for night (LQIP pattern) */
  @Input() srcLowNight = '/assets/hdri/laufenurg_church_1k.webp';
  /** High quality night image loaded in background */
  @Input() srcHighNight = '/assets/hdri/laufenurg_church_8k.webp';

  /** @deprecated Use srcHighDay instead. Kept for backward compatibility */
  @Input() set src(value: string) {
    this.srcHighDay = value;
  }
  /** @deprecated Use srcLowDay instead */
  @Input() set srcLow(value: string) {
    this.srcLowDay = value;
  }
  /** @deprecated Use srcHighDay instead */
  @Input() set srcHigh(value: string) {
    this.srcHighDay = value;
  }

  @Input() autoRotate = true;
  @Input() rotateSpeed = 0.0006; // Moderate speed rotation
  @Input() enableInteraction = true;
  @Input() initialRotationY = 1.24; // Start showing the city in night mode

  @Output() hdriLoaded = new EventEmitter<void>();

  isLoaded = false;

  get backgroundImage(): string {
    const src = this.isNightTime() ? this.srcLowNight : this.srcLowDay;
    return `url('${src}')`;
  }

  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private animationId: number | null = null;
  private isDestroyed = false;

  // Rotation state - start at initial position (showing the star)
  private rotationY = 0.3;
  private rotationX = 0;
  // Target rotation for smooth interpolation (more "weighted" feel)
  private targetRotationY = 0.3;
  private targetRotationX = 0;
  // Smoothing factor: lower = heavier/slower movement (0.05 = very smooth, 0.2 = responsive)
  private readonly ROTATION_SMOOTHING = 0.08;
  // Drag sensitivity: lower = heavier feel (reduced from 0.005)
  private readonly DRAG_SENSITIVITY_X = 0.002;
  private readonly DRAG_SENSITIVITY_Y = 0.0012;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Performance: FPS Throttling (30fps saves 50% CPU vs 60fps)
  private readonly targetFPS = 30;
  private lastFrameTime = 0;

  // Performance: Visibility Detection (pause when not in viewport)
  private isVisible = true;
  private intersectionObserver: IntersectionObserver | null = null;

  // Performance: Idle Detection (pause when no interaction)
  private isIdle = false;
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_DELAY = 3000; // 3 seconds without interaction

  // Track if high-res texture is loaded
  private isHighResLoaded = false;

  // Shaders for equirectangular projection with vignette
  private readonly vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5;
    }
  `;

  private readonly fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float u_rotationY;
    uniform float u_rotationX;
    uniform float u_isNight; // 0.0 = day, 1.0 = night

    const float PI = 3.14159265359;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;

      // Aspect ratio correction
      float aspect = u_resolution.x / u_resolution.y;

      // Convert to normalized device coordinates centered at origin
      vec2 ndc = (uv - 0.5) * 2.0;
      ndc.x *= aspect;

      // Field of view (lower = more zoomed in)
      float fov = 0.55;

      // Create ray direction (as if inside a sphere looking out)
      vec3 dir = normalize(vec3(ndc.x * fov, ndc.y * fov, -1.0));

      // Apply Y rotation (horizontal pan)
      float cosY = cos(u_rotationY);
      float sinY = sin(u_rotationY);
      dir = vec3(
        dir.x * cosY - dir.z * sinY,
        dir.y,
        dir.x * sinY + dir.z * cosY
      );

      // Apply X rotation (vertical tilt) - limited range
      float cosX = cos(u_rotationX);
      float sinX = sin(u_rotationX);
      dir = vec3(
        dir.x,
        dir.y * cosX - dir.z * sinX,
        dir.y * sinX + dir.z * cosX
      );

      // Convert direction to equirectangular UV
      float theta = atan(dir.x, -dir.z);
      float phi = asin(clamp(dir.y, -1.0, 1.0));

      vec2 texCoord = vec2(
        theta / (2.0 * PI) + 0.5,
        0.5 - phi / PI
      );

      vec4 color = texture2D(u_texture, texCoord);

      // Time-based color grading
      if (u_isNight < 0.5) {
        // DAY: Summer warm color grading (subtle)
        color.r *= 1.04;
        color.g *= 1.01;
        color.b *= 0.96;
        // Saturation boost for vibrant summer look
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, 1.08);
      } else {
        // NIGHT: Ambient nocturnal feel (visible but moody)
        // 1. Slight brightness reduction
        color.rgb *= 0.92;

        // 2. Cool blue shift for moonlit feel
        color.r *= 0.85;
        color.g *= 0.92;
        color.b *= 1.08;

        // 3. Subtle desaturation for night feel
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, 0.85);

        // 4. Very subtle blue tint for night sky
        color.rgb = mix(color.rgb, vec3(0.15, 0.18, 0.28), 0.08);
      }

      // Subtle vignette effect for cinematic look
      vec2 vignetteUV = uv - 0.5;
      float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.25;
      color.rgb *= vignette;

      // Clamp to valid range
      color.rgb = clamp(color.rgb, 0.0, 1.0);

      gl_FragColor = color;
    }
  `;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    // Sync both actual and target rotation to initial value
    this.rotationY = this.initialRotationY;
    this.targetRotationY = this.initialRotationY;
    this.initWebGL();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.cleanup();
  }

  private initWebGL(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    // Get WebGL context
    this.gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!this.gl) {
      console.warn('[HdriBackground] WebGL not supported, falling back to CSS background');
      this.isLoaded = true;
      this.hdriLoaded.emit();
      this.cdr.markForCheck(); // FORCE UPDATE
      return;
    }

    // Setup viewport
    this.resizeCanvas();

    // Create shader program
    this.program = this.createProgram();
    if (!this.program) return;

    // Create fullscreen quad
    this.createQuad();

    // Load texture with LQIP pattern
    this.loadTextureProgressive();

    // Setup event listeners
    this.setupEventListeners();

    // Start resize observer
    this.setupResizeObserver();

    // Setup IntersectionObserver for visibility detection
    this.setupIntersectionObserver();

    // Start idle timer
    this.resetIdleTimer();
  }

  private createProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('[HdriBackground] Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[HdriBackground] Shader compile error:', this.gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  private createQuad(): void {
    if (!this.gl || !this.program) return;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * Detects if it's currently night time based on device's local time.
   * Night is defined as 6pm (18:00) to 6am (06:00).
   */
  public isNightTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }

  /**
   * Gets the appropriate HDRI sources based on time of day.
   */
  private getHdriSources(): { low: string; high: string } {
    if (this.isNightTime()) {
      return { low: this.srcLowNight, high: this.srcHighNight };
    }
    return { low: this.srcLowDay, high: this.srcHighDay };
  }

  /**
   * LQIP (Low Quality Image Placeholder) Pattern with Day/Night support.
   *
   * Loads a small 1K placeholder (~23-58KB) for instant FCP,
   * then swaps to 8K (~2.7-5.8MB) when loaded in background.
   * Automatically selects day or night HDRI based on device time.
   *
   * @see https://medium.com/@ravipatel.it/web-progressive-enhancement-with-lqip-blurred-image-loading-using-css-and-javascript-fc1043b0a9d5
   */
  private loadTextureProgressive(): void {
    if (!this.gl) return;

    // Select day or night HDRI based on current time
    const sources = this.getHdriSources();

    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // Placeholder pixel while loading
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([30, 30, 30, 255]),
    );

    // Step 1: Load low-res placeholder first (fast FCP)
    const lowResImage = new Image();
    lowResImage.crossOrigin = 'anonymous'; // Enable CORS for safety

    lowResImage.onload = () => {
      if (this.isDestroyed || !this.gl || !this.texture) return;
      this.logger.debug('[HdriBackground] Low-res loaded:', sources.low);

      this.updateTexture(lowResImage);

      // Trigger fade-in immediately with low-res
      this.isLoaded = true;
      this.hdriLoaded.emit();
      this.cdr.markForCheck(); // FORCE UPDATE
      this.startRenderLoop();
      // High-res is already loading in parallel (started below)
    };

    lowResImage.onerror = (err) => {
      console.warn(
        '[HdriBackground] Failed to load low-res, falling back to high-res:',
        sources.low,
        err,
      );
      // Fallback: load high-res directly
      this.loadHighResTexture(sources.high);
    };

    lowResImage.src = sources.low;

    // Step 2: Start loading high-res in background immediately
    this.loadHighResTexture(sources.high);
  }

  /**
   * Loads high-resolution texture in background and swaps when ready
   */
  private loadHighResTexture(highResSrc: string): void {
    const highResImage = new Image();
    highResImage.crossOrigin = 'anonymous'; // Enable CORS for safety

    highResImage.onload = () => {
      if (this.isDestroyed || !this.gl || !this.texture) return;
      this.logger.debug('[HdriBackground] High-res loaded:', highResSrc);

      this.updateTexture(highResImage);
      this.isHighResLoaded = true;

      // If render loop wasn't started (fallback case), start it now
      if (!this.isLoaded) {
        this.isLoaded = true;
        this.hdriLoaded.emit();
        this.startRenderLoop();
      }
      this.cdr.markForCheck(); // FORCE UPDATE
    };

    highResImage.onerror = (err) => {
      console.error('[HdriBackground] Failed to load high-res image:', highResSrc, err);
      // Ensure component is visible even if loading fails (shows CSS fallback)
      if (!this.isLoaded) {
        this.isLoaded = true;
        this.hdriLoaded.emit();
      }
      this.cdr.markForCheck(); // FORCE UPDATE
    };

    highResImage.src = highResSrc;
  }

  /**
   * Updates WebGL texture with new image data
   * Automatically resizes if image exceeds device's max texture size
   */
  private updateTexture(image: HTMLImageElement): void {
    if (!this.gl || !this.texture) return;

    // Get device's maximum texture size
    const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) || 4096;

    // Check if image needs to be resized
    let textureSource: HTMLImageElement | HTMLCanvasElement = image;

    if (
      image.width > maxTextureSize ||
      image.height > maxTextureSize ||
      image.width === 0 ||
      image.height === 0
    ) {
      // Skip if image has invalid dimensions
      if (image.width === 0 || image.height === 0) {
        console.warn('[HdriBackground] Image has invalid dimensions, skipping texture update');
        return;
      }

      // Resize image to fit within max texture size
      const scale = Math.min(maxTextureSize / image.width, maxTextureSize / image.height);
      const newWidth = Math.floor(image.width * scale);
      const newHeight = Math.floor(image.height * scale);

      this.logger.debug(
        `[HdriBackground] Resizing texture from ${image.width}x${image.height} to ${newWidth}x${newHeight} (max: ${maxTextureSize})`,
      );

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        textureSource = canvas;
      }
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      textureSource,
    );

    // Use linear filtering for smooth appearance
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  /**
   * Optimized Render Loop with:
   * - FPS Throttling: 30fps instead of 60fps (50% CPU reduction)
   * - Visibility Detection: Skip rendering when not visible
   * - Idle Detection: Skip rendering when idle and not auto-rotating
   * - Smooth rotation interpolation for weighted, premium feel
   *
   * @see https://thewebdev.info/2024/04/13/how-to-limit-framerate-in-three-js-to-increase-performance-requestanimationframe-with-javascript/
   */
  private startRenderLoop(): void {
    if (this.isDestroyed) return;

    const render = (currentTime: number): void => {
      if (this.isDestroyed) return;

      // Always schedule next frame to keep loop alive
      this.animationId = requestAnimationFrame(render);

      // 1. Skip if not visible (IntersectionObserver)
      if (!this.isVisible) return;

      // 2. Skip if idle and not auto-rotating (save CPU when user isn't interacting)
      if (this.isIdle && !this.autoRotate && !this.isDragging) return;

      // 3. FPS Throttling: Only render at target FPS (30fps = 33.33ms per frame)
      const deltaTime = currentTime - this.lastFrameTime;
      if (deltaTime < 1000 / this.targetFPS) return;
      this.lastFrameTime = currentTime;

      // 4. Update target rotation if auto-rotating
      if (this.autoRotate && !this.isDragging) {
        this.targetRotationY += this.rotateSpeed;
      }

      // 5. Smooth interpolation (lerp) for weighted, cadenced movement
      // This creates the "heavy" feel - rotation gradually catches up to target
      this.rotationY += (this.targetRotationY - this.rotationY) * this.ROTATION_SMOOTHING;
      this.rotationX += (this.targetRotationX - this.rotationX) * this.ROTATION_SMOOTHING;

      // 6. Render frame
      this.draw();
    };

    requestAnimationFrame(render);
  }

  private draw(): void {
    if (!this.gl || !this.program || !this.texture) return;

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.gl.clearColor(0.05, 0.05, 0.05, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.useProgram(this.program);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    const rotationYLocation = this.gl.getUniformLocation(this.program, 'u_rotationY');
    const rotationXLocation = this.gl.getUniformLocation(this.program, 'u_rotationX');
    const isNightLocation = this.gl.getUniformLocation(this.program, 'u_isNight');

    this.gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    this.gl.uniform1f(rotationYLocation, this.rotationY);
    this.gl.uniform1f(rotationXLocation, this.rotationX);
    this.gl.uniform1f(isNightLocation, this.isNightTime() ? 1.0 : 0.0);

    // Bind texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    const textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
    this.gl.uniform1i(textureLocation, 0);

    // Draw quad
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    if (this.gl) {
      this.gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.enableInteraction) return;

    // Mouse events
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    // Update target rotation (actual rotation is smoothed in render loop)
    this.targetRotationY -= deltaX * this.DRAG_SENSITIVITY_X;
    this.targetRotationX = Math.max(
      -0.5,
      Math.min(0.5, this.targetRotationX + deltaY * this.DRAG_SENSITIVITY_Y),
    );

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    // Reset idle timer on interaction
    this.resetIdleTimer();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;

    // Update target rotation (actual rotation is smoothed in render loop)
    this.targetRotationY -= deltaX * this.DRAG_SENSITIVITY_X;
    this.targetRotationX = Math.max(
      -0.5,
      Math.min(0.5, this.targetRotationX + deltaY * this.DRAG_SENSITIVITY_Y),
    );

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;

    // Reset idle timer on interaction
    this.resetIdleTimer();
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private resizeObserver: ResizeObserver | null = null;

  private setupResizeObserver(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    this.resizeObserver.observe(canvas);
  }

  /**
   * IntersectionObserver: Pause render loop when canvas is not visible
   *
   * This significantly reduces CPU usage when the HDRI is scrolled out of view.
   * @see https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
   */
  private setupIntersectionObserver(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 }, // Trigger when 10% of canvas is visible
    );

    this.intersectionObserver.observe(canvas);
  }

  /**
   * Idle Detection: Mark as idle after 3 seconds without interaction
   *
   * When idle and autoRotate=false, the render loop skips frames to save CPU.
   */
  private resetIdleTimer(): void {
    this.isIdle = false;

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = setTimeout(() => {
      this.isIdle = true;
    }, this.IDLE_DELAY);
  }

  private cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.onMouseDown);
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('mouseup', this.onMouseUp);
      canvas.removeEventListener('mouseleave', this.onMouseUp);
      canvas.removeEventListener('touchstart', this.onTouchStart);
      canvas.removeEventListener('touchmove', this.onTouchMove);
      canvas.removeEventListener('touchend', this.onTouchEnd);
    }

    // Clean up WebGL resources
    if (this.gl) {
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
    }

    this.gl = null;
    this.program = null;
    this.texture = null;
  }
}
