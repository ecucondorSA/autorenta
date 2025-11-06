# 🚗 GUÍA DE USUARIO - AUTORENTA PREMIUM

## 🎉 EXPERIENCIA COMPLETA IMPLEMENTADA

---

## 🌐 PÁGINAS DISPONIBLES

### 1. **Explore Page** ⭐ (RECOMENDADA)
**URL:** https://autorenta-web.pages.dev/explore

#### ✨ Características:
- 🗺️ Mapa fullscreen con dark theme
- 📍 14+ markers premium estilo Airbnb
- 🎠 Carousel bottom con scroll suave
- 🔍 Filtros completos (precio, tipo, combustible)
- 📱 Mobile optimizado

#### 🎯 Cómo usar:
1. **Ver autos en el mapa:** Los markers muestran foto + precio
2. **Click en marker:**
   - Primer click: Carousel hace scroll + highlight verde
   - Segundo click: Navega al detalle del auto
3. **Click en card del carousel:**
   - Primer click: Mapa hace zoom al auto
   - Segundo click: Navega al detalle
4. **Buscar:** Input superior para filtrar por marca/modelo/ciudad
5. **Filtros:** Click en botón "⚙️" para abrir panel
6. **Centrar:** Click en "📍" para volver a tu ubicación

---

### 2. **Cars List Page**
**URL:** https://autorenta-web.pages.dev/cars/list

#### ✨ Características:
- 🗺️ Mapa lateral (desktop) o superior (mobile)
- 🎠 Carousel horizontal con autos cercanos
- 📊 Ordenamiento (distancia, precio, rating)
- 🔍 Filtros avanzados

#### 🎯 Cómo usar:
1. **Ordenar:** Dropdown superior (distancia, precio, rating)
2. **Ver en mapa:** Click en marker
3. **Ver en carousel:** Scroll horizontal
4. **Detalles:** Click en card para ver más

---

## 🎨 DISEÑO Y UX

### **Markers Premium (Estilo Airbnb)**

#### Apariencia:
```
┌─────────────────┐
│ [foto] $35/día  │
└─────────────────┘
```

- **Foto:** Circular 32x32px del auto
- **Precio:** Formato moneda local
- **Hover:** Agranda y sombra más fuerte
- **Active:** Fondo oscuro
- **Click:** Bounce animation

