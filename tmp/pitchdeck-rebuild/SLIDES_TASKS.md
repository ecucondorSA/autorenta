# 🎨 AutoRenta Pitchdeck - Tareas de Mejora UI/UX

> Documento de tareas para mejorar cada uno de los 26 slides del pitchdeck.
> Creado: 2026-01-14

---

## 📋 Resumen de Prioridades

| Prioridad | Cantidad | Descripción |
|-----------|----------|-------------|
| 🔴 Alta | 8 slides | Problemas críticos de layout o imágenes faltantes |
| 🟡 Media | 10 slides | Mejoras de fuentes, spacing o elementos visuales |
| 🟢 Baja | 8 slides | Pulido final y detalles menores |

---

## 🔴 PRIORIDAD ALTA

### Slide 06 - Producto (Flujo 100% Digital)
**Estado**: 🟢 Completo
**Archivo**: `Slide06Producto.tsx`

**Tareas**:
- [x] ~~Reemplazar imagen genérica de auto por mockups de app~~
- [x] ~~Aumentar tamaño de fuentes (paso nombres, descripciones)~~
- [x] ~~Ajustar tamaño de imagen mockups para que no se corte~~
- [x] ~~Verificar que badges inferiores sean visibles~~
- [x] ~~Considerar reducir a 4 pasos clave en lugar de 6 (menos saturación visual)~~

---

### Slide 11 - Product Experience (Concept UI)
**Estado**: ⚠️ Necesita atención
**Archivo**: `Slide11ProductUI.tsx`

**Tareas**:
- [ ] Las imágenes placeholder dicen "PEGAR FIGMA" - reemplazar con screenshots reales
- [ ] Aumentar tamaño de cards de pantalla (180px altura es muy pequeño)
- [ ] Aumentar fuentes de labels de pantalla (10px → 14px)
- [ ] Agregar sombras más pronunciadas a las cards

---

### Slide 13 - Evidencia de Producto (En Vivo)
**Estado**: ⚠️ En progreso  
**Archivo**: `Slide13Evidencia.tsx`

**Tareas**:
- [x] ~~Reducir tamaño de device-frames para que quepan 6~~
- [x] ~~Ajustar gaps del grid~~
- [ ] Verificar que todas las imágenes de pantalla existan en `/assets/`
- [ ] Las pantallas deben mostrar contenido completo (objectFit: contain)
- [ ] Aumentar tamaño de labels bajo cada pantalla (actualmente muy pequeños)
- [ ] Centrar mejor el conector (flecha) entre pantallas

---

### Slide 21 - Demo
**Estado**: 🔴 Crítico
**Archivo**: `Slide21Demo.tsx`

**Tareas**:
- [ ] Revisar si hay video embebido o placeholder
- [ ] Agregar QR code real de la app (si existe)
- [ ] Si no hay demo, crear animación o secuencia de screenshots
- [ ] Aumentar CTAs para que sean más visibles

---

### Slide 24 - Equipo (Founders)
**Estado**: 🔴 Crítico
**Archivo**: `Slide24Equipo.tsx`

**Tareas**:
- [ ] Verificar que imágenes de founders existan (`/assets/founder-edu.jpg`, `/assets/founder-charles.jpg`)
- [ ] Si no existen, agregar fotos reales o placeholders profesionales
- [ ] Agregar links a LinkedIn (íconos)
- [ ] Considerar agregar logos de empresas anteriores
- [ ] Aumentar contraste del texto de experiencia

---

## 🟡 PRIORIDAD MEDIA

### Slide 01 - Cover
**Estado**: 🟡 Revisar
**Archivo**: `Slide01Cover.tsx`

**Tareas**:
- [ ] Verificar que imagen de fondo (`parking-lot.png`) cargue correctamente
- [ ] Aumentar glow verde para más impacto visual
- [ ] Agregar animación sutil al título (fade-in)
- [ ] Logo "AUTORENTAR" podría tener más presencia (más grande)
- [ ] Ajustar overlay del fondo (actualmente muy oscuro)

---

### Slide 02 - Gancho (El Problema)
**Estado**: 🟢 OK
**Archivo**: `Slide02Gancho.tsx`

**Tareas**:
- [ ] Aumentar tamaño de emojis (🚫 y ✓) de 80px → 100px
- [ ] Mejorar contraste de texto en listas (14px es pequeño para presentación)
- [ ] Agregar micro-animación al círculo central (flecha)

