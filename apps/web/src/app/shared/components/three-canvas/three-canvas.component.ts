import { Component, ElementRef, OnDestroy, OnInit, ViewChild, HostListener } from '@angular/core';
import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import AsciiEffect from '../../three/effects/ascii-effect';

@Component({
  selector: 'app-three-canvas',
  standalone: true,
  templateUrl: './three-canvas.component.html',
  styles: [':host { display: block; width: 100%; height: 100%; }'],
})
export class ThreeCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private asciiEffect!: AsciiEffect;
  private rafId = 0;
  private clock = new THREE.Clock();

  ngOnInit(): void {
    const el = this.container.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // composer + passes
    // Note: EffectComposer expects the renderer in the constructor in many postprocessing versions
    // We assume postprocessing exports EffectComposer compatible with this usage.
    // If your postprocessing version differs, adapt accordingly.
    // @ts-ignore: some versions export different types
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.asciiEffect = new AsciiEffect({
      cellSize: 6,
      invert: true,
      colorMode: true,
      resolution: new THREE.Vector2(el.clientWidth, el.clientHeight),
    });

    const effectPass = new EffectPass(this.camera, this.asciiEffect);
    this.composer.addPass(effectPass);

    this.onResize();
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer.dispose();
    // composer and passes may expose dispose methods in your version of postprocessing
  }

  private animate = () => {
    const dt = this.clock.getDelta();
    this.asciiEffect.addTime(dt);
    // render via composer
    // composer.render can accept delta in some versions; fallback to render()
    if (typeof (this.composer as any).render === 'function') {
      try {
        (this.composer as any).render(dt);
      } catch (_) {
        this.composer.render();
      }
    }
    this.rafId = requestAnimationFrame(this.animate);
  };

  @HostListener('window:resize')
  onResize() {
    const el = this.container?.nativeElement;
    if (!el) return;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.asciiEffect.setResolution(new THREE.Vector2(w, h));
  }
}
