# Plan de Implementación: Nueva Navegación Mobile

## Resumen Ejecutivo

Rediseño del bottom navigation bar de AutoRenta siguiendo los patrones UX de las top 5 apps mundiales (Airbnb, Uber, Google Maps, Amazon, Netflix).

## Análisis Comparativo

### Navegación Actual
```
[Alquilar] [Publicar] [FAB:Rentarfast] [Reservas] [Menu]
```

**Problemas identificados:**
1. ❌ "Menu" desperdicia posición premium para abrir drawer
2. ❌ FAB central ocupa espacio para función experimental (voz)
3. ❌ Sin acceso directo a Perfil, Mensajes, Favoritos
4. ❌ "Publicar" ocupa tab pero solo 15% de usuarios publican

### Patrón Airbnb (Referencia)
```
[Explore] [Wishlists] [Trips] [Inbox] [Profile]
```
- 5 tabs claros
- Acciones de alta frecuencia
- Perfil como punto de acceso a todo lo demás

### Patrón Uber Base Design System
- Altura: 56dp Android / 49pt iOS
- Máximo 3-5 ítems
- Labels de 1 palabra
- Ocultar en scroll down

## Nueva Navegación Propuesta

```
[Explorar] [Favoritos] [Reservas] [Mensajes] [Perfil]
```

| Posición | Ítem | Ruta | Icono | Justificación |
|----------|------|------|-------|---------------|
| 1 | Explorar | /cars | search/home | Acción principal (buscar autos) |
| 2 | Favoritos | /favorites | heart | Alta frecuencia de uso |
| 3 | Reservas | /bookings | calendar | Core business |
| 4 | Mensajes | /messages | chat | Comunicación crítica |
| 5 | Perfil | /profile | user | Hub de configuración |

### ¿Dónde queda "Publicar"?

**Opción A (Recomendada):** FAB contextual en página Explorar
- Solo visible en /cars (marketplace)
- Botón flotante para publicar
- No ocupa espacio en nav global

**Opción B:** Dentro de Perfil
- Similar a Airbnb "List your home"
- Card promocional en perfil
- Menos prominente pero consistente

### ¿Dónde queda "Rentarfast"?

- Mover a página de Perfil como feature
- O eliminar si el uso es bajo
- No merece posición central

## Especificaciones Técnicas

### Dimensiones (Material Design + iOS HIG)
```css
/* Android */
.mobile-bottom-nav {
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
}

/* iOS */
.mobile-bottom-nav {
  height: 49px;
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Comportamiento de Scroll
- **Scroll Down:** Ocultar nav (maximizar contenido)
- **Scroll Up:** Mostrar nav
- **Top of page:** Siempre visible
- **Transición:** 200ms ease-out

### Estados
- **Default:** Icono outline + texto gris
- **Active:** Icono filled + texto brand color + indicador
- **Badge:** Punto rojo para notificaciones/mensajes

### Touch Targets
- Mínimo: 44x44px (WCAG AAA)
- Recomendado: 48x48px zona táctil

## Archivos a Modificar

### 1. `mobile-bottom-nav.component.ts`
```typescript
readonly navItems: NavItem[] = [
  { id: 'explore', label: 'Explorar', icon: 'nav-search', route: '/cars' },
  { id: 'favorites', label: 'Favoritos', icon: 'nav-heart', route: '/favorites' },
  { id: 'bookings', label: 'Reservas', icon: 'nav-calendar', route: '/bookings' },
  { id: 'messages', label: 'Mensajes', icon: 'nav-chat', route: '/messages', badgeSignal: this.unreadCount },
  { id: 'profile', label: 'Perfil', icon: 'nav-user', route: '/profile' },
];
```

### 2. `mobile-bottom-nav.component.html`
- Remover FAB central
- Simplificar a 5 items iguales
- Añadir soporte de badges

### 3. `mobile-bottom-nav.component.css`
- Ajustar grid a 5 columnas iguales
- Remover estilos de FAB
- Añadir estilos de badge

### 4. `nav-icon.component.ts`
- Añadir nuevos iconos: nav-search, nav-heart, nav-chat, nav-user

### 5. `mobile-menu-drawer.component.ts`
- Puede eliminarse o simplificarse
- Funcionalidad se mueve a página Perfil

## Cambios en UX

### Drawer Menu → Perfil Page
El drawer actual tiene:
- Mis Reservas → Ya en nav
- Mis Autos → Mover a Perfil
- Mensajes → Ya en nav
- Favoritos → Ya en nav
- Mi Perfil → Es el tab Perfil
- Wallet → Dentro de Perfil
- Configuración → Dentro de Perfil
- Ayuda → Dentro de Perfil

**Nueva estructura de Perfil:**
```
/profile
├── Header: Avatar + Nombre + Nivel
├── Verificación (si incompleta)
├── Mis Autos (si es propietario)
├── Wallet
├── Publicar tu Auto (CTA)
├── Configuración
├── Centro de Ayuda
├── Cerrar Sesión
```

## FAB Contextual para Publicar

Solo visible en `/cars` (marketplace):

```html
<!-- En cars-list.component.html -->
<button
  class="publish-fab"
  routerLink="/cars/publish"
  aria-label="Publicar tu auto"
>
  <svg><!-- + icon --></svg>
</button>
```

```css
.publish-fab {
  position: fixed;
  bottom: calc(56px + 16px + env(safe-area-inset-bottom));
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: var(--color-brand);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

## Migración

### Fase 1: Actualizar Bottom Nav (2 horas)
1. Modificar navItems array
2. Remover FAB y espaciador
3. Ajustar CSS grid
4. Añadir iconos faltantes

### Fase 2: Rediseñar Perfil Page (3 horas)
1. Reorganizar secciones
2. Añadir Mis Autos section
3. Añadir CTA de Publicar
4. Integrar accesos rápidos

### Fase 3: FAB Contextual (1 hora)
1. Crear componente FAB
2. Añadir a marketplace/cars list
3. Animaciones de entrada/salida

### Fase 4: Cleanup (1 hora)
1. Remover drawer si ya no es necesario
2. Actualizar tests
3. Verificar responsive

## Métricas de Éxito

- ↑ Tasa de navegación a Mensajes (actualmente oculto en drawer)
- ↑ Tasa de navegación a Favoritos
- ↓ Bounce rate en marketplace
- ↑ Tiempo en app

## Referencias

- [Uber Base Design System - Bottom Navigation](https://base.uber.com/6d2425e9f/p/1413a0-bottom-navigation)
- [Airbnb App Redesign 2025](https://www.itsnicethat.com/articles/airbnb-app-redesign-140525)
- [Material Design Navigation](https://m3.material.io/components/navigation-bar)
- [Apple HIG Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
