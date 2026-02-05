# 🔄 Flujos de Usuario - AutoRenta

> Documentación generada automáticamente por Patchright MCP Inspector
> Fecha: 2026-02-05T03:32:20.152Z

## Resumen

| Flujo | Pasos | Estado |
|-------|-------|--------|
| Autenticación | 3 | ✅ |
| Navegación | 0 páginas | ✅ |

## 1. Flujo de Autenticación

### Pasos del Login

#### Paso 1: Initial auth page with modal selector

- **URL**: `/auth/login`
- **Estado**: ✅ Completado

#### Paso 2: Login form with email/password fields

- **URL**: `/auth/login`
- **Estado**: ✅ Completado

#### Paso 3: Login fallido

- **URL**: `📜 Result: "https://autorentar.com/auth/login"
⏱️ 3ms`
- **Estado**: ❌ Error

### Diagrama del Flujo

```
Landing Page
    │
    ▼
[Clic "Ingresar" header]
    │
    ▼
Modal "Tu auto, tu plan"
    │
    ├─→ [Ingresar] ──→ Formulario Login ──→ Dashboard
    │
    └─→ [Crear cuenta] ──→ Formulario Registro
```

## 2. Flujo de Navegación Principal

```
Dashboard (/cars/list)
    │
    ├─→ Marketplace (/home/marketplace)
    ├─→ Perfil (/home/profile)
    ├─→ Reservas (/home/bookings)
    ├─→ Billetera (/home/wallet)
    ├─→ Mis Autos (/home/cars)
    └─→ Notificaciones (/home/notifications)
```

## 3. Páginas Inspeccionadas

| Página | Ruta | Descripción | Tiempo Carga |
|--------|------|-------------|--------------|
