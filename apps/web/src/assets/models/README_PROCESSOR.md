# Procesador de Modelos 3D Blender

Script Python avanzado para procesar y optimizar modelos GLB del auto con Blender.

## 📋 Funcionalidades

### ✓ Optimización de Malla
- Reducción de polígonos (decimation)
- Limpiar vértices duplicados
- Remover geometría sin utilizar
- Aplicar smooth shading automático

### ✓ Configuración de Materiales PBR
- Setup automático de shaders Principled BSDF
- Configuración de metallic y roughness
- Preparado para texturas en tiempo real

### ✓ Optimización de Texturas
- Redimensionamiento automático a máximo 2048px
- Conversión a formato WebP
- Compresión Draco para GLB

### ✓ Exportación
- **GLB** (glTF 2.0 binary) - Óptimo para web
- **FBX** - Compatible con engines
- Compresión automática

---

## 🚀 Uso

### Opción 1: Ejecutar desde Terminal (Recomendado)

```bash
cd /home/edu/autorenta/apps/web/src/assets/models
./run_processor.sh
```

**Ventajas:**
- No requiere interfaz gráfica
- Más rápido
- Ideal para CI/CD

### Opción 2: Ejecutar en Blender UI

1. Abre Blender:
```bash
blender
```

2. Ve a **Scripting** (arriba en Blender)

3. Abre el archivo:
   - File → Open Text Block
   - Selecciona `process_car_model.py`

4. Click en **Play** (o Ctrl+Alt+P)

5. Revisa la consola para ver el progreso

### Opción 3: Ejecutar con Blender CLI Personalizado

```bash
blender --background --python /home/edu/autorenta/apps/web/src/assets/models/process_car_model.py
```

---

## ⚙️ Personalización

Edita `process_car_model.py` para cambiar parámetros:

```python
# Reducción de polígonos (0.0-1.0)
self.optimize_mesh(decimation_ratio=0.8)  # Mantener 80%

# Resolución máxima de texturas
self.optimize_texture_resolution(max_resolution=2048)

# Formatos de exportación
processor.process(export_formats=['glb', 'fbx'])
```

---

## 📊 Estadísticas

El script muestra antes y después:

```
Estadísticas iniciales:
  Vértices: 2,345,678
  Caras: 1,234,567
  Objetos: 12
  Materiales: 8

Estadísticas finales:
  Vértices: 1,876,542  (↓ 20% compresión)
  Caras: 987,654
```

---

## 📦 Archivos Generados

Después del procesamiento encontrarás:

- `car-model-optimized.glb` - Modelo GLB optimizado
- `car-model-optimized.fbx` - Modelo FBX
- Historial de backups

---

## 🔧 Troubleshooting

### Error: "glTF add-on not enabled"
```bash
blender --background --python-expr "import bpy; bpy.ops.preferences.addon_enable(module='io_scene_gltf2')"
```

### Proceso lento
- Reduce `decimation_ratio` (ej: 0.5 en lugar de 0.8)
- Desactiva `setup_pbr=True` si no lo necesitas

### Archivos muy grandes
- Aumenta compresión Draco en el código
- Reduce resolución de texturas (max_resolution=1024)

---

## 📝 Notas

- El script preserva el archivo original
- Los cambios se exportan en `*-optimized.glb`
- Compatible con Blender 4.x y 5.x

---

## 🎯 Próximos Pasos

Después de procesar:

1. Verifica que el modelo se ve bien en Blender
2. Prueba en tu aplicación web (Three.js, Babylon.js, etc.)
3. Ajusta decimation_ratio si es necesario

---

Creado para: Autorenta 3D Car Models
Última actualización: 2025-11-24
