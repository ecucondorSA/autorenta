# 📱 Mobile Bottom Navigation - Autorent

## 🎨 Características

✅ **7 botones de navegación** optimizados para móvil
✅ **Modo oscuro nativo** con paleta Autorent
✅ **Badges de notificaciones** animados
✅ **Indicador visual de página activa**
✅ **Soporte para iPhone notch** (safe area)
✅ **Animaciones suaves** y microinteracciones
✅ **Accesibilidad completa** (ARIA labels, keyboard nav)
✅ **Responsive** - se oculta automáticamente en tablet/desktop

## 📦 Instalación

### 1. El componente ya está creado en:
```
src/app/shared/components/mobile-bottom-nav/
  ├── mobile-bottom-nav.component.ts
  ├── mobile-bottom-nav.component.html
  └── mobile-bottom-nav.component.css
```

### 2. Agregar al app.component.html

```html
<div class="app-container">
  <!-- Header (opcional) -->
  <header class="app-header md:block">
    <!-- Tu header existente -->
  </header>

  <!-- Contenido principal con padding bottom para la nav -->
  <main class="app-content pb-20 md:pb-0">
    <router-outlet></router-outlet>
  </main>

  <!-- Bottom Navigation (solo móvil) -->
  <app-mobile-bottom-nav></app-mobile-bottom-nav>
</div>
```

### 3. Agregar al app.component.ts

```typescript
import { MobileBottomNavComponent } from './shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Component({
  // ... otras propiedades
  imports: [
    // ... otros imports
    MobileBottomNavComponent
  ],
})
export class AppComponent {
  // ...
}
```

### 4. Agregar estilos globales (opcional)

En `styles.css`:

```css
/* Asegurar que el contenido no quede tapado por la nav */
.app-content {
  min-height: calc(100vh - 70px);
  padding-bottom: 70px; /* Altura de la nav + margen */
}

@media (min-width: 768px) {
  .app-content {
    padding-bottom: 0;
  }
}
```

## 🎨 Personalización

### Cambiar rutas o labels

Edita el array `navItems` en `mobile-bottom-nav.component.ts`:

```typescript
readonly navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Inicio',      // ← Cambia el texto
    icon: 'home',         // ← Cambia el icono
    route: '/',           // ← Cambia la ruta
    badge: 3,             // ← Opcional: añadir badge
  },
  // ...
];
```

### Agregar nuevos iconos

En el método `getIcon()`, agrega más SVG paths:

```typescript
getIcon(iconName: string): string {
  const icons: Record<string, string> = {
    home: '...',
    // Añade tu nuevo icono aquí:
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  };
  return icons[iconName] || icons['home'];
}
```

### Cambiar colores

En `mobile-bottom-nav.component.css`, busca y modifica:

```css
/* Color de íconos inactivos */
.nav-item__icon {
  color: #9ca3af; /* ← Cambia este valor */
}

/* Color de íconos activos */
.nav-item__icon--active {
  color: #7aa2aa; /* ← Cambia este valor */
}

/* Fondo de la barra */
.nav-container {
  background: linear-gradient(...); /* ← Cambia el gradiente */
}
```

## 🔧 Props disponibles

El componente no recibe props porque las rutas están definidas internamente, pero puedes modificarlo para recibir configuración externa:

```typescript
@Input() items: NavItem[] = [];
@Input() showBadges: boolean = true;
```

## 📱 Vista Previa

```
┌─────────────────────────────────┐
│  ◀  Autorent            🔔  👤  │ ← Header (opcional)
├─────────────────────────────────┤
│                                 │
│     CONTENIDO SCROLLABLE        │
│                                 │
│     (RouterOutlet)              │
│                                 │
├─────────────────────────────────┤
│ 🏠   🚗   🔍   ➕   💰   📅  👤│ ← Bottom Nav
│Home Autos Rent Pub Wall Res User│
└─────────────────────────────────┘
```

## ✅ Checklist de integración

- [ ] Componente creado
- [ ] Importado en app.component.ts
- [ ] Agregado `<app-mobile-bottom-nav>` en el HTML
- [ ] Padding bottom añadido al contenido principal
- [ ] Rutas configuradas correctamente
- [ ] Probado en móvil (responsive)
- [ ] Probado en tablet/desktop (se oculta)
- [ ] Badges funcionando
- [ ] Navegación funcional

## 🎯 Mejoras futuras

- [ ] Haptic feedback en iOS
- [ ] Modo vibrante
- [ ] Gesture swipe entre tabs
- [ ] Animación de fab button central
- [ ] Variante con iconos sin texto
- [ ] Soporte para tema claro
