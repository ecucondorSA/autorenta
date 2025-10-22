# 🌍 Guía de Internacionalización (i18n) de AutoRenta

## Resumen

AutoRenta cuenta con un sistema completo de internacionalización usando **ngx-translate v17.0.0**, permitiendo cambio dinámico entre idiomas sin recargar la aplicación.

### Idiomas Soportados

- 🇦🇷 **Español (es)** - Idioma por defecto
- 🇧🇷 **Português (pt)** - Portugués brasileño

## Arquitectura

### Archivos de Traducción

```
src/assets/i18n/
├── es.json    # Traducciones en español
└── pt.json    # Traducciones en português
```

### Estructura de JSON

Archivo organizado jerárquicamente por módulos:

```json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error"
  },
  "nav": {
    "home": "Inicio",
    "cars": "Autos"
  },
  "cars": {
    "list": {
      "title": "Autos Disponibles"
    }
  }
}
```

### Componentes Clave

| Componente/Servicio | Ubicación | Propósito |
|---------------------|-----------|-----------|
| `LanguageService` | `/core/services/language.service.ts` | Gestión de idioma y persistencia |
| `LanguageSelectorComponent` | `/shared/components/language-selector/` | Selector de idioma para UI |
| `TranslateModule` | `/app.config.ts` | Configuración global de ngx-translate |

## Uso en Componentes

### 1. Usando el Pipe `translate` en Templates

**Ejemplo básico:**
```html
<h1>{{ 'home.hero.title' | translate }}</h1>
<p>{{ 'common.loading' | translate }}</p>
```

**Con parámetros:**
```html
<p>{{ 'messages.welcome' | translate: { name: userName } }}</p>
```

Archivo JSON:
```json
{
  "messages": {
    "welcome": "Bienvenido, {{name}}"
  }
}
```

### 2. Usando `TranslateService` en TypeScript

**Importar el servicio:**
```typescript
import { TranslateService } from '@ngx-translate/core';
import { inject } from '@angular/core';

export class MyComponent {
  private readonly translate = inject(TranslateService);

  showMessage(): void {
    const message = this.translate.instant('auth.login.title');
    alert(message); // "Iniciar Sesión" o "Entrar" según idioma
  }
}
```

**Traducciones asíncronas (observables):**
```typescript
this.translate.get('booking.detail.title').subscribe(translation => {
  console.log(translation);
});
```

### 3. Usando `LanguageService` (Método Recomendado)

**Ventajas:**
- Signal reactivo del idioma actual
- Métodos helper adicionales
- Persistencia automática

```typescript
import { LanguageService } from '@core/services/language.service';

export class MyComponent {
  readonly languageService = inject(LanguageService);

  ngOnInit(): void {
    // Leer idioma actual (signal reactivo)
    console.log(this.languageService.currentLanguage()); // 'es' | 'pt'

    // Cambiar idioma
    this.languageService.setLanguage('pt');

    // Traducción directa
    const text = this.languageService.instant('common.error');
  }
}
```

## Agregando Nuevos Idiomas

### Paso 1: Instalar el paquete de idioma

Aunque ngx-translate viene con soporte básico para múltiples idiomas, si necesitas agregar un nuevo idioma, simplemente crea el archivo JSON correspondiente.

### Paso 2: Crear archivo de traducción

Crear `/src/assets/i18n/en.json`:
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error"
  }
}
```

### Paso 3: Actualizar `LanguageService`

```typescript
// language.service.ts
export type SupportedLanguage = 'es' | 'pt' | 'en';

readonly availableLanguages: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇦🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },  // ← Nuevo
];
```

### Paso 3: Actualizar detección de navegador (opcional)

```typescript
private detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('en')) return 'en';  // ← Nuevo

  return 'es';
}
```

## Buenas Prácticas

### 1. Nomenclatura de Claves

**✅ Recomendado:**
- Usar estructura jerárquica: `module.component.key`
- Nombres descriptivos: `cars.list.noResults`
- Snake case para separar palabras: `auth.forgot_password`

**❌ Evitar:**
- Claves genéricas: `text1`, `label2`
- Anidación excesiva: `module.submodule.component.section.subsection.key`

### 2. Organización de Archivos JSON

Agrupar por módulos funcionales:

```json
{
  "common": { /* elementos compartidos */ },
  "nav": { /* navegación */ },
  "auth": { /* autenticación */ },
  "cars": { /* módulo de autos */ },
  "bookings": { /* módulo de reservas */ },
  "wallet": { /* módulo de wallet */ },
  "profile": { /* perfil de usuario */ }
}
```

### 3. Texto con Pluralización

**No soportado nativamente**, usar lógica condicional:

```html
<p>
  {{ booking.days_count }}
  {{ booking.days_count === 1 ? ('bookings.day' | translate) : ('bookings.days' | translate) }}
