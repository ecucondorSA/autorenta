# PROMPT PARA GEMINI - TESTING.md

## Objetivo
Documentar la estrategia y ejecucion de tests en Autorenta.

## Instrucciones para Gemini

Analiza la configuracion de testing:

### Archivos a analizar:
1. `vitest.config.ts` o `vite.config.ts` - Config Vitest
2. `playwright.config.ts` - Config Playwright E2E
3. `karma.conf.js` - Si existe config Karma
4. `apps/web/src/**/*.spec.ts` - Tests unitarios
5. `apps/web/src/**/*.test.ts` - Tests adicionales
6. `e2e/**` - Tests E2E
7. `package.json` - Scripts de test

### Secciones requeridas:

```markdown
# Testing Guide

## Stack de Testing

| Tipo | Herramienta | Config |
|------|-------------|--------|
| Unit Tests | [Vitest/Jest/Karma] | [archivo config] |
| E2E Tests | [Playwright] | [archivo config] |
| Coverage | [v8/istanbul] | [config] |

## Estructura de Tests

```
apps/web/src/
  app/
    core/
      services/
        bookings/
          bookings.service.ts
          bookings.service.spec.ts  <- Unit test
    features/
      bookings/
        booking-list.component.ts
        booking-list.component.spec.ts  <- Component test
e2e/
  booking-flow.spec.ts  <- E2E test
```

## Unit Tests

### Ejecutar todos los tests
```bash
[comando encontrado en package.json]
```

### Ejecutar tests de un archivo
```bash
[comando]
```

### Ejecutar tests con coverage
```bash
[comando]
```

### Ejecutar tests en watch mode
```bash
[comando]
```

### Convenciones
- Archivos: `*.spec.ts` o `*.test.ts`
- Describe blocks: [patron usado]
- Mocks: [como se mockean servicios]

### Ejemplo de test unitario
```typescript
[Ejemplo REAL de un test.spec.ts del proyecto]
```

### Mocking Supabase
```typescript
[Como se mockea el cliente de Supabase]
```

### Mocking HTTP
```typescript
[Como se mockean llamadas HTTP]
```

## Component Tests

### Setup de TestBed
```typescript
[Ejemplo de configuracion de TestBed]
```

### Testing con Signals
```typescript
[Como testear componentes con signals]
```

### Testing de Forms
```typescript
[Ejemplo de test de formulario]
```

## E2E Tests (Playwright)

### Ejecutar E2E tests
```bash
[comando]
```

### Ejecutar en modo UI
```bash
[comando]
```

### Ejecutar test especifico
```bash
[comando]
```

### Configuracion de browsers
[Browsers configurados en playwright.config.ts]

### Ejemplo de test E2E
```typescript
[Ejemplo REAL de un test E2E del proyecto]
```

### Page Objects
[Si usan page objects, documentar]

### Fixtures
[Fixtures disponibles]

## Coverage

### Generar reporte de coverage
```bash
[comando]
```

### Ver reporte HTML
```bash
[comando o ubicacion]
```

### Umbrales de coverage
| Metrica | Umbral |
|---------|--------|
| Lines | [%] |
| Branches | [%] |
| Functions | [%] |
| Statements | [%] |

## CI/CD Integration

### Tests en GitHub Actions
[Workflow que corre tests]

### Cuando corren los tests
- PR: [si/no]
- Push a main: [si/no]
- Nightly: [si/no]

## Datos de Prueba

### Usuarios de test
| Email | Password | Rol |
|-------|----------|-----|
[Si existen usuarios de test]

### Tarjetas de prueba MercadoPago
| Numero | CVV | Vencimiento | Resultado |
|--------|-----|-------------|-----------|
| 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| 5031 7557 3453 0604 | 123 | 11/25 | Rechazado |
[Tarjetas de test de MP]

### Seeds de base de datos
[Si existen seeds para testing]

## Debugging Tests

### Ejecutar con verbose
```bash
[comando]
```

### Debugging en VS Code
[Configuracion de launch.json si existe]

### Screenshots en E2E fallidos
[Donde se guardan, como verlos]

## Best Practices

### Que testear
- [Lista de que debe tener tests]

### Que NO testear
- [Lista de que no necesita tests]

### Naming conventions
- [Convencion de nombres de tests]

## Tests Existentes

### Servicios con tests
[Lista de servicios que tienen .spec.ts]

### Componentes con tests
[Lista de componentes que tienen .spec.ts]

### Coverage actual
[Si se puede obtener el % actual]
```

### Formato de salida:
- Comandos REALES del proyecto
- Ejemplos de tests REALES del codigo
- Configuracion especifica encontrada
- Maximo 400 lineas
