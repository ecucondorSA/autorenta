# UI Component Library V2

Librería de componentes mobile-first para AutoRenta V2.

## 📦 Componentes Disponibles

### Form Components

#### Button
Botón flexible con múltiples variantes y estados.

**Variantes**: `primary`, `secondary`, `ghost`, `outline`, `text`, `icon`  
**Tamaños**: `sm` (36px), `md` (44px), `lg` (52px)

```typescript
<app-button 
  variant="primary" 
  size="md"
  [loading]="isLoading()"
  (clicked)="handleClick()"
>
  Confirmar Reserva
</app-button>

<!-- Icon Button -->
<app-button variant="icon" size="md">
  <svg iconLeading>...</svg>
</app-button>

<!-- Full Width -->
<app-button [fullWidth]="true">
  Continuar
</app-button>
```

#### Input
Campo de entrada optimizado para móvil con validación.

**Tipos**: `text`, `email`, `password`, `tel`, `url`, `number`, `search`, `textarea`

```typescript
<app-input
  label="Correo electrónico"
  type="email"
  placeholder="tu@email.com"
  [value]="email()"
  [error]="emailError()"
  [required]="true"
  [clearable]="true"
  (valueChange)="onEmailChange($event)"
>
  <svg iconLeading>...</svg>
</app-input>

<!-- With character counter -->
<app-input
  type="textarea"
  label="Descripción"
  [maxLength]="500"
  [showCounter]="true"
/>
```

---

### Layout Components

#### Card
Contenedor flexible con header, content, y footer.

**Elevaciones**: `flat`, `low`, `medium`, `high`

```typescript
<app-card 
  elevation="medium"
  [clickable]="true"
  [imageUrl]="car().image"
>
  <div cardHeader>
    <h3>{{ car().name }}</h3>
  </div>
  
  <div>
    <p>{{ car().description }}</p>
  </div>
  
  <div cardFooter>
    <app-button size="sm">Ver más</app-button>
  </div>
</app-card>
```

#### Modal
Modal full-screen con animación slide-up.

**Tamaños**: `full`, `large`, `medium`, `small`

```typescript
<app-modal
  [isOpen]="showModal()"
  title="Confirmar Reserva"
  size="medium"
  [showFooter]="true"
  (closed)="closeModal()"
>
  <p>¿Estás seguro de confirmar esta reserva?</p>
  
  <div modalFooter>
    <app-button variant="ghost" (clicked)="closeModal()">
      Cancelar
    </app-button>
    <app-button (clicked)="confirmBooking()">
      Confirmar
    </app-button>
  </div>
</app-modal>
```

#### Bottom Sheet
Sheet con drag-to-dismiss y snap points.

**Snap Points**: `collapsed`, `half`, `expanded`

```typescript
<app-bottom-sheet
  [isOpen]="showSheet()"
  title="Filtros"
  snapPoint="half"
  [showFooter]="true"
  (closed)="closeSheet()"
>
  <!-- Filters content -->
  
  <div sheetFooter>
    <app-button (clicked)="applyFilters()">
      Aplicar Filtros
    </app-button>
  </div>
</app-bottom-sheet>
```

---

### Action Components

#### FAB (Floating Action Button)
Botón de acción flotante.

**Variantes**: `regular` (56px), `mini` (40px), `extended` (con label)  
**Posiciones**: `bottom-right`, `bottom-left`, `bottom-center`

```typescript
<app-fab
  variant="regular"
  position="bottom-right"
  [withBottomNav]="true"
  ariaLabel="Publicar auto"
  (clicked)="publishCar()"
>
  <svg fabIcon><!-- Plus icon --></svg>
</app-fab>

<!-- Extended FAB -->
<app-fab
  variant="extended"
  label="Publicar Auto"
  position="bottom-center"
>
  <svg fabIcon><!-- Plus icon --></svg>
</app-fab>
```

#### Chip
Elemento pequeño para filtros y tags.

**Variantes**: `filled`, `outlined`, `text`  
**Colores**: `default`, `primary`, `success`, `warning`, `danger`

```typescript
<app-chip
  label="Automático"
  variant="filled"
  [active]="isSelected()"
  [clickable]="true"
  [removable]="true"
  (clicked)="toggleFilter()"
  (removed)="removeFilter()"
>
  <svg chipIcon><!-- Icon --></svg>
</app-chip>

<!-- Avatar chip -->
<app-chip
  label="Juan Pérez"
  [avatar]="user().avatar"
/>
```

