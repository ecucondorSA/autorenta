# 🎨 Guía de Proyección de Texturas en Car 3D Viewer

## ✅ Implementación Completa

Se ha implementado un sistema **GRATUITO** de proyección de texturas fotográficas sobre modelos 3D GLB usando `three-projected-material`.

---

## 📦 Dependencias Instaladas

```bash
npm install three-projected-material
```

**Estado:** ✅ Instalado correctamente

---

## 🔧 Componente Modificado

**Archivo:** `apps/web/src/app/shared/components/car-3d-viewer/car-3d-viewer.component.ts`

### Nuevas Características

1. **Input de Archivo:** Botón "📷 Aplicar Textura" para subir imágenes
2. **Proyección de Textura:** Sistema de proyección desde cámara virtual
3. **Limpiar Textura:** Botón para restaurar materiales originales
4. **Actualización en Tiempo Real:** Texturas se actualizan en cada frame

---

## 🚀 Cómo Usar

### 1. En la UI

El componente ya tiene controles integrados:

```html
<app-car-3d-viewer
  src="assets/models/car-3d-model.glb"
  [selectedColor]="selectedCar()?.color"
  alt="Featured Car 3D Model">
</app-car-3d-viewer>
```

### 2. Pasos para el Usuario

1. **Abrir la página:** Navega a Marketplace V2 (donde está el visor 3D)
2. **Clic en "📷 Aplicar Textura"** (botón en la esquina superior derecha)
3. **Seleccionar imagen:** Elige la foto del auto azul u otra textura
4. **Ver resultado:** La textura se proyecta automáticamente sobre el modelo
5. **Limpiar (opcional):** Clic en "✕ Limpiar" para restaurar el modelo original

---

## 🎯 Cómo Funciona

### Proyección de Textura

```typescript
// Cámara virtual que actúa como "proyector"
this.projectionCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
this.projectionCamera.position.set(3, 2, 5);
this.projectionCamera.lookAt(0, 0.5, 0);

// Material proyectado
const projectedMaterial = new ProjectedMaterial({
  camera: this.projectionCamera,
  texture: texture,
  color: 0xffffff,
  textureScale: 1.0,
});
```

### Actualización por Frame

```typescript
// En el loop de animación
if (this.hasProjectedTexture && this.projectionCamera) {
  this.carModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material && 'project' in mesh.material) {
        (mesh.material as any).project(this.projectionCamera);
      }
    }
  });
}
```

---

## 📐 Ajustes Disponibles

### Posición de la Cámara de Proyección

Puedes ajustar desde dónde se proyecta la textura modificando:

```typescript
// Línea 441 en car-3d-viewer.component.ts
this.projectionCamera.position.set(3, 2, 5); // x, y, z
this.projectionCamera.lookAt(0, 0.5, 0);     // target
```

### Escala de Textura

```typescript
// Línea 465
textureScale: 1.0,  // Aumentar para zoom out, reducir para zoom in
```

---

## 🧪 Prueba con tu Imagen

### Imagen del Auto Azul Mercedes

Usa la imagen que me enviaste:

1. Guárdala como `blue-mercedes.jpg`
2. Sube usando el botón en el visor
3. La textura se proyectará sobre el modelo GLB

### Resultados Esperados

- ✅ La imagen se mapea sobre la geometría del auto
- ✅ Rotación del modelo mantiene la proyección actualizada
- ✅ Puedes limpiar y volver a aplicar texturas diferentes

---

## 🔍 Limitaciones

1. **UV Mapping:** El modelo GLB debe tener coordenadas UV correctas
2. **Proyección:** Es una proyección planar, no wrap completo 360°
3. **Sin IA Generativa:** No genera texturas desde descripción (solo aplica imágenes)

---

## 🎨 Mejoras Futuras (Opcionales)

### Para IA Generativa

Si quieres generar texturas con IA, necesitarías integrar:

- **Tripo AI API** ($)
- **Meshy AI API** ($16-20/mes)
- **Stable Diffusion** (requiere Blender)

---

## ✅ Estado de Implementación

- [x] Instalar `three-projected-material`
- [x] Modificar componente car-3d-viewer
- [x] Agregar UI controls (botones)
- [x] Implementar lógica de proyección
- [x] Actualización en tiempo real
- [x] Sistema de limpieza/restauración
- [x] Verificación TypeScript (sin errores)

---

## 🎬 Siguiente Paso

**¡Pruébalo ahora!**

1. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev:web
   ```

2. Navega a la página Marketplace V2

3. Usa el botón "📷 Aplicar Textura" y sube tu imagen del Mercedes azul

4. Observa cómo se proyecta sobre el modelo 3D

---

## 📚 Referencias

- [three-projected-material GitHub](https://github.com/marcofugaro/three-projected-material)
- [Playing with Texture Projection in Three.js](https://tympanus.net/codrops/2020/01/07/playing-with-texture-projection-in-three-js/)
- [Three.js Texture Mapping](https://discoverthreejs.com/book/first-steps/textures-intro/)

---

**Implementado por:** Claude Code
**Fecha:** 2025-11-23
**Costo:** $0 (solución 100% gratuita)
