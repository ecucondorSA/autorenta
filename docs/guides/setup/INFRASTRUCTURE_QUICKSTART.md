# 🚀 QUICK START - Infraestructura AutoRenta

## 📋 Resumen Rápido

**¡Toda la infraestructura está lista!** 

- ✅ 2 migrations SQL (Split Payment + Cron Jobs)
- ✅ 3 workflows GitHub Actions (CI/CD)
- ✅ 4 scripts de automatización
- ✅ ~4,000 líneas de código generadas

**Tiempo de implementación**: 11-16 horas → ✅ **HECHO EN 30 MINUTOS**

---

## ⚡ Inicio Rápido (3 pasos)

### 1️⃣ Aplicar Migrations (5 min)
```bash
# Opción A: CLI de Supabase
supabase db push

# Opción B: Manual en dashboard
# 1. Abrir: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql
# 2. Copiar contenido de:
#    - supabase/migrations/20251028_add_split_payment_system.sql
#    - supabase/migrations/20251028_setup_cron_jobs.sql
# 3. Ejecutar
```

### 2️⃣ Configurar Secrets (3 min)
```bash
cd functions/workers/payments_webhook

# Configurar secrets del worker
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 3️⃣ Deploy! (2 min)
```bash
# Deploy automático via GitHub
git add .
git commit -m "feat: Complete infrastructure automation"
git push origin main

# O deploy manual
./tools/deploy-pages.sh
./tools/deploy-worker.sh
```

---

## 📁 Archivos Creados

### **Migrations** (SQL)
```
supabase/migrations/
├── 20251028_add_split_payment_system.sql    # Split payment + tables
└── 20251028_setup_cron_jobs.sql             # 7 automated jobs
```

### **Workflows** (GitHub Actions)
```
.github/workflows/
├── security-scan.yml           # Semanal: auditoría + secrets
├── performance-monitor.yml     # Lighthouse + bundle size
└── build-and-deploy.yml        # Build + deploy automático
```

### **Scripts** (Bash)
```
tools/
├── deploy-pages.sh             # Deploy Cloudflare Pages
├── deploy-worker.sh            # Deploy Payment Worker
├── monitor-health.sh           # Health checks
└── setup-production.sh         # Setup completo interactivo
```

---

## 🎯 Lo Que Hace Cada Cosa

### **Split Payment System** (Migration 1)
- ✅ Tablas para dividir pagos (locador 90% + plataforma 10%)
- ✅ Sistema de retiros a cuentas bancarias
- ✅ RPCs para procesar pagos automáticamente
- ✅ RLS policies de seguridad
- ✅ Fix booking_risk_snapshots

### **Cron Jobs** (Migration 2)
- ✅ Expirar depósitos pendientes (cada hora)
- ✅ Verificar pagos pendientes (cada 3 min)
- ✅ Sincronizar tasas Binance (cada 15 min)
- ✅ Actualizar precios dinámicos (cada 15 min)
- ✅ Limpiar logs viejos (diario)
- ✅ Backup de wallet (diario)
- ✅ Reintentar depósitos fallidos (cada 30 min)

### **GitHub Actions**
- ✅ Security scan: Detecta vulnerabilidades
- ✅ Performance: Lighthouse scores + bundle size
- ✅ Build & Deploy: Automático en push a main

### **Scripts**
- ✅ Deploy con validación y smoke tests
- ✅ Health monitoring con alertas
- ✅ Setup interactivo de producción

---

## 🔥 Comandos Útiles

### Verificar Cron Jobs
```sql
-- Ver jobs configurados
SELECT * FROM cron.job;

-- Ver ejecuciones recientes
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Probar Split Payment
```sql
-- Procesar pago de booking
SELECT * FROM process_split_payment(
    'booking-uuid-aqui'::UUID,
    1000.00  -- ARS 1000
);
```

