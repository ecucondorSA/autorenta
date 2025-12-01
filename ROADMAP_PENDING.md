# 🚀 Roadmap y Pendientes de AutoRenta

Este documento detalla las funcionalidades faltantes, mejoras técnicas y pasos siguientes tras el despliegue de la versión con Gestión de Flotas (Noviembre 2025).

## 🔴 Prioridad Alta (Crítico para Operación Real)

### 1. Integración Real de IA para Documentos
Actualmente, la Edge Function `verify-document` está en modo **MOCK** (simulación).
- [ ] **Conectar API:** Integrar Google Cloud Vision API o OpenAI Vision para leer DNI/Licencias reales.
- [ ] **Validación Lógica:** Comparar datos extraídos (OCR) vs datos del perfil (Nombre, Fecha Nacimiento).
- [ ] **Anti-Fraude:** Detectar ediciones en imágenes o fotos de pantallas.

### 2. Lógica de Pagos Split para Gestores
La base de datos soporta `commission_fixed_percent` para miembros de flota, pero el procesador de pagos necesita consumirlo.
- [ ] **Backend:** Actualizar `create_payment_intent` o el Webhook de MercadoPago para que, al dividir el pago, lea si hay un Gestor asignado y le envíe su %.
- [ ] **UI:** Mostrar al dueño el desglose exacto (Total - Fee Plataforma - Fee Gestor = Neto).

### 3. Sistema de Invitación a Flotas
Ya existe la estructura de datos (`organization_members`), pero no hay interfaz para agregar gente.
- [ ] **UI Propietario:** Pantalla "Mi Equipo" o "Gestionar Flota".
- [ ] **Funcionalidad:** Generar link de invitación o invitar por email.
- [ ] **Roles:** Interfaz para asignar rol (Manager, Driver) y comisión.

---

## 🟡 Prioridad Media (Mejora de Producto)

### 4. Dashboard de Incentivos & Gamificación
Ya mostramos el progreso del bono, pero falta el cierre del ciclo.
- [ ] **Notificaciones:** Email/Push automático cuando un auto llega al objetivo (3 viajes + 4.8 estrellas).
- [ ] **Reclamo de Bono:** Botón "Canjear Bono" que genere una solicitud de pago o crédito en wallet.
- [ ] **Admin View:** Panel para que tú veas qué flotas están rindiendo mejor.

### 5. Calendario Avanzado para Flotas
Un gestor con 10 autos necesita una vista unificada.
- [ ] **Vista Gantt:** Ver todos los autos de la flota en un solo calendario timeline.
- [ ] **Bloqueo Masivo:** Poder bloquear fechas para mantenimiento en múltiples autos a la vez.

---

## 🟢 Mantenimiento y Deuda Técnica

### 6. Limpieza de Código
- [ ] **WalletService Refactor:** Se hicieron parches rápidos para compatibilidad. Idealmente, migrar todo a Signals puros y eliminar métodos deprecados (`getBalance` vs `fetchBalance`).
- [ ] **Tipos TypeScript:** Unificar definiciones de `BookingStatus` y `ConversionEventType` en un solo lugar centralizado para evitar discrepancias.

### 7. Tests E2E
- [ ] **Flujo Flota:** Crear test de Playwright que simule: Login Dueño -> Ver Auto Flota -> Login Conductor -> Reservar Auto Flota.

---

## 📝 Historial de Cambios Recientes (Deploy Actual)
- **Infraestructura:** Tablas `organizations`, `fleet_bonuses`.
- **Seguridad:** Bloqueo de pagos si falta licencia o VTV (`prepare_booking_payment`).
- **Frontend:** Banner de Flota en "Mis Autos", corrección de Profile (dirección), Reactivación de Splash y 3D.
