# 🚨 Disaster Recovery Plan - AutoRenta

**Última actualización**: 2025-11-03  
**Versión**: 1.0.0  
**RTO (Recovery Time Objective)**: 4 horas  
**RPO (Recovery Point Objective)**: 24 horas

## Índice

- [Overview](#overview)
- [Escenarios de Desastre](#escenarios-de-desastre)
- [Procedimientos de Recuperación](#procedimientos-de-recuperación)
- [Backup Strategy](#backup-strategy)
- [Contactos de Emergencia](#contactos-de-emergencia)
- [Post-Recovery Checklist](#post-recovery-checklist)

---

## Overview

Este plan documenta los procedimientos para recuperar AutoRenta después de un desastre. Cubre los componentes críticos:

- **Frontend**: Cloudflare Pages
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **Payments**: MercadoPago integration
- **Infrastructure**: Cloudflare Workers (legacy)

### Objetivos de Recuperación

| Componente | RTO | RPO | Prioridad |
|------------|-----|-----|-----------|
| Database | 2 horas | 24 horas | 🔴 Crítica |
| Frontend | 1 hora | 0 horas | 🔴 Crítica |
| Edge Functions | 2 horas | 0 horas | 🟠 Alta |
| Storage | 4 horas | 24 horas | 🟡 Media |
| Workers | 4 horas | 0 horas | 🟢 Baja |

**RTO**: Tiempo máximo para restaurar servicio  
**RPO**: Máxima pérdida de datos aceptable

---

## Escenarios de Desastre

### 🔴 Críticos (Impacto Alto)

#### 1. Pérdida Completa de Base de Datos

**Síntomas**:
- Base de datos no responde
- Proyecto Supabase eliminado o corrupto
- Pérdida de todos los datos

**Probabilidad**: Baja  
**Impacto**: Crítico  
**RTO**: 2 horas

#### 2. Compromiso de Seguridad (Data Breach)

**Síntomas**:
- Tokens/secrets expuestos
- Acceso no autorizado detectado
- Datos de usuarios comprometidos

**Probabilidad**: Media  
**Impacto**: Crítico  
**RTO**: 1 hora (inmediato)

#### 3. Fallo de Infraestructura Cloudflare

**Síntomas**:
- Cloudflare Pages down
- Todos los deployments fallan
- CDN no responde

**Probabilidad**: Muy Baja  
**Impacto**: Crítico  
**RTO**: 1 hora

### 🟠 Altos (Impacto Medio)

#### 4. Pérdida de Edge Functions

**Síntomas**:
- Webhooks no funcionan
- Payments no se procesan
- Edge Functions eliminadas

**Probabilidad**: Baja  
**Impacto**: Alto  
**RTO**: 2 horas

#### 5. Pérdida de Storage (Imágenes)

**Síntomas**:
- Avatares no cargan
- Fotos de autos desaparecen
- Storage buckets eliminados

**Probabilidad**: Baja  
**Impacto**: Medio  
**RTO**: 4 horas

### 🟡 Medios (Impacto Bajo)

#### 6. Pérdida de Workers (Legacy)

**Síntomas**:
- Payment webhook worker no responde
- Workers eliminados

**Probabilidad**: Baja  
**Impacto**: Bajo (legacy, no crítico)  
**RTO**: 4 horas

---

## Procedimientos de Recuperación

### Escenario 1: Pérdida Completa de Base de Datos

#### Fase 1: Evaluación (15 minutos)

```bash
# 1. Verificar estado del proyecto Supabase
supabase projects list

# 2. Intentar conectar a DB
psql "$DB_URL" -c "SELECT NOW();"

# 3. Verificar backups disponibles
# Via Dashboard: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/database
```

#### Fase 2: Recuperación (1-2 horas)

**Opción A: Restore desde Backup Automático de Supabase**

```bash
# 1. Acceder a Supabase Dashboard
# https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/database

# 2. Ir a sección "Backups"
# 3. Seleccionar backup más reciente (< 24 horas)
# 4. Click "Restore" o "Download"

# 5. Si se descargó, restaurar manualmente
pg_restore -d "$NEW_DB_URL" backup_file.sql
```

**Opción B: Restore desde Backup Local**

```bash
# 1. Localizar último backup local
ls -lht backups/daily/ | head -5

# 2. Restaurar
psql "$NEW_DB_URL" < backups/daily/backup_latest.sql

# 3. Verificar
psql "$NEW_DB_URL" -c "SELECT COUNT(*) FROM users;"
```

**Opción C: Point-in-Time Recovery (PITR)**

```bash
# 1. Supabase Pro incluye PITR
# Via Dashboard: Settings → Database → Point in Time Recovery

# 2. Seleccionar timestamp de recovery
# 3. Confirmar restore
# 4. Esperar completación (30-60 minutos)
```

#### Fase 3: Verificación (30 minutos)

```sql
-- Verificar tablas críticas
SELECT 
  'users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'cars', COUNT(*) FROM cars
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;

-- Verificar integridad
SELECT 
  b.id,
  b.car_id,
  b.user_id,
  c.title as car_title
FROM bookings b
LEFT JOIN cars c ON c.id = b.car_id
WHERE c.id IS NULL
LIMIT 10;
-- Debe retornar 0 filas (no hay bookings huérfanos)
```

#### Fase 4: Reconfiguración (30 minutos)

```bash
# 1. Actualizar DB_URL si cambió
# 2. Verificar secrets
supabase secrets list

# 3. Re-aplicar migrations si es necesario
supabase db push

# 4. Verificar Edge Functions
supabase functions list
```

**Checklist**:
- [ ] Base de datos restaurada
- [ ] Todas las tablas presentes
- [ ] Integridad de datos verificada
- [ ] Secrets reconfigurados
- [ ] Migrations aplicadas
- [ ] Aplicación funciona correctamente

---

### Escenario 2: Compromiso de Seguridad

#### Fase 1: Contención Inmediata (15 minutos)

```bash
# 1. ROTAR TODOS LOS SECRETS INMEDIATAMENTE

# GitHub Secrets
gh secret set CF_API_TOKEN -b"$(wrangler whoami)"
gh secret set SUPABASE_SERVICE_ROLE_KEY -b"$(supabase secrets get SUPABASE_SERVICE_ROLE_KEY)"

# Supabase Secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<new_token>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new_key>

# Cloudflare API Token
# Generar nuevo token en: https://dash.cloudflare.com/profile/api-tokens
wrangler config
```

#### Fase 2: Auditoría (1 hora)

```bash
# 1. Verificar logs de acceso
# Supabase Dashboard → Logs → Auth logs

# 2. Verificar actividad sospechosa
psql "$DB_URL" -c "
  SELECT 
    id,
    email,
    last_sign_in_at,
    created_at
  FROM auth.users
  WHERE last_sign_in_at > NOW() - INTERVAL '24 hours'
  ORDER BY last_sign_in_at DESC;
"

# 3. Verificar cambios en datos críticos
psql "$DB_URL" -c "
  SELECT 
    id,
    email,
    updated_at,
    mercadopago_collector_id
  FROM profiles
  WHERE updated_at > NOW() - INTERVAL '24 hours'
  ORDER BY updated_at DESC;
"
```

#### Fase 3: Notificación (30 minutos)

- [ ] Notificar a usuarios afectados (si aplica)
- [ ] Documentar incidente
- [ ] Reportar a autoridades si es necesario (GDPR, etc.)

#### Fase 4: Hardening (1 hora)

```bash
# 1. Revisar políticas RLS
psql "$DB_URL" -c "SELECT * FROM pg_policies;"

# 2. Verificar que no hay secrets hardcodeados
grep -r "APP_USR-\|sk_live\|pk_live" apps/web/src

# 3. Auditar permisos
supabase projects list
```

**Checklist**:
- [ ] Todos los secrets rotados
- [ ] Auditoría completada
- [ ] Usuarios notificados
- [ ] Documentación del incidente
- [ ] Hardening aplicado

---

### Escenario 3: Fallo de Infraestructura Cloudflare

#### Fase 1: Verificación (15 minutos)

```bash
# 1. Verificar estado de Cloudflare
curl -I https://www.cloudflare.com

# 2. Verificar deployments
wrangler pages deployment list autorenta-web

# 3. Verificar status page
# https://www.cloudflarestatus.com/
```

#### Fase 2: Failover a Alternativa (1 hora)

**Opción A: Deploy a Vercel (Backup)**

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
cd apps/web
vercel --prod

# 3. Configurar dominio
# vercel domains add autorenta.com
```

**Opción B: Deploy a Netlify (Backup)**

```bash
# 1. Instalar Netlify CLI
npm i -g netlify-cli

# 2. Deploy
cd apps/web
netlify deploy --prod --dir=dist/web
```

**Opción C: Servidor Estático Temporal**

```bash
# 1. Build
cd apps/web && npm run build

# 2. Servir con nginx o similar
# Copiar dist/web/ a servidor estático
```

#### Fase 3: Actualizar DNS (30 minutos)

```bash
# Si cambiaste de hosting, actualizar DNS
# CNAME autorenta.com → nuevo-hosting.com
```

**Checklist**:
- [ ] Aplicación deployada en alternativa
- [ ] DNS actualizado
- [ ] Aplicación accesible
- [ ] Funcionalidad verificada

---

### Escenario 4: Pérdida de Edge Functions

#### Fase 1: Identificación (15 minutos)

```bash
# Verificar funciones desplegadas
supabase functions list

# Verificar logs
supabase functions logs mercadopago-webhook --limit 10
```

#### Fase 2: Restauración (1-2 horas)

```bash
# 1. Restaurar desde git
git checkout <commit-with-functions>
cd supabase/functions

# 2. Re-deploy cada función crítica
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-create-booking-preference
supabase functions deploy wallet-transfer
supabase functions deploy wallet-reconciliation

# 3. Verificar deployment
supabase functions list
```

#### Fase 3: Reconfigurar Secrets (30 minutos)

```bash
# Verificar secrets
supabase secrets list

# Re-setear si es necesario
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<token>
```

**Checklist**:
- [ ] Todas las funciones restauradas
- [ ] Secrets configurados
- [ ] Funciones responden correctamente
- [ ] Webhooks funcionan

---

### Escenario 5: Pérdida de Storage

#### Fase 1: Evaluación (15 minutos)

```bash
# Verificar buckets
supabase storage list-buckets

# Verificar archivos
# Via Dashboard: Storage → Buckets
```

#### Fase 2: Restauración (2-4 horas)

**Opción A: Restore desde Backup de Supabase**

```bash
# Supabase Pro incluye backups de storage
# Via Dashboard: Settings → Storage → Backups
```

**Opción B: Restore desde Backup Local**

```bash
# Si tienes backups locales de storage
# (Requiere haber hecho backup manual previamente)

# Restaurar archivos a buckets
supabase storage cp backup/avatars/ avatars/ --recursive
supabase storage cp backup/car-images/ car-images/ --recursive
```

**Opción C: Re-generar desde URLs**

```sql
-- Si las URLs de storage están en DB pero archivos perdidos
-- Re-generar desde URLs externas (si aplica)

-- O marcar como perdidos y pedir re-upload
UPDATE profiles SET avatar_url = NULL WHERE avatar_url LIKE '%storage%';
UPDATE car_photos SET url = NULL WHERE url LIKE '%storage%';
```

**Checklist**:
- [ ] Buckets restaurados
- [ ] Archivos restaurados (o marcados para re-upload)
- [ ] Permisos de storage verificados
- [ ] Aplicación funciona con storage restaurado

---

## Backup Strategy

### Backups Automáticos

| Componente | Frecuencia | Retención | Proveedor |
|------------|-----------|-----------|-----------|
| Database | Diario | 7 días | Supabase |
| Database PITR | Continuo | 7 días | Supabase Pro |
| Storage | Diario | 7 días | Supabase Pro |
| Code | Continuo | Indefinido | GitHub |

### Backups Manuales

#### Database

```bash
# Backup diario manual (recomendado)
./docs/runbooks/database-backup-restore.sh

# Backup antes de cambios grandes
./docs/runbooks/database-backup-restore.sh pre-migration
```

#### Storage

```bash
# Backup manual de storage (si es crítico)
# Descargar archivos importantes desde Supabase Dashboard
# O usar script de backup (si existe)
```

#### Code

```bash
# Git ya hace backup automático
# Pero hacer tag antes de cambios grandes
git tag -a v1.0.0-backup -m "Backup before major change"
git push origin v1.0.0-backup
```

### Ubicación de Backups

```
backups/
├── daily/
│   ├── backup_20251103.sql.gz
│   └── backup_20251102.sql.gz
├── pre-migration/
│   └── snapshot_before_<migration>_<date>.sql
└── monthly/
    └── backup_202510.sql.gz
```

### Verificación de Backups

```bash
# Verificar integridad
gunzip -t backups/daily/backup_*.sql.gz

# Test restore en ambiente local
supabase db reset
psql <local_db> < backups/daily/backup_latest.sql
```

---

## Contactos de Emergencia

### Internos

- **DevOps Lead**: [Agregar contacto]
- **Tech Lead**: [Agregar contacto]
- **CEO**: [Agregar contacto]

### Proveedores

| Proveedor | Support | URL |
|-----------|---------|-----|
| **Supabase** | support@supabase.com | https://supabase.com/support |
| **Cloudflare** | support@cloudflare.com | https://dash.cloudflare.com/support |
| **MercadoPago** | developers@mercadopago.com | https://www.mercadopago.com.ar/developers/es/support |
| **GitHub** | support@github.com | https://support.github.com |

### Escalación

1. **Nivel 1**: Developer (este plan)
2. **Nivel 2**: Tech Lead / DevOps
3. **Nivel 3**: Vendor Support
4. **Nivel 4**: Management / Legal

---

## Post-Recovery Checklist

Después de cualquier recovery, verificar:

### Funcionalidad

- [ ] Login funciona
- [ ] Autos se muestran
- [ ] Reservas se crean
- [ ] Pagos se procesan
- [ ] Webhooks funcionan
- [ ] Storage funciona (uploads/downloads)

### Integridad de Datos

- [ ] No hay datos huérfanos
- [ ] Referencias entre tablas correctas
- [ ] Contadores correctos (bookings, payments, etc.)
- [ ] Wallets balanceados correctamente

### Performance

- [ ] Queries responden rápido (< 2 segundos)
- [ ] Aplicación carga rápido (< 3 segundos)
- [ ] No hay timeouts

### Seguridad

- [ ] Secrets rotados (si fue security incident)
- [ ] RLS policies activas
- [ ] No hay secrets expuestos
- [ ] Logs de acceso verificados

### Documentación

- [ ] Incidente documentado
- [ ] Root cause identificado
- [ ] Prevención planificada
- [ ] Runbook actualizado si es necesario

---

## Mejoras Continuas

### Revisar Este Plan

- **Frecuencia**: Cada 3 meses
- **Trigger**: Después de cualquier incidente
- **Responsable**: Tech Lead

### Pruebas de Recovery

- **Frecuencia**: Cada 6 meses
- **Tipo**: Disaster recovery drill
- **Escenario**: Simular pérdida de DB y restaurar

### Métricas de Recovery

- **RTO actual**: Medir tiempo real de recovery
- **RPO actual**: Verificar pérdida de datos real
- **Mejoras**: Identificar gaps y mejorar plan

---

## Referencias

- [Runbook: Troubleshooting](./runbooks/troubleshooting.md)
- [Runbook: Database Backup & Restore](./runbooks/database-backup-restore.md)
- [Runbook: Secret Rotation](./runbooks/secret-rotation.md)
- [Deployment Guide](./deployment-guide.md)
- [CLAUDE.md](../../CLAUDE.md)

---

**Última revisión**: 2025-11-03  
**Próxima revisión**: 2026-02-03  
**Mantenedor**: Equipo de Desarrollo AutoRenta







