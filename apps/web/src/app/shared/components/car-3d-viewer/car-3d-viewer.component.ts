
import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

@Component({
  selector: 'app-car-3d-viewer',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="viewer-container">
      <model-viewer
        [attr.src]="src"
        [attr.alt]="alt"
        (load)="handleModelLoad($event)"
        auto-rotate
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        shadow-softness="1"
        exposure="1"
        environment-image="neutral"
        loading="lazy"
        interaction-prompt="auto"
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-orbit="45deg 75deg 2.5m"
        field-of-view="45deg"
        min-camera-orbit="30deg 30deg 1.5m"
        max-camera-orbit="70deg 80deg 3m"
        min-field-of-view="auto"
        max-field-of-view="auto"
        interpolation-decay="200"
      >
        <!-- Hotspot: Engine/Hood -->
        <button
          class="hotspot"
          slot="hotspot-engine"
          [attr.data-position]="
            hotspots.engine.x + 'm ' + hotspots.engine.y + 'm ' + hotspots.engine.z + 'm'
          "
          data-normal="0m 1m 0m"
          data-visibility-attribute="visible"
        >
          <div class="hotspot-annotation">Motor V8 Turbo</div>
        </button>

        <!-- Hotspot: Trunk/Cargo -->
        <button
          class="hotspot"
          slot="hotspot-cargo"
          [attr.data-position]="
            hotspots.cargo.x + 'm ' + hotspots.cargo.y + 'm ' + hotspots.cargo.z + 'm'
          "
          data-normal="0m 1m 0m"
          data-visibility-attribute="visible"
        >
          <div class="hotspot-annotation">Gran Capacidad</div>
        </button>

        <div class="progress-bar hide" slot="progress-bar">
          <div class="update-bar"></div>
        </div>

        <!-- Color Picker Controls -->
        <div class="controls">
          <div class="color-picker">
            <button
              *ngFor="let color of colors"
              class="color-btn"
              [style.background-color]="color.hex"
              [title]="color.name"
              (click)="changeColor(color.hex)"
            ></button>
          </div>
        </div>
      </model-viewer>

      <!-- Debug Controls -->
      <div class="debug-panel" *ngIf="debugMode">
        <h3>🔧 Ajuste de Hotspots</h3>

        <div class="hotspot-controls">
          <h4>🚗 Motor (Engine)</h4>
          <div class="slider-group">
            <label>X: {{ hotspots.engine.x }}</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              [value]="hotspots.engine.x"
              (input)="updateHotspot('engine', 'x', +$any($event.target).value)"
            />
          </div>
          <div class="slider-group">
            <label>Y: {{ hotspots.engine.y }}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              [value]="hotspots.engine.y"
              (input)="updateHotspot('engine', 'y', +$any($event.target).value)"
            />
          </div>
          <div class="slider-group">
            <label>Z: {{ hotspots.engine.z }}</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              [value]="hotspots.engine.z"
              (input)="updateHotspot('engine', 'z', +$any($event.target).value)"
            />
          </div>
          <button class="copy-btn" (click)="copyCoordinates('engine')">
            📋 Copiar Coordenadas
          </button>
        </div>

        <div class="hotspot-controls">
          <h4>📦 Capacidad (Cargo)</h4>
          <div class="slider-group">
            <label>X: {{ hotspots.cargo.x }}</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              [value]="hotspots.cargo.x"
              (input)="updateHotspot('cargo', 'x', +$any($event.target).value)"
            />
          </div>
          <div class="slider-group">
            <label>Y: {{ hotspots.cargo.y }}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              [value]="hotspots.cargo.y"
              (input)="updateHotspot('cargo', 'y', +$any($event.target).value)"
            />
          </div>
          <div class="slider-group">
            <label>Z: {{ hotspots.cargo.z }}</label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              [value]="hotspots.cargo.z"
              (input)="updateHotspot('cargo', 'z', +$any($event.target).value)"
            />
          </div>
          <button class="copy-btn" (click)="copyCoordinates('cargo')">📋 Copiar Coordenadas</button>
        </div>
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
        min-height: 300px;
        position: relative;
        background: transparent;
        /* border-radius: 1rem; removed for floating effect */
        /* overflow: hidden; removed for floating effect */
      }

      model-viewer {
        width: 100%;
        height: 100%;
        --poster-color: transparent;
      }

      /* Hotspot Styles */
      .hotspot {
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 10px;
        border: none;
        background-color: rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
        position: relative;
        cursor: pointer;
        transition: transform 0.3s;
      }

      .hotspot:not([data-visible]) {
        background: transparent;
        border: 4px solid #fff;
        box-shadow: none;
        height: 32px;
        pointer-events: none;
        width: 32px;
      }

      .hotspot:focus {
        border: 4px solid rgb(0, 128, 200);
        height: 32px;
        outline: none;
        width: 32px;
      }

      .hotspot > * {
        opacity: 1;
        transform: translateY(-50%);
      }

      .hotspot-annotation {
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
        color: rgba(0, 0, 0, 0.8);
        display: block;
        font-family:
          Futura,
          Helvetica Neue,
          sans-serif;
        font-size: 14px;
        font-weight: 700;
        left: calc(100% + 1em);
        max-width: 128px;
        padding: 0.5em 1em;
        position: absolute;
        top: 50%;
        width: max-content;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      .hotspot:hover .hotspot-annotation,
      .hotspot:focus .hotspot-annotation {
        opacity: 1;
        pointer-events: auto;
      }

      /* Color Picker Styles */
      .controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 10px 15px;
        border-radius: 30px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(5px);
        z-index: 100;
      }

      .color-picker {
        display: flex;
        gap: 10px;
      }

      .color-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        padding: 0;
      }

      .color-btn:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .color-btn:active {
        transform: scale(0.95);
      }

      /* Debug Panel Styles */
      .debug-panel {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.95);
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        max-width: 300px;
        max-height: 90%;
        overflow-y: auto;
        z-index: 1000;
      }

      .debug-panel h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: 700;
        color: #333;
      }

      .hotspot-controls {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .hotspot-controls:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .hotspot-controls h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: #555;
      }

      .slider-group {
        margin-bottom: 10px;
      }

      .slider-group label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: #666;
        margin-bottom: 5px;
      }

      .slider-group input[type='range'] {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #4caf50, #2196f3);
        outline: none;
        -webkit-appearance: none;
      }

      .slider-group input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #2196f3;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .slider-group input[type='range']::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #2196f3;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .copy-btn {
        width: 100%;
        padding: 8px 12px;
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        margin-top: 5px;
      }

      .copy-btn:hover {
        background: #45a049;
      }

      .copy-btn:active {
        transform: scale(0.98);
      }
    `,
  ],
})
export class Car3dViewerComponent {
  @Input() src = 'assets/models/car-model.glb';
  @Input() alt = 'A 3D model of a car';
  @Input() debugMode = false; // Enable debug controls

  colors = [
    { name: 'Rojo', hex: '#ff0000' },
    { name: 'Azul', hex: '#0000ff' },
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#ffffff' },
    { name: 'Plata', hex: '#c0c0c0' },
  ];

  // Hotspot positions for debugging
  hotspots = {
    engine: { x: 0, y: 0.85, z: 1.2 },
    cargo: { x: 0, y: 0.9, z: -1.5 },
  };

  handleModelLoad(_event: Event) {
    // Model loaded
  }

  changeColor(colorHex: string) {
    const modelViewer = document.querySelector('model-viewer') as HTMLElement & { model: { materials: Array<{ name: string; pbrMetallicRoughness: { setBaseColorFactor: (hex: string) => void } }> } };
    if (!modelViewer || !modelViewer.model) return;

    // Material name identified via inspection script
    const targetMaterialName = 'tripo_node_a41145e0-39be-4e18-8be5-4aba2aff666d_material.001';

    const paintMaterial = modelViewer.model.materials.find(
      (mat: { name: string }) => mat.name === targetMaterialName,
    );

    if (paintMaterial) {
      paintMaterial.pbrMetallicRoughness.setBaseColorFactor(colorHex);
    } else {
      // Fallback: try to find the first material if exact match fails
      if (modelViewer.model.materials.length > 0) {
        modelViewer.model.materials[0].pbrMetallicRoughness.setBaseColorFactor(colorHex);
      }
    }
  }

  updateHotspot(hotspotName: 'engine' | 'cargo', axis: 'x' | 'y' | 'z', value: number) {
    this.hotspots[hotspotName][axis] = value;
    const modelViewer = document.querySelector('model-viewer') as HTMLElement & { querySelector: (s: string) => HTMLElement | null };
    const hotspot = modelViewer?.querySelector(`[slot="hotspot-${hotspotName}"]`);
    if (hotspot) {
      const pos = this.hotspots[hotspotName];
      hotspot.setAttribute('data-position', `${pos.x}m ${pos.y}m ${pos.z}m`);
    }
  }

  copyCoordinates(hotspotName: 'engine' | 'cargo') {
    const pos = this.hotspots[hotspotName];
    const coords = `${pos.x}m ${pos.y}m ${pos.z}m`;
    navigator.clipboard.writeText(coords);
    console.log(`Coordenadas copiadas para ${hotspotName}:`, coords);
    alert(`Coordenadas copiadas: ${coords}`);
  }
}
