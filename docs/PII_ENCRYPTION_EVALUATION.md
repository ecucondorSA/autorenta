# AutoRenta - Evaluación de Encriptación de PII en Reposo

**Fecha:** 2025-12-28
**Evaluador:** Claude Code
**Estado:** Evaluación completada

---

## Resumen Ejecutivo

La plataforma AutoRenta almacena datos personales identificables (PII) que requieren protección adecuada. Esta evaluación analiza el estado actual de la encriptación en reposo y proporciona recomendaciones.

### Estado Actual: ACEPTABLE

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Encriptación de disco | ✅ Activo | Supabase AES-256 por defecto |
| Encriptación de conexión | ✅ Activo | TLS 1.3 para todas las conexiones |
| Encriptación a nivel de campo | ⚠️ Parcial | Solo para tokens/secrets |
| Backups encriptados | ✅ Activo | Supabase maneja automáticamente |

---

## 1. Datos PII Identificados

### Categoría Alta (requiere máxima protección)

| Campo | Tabla | Encriptación Actual | Riesgo |
|-------|-------|---------------------|--------|
| `mp_access_token` | profiles | ❌ Texto plano | Alto |
| `mp_refresh_token` | profiles | ❌ Texto plano | Alto |
| `paypal_email` | profiles | ❌ Texto plano | Medio |
| `dni/cuit` | user_verifications | ❌ Texto plano | Alto |

### Categoría Media (protección estándar)

| Campo | Tabla | Encriptación Actual | Riesgo |
|-------|-------|---------------------|--------|
| `email` | profiles, auth.users | ✅ Protegido por Supabase Auth | Bajo |
| `phone` | profiles | ❌ Texto plano | Medio |
| `full_name` | profiles | ❌ Texto plano | Bajo |
| `address` | profiles, bookings | ❌ Texto plano | Medio |

### Categoría Baja (datos públicos/semi-públicos)

| Campo | Tabla | Notas |
|-------|-------|-------|
| `avatar_url` | profiles | URL pública |
| `car photos` | cars | URLs públicas |
| `display_name` | profiles | Visible públicamente |

---

## 2. Encriptación Existente

### 2.1 Supabase (Infraestructura)

Supabase proporciona:
- **Encryption at rest**: AES-256 para todos los datos en disco
- **Encryption in transit**: TLS 1.3 para todas las conexiones
- **Backup encryption**: Backups automáticos encriptados

### 2.2 Aplicación (EncryptionService)

Existe un servicio de encriptación en:
`/apps/web/src/app/core/services/encryption.service.ts`

```typescript
// Capacidades:
- AES-GCM encryption
- PBKDF2 key derivation (100k iterations)
- Base64 encoding for storage
```

**Uso actual:** Limitado a funcionalidades específicas del cliente.

---

## 3. Análisis de Brechas

### Brecha 1: Tokens de MercadoPago

**Problema:** `mp_access_token` y `mp_refresh_token` se almacenan sin encriptación adicional.

**Riesgo:** Si la base de datos es comprometida, los atacantes podrían:
- Realizar pagos fraudulentos
- Acceder a información financiera de usuarios
- Robar fondos

**Mitigación actual:**
- RLS policies limitan acceso
- Tokens expiran y se refrescan
- No se exponen via API pública

**Recomendación:** Encriptar a nivel de campo con clave rotable.

### Brecha 2: Documentos de Identidad

**Problema:** DNI/CUIT se almacenan como texto plano en `user_verifications`.

**Riesgo:** Exposición de datos de identidad nacional.

**Mitigación actual:**
- RLS policies muy restrictivas
- Solo admins pueden leer

**Recomendación:** Considerar encriptación o tokenización.

### Brecha 3: Números de Teléfono

**Problema:** Teléfonos se almacenan sin encriptación.

**Riesgo:** Menor - usado para contacto legítimo.

**Mitigación actual:**
- RLS policies limitan exposición
- Solo visible para partes de reserva

**Recomendación:** Mantener actual (riesgo aceptable).

---

## 4. Recomendaciones

### Prioridad Alta (Implementar)

#### 4.1 Encriptar Tokens de Pago

```sql
-- Agregar columnas encriptadas
ALTER TABLE profiles
ADD COLUMN mp_access_token_encrypted BYTEA,
ADD COLUMN mp_refresh_token_encrypted BYTEA;

-- Función de encriptación usando pgcrypto
CREATE OR REPLACE FUNCTION encrypt_payment_token(token TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    token,
    current_setting('app.encryption_key'),
    'compress-algo=0, cipher-algo=aes256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Complejidad:** Media
**Impacto en código:** Actualizar Edge Functions que leen/escriben tokens

#### 4.2 Vault para Secrets

Supabase Vault está disponible para almacenar secrets encriptados:

```sql
-- Almacenar token en Vault
SELECT vault.create_secret(
  'mp_token_user_123',
  'APP_USR_xxxxx',
  'MercadoPago access token for user 123'
);

-- Recuperar token
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'mp_token_user_123';
```

**Complejidad:** Baja
**Beneficio:** Encriptación automática, rotación de claves

### Prioridad Media (Evaluar)

#### 4.3 Encriptación de DNI/CUIT

Para cumplimiento regulatorio futuro, considerar:

```typescript
// En Edge Function antes de guardar
const encryptedDni = await encrypt(dni, ENCRYPTION_KEY);
await supabase.from('user_verifications').insert({
  ...data,
  document_number_encrypted: encryptedDni,
});
```

### Prioridad Baja (Documentar)

#### 4.4 Política de Retención

Ya documentada en `/docs/DATA_RETENTION_POLICY.md`.

---

## 5. Plan de Implementación Sugerido

### Fase 1: Preparación (1 día)

1. Habilitar extensión `pgcrypto` si no está activa
2. Crear función de encriptación/desencriptación
3. Definir estrategia de gestión de claves

### Fase 2: Migración de Tokens (2 días)

1. Agregar columnas encriptadas
2. Migrar datos existentes
3. Actualizar Edge Functions
4. Eliminar columnas texto plano

### Fase 3: Vault (1 día)

1. Configurar Supabase Vault
2. Migrar secrets sensibles
3. Actualizar acceso desde Edge Functions

---

## 6. Conclusión

El nivel actual de encriptación es **aceptable** para operación normal:
- Supabase proporciona encriptación de disco (AES-256)
- RLS policies limitan acceso a datos sensibles
- No hay exposición directa de PII via API

**Recomendaciones prioritarias:**
1. Encriptar tokens de MercadoPago a nivel de campo
2. Evaluar Supabase Vault para gestión de secrets
3. Mantener auditorías periódicas de PII

**Riesgo residual:** Bajo a Medio

---

## 7. Revisión

| Fecha | Revisor | Acción |
|-------|---------|--------|
| 2025-12-28 | Claude Code | Evaluación inicial |
| TBD | Team Lead | Revisar recomendaciones |
| TBD | Security | Aprobar plan de implementación |

---

*Documento generado por Claude Code*
*Próxima revisión recomendada: 2026-03-28*
