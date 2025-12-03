# AutoRenta - Features

> Marketplace de alquiler de autos entre particulares para Argentina

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 20 (standalone components) + Tailwind CSS + PrimeNG + Ionic |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions, Realtime) |
| Pagos | MercadoPago (OAuth, Payment Brick, Webhooks) |
| Mapas | Mapbox GL JS con clustering |
| Hosting | Cloudflare Pages + Workers |
| PWA | Service Worker con soporte offline |

---

## Features para Locatarios (Renters)

### Búsqueda y Marketplace
- **Marketplace con 3 vistas**: Grid, Lista y Mapa interactivo
- **Filtros avanzados**: Precio, tipo de vehículo, transmisión, combustible, año
- **Búsqueda por ubicación**: Geocodificación con distancia a cada auto
- **Rango de fechas**: Selector de período de alquiler
- **Ordenamiento**: Por precio, distancia, rating, disponibilidad
- **Visor 3D**: Visualización 360° de vehículos (Tripo AI)
- **Comparador de autos**: Comparar hasta 3 vehículos lado a lado
- **Social proof**: Badges de "visto recientemente", disponibilidad limitada
- **Precios dinámicos**: Surge pricing según demanda en tiempo real

### Reservas y Bookings
- **Wizard de reserva**: Flujo paso a paso para crear reserva
- **Calendario de disponibilidad**: Fechas disponibles/bloqueadas
- **Selector de seguros**: Múltiples niveles de cobertura
- **Desglose de precios**: Tarifa base, fees, seguros, descuentos
- **Check-in digital**: Documentación del estado del vehículo con fotos
- **Check-out digital**: Confirmación de devolución
- **Timeline de reserva**: 9 etapas del ciclo de vida de la reserva
- **Contratos digitales**: Generación y firma de contratos
- **Reserva urgente**: Modo para alquileres de última hora

### Wallet y Pagos
- **Billetera digital**: Balance disponible, bloqueado y total
- **Depósitos**: Via MercadoPago (tarjetas, transferencia, efectivo)
- **Pago mixto**: Combinar wallet + tarjeta de crédito
- **Historial de transacciones**: Registro completo de movimientos
- **Garantías bilaterales**: Fondos bloqueados durante la reserva

### Verificación de Identidad
- **Nivel 1 - Contacto**: Email + teléfono verificado (OTP SMS)
- **Nivel 2 - Documentos**: DNI + licencia de conducir
- **Nivel 3 - Identidad**: Selfie con verificación facial
- **Progreso visual**: Barra de progreso por niveles
- **Milestones**: Notificaciones al 50% y 80% de completitud

### Comunicación
- **Chat en tiempo real**: Mensajería entre renter y owner
- **Notificaciones push**: PWA notifications
- **Centro de notificaciones**: Historial filtrable por tipo
- **Emails transaccionales**: Confirmaciones, recordatorios, alertas

### Perfil y Cuenta
- **Perfil público**: Información visible para otros usuarios
- **Autos favoritos**: Lista de vehículos guardados
- **Historial de reservas**: Todas las reservas pasadas y activas
- **Reseñas recibidas**: Rating y comentarios de owners
- **Configuración de notificaciones**: Preferencias de alertas
- **Estadísticas de conducción**: Métricas del perfil de conductor

---

## Features para Locadores (Owners)

### Publicación de Autos
- **Formulario wizard**: Publicación paso a paso
- **FIPE Autocomplete**: Selector de marca/modelo con datos oficiales
- **Fotos del vehículo**: Upload múltiple con drag & drop
- **AI Photo Generator**: Generación de fotos con IA (FLUX.1 / stock)
- **AI Photo Enhancer**: Mejora automática de fotos
- **Ubicación del auto**: Selector con mapa y geocodificación
- **Precio diario**: Configuración de tarifa base
- **Características**: Aire acondicionado, GPS, bluetooth, etc.
- **Documentos del vehículo**: VTV, seguro, título

### Gestión de Disponibilidad
- **Calendario visual**: Vista mensual de disponibilidad
- **Bloqueo de fechas**: Manual o por rangos
- **Bloqueo masivo**: Bloquear múltiples fechas de una vez
- **Sincronización**: Google Calendar (próximamente)

### Dashboard de Owner
- **Resumen de ganancias**: Total, este mes, este año
- **Reservas activas**: Pendientes, en curso, completadas
- **Estadísticas**: Tasa de ocupación, rating promedio
- **Widgets**: Calendario, earnings, reseñas, seguros
- **Gráficos de tendencia**: Evolución de ingresos

### Cobros y Retiros
- **Split de pagos**: 85% owner / 15% plataforma
- **Cuentas bancarias**: Registro de cuentas para retiros
- **Solicitud de retiro**: Transferencia a cuenta bancaria
- **Historial de payouts**: Registro de liquidaciones
- **MercadoPago Connect**: Vinculación OAuth para cobros directos

### Gestión de Reservas (Owner)
- **Aprobación de reservas**: Aceptar/rechazar solicitudes
- **Check-in owner**: Documentar entrega del vehículo
- **Check-out owner**: Confirmar devolución
- **Reporte de daños**: Documentar daños con fotos y descripción
- **Disputas**: Abrir reclamos por daños o incumplimientos

### Reseñas
- **Calificar renters**: 6 categorías (limpieza, comunicación, precisión, ubicación, check-in, valor)
- **Comentarios**: Público y privado
- **Rating promedio**: Cálculo automático

---

## Features del Sistema de Pagos

### Integración MercadoPago
- **Payment Brick**: Checkout embebido en la plataforma
- **OAuth Connect**: Vinculación de cuentas de owners
- **Webhooks**: Notificaciones de estado de pagos (IPN)
- **Múltiples métodos**: Tarjetas, MercadoPago, transferencia, efectivo

