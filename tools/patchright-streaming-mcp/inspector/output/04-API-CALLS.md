# 🌐 API Calls - AutoRenta

> Análisis de llamadas de red detectadas
> Backend: Supabase

## Resumen de Assets

| Página | JS | CSS | Imágenes | Fonts | Otros | Total |
|--------|----|----|----------|-------|-------|-------|
| landing | 0 | 0 | 0 | 0 | 0 | 0 |
| auth_login | 0 | 0 | 0 | 0 | 0 | 0 |
| cars_list | 0 | 0 | 0 | 0 | 0 | 0 |
| home_marketplace | 0 | 0 | 0 | 0 | 0 | 0 |
| home_profile | 0 | 0 | 0 | 0 | 0 | 0 |
| home_bookings | 0 | 0 | 0 | 0 | 0 | 0 |
| home_wallet | 0 | 0 | 0 | 0 | 0 | 0 |
| home_cars | 0 | 0 | 0 | 0 | 0 | 0 |
| home_notifications | 0 | 0 | 0 | 0 | 0 | 0 |

## API Endpoints Detectados

No se detectaron llamadas API específicas.

## Patrones de API

### Supabase Endpoints

```
Base URL: https://[project].supabase.co

Auth:
  POST /auth/v1/token      - Login/Refresh
  POST /auth/v1/signup     - Registro
  POST /auth/v1/logout     - Logout

Database (REST):
  GET  /rest/v1/[table]    - Select
  POST /rest/v1/[table]    - Insert
  PATCH /rest/v1/[table]   - Update
  DELETE /rest/v1/[table]  - Delete

RPC:
  POST /rest/v1/rpc/[function]  - Llamadas a funciones

Storage:
  GET /storage/v1/object/[bucket]/[path]  - Descargar
  POST /storage/v1/object/[bucket]        - Subir
```

### Headers Requeridos

```http
Authorization: Bearer [access_token]
apikey: [anon_key]
Content-Type: application/json
```
