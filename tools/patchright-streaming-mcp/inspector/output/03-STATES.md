# 🔄 Estados de la Aplicación - AutoRenta

> Análisis de los diferentes estados detectados

## Estados por Página

| Página | URL | Auth | Loading | Error | Empty |
|--------|-----|------|---------|-------|-------|
| landing | `/` | ❌ | – | – | – |
| auth_login | `/auth/login` | ❌ | – | – | – |
| cars_list | `/cars/list` | ❌ | – | – | – |
| home_marketplace | `/home/marketplace` | ❌ | – | – | – |
| home_profile | `/home/profile` | ❌ | – | – | – |
| home_bookings | `/home/bookings` | ❌ | – | – | – |
| home_wallet | `/home/wallet` | ❌ | – | – | – |
| home_cars | `/home/cars` | ❌ | – | – | – |
| home_notifications | `/home/notifications` | ❌ | – | – | – |

## Detalle de Estados

### Estados de Autenticación

```
┌─────────────────────────────────────────────┐
│  GUEST (No autenticado)                     │
│  - Landing page visible                      │
│  - Botón "Ingresar" en header               │
│  - Acceso limitado a páginas públicas       │
└─────────────────────────────────────────────┘
                    │
                    ▼ [Login]
┌─────────────────────────────────────────────┐
│  AUTHENTICATED (Autenticado)                │
│  - Dashboard visible                         │
│  - Menú de usuario en header                │
│  - Acceso a todas las páginas               │
│  - Notificaciones visibles                  │
└─────────────────────────────────────────────┘
```

### Estados de Carga

| Estado | Indicador Visual | Duración Típica |
|--------|------------------|-----------------|
| Initial Load | Splash screen | 2-4s |
| Page Navigation | ion-spinner | 0.5-2s |
| Data Fetch | Skeleton loaders | 1-3s |
| Action Processing | ion-loading overlay | Variable |

### Estados de Error

| Código | Página | Descripción |
|--------|--------|-------------|
| – | – | No se detectaron errores |

## Storage

### LocalStorage Keys Detectados

No se detectaron keys en localStorage.