### Sistema de Garantías Bilateral
- **Bloqueo de fondos**: Garantía retenida durante la reserva
- **Liberación automática**: Al completar la reserva sin incidentes
- **Retención por daños**: Fondos bloqueados hasta resolver disputa
- **Reembolsos**: Procesamiento automático de devoluciones

### Precios Dinámicos
- **Surge pricing**: Aumento automático en alta demanda
- **Realtime updates**: Precios actualizados en tiempo real
- **Indicador visual**: Badge de precio dinámico en cards
- **Tasas de cambio**: Conversión USD/ARS automática

---

## Features de Seguros y Protección

### Coberturas
- **Múltiples niveles**: Básico, estándar, premium
- **Deducibles configurables**: Según nivel de cobertura
- **Límites de cobertura**: Montos máximos por siniestro

### Bonus Protector
- **3 niveles de protección**:
  - Nivel 1 ($15 USD): 1 siniestro leve
  - Nivel 2 ($25 USD): 2 leves o 1 moderado
  - Nivel 3 ($40 USD): 3 leves, 2 moderados o 1 grave
- **Simulación de impacto**: Ver efecto antes de comprar
- **Renovación automática**: Al expirar la protección

### Sistema de Riesgo
- **Cálculo de riesgo**: Por perfil de usuario y vehículo
- **Matriz de riesgo**: Evaluación automática
- **FGO (Fondo de Garantía)**: Garantía de terceros

---

## Features de Verificación

### Verificación de Teléfono
- **OTP via SMS**: Código de 6 dígitos
- **Múltiples países**: Argentina, USA, México, Brasil, Chile
- **Rate limiting**: 3 intentos por hora
- **Cooldown**: 60 segundos entre envíos

### Verificación de Documentos
- **DNI**: Frente y dorso
- **Licencia de conducir**: Foto y datos
- **Validación manual**: Revisión por admin

### Verificación Facial
- **Selfie**: Comparación con foto del DNI
- **Biometría**: Validación de identidad

---

## Features de Disputas y Reclamos

### Sistema de Disputas
- **Formulario de disputa**: Descripción + evidencia (fotos/videos)
- **Monto reclamado**: Valor del reclamo
- **Estados**: Abierta, en revisión, resuelta
- **Timeline de resolución**: Historial de acciones

### Gestión de Claims
- **Reclamos de reserva**: Por daños, incumplimientos
- **Mediación**: Intervención de la plataforma
- **Resolución**: Decisión final con acción

---

## Panel de Administración

### Dashboard Admin
- **Métricas generales**: Usuarios, reservas, ingresos
- **Gráficos**: Tendencias y comparativas
- **Alertas**: Issues que requieren atención

### Verificaciones
- **Cola de verificaciones**: Documentos pendientes de revisar
- **Aprobación/Rechazo**: Con comentarios
- **Historial**: Registro de verificaciones procesadas

### Gestión Financiera
- **Contabilidad**: Balance general de la plataforma
- **Monitoreo de depósitos**: Estado de pagos entrantes
- **Liquidaciones**: Pagos pendientes a owners
- **Retiros**: Solicitudes de retiro
- **Reembolsos**: Procesamiento de devoluciones

### Gestión de Contenido
- **Gestión de reseñas**: Moderación de contenido
- **Feature flags**: Activar/desactivar funcionalidades
- **Tipos de cambio**: Configurar tasas USD/ARS
- **Precios**: Configuración de pricing

### Analytics
- **Métricas de uso**: Usuarios activos, sesiones
- **Conversión**: Funnel de reservas
- **Performance**: Tiempos de carga, errores

### Exportación
- **Database export**: Exportar datos de la base

---

## Features Técnicas

### PWA (Progressive Web App)
- **Instalable**: Banner de instalación
- **Offline**: Funcionalidad básica sin conexión
- **Push notifications**: Alertas en tiempo real

### Realtime
- **Supabase Realtime**: Channels para updates en vivo
- **Mensajes**: Chat instantáneo
- **Precios**: Actualización de precios dinámicos
- **Notificaciones**: Alertas inmediatas

### Geolocalización
- **Mapbox GL**: Mapas interactivos
- **Clustering**: Agrupación de markers
- **Geocodificación**: Búsqueda por dirección
- **Direcciones**: Cálculo de rutas
- **Distancias**: Cálculo automático a cada auto

### Integraciones IA
- **Cloudflare AI**: Generación de imágenes (FLUX.1)
- **Photo Enhancement**: Mejora automática de fotos
- **Detección de daños**: Análisis de imágenes
- **Tripo AI**: Generación de modelos 3D

### SEO y Marketing
- **Schema.org**: Datos estructurados
- **Meta Pixel**: Tracking de Facebook
- **TikTok Events**: Tracking de TikTok
- **Referidos**: Sistema de comisiones

---

## Módulos Adicionales

### Onboarding
- **Smart Onboarding**: Flujo adaptativo según rol
- **Become Renter**: Landing para convertirse en anfitrión
- **Calculadora de ingresos**: Estimación de ganancias

### Legal
- **Términos y condiciones**: Documentos legales
- **Política de seguros**: Coberturas y exclusiones

### Experiencias
- **Tours especiales**: (próximamente)
- **Eventos**: (próximamente)

### Organizaciones
- **Gestión de empresas**: Flotas corporativas (próximamente)

---

## Estadísticas del Codebase

| Métrica | Valor |
|---------|-------|
| Módulos de features | 31 |
| Componentes compartidos | 170+ |
| Servicios | 176 |
| Edge Functions (Supabase) | 40+ |
| Rutas protegidas | 50+ |

---

*Última actualización: Diciembre 2025*