#### Badge
Indicador de notificaciones o estados.

**Variantes**: `filled`, `outlined`, `dot`  
**Colores**: `primary`, `success`, `warning`, `danger`, `info`

```typescript
<!-- Notification badge -->
<div style="position: relative;">
  <button>Inbox</button>
  <app-badge
    [content]="unreadCount()"
    color="danger"
    [anchored]="true"
    position="top-right"
    [pulse]="true"
  />
</div>

<!-- Status dot -->
<app-badge
  variant="dot"
  color="success"
  [anchored]="true"
/>
```

---

### Feedback Components

#### Toast
Notificación temporal con auto-dismiss.

**Variantes**: `success`, `error`, `warning`, `info`  
**Posiciones**: `top`, `bottom`

```typescript
<app-toast
  [isVisible]="showToast()"
  variant="success"
  title="Reserva confirmada"
  message="Tu reserva ha sido confirmada exitosamente"
  position="bottom"
  [duration]="4000"
  actionLabel="Ver"
  (closed)="hideToast()"
  (actionClicked)="viewBooking()"
/>
```

#### Skeleton
Placeholder de carga con animación shimmer.

**Variantes**: `text`, `circle`, `rectangle`, `card`, `button`, `avatar`  
**Animaciones**: `shimmer`, `pulse`, `wave`

```typescript
<!-- Text skeleton -->
<app-skeleton variant="text" width="60%" />
<app-skeleton variant="text" width="80%" />

<!-- Avatar skeleton -->
<app-skeleton variant="avatar" size="lg" />

<!-- Card skeleton -->
<app-skeleton variant="card" height="200px" />

<!-- Custom dimensions -->
<app-skeleton 
  variant="rectangle" 
  width="100%" 
  height="150px"
  animation="wave"
/>
```

---

## 🎨 Design Tokens

Todos los componentes utilizan los tokens definidos en `_tokens.scss`:

- **Colores**: Primary (#4F46E5), Success (#10B981), Warning (#F59E0B), Danger (#EF4444)
- **Espaciado**: Escala de 1-24 unidades (1 = 0.25rem)
- **Tipografía**: Sistema de fonts nativo (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Sombras**: xs, sm, md, lg, xl, 2xl
- **Border Radius**: xs (4px), sm (6px), md (8px), lg (12px), xl (16px), 2xl (24px)
- **Z-Index**: Capas organizadas (dropdown: 1000, sticky: 1010, modal: 9999, toast: 10000)

---

## 🎭 Animaciones

Todos los componentes incluyen animaciones suaves usando `cubic-bezier(0.4, 0, 0.2, 1)`.

- **Entrada**: Slide-in, fade-in, scale-in
- **Salida**: Slide-out, fade-out, scale-out
- **Gestos**: Tap feedback, swipe to dismiss
- **Estados**: Hover, active, focus

---

## ♿ Accesibilidad

- **ARIA**: Labels, roles, y estados apropiados
- **Keyboard**: Navegación completa con teclado
- **Focus**: Indicadores visuales claros
- **Touch Targets**: Mínimo 44×44px (WCAG 2.1 Level AAA)
- **Screen Readers**: Texto descriptivo para elementos visuales

---

## 📱 Mobile-First

- **Touch-optimized**: Mínimo 44px para áreas táctiles
- **Safe Areas**: Soporte para notch y home indicator
- **Gestures**: Swipe, long-press, drag
- **Haptic Feedback**: Vibraciones sutiles en interacciones
- **Performance**: Animaciones hardware-accelerated

---

## 🔧 Uso con Signals

Todos los componentes están optimizados para Angular Signals:

```typescript
export class MyComponent {
  isLoading = signal(false);
  email = signal('');
  showModal = signal(false);
  
  async submitForm() {
    this.isLoading.set(true);
    await api.submit();
    this.isLoading.set(false);
    this.showModal.set(true);
  }
}
```

---

## 📚 Próximos Componentes

- [ ] Accordion
- [ ] Tabs
- [ ] Dropdown/Select
- [ ] Toggle/Switch
- [ ] Radio Group
- [ ] Checkbox
- [ ] Progress Bar
- [ ] Avatar
- [ ] Empty State
- [ ] Search Bar

---

## 🤝 Contribuir

Ver [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) para guías de contribución.

## 📄 Licencia

MIT © AutoRenta 2025