</p>
```

JSON:
```json
{
  "bookings": {
    "day": "día",
    "days": "días"
  }
}
```

### 4. Textos Dinámicos con Interpolación

**Template:**
```html
<p>{{ 'wallet.balance' | translate: { amount: balance, currency: 'USD' } }}</p>
```

**JSON:**
```json
{
  "wallet": {
    "balance": "Tu saldo es {{amount}} {{currency}}"
  }
}
```

## Testing

### Unit Tests con Traducciones

```typescript
import { TranslateModule } from '@ngx-translate/core';

TestBed.configureTestingModule({
  imports: [
    TranslateModule.forRoot()
  ]
});
```

### Verificar Traducciones en Tests

```typescript
it('should display translated title', () => {
  component.languageService.setLanguage('pt');
  fixture.detectChanges();

  const title = fixture.nativeElement.querySelector('h1').textContent;
  expect(title).toContain('Carros Disponíveis');
});
```

## Troubleshooting

### Traducción no aparece

1. **Verificar que la clave existe en el JSON:**
   ```bash
   cat src/assets/i18n/es.json | grep "clave.buscada"
   ```

2. **Verificar sintaxis del JSON:**
   ```bash
   npx jsonlint src/assets/i18n/es.json
   ```

3. **Limpiar caché del navegador** (Ctrl+Shift+R)

### Idioma no cambia

1. Verificar que `TranslateModule` está importado en `app.config.ts`
2. Verificar que el componente importa `TranslateModule` o usa el pipe
3. Revisar consola del navegador por errores de carga de JSON

### Performance: JSON muy grande

**Solución:** Lazy load de traducciones por módulo

```typescript
// Por implementar si es necesario
this.translate.setDefaultLang('es');
this.translate.use('es');

// Cargar traducciones de un módulo específico
this.http.get('/assets/i18n/cars-es.json').subscribe(translations => {
  this.translate.setTranslation('es', translations, true);
});
```

## Notas Técnicas - ngx-translate v17

### Cambios en la API v17

**IMPORTANTE:** ngx-translate v17 introdujo cambios importantes en la API:

1. **`TranslateHttpLoader` constructor sin parámetros**:
   - ✅ v17: `new TranslateHttpLoader()` (sin argumentos, usa DI)
   - ❌ v16: `new TranslateHttpLoader(http, './assets/i18n/', '.json')`

2. **Nueva función `provideTranslateHttpLoader()`**:
   - Método recomendado en standalone apps
   - Configuración mediante objeto de config
   ```typescript
   provideTranslateHttpLoader({
     prefix: '/assets/i18n/',
     suffix: '.json',
   })
   ```

3. **Configuración en `app.config.ts`**:
   ```typescript
   import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

   export const appConfig: ApplicationConfig = {
     providers: [
       importProvidersFrom(
         TranslateModule.forRoot({
           defaultLanguage: 'es',
         })
       ),
       provideTranslateHttpLoader({
         prefix: '/assets/i18n/',
         suffix: '.json',
       }),
     ],
   };
   ```

### Compatibilidad

- **Angular:** v17+ (standalone components)
- **ngx-translate/core:** v17.0.0
- **ngx-translate/http-loader:** v17.0.0

### Uso en Standalone Components

Los componentes standalone no necesitan importar `TranslateModule` directamente:
- El pipe `translate` está disponible globalmente vía `TranslateModule.forRoot()`
- Solo importa `TranslateModule` si necesitas el pipe en un componente lazy-loaded

```typescript
// ✅ Standalone component - NO necesita import
@Component({
  selector: 'app-my-component',
  standalone: true,
  template: `<h1>{{ 'home.title' | translate }}</h1>`
})
export class MyComponent {}

// ✅ Standalone component lazy-loaded - SÍ necesita import
@Component({
  selector: 'app-lazy-component',
  standalone: true,
  imports: [TranslateModule],  // ← Importar aquí
  template: `<h1>{{ 'home.title' | translate }}</h1>`
})
export class LazyComponent {}
```

## Roadmap

- [ ] Agregar idioma inglés (en)
- [ ] Implementar lazy loading de traducciones por módulo
- [ ] Agregar soporte de pluralización con ngx-translate-messageformat
- [ ] Traducir mensajes de error del backend
- [ ] Agregar detector de traducciones faltantes en CI/CD
- [x] Configurar ngx-translate v17 con standalone components

## Recursos

- **ngx-translate Docs:** https://github.com/ngx-translate/core
- **ngx-translate v17 Migration:** https://github.com/ngx-translate/core/blob/master/CHANGELOG.md
- **Convenciones i18n:** https://angular.dev/guide/i18n
- **Herramienta de validación:** https://jsonlint.com/

---

**Última actualización:** Octubre 2025 (ngx-translate v17 configurado)
