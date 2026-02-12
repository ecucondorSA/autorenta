# 🧪 AutoRenta - Release Smoke Test Plan

> **Checklist de Calidad Manual (QA)** parar ejecutar antes de cada release.
> **Versión Objetivo:** `v3.37.0` (Android & PWA)

## 0. Pre-Requisites

- [ ] **Ambiente:** Production (https://autorentar.com)
- [ ] **Dispositivo:** Android 13+ (Physical Device) & Chrome Desktop
- [ ] **Usuario Test:** `test.releasex@autorentar.com` (o crear nuevo)

---

## 1. 🔐 Autenticación (Critical)

### Login Flow
- [ ] **Email/Password:** Login exitoso con credenciales válidas.
- [ ] **Google Sign-In:** Login exitoso con cuenta Google.
- [ ] **Facebook Login (Disabled):** Verificar que el botón NO aparece (deshabilitado por config).
- [ ] **Biometría:** Si está habilitada, verificar login con huella/FaceID.
- [ ] **Refresh Token:**
    1. Login.
    2. Esperar 15 min (o simular expiración borrando token local pero dejando refresh).
    3. Recargar página / navegar.
    4. Verificar que la sesión se mantiene activa (no logout forzado).

### Registro
- [ ] **Nuevo Usuario:** Completar flujo de registro.
- [ ] **Email Confirmation:** Verificar recepción de email de bienvenida.

---

## 2. 🚦 Onboarding & KYC

- [ ] **Phone Verification:** Enviar OTP y verificar.
- [ ] **Document Upload:** Subir imagen de DNI/Licencia (test de compresión/upload).
    - Verificar que no falle con imágenes > 5MB.
- [ ] **Selfie:** Subir selfie de prueba.

---

## 3. 🚗 Marketplace & Search

- [ ] **Home Load:** Carga rápida de mapa y lista.
- [ ] **Search:** Buscar "Toyota" o "Palermo". Resultados coherentes.
- [ ] **Filters:** Filtrar por fecha y precio.
- [ ] **Car Detail:** Abrir auto, ver fotos (carousel), revisar precios.

---

## 4. 📅 Booking Flow (Critical)

- [ ] **Availability:** Seleccionar fechas disponibles.
- [ ] **Pricing:** Verificar cálculo de días + fees.
- [ ] **Create Request:** Enviar solicitud de reserva.
- [ ] **Owner Approval:** (Simular) Aprobar reserva desde dashboard de propietario.

---

## 5. 💳 Payments (MercadoPago)

- [ ] **Deposit (Pre-Auth):** Intentar pago de depósito de seguridad.
    - Usar tarjeta de prueba de MP.
    - Verificar redirección correcta a app tras pago.
- [ ] **Booking Payment:** Pagar el total del alquiler.

---

## 6. 📱 Mobile Specifics (Android)

- [ ] **Splash Screen:** Carga correcta, sin parpadeos blancos largos.
- [ ] **Deep Links:** Abrir `https://autorentar.com/cars/123` abre la app, no el navegador.
- [ ] **Back Button:** Navegación nativa hacia atrás funciona lógicamente.
- [ ] **Permissions:**
    - Solicita Permiso de Ubicación (precisa).
    - Solicita Permiso de Cámara/Fotos al subir evidencia.
    - Explica por qué pide los permisos.

---

## 7. 📹 Video Inspection (New Feature)

- [ ] **Recording:** Iniciar inspección de check-in.
- [ ] **Guides:** Verificar superposición de guías.
- [ ] **Duration Warn:** Si dura < 90s, no permite finalizar.
- [ ] **Upload:** Finalizar y subir.
    - Verificar tiempo de subida razonable (bitrate optimizado).

---

## 8. 👤 Profile & Wallet

- [ ] **Edit Profile:** Cambiar foto o teléfono.
- [ ] **Wallet:** Ver saldo (si aplica).
- [ ] **Settings:** Verificar versión de app en footer.

---

## 🛑 Go/No-Go Criteria

- **Blocker:** Cualquier crash (pantalla blanca), fallo en pago, o imposibilidad de login.
- **Major:** Funcionalidad visual rota pero bloqueante con workaround.
- **Minor:** Detalles estéticos o typos.

> **Decision:** Si hay 0 Blockers y < 2 Majors → **GO FOR RELEASE**.
