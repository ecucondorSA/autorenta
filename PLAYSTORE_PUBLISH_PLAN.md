# Plan de Publicacion en Google Play Store - Autorenta

## Estado Actual del Proyecto

| Requisito | Estado | Notas |
|-----------|--------|-------|
| targetSdkVersion | 35 (Android 15) | Cumple requisitos 2025 |
| compileSdkVersion | 35 | OK |
| minSdkVersion | 24 (Android 7.0) | OK |
| Signing Config | Configurado | autorentar-release.keystore |
| Package Name | com.autorentar.app | OK |
| Version | 1.0.8 (versionCode 42) | OK |

---

## FASE 1: Preparacion Tecnica

### 1.1 Requisitos de API Level (OBLIGATORIO)

**Deadline: 31 Agosto 2025**

- [x] targetSdkVersion = 35 (Android 15) - YA CUMPLE
- [x] compileSdkVersion = 35 - YA CUMPLE

> **Fuente**: [Google Play Target API Level Requirements](https://median.co/blog/google-plays-target-api-level-requirement-for-android-apps)

### 1.2 Verificacion de Permisos

Permisos actuales declarados:
- `INTERNET` - Requerido, justificado
- `ACCESS_FINE_LOCATION` - Para busqueda de autos por ubicacion
- `ACCESS_COARSE_LOCATION` - Para busqueda de autos por ubicacion
- `CAMERA` - Para verificacion KYC (selfie)
- `POST_NOTIFICATIONS` - Para notificaciones push
- `VIBRATE` - Para haptics
- `ACCESS_NETWORK_STATE` - Deteccion offline
- `READ_MEDIA_IMAGES` - Subida de fotos (Android 13+)

**ACCION REQUERIDA**: Documentar justificacion de cada permiso en Play Console

### 1.3 Funcionalidad de Eliminar Cuenta (OBLIGATORIO)

Google requiere que los usuarios puedan eliminar su cuenta y datos.

- [x] Implementar Edge Function `delete-account` (usuarios autenticados)
- [x] Implementar Edge Function `delete-account-request` (solicitud por email)
- [x] Crear pagina web publica `/delete-account`
- [x] Migracion SQL para tabla `account_deletion_requests`
- [ ] **Aplicar migracion en produccion**: `supabase db push`
- [ ] **Desplegar Edge Functions**: `supabase functions deploy delete-account` y `delete-account-request`

**URL para Play Console**: `https://autorentar.com/delete-account`

> **Fuente**: [OneMobile - Common Rejections](https://onemobile.ai/common-google-play-store-rejections/)

### 1.4 Politica de Privacidad (OBLIGATORIO)

- [x] Politica de privacidad creada
- [x] Publicada en URL publica `/privacy`
- [x] Menciona datos recolectados (identificacion, contacto, ubicacion, vehiculos, financieros)
- [x] Explica uso de ubicacion, camara, notificaciones
- [x] Incluye informacion de contacto (soporte@autorentar.com)

**URL para Play Console**: `https://autorentar.com/privacy`

### 1.5 Terminos y Condiciones

- [x] Terminos de servicio creados
- [x] Publicados en URL publica `/terminos`

**URL para Play Console**: `https://autorentar.com/terminos`

---

## FASE 2: Assets y Branding para Play Store

### 2.1 Iconos de la App

| Asset | Dimensiones | Formato | Estado |
|-------|-------------|---------|--------|
| App Icon | 512x512 px | PNG (32-bit) | [ ] |
| Adaptive Icon Foreground | 108x108 dp | PNG | [ ] |
| Adaptive Icon Background | 108x108 dp | PNG/Color | [ ] |

### 2.2 Screenshots (MINIMO 2, RECOMENDADO 8)

| Tipo | Dimensiones Minimas | Cantidad |
|------|---------------------|----------|
| Telefono | 320-3840 px | 4-8 |
| Tablet 7" | 320-3840 px | 4-8 (opcional) |
| Tablet 10" | 1080-7680 px | 4-8 (opcional) |

**Screenshots sugeridos:**
1. Pantalla de inicio / Busqueda de autos
2. Lista de vehiculos disponibles
3. Detalle de vehiculo
4. Proceso de reserva
5. Calendario de reservas
6. Perfil de usuario
7. Chat con propietario
8. Confirmacion de reserva

### 2.3 Feature Graphic (OBLIGATORIO)

- Dimensiones: 1024 x 500 px
- Formato: PNG o JPEG (sin alpha)
- [ ] Disenar feature graphic

### 2.4 Video Promocional (Opcional pero recomendado)

- URL de YouTube (publico o no listado)
- Duracion recomendada: 30s - 2min

---

## FASE 3: Configuracion de Play Console

### 3.1 Cuenta de Desarrollador

- [ ] Cuenta Google Play Developer ($25 USD, pago unico)
- [ ] Verificacion de identidad (Organizacion recomendada para apps financieras)
- [ ] Numero D-U-N-S (si es cuenta de Organizacion)

> **IMPORTANTE (2026)**: A partir de septiembre 2026, todas las apps requeriran desarrollador verificado. Ver [Mandatory Verification 2026](https://www.nomidmdm.com/en/blog/the-core-change-mandatory-verification-for-all-android-apps)

### 3.2 Tipo de Cuenta Recomendada

Para Autorenta (servicio de alquiler de autos con pagos):
- **Tipo**: Cuenta de Organizacion
- **Razon**: Apps con servicios financieros requieren cuenta de Organizacion

> **Fuente**: [Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/16810878?hl=en)

### 3.3 Informacion de la App

```
Nombre: Autorenta
Nombre corto: Autorenta
Descripcion breve (80 chars max):
  "Alquila tu auto o renta uno cerca de ti. Gana dinero con tu vehiculo."

Categoria: Viajes y guias / Auto y vehiculos
Clasificacion de contenido: Completar cuestionario
```

---

## FASE 4: Declaraciones de Seguridad de Datos

### 4.1 Data Safety Form (OBLIGATORIO)

Declarar en Play Console:

| Tipo de Dato | Recolectado | Compartido | Proposito |
|--------------|-------------|------------|-----------|
| Nombre | Si | No | Funcionalidad |
| Email | Si | No | Funcionalidad, Comunicacion |
| Telefono | Si | No | Funcionalidad |
| Ubicacion precisa | Si | No | Funcionalidad (busqueda) |
| Fotos | Si | No | Funcionalidad (KYC, vehiculos) |
| Info de pago | Si | Con procesador | Transacciones |

### 4.2 Encriptacion de Datos

- [ ] Declarar que los datos se transmiten encriptados (HTTPS)
- [ ] Confirmar que la app usa conexiones seguras

---

## FASE 5: Pruebas de Calidad

### 5.1 Checklist Pre-Publicacion

- [ ] App no crashea en inicio
- [ ] Todas las funciones principales operan correctamente
- [ ] Tiempo de carga < 3 segundos
- [ ] Sin ANRs (Application Not Responding)
- [ ] Deep links funcionan correctamente
- [ ] Notificaciones push funcionan
- [ ] Geolocalizacion funciona con permisos

### 5.2 Dispositivos de Prueba Recomendados

- [ ] Android 10 (API 29)
- [ ] Android 12 (API 31)
- [ ] Android 13 (API 33)
- [ ] Android 14 (API 34)
- [ ] Android 15 (API 35)

### 5.3 Pre-launch Report (Automatico)

Google ejecuta pruebas automaticas. Verificar:
- Crashes
- Vulnerabilidades de seguridad
- Problemas de accesibilidad
- Compatibilidad con dispositivos

---

## FASE 6: Proceso de Publicacion

### 6.1 Generar AAB (Android App Bundle)

```bash
cd /home/edu/autorenta/apps/web
pnpm build
npx cap sync android
cd android
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### 6.2 Tracks de Publicacion

| Track | Proposito | Recomendacion |
|-------|-----------|---------------|
| Internal Testing | Pruebas internas (100 testers) | Usar primero |
| Closed Testing | Beta cerrada (grupos limitados) | Segunda etapa |
| Open Testing | Beta publica | Tercera etapa |
| Production | Publico general | Final |

**Recomendacion**: Comenzar con Internal Testing, luego Closed, luego Production

### 6.3 Tiempo de Revision

- Primera publicacion: 3-7 dias habiles
- Actualizaciones: 1-3 dias habiles
- Puede extenderse si hay problemas

---

## FASE 7: Cumplimiento de Politicas Especificas

### 7.1 Pagos In-App

Autorenta maneja pagos de alquileres. Opciones:

**Opcion A (Recomendada)**: Pagos fuera de la app
- Los pagos se procesan via web (MercadoPago)
- No requiere Google Play Billing
- Desde Oct 2025, permitido en USA sin restricciones

**Opcion B**: Google Play Billing
- Mayor comision (15-30%)
- Mas integrado

> **Fuente**: [Epic Games Ruling Update](https://support.google.com/googleplay/android-developer/answer/15582165?hl=en)

### 7.2 Verificacion de Identidad (KYC)

La app usa verificacion de identidad:
- [ ] Documentar proceso de KYC en politica de privacidad
- [ ] Explicar almacenamiento de datos biometricos/fotos

### 7.3 Servicios de Transporte/Alquiler

- [ ] Revisar politicas de apps de transporte
- [ ] Cumplir con regulaciones locales del pais de operacion

---

## FASE 8: Post-Publicacion

### 8.1 Monitoreo

- [ ] Configurar alertas de crashes en Play Console
- [ ] Revisar ANR reports diariamente primera semana
- [ ] Monitorear resenas y responder

### 8.2 Actualizaciones Obligatorias

| Fecha | Requisito |
|-------|-----------|
| Ago 2025 | API 35 obligatorio para nuevas apps |
| Ene 2026 | Politicas de Age Signals API |
| Sep 2026 | Verificacion de desarrollador obligatoria |

---

## Checklist Final Pre-Publicacion

### Tecnico
- [ ] APK/AAB firmado con keystore de release
- [ ] targetSdkVersion >= 35
- [ ] Sin crasheos en pruebas
- [ ] Todos los permisos justificados

### Legal
- [ ] Politica de Privacidad publicada y linkeada
- [ ] Terminos y Condiciones publicados
- [ ] Pagina de eliminacion de cuenta disponible
- [ ] Cumplimiento GDPR (si aplica)

### Assets
- [ ] Icono 512x512
- [ ] Feature Graphic 1024x500
- [ ] Minimo 4 screenshots de telefono
- [ ] Descripcion completa (4000 chars max)
- [ ] Descripcion corta (80 chars max)

### Play Console
- [ ] Cuestionario de clasificacion completado
- [ ] Data Safety form completado
- [ ] Informacion de contacto agregada
- [ ] Configuracion de precios (Gratis)

---

## Razones Comunes de Rechazo (EVITAR)

1. **Politica de Privacidad faltante o incompleta**
2. **Permisos no justificados**
3. **Funcionalidad de eliminar cuenta faltante**
4. **Crashes o bugs criticos**
5. **Descripcion enganosa**
6. **Contenido de copyright infringido**
7. **API level desactualizado**
8. **Informacion de desarrollador no verificada**

> **Fuente**: [Common Rejection Reasons](https://nandbox.com/app-rejected-on-google-play/)

---

## Recursos Utiles

- [Publishing Checklist - Android Developers](https://stuff.mit.edu/afs/sipb/project/android/docs/distribute/googleplay/publish/preparing.html)
- [Developer Policy Center](https://play.google/developer-content-policy/)
- [Play Console Help](https://support.google.com/googleplay/android-developer/)
- [App Submission Guidelines 2025](https://ripenapps.com/blog/app-submission-guidelines/)

---

## Notas Adicionales

- La app ya tiene configuracion de ProGuard para ofuscacion
- Deep links configurados para autorentar.com
- Firebase/Google Services integrado para push notifications
- Keystore de release ya existe en `keystore/autorentar-release.keystore`
