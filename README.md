# Proyecto Autorentar

Este proyecto contiene la aplicación y sus recursos.

## Optimización de Modelos 3D (.glb)

Hemos incluido un script de Python para optimizar modelos 3D en formato `.glb`, lo que es crucial para un rendimiento óptimo en dispositivos móviles. Este script aplica compresión Draco, redimensiona texturas a 1K y las convierte a formato KTX2.

### `optimize_glb.py`

**Propósito:** Optimiza archivos `.glb` para reducir el tamaño, mejorar la velocidad de carga y el rendimiento en dispositivos móviles, enfocándose en la VRAM y los Draw Calls.

**Características:**
-   **Compresión Draco:** Comprime la geometría del modelo. Se utilizan 14 bits para la posición y 10 bits para las normales.
-   **Redimensionamiento de Texturas:** Todas las texturas se redimensionan a una resolución de 1024x1024 píxeles (1K).
-   **Conversión a KTX2:** Las texturas se convierten al formato KTX2 (Basis Universal), que permite que las texturas permanezcan comprimidas en la GPU, reduciendo drásticamente el uso de VRAM y mejorando los tiempos de carga.

### Requisitos Previos

Para ejecutar el script, necesitarás tener Python instalado y las siguientes librerías:

-   `gltf-transform`: La herramienta principal para la manipulación de archivos GLTF/GLB.
-   `draco3d`: Dependencia de `gltf-transform` para la compresión Draco.
-   `ktx-parse`: Dependencia de `gltf-transform` para el formato KTX2.

Puedes instalar estas librerías usando `pip`:

```bash
pip install "gltf-transform[cli]"
```

**Nota:** La instalación de `gltf-transform[cli]` debería incluir automáticamente las dependencias necesarias para Draco y KTX2. Si tienes problemas, consulta la documentación oficial de `gltf-transform`.

### Uso

El script `optimize_glb.py` se ejecuta desde la línea de comandos, aceptando dos argumentos: la ruta al archivo `.glb` de entrada y la ruta al archivo `.glb` de salida.

```bash
python autorenta/optimize_glb.py <ruta_al_archivo_input.glb> <ruta_al_archivo_output.glb>
```

**Ejemplo:**

```bash
python autorenta/optimize_glb.py assets/coche_sin_optimizar.glb assets/coche_optimizado.glb
```

Asegúrate de que la ruta de salida especifique un archivo `.glb`. Si el directorio de salida no existe, el script intentará crearlo.

---

## Tests (Vitest)

Los tests unitarios viven principalmente en `functions/` y se ejecutan con Vitest.

### Requisitos
- Dependencias instaladas en la raíz (Vitest y plugins).

### Comandos rápidos (PNPM)
```bash
pnpm run test:unit
pnpm run test:unit:watch
pnpm run test:unit:coverage
pnpm run test:unit:ui
```

### Limpieza antes de correr tests
```bash
pnpm run test:unit:clean
```

### Notas
- Los tests usan configuración en `vitest.config.ts`.
- El reporte de cobertura es opcional y se guarda en `coverage/`.
- En CI podés usar `pnpm run test:unit:ci` para salida concisa.

### Apps/Web (Vitest + jsdom)
Para tests unitarios del frontend (Angular) con Vitest:

```bash
pnpm --dir apps/web run test:unit
pnpm --dir apps/web run test:unit:watch
pnpm --dir apps/web run test:unit:coverage
pnpm --dir apps/web run test:unit:ui
```

La configuración vive en `apps/web/vitest.config.ts` y el setup en `apps/web/src/test/vitest.setup.ts`.
