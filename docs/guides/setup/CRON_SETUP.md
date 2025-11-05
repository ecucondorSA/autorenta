# Configuración de Cron Jobs - AutoRenta Wallet

**Fecha**: 2025-10-20
**Propósito**: Automatizar limpieza de transacciones pending viejas

---

## 1. Cleanup de Depósitos Viejos

### Script: `tools/cleanup-old-deposits-cron.sh`

**Función**: Cancela transacciones pending con más de 30 días automáticamente

**Frecuencia Recomendada**: Diariamente a las 2:00 AM

### Instalación del Cron Job

**Paso 1**: Editar crontab
```bash
crontab -e
```

**Paso 2**: Agregar la siguiente línea:
```bash
# Cleanup de depósitos viejos - Todos los días a las 2:00 AM
0 2 * * * /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh >> /var/log/wallet-cleanup.log 2>&1
```

**Paso 3**: Guardar y verificar
```bash
# Ver crontab actual
crontab -l

# Verificar sintaxis
crontab -l | tail -1
```

### Crear archivo de log

```bash
# Crear archivo de log
sudo touch /var/log/wallet-cleanup.log

# Dar permisos al usuario actual
sudo chown $USER:$USER /var/log/wallet-cleanup.log

# Dar permisos de escritura
chmod 644 /var/log/wallet-cleanup.log
```

### Ver logs de ejecución

```bash
# Ver últimas 50 líneas
tail -50 /var/log/wallet-cleanup.log

# Ver en tiempo real
tail -f /var/log/wallet-cleanup.log

# Ver solo ejecuciones con cancelaciones
grep "canceladas: [1-9]" /var/log/wallet-cleanup.log
```

---

## 2. Monitoreo de Wallet (Opcional)

### Script: `tools/monitor-wallet-deposits.sh`

**Función**: Monitoreo manual de transacciones y detección de anomalías

**Uso**:
```bash
# Ejecutar una vez
./tools/monitor-wallet-deposits.sh --once

# Ver últimas 10 transacciones
./tools/monitor-wallet-deposits.sh --last 10

# Solo estadísticas
./tools/monitor-wallet-deposits.sh --stats

# Solo verificación de anomalías
./tools/monitor-wallet-deposits.sh --check

# Monitoreo continuo (cada 30s)
./tools/monitor-wallet-deposits.sh
```

**NO es necesario agregar a crontab** - Se ejecuta manualmente según necesidad

---

## 3. Verificación de Instalación

### Test Manual del Cleanup

```bash
# Ejecutar script manualmente
/home/edu/autorenta/tools/cleanup-old-deposits-cron.sh

# Debería mostrar:
# ✅ Cleanup ejecutado exitosamente
# Transacciones canceladas: 0 (si no hay pending viejos)
```

### Verificar Cron Job

```bash
# Ver crontab instalado
crontab -l

# Ver logs del sistema cron
grep CRON /var/log/syslog | tail -20

# Ver si el script se ejecutó (después de las 2:00 AM)
ls -lh /var/log/wallet-cleanup.log
cat /var/log/wallet-cleanup.log
```

---

## 4. Troubleshooting

### El cron job no ejecuta

**Problema**: No aparece nada en `/var/log/wallet-cleanup.log`

**Soluciones**:
1. Verificar permisos del script:
   ```bash
   ls -l /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh
   # Debe tener permisos de ejecución (rwxr-xr-x)
   ```

2. Verificar permisos del log:
   ```bash
   ls -l /var/log/wallet-cleanup.log
   # Usuario actual debe poder escribir
   ```

3. Verificar sintaxis de crontab:
   ```bash
   crontab -l
   # Formato correcto: MIN HOUR DAY MONTH WEEKDAY COMMAND
   ```

4. Ver errores de cron en syslog:
   ```bash
   grep CRON /var/log/syslog | grep cleanup
   ```

### Script ejecuta pero falla

**Problema**: Aparece "❌ Error ejecutando cleanup" en el log

**Soluciones**:
1. Verificar conectividad a base de datos:
   ```bash
   PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng..." -c "SELECT 1;"
   ```

2. Verificar que la función existe:
   ```bash
   PGPASSWORD="ECUCONDOR08122023" psql "..." -c "SELECT proname FROM pg_proc WHERE proname = 'cleanup_old_pending_deposits';"
   ```

3. Ejecutar manualmente con debug:
   ```bash
   bash -x /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh
   ```

---

## 5. Desinstalación

### Remover Cron Job

```bash
# Editar crontab
crontab -e

# Eliminar la línea del cleanup
# Guardar y salir

# Verificar
crontab -l
```

### Remover Scripts

```bash
rm /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh
rm /home/edu/autorenta/tools/monitor-wallet-deposits.sh
```

### Remover Logs

```bash
sudo rm /var/log/wallet-cleanup.log
```

---

## 6. Alternativas de Implementación

### Opción 1: Cron Job (Actual)

**Pros**:
- Simple de configurar
- No requiere servicios adicionales
- Corre en el mismo servidor

**Contras**:
- Requiere servidor siempre encendido
- Sin retry automático si falla

### Opción 2: Supabase Cron (Recomendado para producción)

**Pros**:
- Gestionado por Supabase
- Retry automático
- Logs en dashboard
- No requiere servidor propio

**Configuración**:
```sql
-- En Supabase SQL Editor
SELECT cron.schedule(
  'cleanup-old-deposits',           -- Nombre del job
  '0 2 * * *',                      -- Cron schedule (2 AM diario)
  $$ SELECT * FROM cleanup_old_pending_deposits(); $$
);

-- Ver jobs programados
SELECT * FROM cron.job;

-- Ver ejecuciones recientes
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Opción 3: Cloudflare Workers Cron

**Pros**:
- Serverless
- Alta disponibilidad
- Integrado con Workers

**Configuración** (en `wrangler.toml`):
```toml
[triggers]
crons = ["0 2 * * *"]
```

---

## 7. Resumen de Instalación

### Pasos Rápidos (Cron Local)

```bash
# 1. Crear archivo de log
sudo touch /var/log/wallet-cleanup.log
sudo chown $USER:$USER /var/log/wallet-cleanup.log

# 2. Agregar a crontab
crontab -e
# Pegar: 0 2 * * * /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh >> /var/log/wallet-cleanup.log 2>&1

# 3. Verificar instalación
crontab -l
/home/edu/autorenta/tools/cleanup-old-deposits-cron.sh

# 4. Listo! Se ejecutará automáticamente a las 2 AM
```

---

**Última actualización**: 2025-10-20 20:25 UTC
**Autor**: Claude Code
**Status**: ✅ Scripts creados y probados - Listo para instalar en crontab
