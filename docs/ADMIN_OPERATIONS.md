# PROMPT PARA GEMINI - ADMIN_OPERATIONS.md

## Objetivo
Documentar el panel de administracion y operaciones de Autorenta.

## Instrucciones para Gemini

Analiza los archivos del modulo admin:

### Archivos a analizar:
1. `apps/web/src/app/features/admin/**` - TODO el modulo admin (39 archivos)
2. `apps/web/src/app/core/services/admin/**` - Servicios admin
3. `apps/web/src/app/core/types/admin.types.ts` - Types de admin
4. `supabase/migrations/*admin*` - Migraciones admin
5. `supabase/migrations/*rbac*` - Permisos y roles

### Secciones requeridas:

```markdown
# Admin Operations

## Acceso al Panel Admin

### URL
[Ruta del admin panel]

### Roles y Permisos
| Rol | Permisos | Descripcion |
|-----|----------|-------------|
[Listar roles: super_admin, admin, support, etc]

### Como asignar rol admin
[SQL o proceso]

## Dashboard Principal

### Metricas mostradas
- [Total usuarios]
- [Total autos]
- [Reservas activas]
- [Ingresos]
[... todas las metricas]

### Graficos
[Describir graficos disponibles]

## Gestion de Usuarios

### Lista de usuarios
- Filtros disponibles: [Lista]
- Acciones: [Editar, suspender, eliminar]

### Verificacion KYC
- Estados: [pending, approved, rejected]
- Proceso de revision: [Pasos]
- Documentos requeridos: [Lista]

### Suspension de usuarios
- Motivos: [Lista]
- Proceso: [Pasos]
- Notificacion al usuario: [Como]

## Gestion de Autos

### Aprobacion de autos
- Criterios: [Lista]
- Proceso: [Pasos]

### Suspension de autos
- Motivos: [Lista]

## Gestion de Reservas

### Vista de reservas
- Filtros: [Lista]
- Acciones administrativas: [Lista]

### Cancelacion forzada
- Cuando usar: [Casos]
- Proceso: [Pasos]
- Impacto en pagos: [Que pasa]

## Disputas

### Panel de disputas
- Estados: [open, in_review, resolved]
- Informacion mostrada: [Lista]

### Proceso de resolucion
1. [Revisar evidencia]
2. [Contactar partes]
3. [Tomar decision]
4. [Ejecutar resolucion]

### Opciones de resolucion
- Reembolso total al renter
- Reembolso parcial
- A favor del owner
- [Otras opciones]

### Ejecucion de reembolsos
- Edge function: [Nombre]
- Proceso: [Pasos]

## Contabilidad / Accounting

### Dashboard contable
- Ingresos por periodo
- Comisiones cobradas
- Payouts pendientes
- [Otras metricas]

### FGO (Fondo de Garantia)
- Que es: [Descripcion]
- Como funciona: [Proceso]
- Reportes: [Disponibles]

### Payouts
- Lista de payouts pendientes
- Proceso de aprobacion
- Ejecucion masiva

### Reportes
- Exportar transacciones
- Reporte de comisiones
- [Otros reportes]

## Subscripciones

### Vista de subscripciones
- Activas
- Canceladas
- Por vencer

### Gestion manual
- Activar subscription
- Cancelar subscription
- Cambiar tier

## Notificaciones Masivas

### Enviar notificacion
- A todos los usuarios
- A segmento especifico
- Canales: [push, email, in-app]

## Configuracion del Sistema

### Feature flags
[Si existen]

### Parametros configurables
- Comision de plataforma: [%]
- Dias minimos de reserva
- [Otros parametros]

## Logs y Auditoria

### Logs de acciones admin
- Donde ver: [Tabla o servicio]
- Que se loguea: [Lista]

### Logs de sistema
- Supabase logs
- Edge function logs

## Componentes Angular

### Rutas del admin
| Ruta | Componente | Descripcion |
|------|------------|-------------|
[Listar TODAS las rutas /admin/*]

### Servicios
[Listar servicios admin]

## Permisos RLS para Admin

### Policies especiales
[SQL de policies que permiten acceso admin]
```

### Formato de salida:
- Documentar TODAS las funcionalidades encontradas
- Incluir rutas exactas
- SQL de permisos
- Maximo 600 lineas
