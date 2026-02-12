# 👮 Admin Operations Manual: La Guía Definitiva

> **Manual de Procedimientos y Operaciones Críticas**
> Este documento es la referencia absoluta para la operación, administración y soporte de nivel 2/3 de la plataforma Autorenta. Cubre desde la gestión diaria hasta la resolución de crisis financieras y legales.

---

## 📑 Tabla de Contenidos

1.  [Acceso y Seguridad RBAC](#-acceso-y-seguridad-rbac)
2.  [Dashboard y Métricas de Negocio](#-dashboard-y-métricas-de-negocio)
3.  [Gestión Avanzada de Usuarios (KYC & Riesgo)](#-gestión-avanzada-de-usuarios-kyc--riesgo)
4.  [Resolución de Disputas y Arbitraje](#-resolución-de-disputas-y-arbitraje)
5.  [Operaciones Financieras (Tesorería)](#-operaciones-financieras-tesorería)
6.  [Gestión de Flota y Calidad](#-gestión-de-flota-y-calidad)
7.  [Configuración del Sistema (Feature Flags)](#-configuración-del-sistema-feature-flags)
8.  [Auditoría Forense y Logs](#-auditoría-forense-y-logs)

---

## 🔐 Acceso y Seguridad RBAC

El panel de administración (`/admin`) es el centro de control. El acceso es estrictamente regulado mediante **Role-Based Access Control (RBAC)** a nivel de base de datos.

### Matriz de Permisos Detallada

| Rol | Permiso | Descripción | Nivel de Riesgo |
| :--- | :--- | :--- | :--- |
| `superadmin` | `ALL` | Acceso irrestricto. Puede ver llaves API, borrar usuarios y mover fondos del FGO. | 🔴 CRÍTICO |
| `admin` | `OPERATIONS` | Gestión diaria: aprobar autos, validar KYC, moderar reviews. Sin acceso a fondos raíz. | 🟠 ALTO |
| `finance` | `TREASURY` | Solo puede ver/aprobar retiros y conciliaciones bancarias. No ve datos personales sensibles. | 🟡 MEDIO |
| `support` | `READ_ONLY` | Ver estado de reservas y chats para dar soporte. No puede editar nada. | 🟢 BAJO |

### Procedimiento de Alta de Administrador
Por seguridad, no existe UI para crear admins. Se debe ejecutar un script SQL auditado.

```sql
BEGIN;
  -- 1. Otorgar rol en public.profiles
  UPDATE public.profiles 
  SET role = 'admin', is_admin = true 
  WHERE email = 'nuevo.admin@autorenta.com';

  -- 2. Registrar auditoría de elevación de privilegios
  INSERT INTO public.admin_audit_log (action, admin_user_id, details)
  VALUES (
    'GRANT_ADMIN_ROLE',
    auth.uid(), -- ID del superadmin que ejecuta
    jsonb_build_object('target_email', 'nuevo.admin@autorenta.com', 'role', 'admin')
  );
COMMIT;
```

---

## 👥 Gestión Avanzada de Usuarios (KYC & Riesgo)

La confianza es el activo más valioso. El proceso de verificación es híbrido (IA + Humano).

### Protocolo de Validación Manual (KYC)
Cuando la IA (`gemini-document-analyzer`) marca un perfil como `manual_review`:

1.  **Inspección Visual:**
    *   Ir a `/admin/verifications/{userId}`.
    *   Comparar foto del DNI con la selfie (Liveness check).
    *   Verificar hologramas de seguridad y bordes del documento (anti-photoshop).
2.  **Cruce de Datos:**
    *   ¿El nombre en el DNI coincide *exactamente* con el perfil?
    *   ¿La fecha de nacimiento coincide?
3.  **Decisión:**
    *   ✅ **Aprobar:** Habilita reservas inmediatas.
    *   ❌ **Rechazar:** Seleccionar motivo predefinido ("Documento borroso", "Vencido"). Esto dispara un email transaccional con instrucciones para reintentar.

### Gestión de Fraude y Bloqueos
Si el sistema antifraude (`fraud-detection-system`) detecta anomalías (IPs de riesgo, tarjetas múltiples rechazadas):

*   **Soft Ban (Suspensión):**
    *   Acción: Botón "Suspender Usuario" en perfil.
    *   Efecto: No puede crear nuevas reservas ni publicar. Sus reservas activas continúan.
    *   Uso: Comportamiento sospechoso, falta de respuesta a soporte.
*   **Hard Ban (Bloqueo Total):**
    *   Acción: Botón "Bloquear y Reportar".
    *   Efecto: Cierre de sesión forzado. Cancelación de reservas futuras. Lista negra de DNI/Teléfono.
    *   Uso: Robo de vehículo, estafa confirmada, violencia.

---

## ⚖️ Resolución de Disputas y Arbitraje

El módulo `/admin/disputes` es el tribunal digital de Autorenta.

### Flujo de Arbitraje: Caso "Daños no reconocidos"
1.  **Apertura:** El Owner reclama daños post-viaje. El Renter los niega. Estado: `OPEN`.
2.  **Fase de Pruebas (24-48hs):**
    *   El admin usa la herramienta **"Damage Comparator"** en el panel.
    *   Visualiza fotos de Check-in (antes) y Check-out (después) lado a lado con zoom sincronizado.
3.  **Dictamen:**
    *   *Si el daño ya estaba en el check-in:* **Fallo a favor del Renter**. Se cierra el caso.
    *   *Si el daño es nuevo:* **Fallo a favor del Owner**.
4.  **Ejecución Financiera:**
    *   El admin ingresa el monto a compensar (basado en presupuesto o tabla de costos).
    *   Al confirmar, el sistema ejecuta atómicamente:
        1.  Captura parcial de la garantía del Renter (MercadoPago).
        2.  Transfiere el monto a la Wallet del Owner.
        3.  Genera factura por cargos administrativos si aplica.

---

## 💰 Operaciones Financieras (Tesorería)

Gestión del flujo de caja en `/admin/accounting`.

### Conciliación de Pagos (Reconciliation)
Diariamente, el sistema compara:
1.  Registros en `public.payments` (Nuestra DB).
2.  Reporte de liquidación de MercadoPago (API).

**Desvíos Comunes:**
*   **Chargeback (Contracargo):** El banco del usuario desconoció el pago.
    *   *Acción:* El sistema marca el pago como `disputed`. Finanzas debe presentar evidencia (Contrato, Logs, Fotos) a MercadoPago en 7 días.
*   **Pago Huérfano:** Dinero recibido sin booking asociado (raro).
    *   *Acción:* Buscar por `external_reference` en logs y asociar manualmente.

### Fondo de Garantía Operativa (FGO)
El "colchón" financiero para siniestros.
*   **Alerta de Liquidez:** Si el saldo FGO < $10,000 USD (configurable), se notifica a la directiva.
*   **Inyección de Fondos:** Superadmin puede transferir de "Comisiones" a "FGO" internamente.

---

## 🚗 Gestión de Flota y Calidad

### Auditoría de Vehículos
Periódicamente se revisa la flota activa.
*   **Antigüedad:** Autos > 10 años se marcan para revisión.
*   **Mantenimiento:** Si un auto no registra mantenimientos en 12 meses (feature futura), se pausa preventivamente.

### Baneo de Vehículos
Motivos para retirar un auto de la plataforma:
*   Fallas mecánicas reportadas por 2 renters distintos.
*   Documentación (Seguro/Patente) vencida.
*   Discrepancia grave entre fotos y realidad.

---

## 🛠️ Configuración y Logs Técnicos

### Consultas SQL de Diagnóstico (Cheat Sheet)

**Verificar estado real de un pago:**
```sql
SELECT 
  b.id as booking_id,
  b.status,
  p.status as payment_status,
  p.provider_payment_id
FROM bookings b
JOIN payments p ON p.booking_id = b.id
WHERE b.ref_code = 'RESERVA-1234';
```

**Buscar usuarios duplicados (por DNI):**
```sql
SELECT gov_id_number, COUNT(*)
FROM profiles
GROUP BY gov_id_number
HAVING COUNT(*) > 1;
```

**Auditar acciones de un admin:**
```sql
SELECT created_at, action, details
FROM admin_audit_log
WHERE admin_user_id = 'uuid-del-admin'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🚨 Protocolos de Emergencia (Red Button)

### Fuga de Datos o Hackeo
1.  **Bloqueo Total:** Activar Feature Flag `maintenance_mode`. La web muestra pantalla de mantenimiento.
2.  **Rotación de Llaves:** Revocar `SERVICE_ROLE_KEY` y `MERCADOPAGO_ACCESS_TOKEN` inmediatamente.
3.  **Análisis Forense:** Exportar logs de Supabase para auditoría externa.

### Caída de Proveedor de Pagos
Si MercadoPago cae globalmente:
1.  Activar Flag `disable_new_bookings`.
2.  Poner mensaje global en el banner superior: "Los pagos están temporalmente demorados".
3.  No cancelar reservas; dejarlas en cola hasta que vuelva el servicio.

---

**© 2026 Autorenta Operations Team**