#### Estados:
- 🟢 **Normal:** Blanco con border sutil
- 🔵 **Hover:** Scale 1.1 + shadow
- ⚫ **Selected:** Fondo oscuro (#222)

---

### **Carousel Bottom**

#### Desktop (320px):
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  [Foto Auto] │  │  [Foto Auto] │  │  [Foto Auto] │
│              │  │              │  │              │
│  Precio      │  │  Precio      │  │  Precio      │
└──────────────┘  └──────────────┘  └──────────────┘
```

#### Mobile (290px):
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ [Foto]  │  │ [Foto]  │  │ [Foto]  │
│         │  │         │  │         │
│ Precio  │  │ Precio  │  │ Precio  │
└─────────┘  └─────────┘  └─────────┘
```

#### Interacciones:
- 👆 **Click:** Selecciona + fly-to mapa
- 👆👆 **Doble click:** Navega a detalle
- 🟢 **Selected:** Border verde + shadow
- ⚡ **Highlight:** Pulse verde 1.5s

---

## 🔄 FLUJOS DE INTERACCIÓN

### **Flujo 1: Explorar desde Mapa**
```
Usuario ve mapa
   ↓
Click en marker
   ↓
Carousel hace scroll + highlight verde
   ↓
Usuario confirma (segundo click)
   ↓
Navega a /cars/detail/:id
```

### **Flujo 2: Explorar desde Carousel**
```
Usuario ve carousel
   ↓
Click en card
   ↓
Mapa hace fly-to + zoom
   ↓
Usuario confirma (segundo click)
   ↓
Navega a /cars/detail/:id
```

### **Flujo 3: Filtrar Autos**
```
Usuario abre filtros
   ↓
Selecciona precio, tipo, combustible
   ↓
Mapa actualiza markers
   ↓
Carousel actualiza cards
   ↓
Usuario explora resultados
```

---

## 📱 MOBILE EXPERIENCE

### **Layout:**
```
┌─────────────────────┐
│  [Búsqueda] [⚙️]    │  ← Floating search
├─────────────────────┤
│                     │
│       MAPA          │  ← Fullscreen
│     FULLSCREEN      │
│                     │
├─────────────────────┤
│ [🚗] [🚗] [🚗]      │  ← Carousel bottom
└─────────────────────┘
```

### **Gestos:**
- 👆 **Tap:** Seleccionar auto
- 👆👆 **Double tap:** Ver detalle
- 👉 **Swipe:** Scroll carousel
- 🔍 **Pinch:** Zoom mapa
- 📍 **Botón:** Centrar ubicación

---

## 🎯 FILTROS DISPONIBLES

### **Precio:**
- Min: $5,000 ARS
- Max: $500,000 ARS
- Slider con input numérico

### **Transmisión:**
- 🔹 Todas
- 🔸 Automática
- 🔸 Manual

### **Combustible:**
- 🔹 Todos
- 🔸 Nafta
- 🔸 Diesel
- 🔸 Eléctrico
- 🔸 Híbrido

### **Asientos:**
- Min: 2
- Max: 9
- Slider numérico

### **Características:**
- ❄️ Aire acondicionado
- 🗺️ GPS
- 📱 Bluetooth
- 📷 Cámara trasera

---

## 🚀 CASOS DE USO

### **Caso 1: Viajero buscando auto económico**
1. Abrir /explore
2. Filtrar: precio < $20,000
3. Filtrar: transmisión automática
4. Ver markers en mapa cerca de hotel
5. Click en marker más cercano
6. Revisar info en carousel
7. Doble click → Ver detalle
8. Reservar

### **Caso 2: Usuario con necesidades específicas**
1. Abrir /explore
2. Filtros:
   - Combustible: Eléctrico
   - Asientos: 7+
   - GPS: Sí
3. Ver resultados filtrados
4. Comparar precios en carousel
5. Seleccionar favorito
6. Ver detalle completo

### **Caso 3: Exploración rápida en mobile**
1. Abrir app en móvil
2. Permitir ubicación
3. Ver autos cercanos en mapa
4. Swipe en carousel
5. Tap para seleccionar
6. Doble tap para detalles

---

## ⚡ ATAJOS DE TECLADO

### **Desktop:**
- `Ctrl + F` → Abrir búsqueda
- `Esc` → Cerrar filtros
- `←` / `→` → Navegar carousel
- `Enter` → Ver detalle del auto seleccionado

### **Mobile:**
- Búsqueda siempre visible
- Gestos touch nativos
- Pull-to-refresh (si aplica)

---

## 🎨 TEMAS

### **Light Mode:**
- Mapa: Dark theme contraste
- Cards: Blanco (#ffffff)
- Markers: Blanco con border
- Shadow: Sutil y progresivo

### **Dark Mode:**
- Mapa: Extra dark
- Cards: Gris oscuro (#1f2937)
- Markers: Ajuste automático
- Shadow: Más fuerte

---

## 📊 RENDIMIENTO

### **Métricas Target:**
- ⚡ FCP: < 1.8s
- 🎯 LCP: < 2.5s
- 🔄 CLS: < 0.1
- 📱 Mobile: 90+ Lighthouse

### **Optimizaciones Aplicadas:**
- ✅ Import estático Mapbox
- ✅ Lazy load de imágenes
- ✅ Scroll snap para carousel
- ✅ CSS animations hardware-accelerated
- ✅ Debounce en filtros

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### **Markers no aparecen:**
1. Verificar token Mapbox en env
2. Limpiar caché del navegador
3. Verificar consola (F12) por errores
4. Reload hard (Ctrl + Shift + R)

### **Carousel no hace scroll:**
1. Verificar ancho de viewport
2. Verificar overflow-x: auto
3. Verificar scroll-snap-type
4. Probar en otro navegador

### **Doble click no funciona:**
1. Verificar selectedCarId se setea
2. Verificar previousCarId comparación
3. Verificar Router inyectado
4. Ver consola por errores de navegación

---

## 🔗 URLS DE PRUEBA

### **Producción:**
- **Explore:** https://autorenta-web.pages.dev/explore
- **Cars List:** https://autorenta-web.pages.dev/cars/list

### **Latest Deploy:**
- https://010af23f.autorenta-web.pages.dev/explore

### **Desarrollo:**
- http://localhost:4200/explore
- http://localhost:4200/cars/list

---

## 📞 SOPORTE

### **Reportar Issues:**
- GitHub: https://github.com/ecucondorSA/autorenta/issues
- Incluir screenshot
- Describir pasos para reproducir
- Especificar navegador + versión

### **Feature Requests:**
- Abrir discussion en GitHub
- Describir caso de uso
- Mockups si es posible

---

## 🎓 APRENDIZAJES CLAVE

### **Para Desarrolladores:**

1. **Import Estático > Dynamic Import**
   - Vite + Angular 20 prefieren estáticos
   - Dynamic imports fallan en prod a veces
   - Usar `import mapboxgl from 'mapbox-gl'`

2. **Scroll Smooth:**
   ```typescript
   element.scrollTo({
     left: position,
     behavior: 'smooth'
   });
   ```

3. **Doble Click Detection:**
   ```typescript
   const previous = this.selected;
   this.selected = newValue;
   if (previous === newValue) {
     // Segundo click
   }
   ```

4. **Pulse Animation:**
   ```css
   @keyframes pulse {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.03); }
   }
   ```

5. **ViewChild para Referencias:**
   ```typescript
   @ViewChild('carousel') carousel?: ElementRef;
   // Acceso directo al DOM
   ```

---

## ✨ CONCLUSIÓN

**Autorenta** ahora ofrece una experiencia premium tipo Airbnb con:

✅ Mapa interactivo fullscreen
✅ Markers con foto + precio
✅ Carousel horizontal elegante
✅ Integración fluida mapa ↔ carousel
✅ Filtros completos funcionales
✅ Mobile responsive perfecto
✅ Dark mode support
✅ Performance optimizado
✅ Doble click para navegación

**¡Disfruta explorando autos!** 🚗✨

---

_Última actualización: 2025-11-01_
