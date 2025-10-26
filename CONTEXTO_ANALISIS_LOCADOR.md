# Contexto para Análisis del Flujo del Locador

## Archivos Principales a Analizar:

### Fase 1: Publicar Vehículo
```
apps/web/src/app/features/cars/publish/
├── publish-car-v2.page.ts (1020 líneas) ⭐ ARCHIVO PRINCIPAL
├── publish-car.page.ts (299 líneas) - Legacy
├── car-publish.page.ts (57 líneas) - Wrapper?
└── *.html (templates)
```

### Fase 2: Gestionar Mis Autos
```
apps/web/src/app/features/cars/my-cars/
├── my-cars.page.ts (70 líneas)
├── my-cars.page.html
└── my-cars.page.css
```

### Fase 3: Gestionar Reservas (ya analizado parcialmente)
```
apps/web/src/app/features/bookings/my-bookings/
├── my-bookings.page.ts
└── my-bookings.page.html (visto anteriormente para botón "Completar Pago")
```

### Fase 4: Gestión Financiera
```
apps/web/src/app/features/wallet/ (si existe)
apps/web/src/app/core/services/wallet.service.ts
apps/web/src/app/core/services/payments.service.ts
```

## Servicios Clave:
- CarsService: CRUD de autos
- WalletService: Gestión de wallet del locador
- PaymentsService: Procesamiento de pagos
- BookingsService: Gestión de reservas

## Preguntas Críticas:

1. **Publicación de Auto:**
   - ¿Validación de imágenes correcta?
   - ¿Se puede publicar sin value_usd? (ahora requerido)
   - ¿Precios dinámicos configurables?

2. **Gestión de Reservas:**
   - ¿El locador puede aceptar/rechazar?
   - ¿Notificaciones funcionando?
   - ¿Comunicación con locatario?

3. **Gestión Financiera:**
   - ¿Cómo recibe el pago el locador?
   - ¿Split con comisión de plataforma?
   - ¿Wallet o transferencia directa?
   - ¿Seguros P2P implementados?

4. **Seguridad:**
   - ¿Puede editar autos con reservas activas?
   - ¿Puede eliminar autos con historial?
   - ¿Validación de permisos (owner_id)?
