# 📡 Roadmap: AutoRenta Mesh (Project Beacon)

> **Versión:** 1.0
> **Fecha:** Enero 2026
> **Autor:** Claude + Eduardo
> **Estado:** En planificación

---

## 1. Resumen Ejecutivo

### Objetivo
Permitir que dispositivos sin internet emitan una señal de socorro (Beacon) vía Bluetooth Low Energy que sea capturada por otros dispositivos cercanos y retransmitida a la nube.

### Concepto
**"Red de Vigilancia Comunitaria"** - Cada usuario de AutoRenta con la app instalada se convierte en un nodo de la red que puede:
1. **Emitir** una señal de emergencia cuando está en peligro (Modo Faro)
2. **Detectar** señales de otros usuarios y retransmitirlas a Supabase (Modo Radar)

### Arquitectura Clave: "Asimétrica"
Basado en la investigación técnica, adoptamos una arquitectura asimétrica que reconoce las limitaciones de iOS:

```
┌─────────────────────────────────────────────────────────────┐
│  ANDROID (80% de usuarios LATAM)                            │
│  ✅ Background Advertising (ForegroundService)              │
│  ✅ Background Scanning (sin restricciones)                 │
│  ✅ Funciona con pantalla apagada                           │
│  → ROL: Infraestructura permanente (Faro + Radar 24/7)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  iOS (20% de usuarios LATAM)                                │
│  ✅ Foreground Advertising (con Keep-Awake)                 │
│  ⚠️ Background Scanning (limitado, solo iOS-to-iOS)         │
│  ❌ Background Advertising (imposible cross-platform)       │
│  → ROL: Nodo activo solo en emergencia explícita            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Investigación Técnica Completada

### 2.1 Hallazgos Críticos

| Tema | Hallazgo | Fuente |
|------|----------|--------|
| Plugin BLE | `@capgo/capacitor-bluetooth-low-energy` soporta peripheral mode GRATIS | [GitHub](https://github.com/Cap-go/capacitor-bluetooth-low-energy) |
| Android 15 | `connectedDevice` foreground service NO tiene timeout | [Android Docs](https://developer.android.com/develop/background-work/services/fgs/timeout) |
| iOS 18 | Bug de scanning corregido en 18.1, pero background advertising sigue limitado | [Apple Forums](https://developer.apple.com/forums/thread/759280) |
| BLE Packet | Máximo 31 bytes legacy, 27 bytes útiles para payload custom | [Novel Bits](https://novelbits.io/maximum-data-bluetooth-advertising-packet-ble/) |
| iOS Background | Usa "overflow area" propietario, invisible para Android | [David Young Research](https://davidgyoungtech.com/2020/05/07/hacking-the-overflow-area) |

### 2.2 Stack Tecnológico Seleccionado

| Componente | Tecnología | Razón |
|------------|------------|-------|
| BLE Plugin | `@capgo/capacitor-bluetooth-low-energy` | Gratis, soporta peripheral mode, foreground service built-in |
| Keep Awake | `@capacitor-community/keep-awake` | Maduro, sin permisos extra |
| Backend | Supabase Edge Functions (Deno) | Ya integrado en AutoRenta |
| Protocolo | AR-Protocol custom (24 bytes) | Ultracompacto para BLE |
| Notificaciones | Push existente de AutoRenta | Reutilizar infraestructura |

### 2.3 Alternativas Descartadas

| Alternativa | Razón de Descarte |
|-------------|-------------------|
| Bridgefy SDK | Costo por MAU, dependencia externa, vulnerabilidades reportadas 2023 |
| `@capacitor-community/bluetooth-le` | Solo soporta Central role, no Peripheral |
| Plugin custom nativo | Innecesario dado que @capgo/ble ya existe |
| iOS Background Advertising | Técnicamente imposible para cross-platform |

---

## 3. AR-Protocol (Protocolo de Beacon)

### 3.1 Estructura del Payload (24 bytes)

```
┌────────────────────────────────────────────────────────────────┐
│  BLE Manufacturer Specific Data (AD Type 0xFF)                 │
├────────┬──────┬────────────────────────────────────────────────┤
│ Offset │ Size │ Campo                                          │
├────────┼──────┼────────────────────────────────────────────────┤
│ 0      │ 1B   │ Magic Byte: 0xAR (identificador AutoRenta)     │
│ 1      │ 1B   │ Version (4 bits) + AlertType (4 bits)          │
│ 2-9    │ 8B   │ Booking/User ID (UUID truncado o hash)         │
│ 10-13  │ 4B   │ Latitude (Float32 IEEE 754)                    │
│ 14-17  │ 4B   │ Longitude (Float32 IEEE 754)                   │
│ 18-21  │ 4B   │ Timestamp (Unix epoch seconds)                 │
│ 22-23  │ 2B   │ CRC16 (checksum para validación)               │
└────────┴──────┴────────────────────────────────────────────────┘
```

### 3.2 Tipos de Alerta (AlertType)

| Valor | Tipo | Descripción |
|-------|------|-------------|
| 0x01 | SOS | Emergencia general (botón de pánico) |
| 0x02 | THEFT | Robo reportado |
| 0x03 | CRASH | Accidente detectado |
| 0x04 | SILENT | Silencio sospechoso (auto no responde) |

### 3.3 Ofuscación

El payload se ofusca con XOR usando una clave derivada del timestamp para evitar tracking malicioso:
```typescript
const obfuscationKey = timestamp % 256;
const obfuscatedPayload = payload.map(byte => byte ^ obfuscationKey);
```

---

## 4. Roadmap de Implementación

### Fase 1: Protocolo y Core (Semana 1)
**Objetivo:** Implementar AR-Protocol y servicio base sin dependencias de hardware.

| Tarea | Archivo | Prioridad |
|-------|---------|-----------|
| Definir tipos TypeScript para AR-Protocol | `core/models/beacon.model.ts` | Alta |
| Implementar `encodeBeaconPayload()` | `core/services/beacon/ar-protocol.service.ts` | Alta |
| Implementar `decodeBeaconPayload()` | `core/services/beacon/ar-protocol.service.ts` | Alta |
| Unit tests para encode/decode | `core/services/beacon/ar-protocol.service.spec.ts` | Alta |
| Función CRC16 | `utils/crc16.ts` | Media |

**Entregable:** Protocolo 100% testeable sin hardware.

---

### Fase 2: Integración BLE (Semana 2)
**Objetivo:** Conectar con el plugin BLE y lograr advertising/scanning básico.

| Tarea | Archivo | Prioridad |
|-------|---------|-----------|
| Instalar `@capgo/capacitor-bluetooth-low-energy` | `package.json` | Alta |
| Instalar `@capacitor-community/keep-awake` | `package.json` | Alta |
| Crear `BeaconService` (orquestador) | `core/services/beacon/beacon.service.ts` | Alta |
| Implementar `startBroadcasting()` | `core/services/beacon/beacon.service.ts` | Alta |
| Implementar `startScanning()` | `core/services/beacon/beacon.service.ts` | Alta |
| Configurar permisos Android (`AndroidManifest.xml`) | `android/app/src/main/AndroidManifest.xml` | Alta |
| Configurar permisos iOS (`Info.plist`) | `ios/App/App/Info.plist` | Alta |
| Configurar Foreground Service Android | `capacitor.config.ts` | Media |

**Permisos Android requeridos:**
```xml
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

