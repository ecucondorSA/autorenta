import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
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
 */
@Component({
  selector: 'app-hdri-background',
  standalone: true,
  template: `<canvas #canvas class="w-full h-full block transition-opacity duration-1000" [class.opacity-0]="!isLoaded" [class.opacity-100]="isLoaded"></canvas>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HdriBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() src = 'assets/hdri/suburban_parking_area_8k.webp';
  @Input() autoRotate = true;
  @Input() rotateSpeed = 0.0002; // Slower for premium feel
  @Input() enableInteraction = true;
  @Input() initialRotationY = -0.5; // Start showing the cars

  @Output() hdriLoaded = new EventEmitter<void>();

  isLoaded = false;

  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private animationId: number | null = null;
  private isDestroyed = false;

  // Rotation state - start at initial position
  private rotationY = -0.5;
  private rotationX = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

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

    const float PI = 3.14159265359;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;

      // Aspect ratio correction
      float aspect = u_resolution.x / u_resolution.y;

      // Convert to normalized device coordinates centered at origin
      vec2 ndc = (uv - 0.5) * 2.0;
      ndc.x *= aspect;

      // Field of view (lower = more zoomed in)
      float fov = 0.7;

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

      // Summer warm color grading (subtle)
      // Slightly boost warm tones
      color.r *= 1.04;
      color.g *= 1.01;
      // Slightly reduce blue for warmer feel
      color.b *= 0.96;

      // Subtle saturation boost for vibrant summer look
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, 1.08);

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
    this.rotationY = this.initialRotationY;
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
      console.warn('[HdriBackground] WebGL not supported');
      return;
    }

    // Setup viewport
    this.resizeCanvas();

    // Create shader program
    this.program = this.createProgram();
    if (!this.program) return;

    // Create fullscreen quad
    this.createQuad();

    // Load texture
    this.loadTexture();

    // Setup event listeners
    this.setupEventListeners();

    // Start resize observer
    this.setupResizeObserver();
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

  private loadTexture(): void {
    if (!this.gl) return;

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

    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (this.isDestroyed || !this.gl || !this.texture) return;

      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

      // Use linear filtering for smooth appearance
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      // Trigger fade-in
      this.isLoaded = true;
      this.hdriLoaded.emit();
      this.startRenderLoop();
    };

    image.onerror = () => {
      console.error('[HdriBackground] Failed to load image:', this.src);
    };

    image.src = this.src;
  }

  private startRenderLoop(): void {
    if (this.isDestroyed) return;

    const render = (): void => {
      if (this.isDestroyed) return;

      if (this.autoRotate && !this.isDragging) {
        this.rotationY += this.rotateSpeed;
      }

      this.draw();
      this.animationId = requestAnimationFrame(render);
    };

    render();
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

    this.gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    this.gl.uniform1f(rotationYLocation, this.rotationY);
    this.gl.uniform1f(rotationXLocation, this.rotationX);

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

    this.rotationY -= deltaX * 0.005;
    this.rotationX = Math.max(-0.5, Math.min(0.5, this.rotationX + deltaY * 0.003));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
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

    this.rotationY -= deltaX * 0.005;
    this.rotationX = Math.max(-0.5, Math.min(0.5, this.rotationX + deltaY * 0.003));

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
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

  private cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
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
