# 🌐 API Calls - AutoRenta

> Análisis de llamadas de red detectadas
> Backend: Supabase

## Resumen de Assets

| Página | JS | CSS | Imágenes | Fonts | Otros | Total |
|--------|----|----|----------|-------|-------|-------|

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
