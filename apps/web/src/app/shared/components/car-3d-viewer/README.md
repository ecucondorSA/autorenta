# Car 3D Viewer Component

Componente Angular standalone para visualizar modelos 3D de autos con Three.js.

## 📋 Instalación

El componente ya está en:
```
apps/web/src/app/shared/components/car-3d-viewer/
```

## 🚀 Uso

### Importar el componente

```typescript
import { Car3dViewerComponent } from '@app/shared/components/car-3d-viewer';

@Component({
  selector: 'app-car-showcase',
  standalone: true,
  imports: [Car3dViewerComponent],
  template: `
    <app-car-3d-viewer
      [modelPath]="'assets/models/car-3d-model-pbr-optimized.glb'"
      [showControls]="true"
      [autoRotate]="true"
    ></app-car-3d-viewer>
  `,
  styles: [`
    app-car-3d-viewer {
      display: block;
      width: 100%;
      height: 600px;
    }
  `]
})
export class CarShowcaseComponent {}
```

## 📝 Props

| Prop | Tipo | Por Defecto | Descripción |
|------|------|-----------|-----------|
| `modelPath` | string | `'assets/models/car-3d-model-pbr-optimized.glb'` | Ruta del archivo GLB |
| `showControls` | boolean | `true` | Mostrar selector de colores |
| `autoRotate` | boolean | `true` | Rotación automática |

## 🎨 Características

✅ Visualización 3D con Three.js
✅ Selector de colores (Rojo, Azul, Blanco, Negro)
✅ Controles interactivos (Rotación, Zoom, Panorámica)
✅ Responsive design
✅ Loading animation
✅ Error handling
✅ OnDestroy cleanup

## 🔧 Requisitos

- Angular 15+
- Three.js
- @types/three

## 📦 Instalación de dependencias

```bash
pnpm add three
pnpm add --save-dev @types/three
```

Si usted tiene trouble con tres, puede instalar desde npm:

```bash
npm install three
```

## 💻 Controles

- **Rotar**: Click + Drag
- **Zoom**: Scroll del ratón
- **Panorámica**: Click izquierdo + Drag
- **Reset**: Doble click

## 📍 Ubicación del Archivo 3D

```
apps/web/src/assets/models/car-3d-model-pbr-optimized.glb
```

## 🎯 Ejemplo de Uso Completo

```typescript
import { Component } from '@angular/core';
import { Car3dViewerComponent } from '@app/shared/components/car-3d-viewer';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [Car3dViewerComponent],
  template: `
    <div class="car-detail-page">
      <h1>{{ carName }}</h1>

      <div class="car-viewer">
        <app-car-3d-viewer
          [modelPath]="carModel"
          [showControls]="true"
          [autoRotate]="true"
        ></app-car-3d-viewer>
      </div>

      <div class="car-info">
        <p>{{ carDescription }}</p>
      </div>
    </div>
  `,
  styles: [`
    .car-detail-page {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 30px;
      padding: 30px;
    }

    .car-viewer {
      height: 600px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .car-info {
      padding: 20px;
    }

    @media (max-width: 768px) {
      .car-detail-page {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CarDetailComponent {
  carName = 'Auto Premium 3D';
  carModel = 'assets/models/car-3d-model-pbr-optimized.glb';
  carDescription = 'Modelo 3D optimizado con compresión Draco...';
}
```

## 🔍 Debugging

Puedes ver los logs de carga en la consola del navegador:
```javascript
// En consola del navegador
console.log('Cargando modelo...');
// Verás el porcentaje de carga
```

## 📚 Referencias

- Three.js: https://threejs.org/
- GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- OrbitControls: https://threejs.org/docs/#examples/en/controls/OrbitControls

---

Creado para: Autorenta
Fecha: 2025-11-24