---

### Slide 03 - Problema
**Estado**: 🟡 Revisar
**Archivo**: `Slide03Problema.tsx`

**Tareas**:
- [ ] Verificar legibilidad de todo el contenido
- [ ] Aumentar fuentes si son menores a 16px
- [ ] Considerar agregar iconografía visual

---

### Slide 04 - Solución
**Estado**: 🟢 Bueno
**Archivo**: `Slide04Solucion.tsx`

**Tareas**:
- [ ] Las 3 cards de solución están bien estructuradas
- [ ] Aumentar padding interno de cards si se ve apretado
- [ ] Verificar que el color amarillo (#FFC107) tenga suficiente contraste
- [ ] Fuente de 24px para títulos de solución está bien

---

### Slide 05 - Timing
**Estado**: 🟡 Simple
**Archivo**: `Slide05Timing.tsx`

**Tareas**:
- [ ] Este slide es muy corto (1273 bytes) - probablemente necesita más contenido
- [ ] Agregar timeline visual de oportunidad de mercado
- [ ] Considerar gráfico de tendencias o datos de crecimiento

---

### Slide 07 - Mercado (TAM/SAM/SOM)
**Estado**: 🟢 Bueno
**Archivo**: `Slide07Mercado.tsx`

**Tareas**:
- [ ] Los círculos concéntricos están bien diseñados
- [ ] Verificar que fuentes de 14px sean legibles en proyección
- [ ] La cita del Marketplace podría tener más prominencia visual
- [ ] Agregar fuente/link a los datos citados

---

### Slide 08 - Failure Modes
**Estado**: 🟡 Revisar
**Archivo**: `Slide08FailureModes.tsx`

**Tareas**:
- [ ] Aumentar fuentes descriptivas
- [ ] Agregar iconografía para cada modo de falla
- [ ] Usar colores de alerta (rojo/amarillo) para riesgos

---

### Slide 09 - Economics
**Estado**: 🟡 Revisar
**Archivo**: `Slide09Economics.tsx`

**Tareas**:
- [ ] Verificar que números financieros sean grandes y claros
- [ ] Agregar gráfico visual de unit economics
- [ ] Destacar métricas clave (CAC, LTV, margen)

---

### Slide 10 - Risk Policy
**Estado**: 🟡 Revisar
**Archivo**: `Slide10RiskPolicy.tsx`

**Tareas**:
- [ ] Agregar iconografía de seguridad/confianza
- [ ] Usar badges visuales para políticas
- [ ] Aumentar jerarquía visual

---

### Slide 12 - Tecnología
**Estado**: 🟡 Simple
**Archivo**: `Slide12Tecnologia.tsx`

**Tareas**:
- [ ] Archivo muy corto (1429 bytes) - necesita más contenido
- [ ] Agregar diagrama de arquitectura técnica
- [ ] Mostrar stack tecnológico con logos (Supabase, Angular, etc.)
- [ ] Agregar métricas de infraestructura

---

### Slide 14 - GTM (Go-To-Market)
**Estado**: 🟡 Simple
**Archivo**: `Slide14GTM.tsx`

**Tareas**:
- [ ] Archivo muy corto (1137 bytes)
- [ ] Agregar funnel visual de adquisición
- [ ] Mostrar canales de marketing
- [ ] Agregar métricas de conversión objetivo

---

### Slide 15 - Validation
**Estado**: 🟡 Revisar
**Archivo**: `Slide15Validation.tsx`

**Tareas**:
- [ ] Agregar testimoniales o quotes de usuarios
- [ ] Mostrar métricas de validación con números grandes
- [ ] Considerar agregar logos de early adopters

---

### Slide 16 - Estrategia
**Estado**: 🟡 Revisar
**Archivo**: `Slide16Estrategia.tsx`

**Tareas**:
- [ ] Agregar roadmap visual o timeline
- [ ] Usar iconografía para cada fase estratégica
- [ ] Destacar hitos clave

---

### Slide 17 - Fintech
**Estado**: 🟡 Revisar
**Archivo**: `Slide17Fintech.tsx`

**Tareas**:
- [ ] Mostrar flujo de dinero visual
- [ ] Agregar logos de integraciones (MercadoPago, etc.)
- [ ] Destacar ventaja competitiva fintech

---

### Slide 18 - Visión
**Estado**: 🟡 Revisar
**Archivo**: `Slide18Vision.tsx`

**Tareas**:
- [ ] Este slide debe ser impactante visualmente
- [ ] Agregar imagen de fondo inspiracional
- [ ] Texto grande y memorable
- [ ] Considerar quote o statement final

---

### Slide 19 - KPIs / Métricas Piloto
**Estado**: 🟡 Revisar
**Archivo**: `Slide19KPIs.tsx`

**Tareas**:
- [ ] Aumentar tamaño de números clave
- [ ] Agregar indicadores visuales (gauges, progress bars)
- [ ] Usar colores para status (verde = logrado, amarillo = en progreso)

---

## 🟢 PRIORIDAD BAJA (Pulido)

### Slide 20 - Master Plan
**Estado**: 🟢 OK
**Archivo**: `Slide20MasterPlan.tsx`

**Tareas**:
- [ ] Revisar spacing general
- [ ] Verificar legibilidad de fuentes pequeñas

---

### Slide 22 - Competencia
**Estado**: 🟢 OK
**Archivo**: `Slide22Competencia.tsx`

**Tareas**:
- [ ] Agregar logos de competidores si es posible
- [ ] Verificar que tabla/matriz sea legible
- [ ] Destacar diferenciadores de AutoRenta

---

### Slide 23 - Growth
**Estado**: 🟢 OK
**Archivo**: `Slide23Growth.tsx`

**Tareas**:
- [ ] Verificar gráficos de crecimiento
- [ ] Aumentar fuentes de ejes si hay charts
- [ ] Agregar proyecciones claras

---

### Slide 25 - Crecimiento
**Estado**: 🟢 OK
**Archivo**: `Slide25Crecimiento.tsx`

**Tareas**:
- [ ] Verificar métricas de crecimiento
- [ ] Agregar indicadores visuales de tendencia

---

### Slide 26 - Inversión
**Estado**: 🟢 Bueno
**Archivo**: `Slide26Inversion.tsx`

**Tareas**:
- [ ] Este slide está bien estructurado
- [ ] Destacar más el monto de inversión (USD 500k)
- [ ] Agregar pie chart visual para uso de fondos
- [ ] El hack de WiFi fronterizo es interesante - podría tener su propia visualización

---

## 🛠️ Tareas Globales (Aplican a todos los slides)

### Fuentes
- [ ] Mínimo 16px para texto de párrafos
- [ ] Títulos principales: 48-72px
- [ ] Subtítulos: 24-32px
- [ ] Labels/captions: mínimo 14px

### Colores
- [ ] Verificar contraste de texto sobre fondos oscuros
- [ ] Usar verde (#00D084) consistentemente para highlights
- [ ] Rojo (#FF4444) solo para alertas/problemas

### Spacing
- [ ] Padding mínimo de slides: 60-80px
- [ ] Gap entre elementos: mínimo 24px
- [ ] Márgenes consistentes

### Imágenes
- [ ] Todas las imágenes deben existir en `/assets/`
- [ ] Formato preferido: WebP o PNG
- [ ] Fallbacks para imágenes faltantes

### Responsive
- [ ] Verificar en pantalla de proyector (16:9 o 4:3)
- [ ] Modo presentación sin scroll

---

## 📁 Assets Necesarios

| Asset | Estado | Ubicación |
|-------|--------|-----------|
| `parking-lot.png` | ✅ Existe | `/assets/` |
| `app-mockups.png` | ✅ Generado | `/assets/` |
| `founder-edu.jpg` | ❓ Verificar | `/assets/` |
| `founder-charles.jpg` | ❓ Verificar | `/assets/` |
| Screenshots de app | ❓ Varios | `/assets/product-experience/` |
| Logos competidores | ❌ Faltante | `/assets/logos/` |
| Diagrama arquitectura | ❌ Faltante | `/assets/` |
| QR de demo | ❌ Faltante | `/assets/` |

---

## 🚀 Próximos Pasos

1. **Fase 1**: Corregir slides 🔴 Alta prioridad
2. **Fase 2**: Mejorar slides 🟡 Media prioridad  
3. **Fase 3**: Pulir slides 🟢 Baja prioridad
4. **Fase 4**: Testing en modo presentación
5. **Fase 5**: Exportar a PDF

---

*Última actualización: 2026-01-14 21:21*
