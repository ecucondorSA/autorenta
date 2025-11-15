---
applyTo: "**/src/app/**/*.component.ts"
---

# Angular Components - Copilot Instructions

## Requirements

Cuando trabajes en componentes Angular en AutoRenta, sigue estas guías:

### 1. Standalone Components
- SIEMPRE usar standalone components (NO NgModules)
- Declarar imports en el decorator del componente

```typescript
@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './car-card.component.html',
})
export class CarCardComponent {}
```

### 2. Signals sobre Observables
- Preferir Signals para estado local
- Usar Observables solo cuando sea necesario (HTTP, eventos)

```typescript
// ✅ Preferir Signals
const count = signal(0);
const doubled = computed(() => count() * 2);

// ⚠️ Solo si es necesario
users$ = this.http.get<User[]>('/users');
```

### 3. Dependency Injection
- Usar `inject()` en lugar de constructor injection cuando sea posible
- Usar `injectSupabase()` para acceder al cliente Supabase

```typescript
export class CarListComponent {
  private supabase = injectSupabase();
  private router = inject(Router);
}
```

### 4. Estilos con Tailwind
- Usar utility classes de Tailwind CSS
- NO usar estilos inline
- Seguir design system en `tailwind.config.js`

```html
<!-- ✅ Correcto -->
<button class="btn-primary">Guardar</button>

<!-- ❌ Incorrecto -->
<button style="background: blue; color: white;">Guardar</button>
```

### 5. Template Syntax
- NO usar spread operator en templates (no soportado)
- Mover lógica compleja a métodos del componente

```typescript
// ❌ Incorrecto - Spread en template
(change)="data.set({...data(), field: $event})"

// ✅ Correcto - Método helper
onFieldChange(event: Event) {
  this.data.set({ ...this.data(), field: event });
}
```

### 6. Error Handling
- Usar ToastService para mostrar errores
- Siempre manejar errores de HTTP

```typescript
try {
  const result = await this.carsService.publishCar(car);
  this.toastService.success('Auto publicado!');
} catch (error) {
  this.toastService.error('Error al publicar auto');
  console.error(error);
}
```

### 7. Tests
- Crear archivo `.spec.ts` para cada componente
- Testear inputs, outputs y métodos públicos
- Mock dependencies con Jasmine

```typescript
describe('CarCardComponent', () => {
  it('should display car name', () => {
    component.car = mockCar;
    fixture.detectChanges();
    expect(compiled.querySelector('h2')?.textContent).toContain(mockCar.name);
  });
});
```