**Entregable:** Dos dispositivos Android pueden verse mutuamente.

---

### Fase 3: Backend (Semana 3)
**Objetivo:** Recibir, validar y procesar señales en Supabase.

| Tarea | Archivo | Prioridad |
|-------|---------|-----------|
| Crear tabla `security_events` | `supabase/migrations/YYYYMMDD_create_security_events.sql` | Alta |
| Crear tabla `beacon_relays` (quién detectó qué) | `supabase/migrations/YYYYMMDD_create_beacon_relays.sql` | Alta |
| Edge Function `beacon-relay` | `supabase/functions/beacon-relay/index.ts` | Alta |
| Validación de CRC y payload | `supabase/functions/beacon-relay/index.ts` | Alta |
| Lookup de Booking/User por hash | `supabase/functions/beacon-relay/index.ts` | Media |
| Trigger de notificación push al Owner | `supabase/functions/beacon-relay/index.ts` | Alta |
| Reward points al Scout (gamification) | `supabase/functions/beacon-relay/index.ts` | Baja |

**Schema `security_events`:**
```sql
CREATE TABLE public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  car_id UUID REFERENCES public.cars(id),
  user_id UUID REFERENCES public.profiles(id),
  alert_type TEXT NOT NULL, -- 'SOS', 'THEFT', 'CRASH', 'SILENT'
  source_location GEOGRAPHY(POINT),
  detected_by UUID[], -- Array de scouts que detectaron
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'FALSE_ALARM'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

**Entregable:** Signal flow completo: Beacon → Scout → Supabase → Push al Owner.

---

### Fase 4: UI de Emergencia (Semana 4)
**Objetivo:** Pantallas de usuario para activar/ver el sistema.

| Tarea | Archivo | Prioridad |
|-------|---------|-----------|
| Botón SOS en Home | `features/home/home.page.ts` | Alta |
| Pantalla "Modo Pánico" (full screen, keep-awake) | `features/emergency/panic-mode.page.ts` | Alta |
| Indicador "Modo Centinela Activo" (Android) | `shared/components/sentinel-indicator/` | Media |
| Pantalla de permisos onboarding | `features/onboarding/beacon-permissions.page.ts` | Alta |
| Historial de alertas detectadas (Scout) | `features/profile/scout-history.page.ts` | Baja |
| Notificación "Ayudaste a localizar un vehículo" | Push notification template | Media |

**UX Modo Pánico (iOS):**
```
┌─────────────────────────────────────────┐
│  🚨 EMITIENDO SEÑAL DE EMERGENCIA 🚨    │
│                                         │
│  Mantén esta pantalla abierta.          │
│  Tu ubicación se está transmitiendo.    │
│                                         │
│  [████████████░░░░] Batería: 67%        │
│                                         │
│  Brillo reducido para ahorrar energía.  │
│                                         │
│         [ CANCELAR EMERGENCIA ]         │
└─────────────────────────────────────────┘
```

**Entregable:** Usuario puede activar SOS y ver estado del sistema.

---

### Fase 5: Optimización y Testing (Semana 5)
**Objetivo:** Estabilizar, optimizar batería, y testing en campo.

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| Duty Cycling | Escanear 10s → Dormir 5min (ahorro batería) | Alta |
| Detección de movimiento | Pausar scan si acelerómetro = quieto | Media |
| Testing en campo | Probar con 2+ Android y 2+ iPhone físicos | Alta |
| Métricas de batería | Medir consumo real en 24h | Alta |
| Rate limiting | Evitar spam de relays duplicados | Media |
| Deduplicación | No procesar mismo beacon 2 veces en 5min | Media |

**Entregable:** Sistema estable con consumo de batería aceptable (<5% en 24h idle).

---

### Fase 6: Compliance y Deploy (Semana 6)
**Objetivo:** Preparar para producción y app stores.

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| Actualizar Privacy Policy | Detallar uso de BLE y ubicación background | Alta |
| Pantallas de consentimiento | GDPR/LGPD compliant | Alta |
| Video demostrativo | Para revisores de Apple/Google | Alta |
| Feature flag | `enableBeaconMesh: boolean` en environment | Media |
| A/B testing | Rollout gradual (10% → 50% → 100%) | Media |
| Monitoreo Sentry | Tracking de errores BLE | Media |

**Entregable:** App lista para submit a stores.

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Rechazo de Apple** | Media | Alto | Feature funciona foreground-only en iOS. Documentar claramente el valor de seguridad. |
| **Consumo excesivo de batería** | Media | Alto | Duty cycling agresivo. Pausar cuando dispositivo quieto. |
| **Falsos positivos BLE** | Baja | Medio | CRC validation + deduplicación temporal. |
| **Plugin @capgo discontinuado** | Baja | Alto | Código es open source, podemos fork si es necesario. |
| **Usuarios no dan permisos** | Media | Medio | UX de onboarding explicando el valor ("Escudo Comunitario"). |
| **Pocos usuarios = red vacía** | Alta (inicialmente) | Alto | Gamification: puntos por ser Scout. Mostrar "X usuarios protegiendo tu zona". |

---

## 6. Métricas de Éxito

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| % usuarios con permisos BLE | >60% | Analytics de onboarding |
| Tiempo promedio de detección | <5 min | Timestamp beacon vs timestamp relay |
| Consumo batería (Android background) | <5% en 24h | Testing manual + user reports |
| Tasa de falsos positivos | <1% | security_events con status=FALSE_ALARM |
| Recuperaciones exitosas | >0 en 6 meses | security_events → booking recovery |

---

## 7. Dependencias Externas

| Dependencia | Versión | Link |
|-------------|---------|------|
| `@capgo/capacitor-bluetooth-low-energy` | ^1.x | [npm](https://www.npmjs.com/package/@capgo/capacitor-bluetooth-low-energy) |
| `@capacitor-community/keep-awake` | ^6.x | [npm](https://www.npmjs.com/package/@capacitor-community/keep-awake) |
| Capacitor | ^6.x o ^7.x | Ya instalado |
| Android SDK | 35 (Android 15) | Ya configurado |
| iOS Deployment Target | 15.0+ | Ya configurado |

---

## 8. Preguntas Abiertas

1. **¿Integrar con Scouts (Bounty System)?** - Si un beacon es detectado, ¿activar automáticamente una misión Scout en la zona?
2. **¿Notificar a autoridades?** - ¿Debería haber opción de escalar a policía automáticamente?
3. **¿Reward económico a Scouts?** - ¿Dar créditos/descuentos a usuarios que detectan señales?
4. **¿Beacon hardware opcional?** - ¿Ofrecer un dispositivo físico BLE para dejar en el auto?

---

## 9. Timeline Resumen

```
Semana 1  │ Fase 1: AR-Protocol (TypeScript puro)
Semana 2  │ Fase 2: Integración BLE + Permisos
Semana 3  │ Fase 3: Backend Supabase
Semana 4  │ Fase 4: UI de Emergencia
Semana 5  │ Fase 5: Optimización + Testing Campo
Semana 6  │ Fase 6: Compliance + Deploy
──────────┼─────────────────────────────────────
          │ 🚀 LAUNCH
```

---

## 10. Referencias

- [Android BLE Background](https://developer.android.com/develop/connectivity/bluetooth/ble/background)
- [Android 15 Foreground Services](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [iOS CoreBluetooth Background](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- [BLE Advertising Packet Structure](https://novelbits.io/maximum-data-bluetooth-advertising-packet-ble/)
- [@capgo/capacitor-bluetooth-low-energy](https://github.com/Cap-go/capacitor-bluetooth-low-energy)
- [iOS Overflow Area Research](https://davidgyoungtech.com/2020/05/07/hacking-the-overflow-area)

---

**© 2026 AutoRenta | Project Beacon v1.0**
