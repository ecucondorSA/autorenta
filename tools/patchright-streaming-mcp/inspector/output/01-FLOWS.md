# 🔄 Flujos de Usuario - AutoRenta

> Documentación generada automáticamente por Patchright MCP Inspector
> Fecha: 2026-02-04T03:07:46.775Z

## Resumen

| Flujo | Pasos | Estado |
|-------|-------|--------|
| Autenticación | 3 | ✅ |
| Navegación | 9 páginas | ✅ |

## 1. Flujo de Autenticación

### Pasos del Login

#### Paso 1: Initial auth page with modal selector

- **URL**: `/auth/login`
- **Estado**: ✅ Completado

#### Paso 2: Login form with email/password fields

- **URL**: `/auth/login`
- **Estado**: ✅ Completado

#### Paso 3: Login exitoso, redirigido a dashboard

- **URL**: `📜 Result: "https://autorentar.com/cars/list"
⏱️ 11ms`
- **Estado**: ✅ Completado

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
| landing | `/` | Landing page pública | 6181ms |
| auth_login | `/auth/login` | Flujo de autenticación | 5922ms |
| cars_list | `/cars/list` | Lista de autos (mapa) | 5476ms |
| home_marketplace | `/home/marketplace` | Marketplace | 5907ms |
| home_profile | `/home/profile` | Perfil de usuario | 5619ms |
| home_bookings | `/home/bookings` | Mis reservas | 6513ms |
| home_wallet | `/home/wallet` | Billetera | 5957ms |
| home_cars | `/home/cars` | Mis autos | 5631ms |
| home_notifications | `/home/notifications` | Notificaciones | 5405ms |
