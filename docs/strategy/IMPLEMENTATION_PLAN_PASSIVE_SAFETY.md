# 🛡️ Implementation Plan: Passive Safety Network (AutoRenta Guardian)

> **Estado:** Draft
> **Fecha:** 2026-01-24
> **Prioridad:** Alta (Diferenciador de Mercado + Protección de Activos)
> **Owner:** Dev Team

## 1. Resumen Ejecutivo
Implementación de un sistema de **Seguridad Pasiva** ("AutoRenta Guardian") que utiliza la sensórica del dispositivo móvil (Acelerómetro, Giroscopio, GPS) para detectar incidentes críticos (choques, conducción temeraria, robos) sin intervención del usuario. 

El sistema operará bajo una arquitectura de **Privacidad por Diseño**, cumpliendo estrictamente la Ley 25.326 (Argentina) y limitando el monitoreo exclusivamente a la ventana temporal de la reserva activa (`BookingStatus.IN_PROGRESS`).

---

## 2. Objetivos
1.  **Detección de Impactos (Crash Detection):** Identificar desaceleraciones > 4G compatibles con accidentes.
2.  **Monitoreo de Comportamiento:** Scoring de conducción (frenadas bruscas, exceso de velocidad).
3.  **Dead Man's Switch:** Protocolo de verificación de vida tras detectar anomalías.
4.  **Asset Recovery:** Rastreo de alta frecuencia en casos de no-devolución o robo.
5.  **Eficiencia Energética:** Impacto <3% en batería diaria mediante `ActivityRecognition`.

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico
*   **Frontend Mobile:** Ionic + Capacitor.
*   **Plugins Nativos:** 
    *   `@capacitor/motion` (Acelerómetro/Giroscopio).
    *   `@capacitor/geolocation` (GPS).
    *   `cordova-plugin-background-mode` (para ejecución crítica, sujeto a revisión de store).
*   **Backend:** Supabase Edge Functions (Procesamiento de telemetría).
*   **Database:** Tablas `telemetry_logs` y `safety_alerts`.

### 3.2 Diagrama de Flujo de Datos

```mermaid
graph TD
    A[Sensores Móvil] -->|Raw Data (50Hz)| B(Local Buffer/Fusion)
    B -->|Detecta Anomalía| C{Algoritmo Local}
    C -->|Falso Positivo| A
    C -->|Evento Crítico| D[Edge Function: process-safety-event]
    D -->|Persistencia| E[(Supabase DB)]
    D -->|Notificación| F[Owner/Admin Dashboard]
    D -->|Webhook| G[Servicios Emergencia (Futuro)]
```

---

## 4. Fases de Implementación

### Fase 1: Fundamentos Legales y UI de Consentimiento (Semana 1)
*Objetivo: Establecer el marco legal y obtener permisos explícitos.*

1.  **Legal Framework:**
    *   Redacción de cláusula de "Monitoreo Telemétrico durante el Arrendamiento".
    *   Actualización de TyC para cumplir con jurisprudencia *Fischer* (monitoreo solo en horas de uso contratado).
2.  **UI Components:**
    *   `SafetyPermissionsComponent`: Modal explicativo solicitando acceso a Motion y Location "Always" (necesario para background).
    *   Indicador visual persistente "Guardian Active" durante el viaje.

### Fase 2: Telemetría y "Driving Score" (Semana 2-3)
*Objetivo: Capturar datos sin drenar batería.*

1.  **Service:** Crear `PassiveSafetyService` en `core/services/geo/`.
2.  **Lógica de Negocio:**
    *   Implementar "Activity Recognition": Solo activar GPS de alta precisión si `speed > 10km/h`.
    *   Calculo de vectores de aceleración $A_n = \sqrt{X^2 + Y^2 + Z^2}$.
3.  **Backend:**
    *   Tabla `driving_scores` vinculada al `booking_id`.
    *   Edge Function para calcular reputación del conductor post-viaje.

### Fase 3: Crash Detection & Dead Man's Switch (Semana 4-5)
*Objetivo: Detección de accidentes graves.*

1.  **Algoritmo de Detección:**
    *   **Trigger:** Pico de aceleración > 4G.
    *   **Validación:** Pérdida abrupta de velocidad (GPS) + Cambio de orientación (Giroscopio) + Silencio cinético posterior (0 movement).
2.  **Protocolo de Respuesta:**
    *   UI: "Hemos detectado un impacto. ¿Estás bien?" (Cuenta regresiva 60s).
    *   **Dead Man's Switch:** Si no hay respuesta -> Trigger `emergency-alert` (Push al Owner + SMS a contacto de emergencia del Renter).

### Fase 4: Asset Recovery (Semana 6)
*Objetivo: Recuperación de vehículos no devueltos.*

1.  **Geofencing Dinámico:**
    *   Alerta si el vehículo sale de la zona permitida o cruza fronteras provinciales/nacionales.
2.  **Ghost Mode:**
    *   Si `now > booking.end_date + grace_period`, activar rastreo de máxima frecuencia y notificar a `LegalService`.

---

## 5. Estructura de Datos (Schema Changes)

```sql
-- public.telemetry_events
create table public.telemetry_events (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id),
  event_type text check (event_type in ('CRASH', 'HARD_BRAKE', 'SPEEDING', 'ROLLOVER')),
  severity float, -- Escala 0.0 a 1.0 o valor G-Force
  gps_coords geography(POINT),
  raw_sensor_data jsonb, -- Snapshot de acelerometro pre/post evento
  created_at timestamp with time zone default now()
);

-- RLS: Insert only by renter during active booking
create policy "Renters can insert telemetry during booking" 
on public.telemetry_events for insert 
to authenticated 
with check (
  exists (
    select 1 from public.bookings 
    where id = telemetry_events.booking_id 
    and renter_id = auth.uid() 
    and status = 'in_progress'
  )
);
```

---

## 6. Riesgos y Mitigación

| Riesgo | Probabilidad | Mitigación |
| :--- | :--- | :--- |
| **Drenaje de Batería** | Alta | Uso de Geofencing pasivo y activación de sensores solo al detectar movimiento vehicular. |
| **Falsos Positivos (Caída de cel)** | Media | Fusión de sensores: Requerir velocidad GPS > 20km/h antes del impacto para considerarlo choque vehicular. |
| **Legal/Privacidad** | Alta | "Killswitch" automático: El monitoreo se apaga por software (backend) y hardware (app deja de escuchar) al finalizar el Booking. |
| **Cierre de App por OS** | Alta | Implementar notificaciones persistentes (Foreground Service) en Android. |

---

## 7. Próximos Pasos Inmediatos
1.  [ ] Crear rama `feat/passive-safety-guardian`.
2.  [ ] Instalar `@capacitor/motion`.
3.  [ ] Prototipar el algoritmo de detección de G-Force en un componente de prueba.
