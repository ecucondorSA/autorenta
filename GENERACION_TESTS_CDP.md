# 🎯 Generación de Tests con Chrome CDP - Guía Rápida

## 🚀 Comando Principal

```bash
npm run generar:tests
```

Este comando te permite **crear tests automáticamente** navegando por tu aplicación con Chrome en vivo.

## 📋 Requisitos Previos

1. **Chrome CDP corriendo**:
   ```bash
   npm run depurar:chrome
   ```

2. **Servidor de desarrollo activo**:
   ```bash
   npm run dev:web
   ```

## 🎬 Cómo Funciona

1. **Ejecutas**: `npm run generar:tests`
2. **Seleccionas** tipo de test:
   - Flujo completo (publicar → reservar → pagar)
   - Componente específico (formulario, modal)
   - Navegación (menú, links)
   - Personalizado

3. **Se abre Chrome** conectado a tu app
4. **Navegas normalmente** - Playwright graba todo
5. **Cierras Chrome** - Se genera el archivo `.spec.ts`

## 🎯 Ejemplo de Uso

```bash
$ npm run generar:tests

🎯 ¿Qué tipo de test quieres generar?
1. Test de flujo completo
2. Test de componente específico  
3. Test de navegación
4. Test personalizado

Selecciona una opción (1-4): 1

🎬 Iniciando generación de test...
📁 Archivo: tests/generados/flujo-completo-20241114-083000.spec.ts

# [Se abre Chrome - navegas por la app]
# [Al cerrar Chrome - se genera el test]

✅ Test generado exitosamente!
```

## 📁 Archivos Generados

Los tests se guardan en `tests/generados/` con nombres descriptivos:

```
tests/generados/
├── flujo-completo-20241114-083000.spec.ts
├── formulario-publicar-20241114-084500.spec.ts  
├── navegacion-20241114-090000.spec.ts
└── reserva-auto-20241114-091500.spec.ts
```

## 🛠️ Comandos Complementarios

```bash
# Generar tests (versión simple)
npm run generar:tests:simple

# Ejecutar tests generados
npm run tests:cdp

# Ejecutar con interfaz visual
npm run tests:cdp:ui

# Depurar Chrome
npm run depurar:chrome

# Flujo completo de depuración  
npm run depurar:cdp
```

## 💡 Consejos para Mejor Generación

### ✅ Haz Esto
- 🐌 **Navega despacio** - mejores selectores
- 📝 **Usa nombres descriptivos** - fácil mantenimiento
- ✅ **Incluye verificaciones** - tests más robustos
- 🎯 **Enfócate en un flujo** - tests más claros

### ❌ Evita Esto
- ⚡ Hacer clic muy rápido
- 🔢 Usar elementos con IDs únicos
- 📅 Elementos con fechas/timestamps
- 📏 Tests muy largos (>20 acciones)

## 🎮 Flujos Comunes

### Publicar Auto
1. Ir a `/publicar`
2. Llenar marca, modelo, año
3. Subir fotos
4. Establecer precio
5. Publicar
6. Verificar éxito

### Reservar Auto  
1. Buscar autos
2. Seleccionar auto
3. Elegir fechas
4. Procesar pago
5. Confirmar reserva

### Test de Componente
1. Abrir modal/dropdown
2. Interactuar con elementos
3. Verificar comportamiento
4. Cerrar componente

## 🚨 Solución Rápida de Problemas

**Chrome no responde:**
```bash
pkill -f chrome
npm run depurar:chrome
```

**Servidor no disponible:**
```bash
npm run dev:web
```

**Test generado no funciona:**
```bash
npx playwright test mi-test.spec.ts --debug
```

## 🎉 ¡Listo!

Ahora puedes crear tests simplemente navegando tu aplicación. 

**Comando para empezar:**
```bash
npm run generar:tests
```

**Documentación completa:** `docs/DEPURACION.md`