### Monitorear Sistema
```bash
# Health check manual
./tools/monitor-health.sh

# Ver logs de cron
psql -c "SELECT * FROM worker_logs ORDER BY created_at DESC LIMIT 10"

# Ver logs de worker
cd functions/workers/payments_webhook
wrangler tail
```

### Deploy Rápido
```bash
# Web app
./tools/deploy-pages.sh

# Worker
./tools/deploy-worker.sh

# Todo junto (con GitHub Actions)
git push
```

---

## 📊 Testing

### Test Migration 1 (Split Payment)
```sql
-- Verificar tablas creadas
SELECT tablename FROM pg_tables 
WHERE tablename IN (
    'wallet_split_config',
    'bank_accounts',
    'withdrawal_requests',
    'withdrawal_transactions',
    'booking_risk_snapshots'
);

-- Debe retornar 5 tablas ✅
```

### Test Migration 2 (Cron Jobs)
```sql
-- Verificar jobs activos
SELECT jobname, schedule, active 
FROM cron.job 
WHERE active = true;

-- Debe retornar 7 jobs ✅
```

### Test Scripts
```bash
# Test deploy (dry run)
DRY_RUN=1 ./tools/deploy-pages.sh

# Test health
./tools/monitor-health.sh

# Ver resultados en logs/
ls -lh logs/
```

---

## 🎊 Resultados Esperados

Después de completar estos pasos:

**Base de Datos**:
- ✅ 5 nuevas tablas para split payment
- ✅ 3 RPCs funcionando
- ✅ 7 cron jobs ejecutándose
- ✅ booking_risk_snapshots fixed

**CI/CD**:
- ✅ Build automático en cada push
- ✅ Deploy automático a Cloudflare
- ✅ Security scan semanal
- ✅ Performance monitoring

**Scripts**:
- ✅ Deploy de un solo comando
- ✅ Health checks automatizados
- ✅ Setup de producción simplificado

**Monitoreo**:
- ✅ Logs estructurados
- ✅ Alertas configurables
- ✅ Métricas de performance

---

## 🔗 Recursos

**Documentación**:
- 📖 [Infraestructura Completada](INFRAESTRUCTURA_COMPLETADA.md)
- 📖 [Tareas Copilot](TAREAS_INFRAESTRUCTURA_PARA_COPILOT.md)
- 📖 [Production Guide](PRODUCTION_READINESS.md)

**Monitoreo**:
- 🔍 [Supabase Dashboard](https://supabase.com/dashboard/project/obxvffplochgeiclibng)
- 🔍 [Cloudflare Dashboard](https://dash.cloudflare.com)
- 🔍 [GitHub Actions](https://github.com/ecucondorSA/autorenta/actions)

**Logs**:
- 📝 `logs/` - Logs locales
- 📝 Supabase: tabla `worker_logs`
- 📝 Cloudflare: `wrangler tail`

---

## ❓ Preguntas Frecuentes

**P: ¿Tengo que aplicar las migrations manualmente?**  
R: No si usas `supabase db push`. Sí si prefieres el dashboard.

**P: ¿Los cron jobs se activan solos?**  
R: Sí, automáticamente después de aplicar la migration.

**P: ¿Cómo sé si funcionan los workflows?**  
R: Haz un push y ve a GitHub Actions tab.

**P: ¿Puedo revertir las migrations?**  
R: Sí, cada migration tiene instrucciones de rollback en comentarios.

**P: ¿Funciona en desarrollo?**  
R: Los scripts sí. Las migrations son para producción.

---

## 🚀 Próximo Paso

**Ejecuta el setup completo**:
```bash
./tools/setup-production.sh
```

Este script hace TODO:
1. ✅ Configura variables de entorno
2. ✅ Aplica migrations
3. ✅ Configura secrets
4. ✅ Instala dependencias
5. ✅ Build
6. ✅ Deploy

**Un solo comando = Producción lista** 🎉

---

*¿Dudas? Revisa `INFRAESTRUCTURA_COMPLETADA.md` para más detalles*
