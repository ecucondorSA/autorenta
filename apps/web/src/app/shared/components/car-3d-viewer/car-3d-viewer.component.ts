
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-car-3d-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer-container">
      <canvas #rendererCanvas id="webgl-canvas"></canvas>

      <!-- Loading Overlay -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Cargando experiencia 3D...</p>
      </div>
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
      }

      canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
        outline: none;
      }

      .loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        z-index: 10;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class Car3dViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() src = 'assets/models/car-model.glb';
  @Input() alt = 'A 3D model of a car';
  @Input() debugMode = false;
  @Input() selectedColor: string | null | undefined;

  @ViewChild('rendererCanvas') rendererCanvas!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private carModel: THREE.Group | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Colors for mapping
  colors = [
    { name: 'Rojo', hex: '#ff0000' },
    { name: 'Azul', hex: '#0000ff' },
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#ffffff' },
    { name: 'Plata', hex: '#c0c0c0' },
    { name: 'Gris', hex: '#808080' },
    { name: 'Amarillo', hex: '#ffff00' },
    { name: 'Verde', hex: '#008000' },
  ];

  constructor(private ngZone: NgZone) { }

  ngAfterViewInit(): void {
    this.initScene();
    this.setupLights();
    this.createRoad();
    this.loadCar();
    this.startAnimationLoop();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedColor'] && !changes['selectedColor'].firstChange) {
      if (this.selectedColor) {
        this.applyColor(this.selectedColor);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initScene() {
    // 1. Scene
    this.scene = new THREE.Scene();
    // Background color (transparent or sky color if needed, but we use CSS bg mostly)
    // this.scene.background = new THREE.Color(0xa0a0a0);
    // We'll leave background transparent to let the CSS gradient show through

    // Fog for depth
    this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    // 2. Camera
    const width = this.rendererCanvas.nativeElement.clientWidth;
    const height = this.rendererCanvas.nativeElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(3, 2, 5);
    this.camera.lookAt(0, 0.5, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.rendererCanvas.nativeElement,
      antialias: true,
      alpha: true, // Transparent background
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  private setupLights() {
    // Sunset Simulation

    // Ambient Light (Warm base)
    const ambientLight = new THREE.AmbientLight(0xffe0b5, 0.5);
    this.scene.add(ambientLight);

    // Hemisphere Light (Sky vs Ground)
    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.8);
    this.scene.add(hemiLight);

    // Directional Light (Sun)
    const sunLight = new THREE.DirectionalLight(0xffaa00, 2.5);
    sunLight.position.set(-5, 5, 5);
    sunLight.castShadow = true;

    // Shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.bias = -0.0001;

    this.scene.add(sunLight);

    // Rim Light (for that premium edge glow)
    const rimLight = new THREE.SpotLight(0x4455ff, 5);
    rimLight.position.set(5, 2, -5);
    rimLight.lookAt(0, 0, 0);
    this.scene.add(rimLight);
  }

  private createRoad() {
    // Procedural Road (Gray Plane)
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Grid Helper (Optional, for tech feel)
    const grid = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    grid.position.y = 0.01; // Slightly above road
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  private loadCar() {
    const loader = new GLTFLoader();

    loader.load(
      this.src,
      (gltf) => {
        this.carModel = gltf.scene;

        // Center the model
        const box = new THREE.Box3().setFromObject(this.carModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Adjust position so it sits on the ground
        this.carModel.position.x += (this.carModel.position.x - center.x);
        this.carModel.position.y = 0; // On ground
        this.carModel.position.z += (this.carModel.position.z - center.z);

        // Scale if too big/small (normalize to ~4m length)
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 5 || maxDim < 2) {
          const scale = 4 / maxDim;
          this.carModel.scale.set(scale, scale, scale);
        }

        // Enable shadows
        this.carModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Enhance materials if needed
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
              mesh.material.envMapIntensity = 1.0;
            }
          }
        });

        this.scene.add(this.carModel);
        this.isLoading = false;

        // Apply initial color if set
        if (this.selectedColor) {
          this.applyColor(this.selectedColor);
        }
      },
      (xhr) => {
        // Progress
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('An error happened loading the car model', error);
        this.isLoading = false;
      }
    );
  }

  private startAnimationLoop() {
    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);

        if (this.carModel) {
          // Gentle rotation
          this.carModel.rotation.y += 0.002;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => {
        this.onWindowResize();
      });
    });
    this.resizeObserver.observe(this.rendererCanvas.nativeElement.parentElement!);
  }

  private onWindowResize() {
    if (!this.rendererCanvas) return;

    const parent = this.rendererCanvas.nativeElement.parentElement;
    if (parent) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  private applyColor(colorNameOrHex: string) {
    if (!this.carModel) return;

    let hexColor = colorNameOrHex;

    // Check predefined colors
    const predefined = this.colors.find(
      (c) => c.name.toLowerCase() === colorNameOrHex.toLowerCase(),
    );
    if (predefined) {
      hexColor = predefined.hex;
    }

    if (!hexColor.startsWith('#')) return;

    // Traverse model to find body paint material
    // Heuristic: usually the material with the largest surface area or specific name
    // For now, we'll try to find materials that look like car paint (StandardMaterial)

    this.carModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Simple heuristic: change all standard materials that aren't black (tires/windows)
        // This is a simplification. Ideally we'd know the material name.
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          const color = mesh.material.color;
          // If it's not very dark (tires) and not transparent (glass)
          if (color.r > 0.1 || color.g > 0.1 || color.b > 0.1) {
            if (mesh.material.opacity > 0.9) {
              mesh.material.color.set(hexColor);
            }
          }
        }
      }
    });
  }
}

