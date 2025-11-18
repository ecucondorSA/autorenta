# Ejemplos Avanzados: Claude Code en AutoRenta Producción

Casos de uso prácticos de producción usando `permissionMode`, `tool_use_id` y `skills frontmatter`.

## Ejemplo 1: Auditoría de Cambios Críticos

### Escenario
Quieres que Claude Code registre EXACTAMENTE qué cambios hizo, cuándo y cuál fue el resultado.

### Configuración

```json
// .claude/settings.local.json
{
  "permissions": {
    "allow": [
      "Bash(npm run build:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Read",
      "Write",
      "Edit"
    ],
    "ask": [
      "Bash(git push:*)"
    ],
    "defaultMode": "plan"
  },
  "toolUseTracking": true,
  "trackingFeatures": {
    "logToolUseId": true,
    "trackExecutionTime": true,
    "enableErrorTracking": true
  }
}
```

### Resultado

Cuando ejecutas un cambio:

```
Claude Code necesita permiso para:
  1. Read (archivo.ts) - tool_use_2024112418_abc123
  2. Edit (archivo.ts) - tool_use_2024112418_abc124
  3. Bash(git add:*) - tool_use_2024112418_abc125
  4. Bash(git commit:*) - tool_use_2024112418_abc126

Presiona 'y' para aceptar cada uno...
```

Cada `tool_use_id` es único y rastreable.

## Ejemplo 2: Runbook Inteligente con Skills

### Archivo: `docs/runbooks/payment-investigation.md`

```markdown
---
skills:
  - database
  - pdf
  - web-fetch
---

# 🔍 Runbook: Investigar Fallo de Pago

## Paso 1: Extraer datos de transacciones fallidas

Voy a consultar la BD de pagos para encontrar transacciones con estado `failed`:

\`\`\`sql
SELECT id, user_id, amount, status, created_at, error_message
FROM transactions
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
\`\`\`

## Paso 2: Obtener logs de MercadoPago

Descargo el reporte PDF de MercadoPago usando el skill `pdf`:

- Extrae transacciones fallidas
- Correlaciona con nuestra BD
- Genera reporte de impacto

## Paso 3: Verificar Webhook Status

Usa `web-fetch` para verificar el estado del webhook de MercadoPago:

\`\`\`
https://api.mercadopago.com/webhooks/status
\`\`\`
```

### Uso

Cuando abres este archivo en Claude Code:

```
✅ Skills detectados: database, pdf, web-fetch
✅ Cargando capacidades...
✅ Listo para investigar pagos
```

## Ejemplo 3: CI/CD Pipeline Seguro

### Escenario
Queremos que Claude Code ejecute un pipeline de build, pero solo después de confirmación en pasos críticos.

### `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run build:web:*)",
      "Bash(npm run test:*)",
      "Bash(npx tsc:*)",
      "Read",
      "Glob"
    ],
    "ask": [
      "Bash(npm run deploy:*)",
      "Bash(supabase db push:*)",
      "Write"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Bash(git push*)"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

### Resultado

```
Build pipeline iniciado...

1. Ejecutando linter...          ✅ (tool_use_123)
2. Ejecutando tests...           ✅ (tool_use_124)
3. Building web app...           ✅ (tool_use_125)

Necesito confirmación para:
4. Deploy a producción? (y/n)
```

El usuario SIEMPRE debe confirmar deployments.

## Ejemplo 4: Rastreo de Performance

### Monitorear Tiempo de Ejecución

Con `toolUseTracking` habilitado:

```
Ejecutando npm run build:web:prod...
tool_use_2024112418_build001
Duration: 15.3s
Memory: 2.1GB
Status: Success ✅
```

Esto permite:

- **Detectar degradación**: Si un build toma 15s vs 25s antes
- **Optimizar**: Identificar operaciones lentas
- **Reportar**: Mostrar métricas de productividad

### Analizar Patrones

```bash
# Ver operaciones más lentas
grep "tool_use_" ~/.claude/logs/tools.log | \
  awk '{print $2, $4}' | \
  sort -k2 -rn | head -10
```

## Ejemplo 5: Workflow Multi-Stage Seguro

### Operación Compleja: Migración de Base de Datos

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Bash(supabase migration list:*)"
    ],
    "ask": [
      "Bash(supabase db push:*)",
      "Edit"
    ],
    "deny": [
      "Bash(supabase db reset:*)"
    ],
    "defaultMode": "plan"
  }
}
```

### Ejecución Controlada

```
Stage 1: Revisar cambios pendientes
   ✅ Read migrations (automático)
   ✅ Bash(supabase migration list) (automático)

Stage 2: Aplicar cambios
   ⏳ Bash(supabase db push) - REQUIERE CONFIRMACIÓN
   ⏳ Edit (migrate script) - REQUIERE CONFIRMACIÓN

Stage 3: Validar
   ✅ Bash(supabase migration list) (automático)
```

## Ejemplo 6: Optimización de Tokens con TOON Format

### Escenario

AutoRenta usa queries grandes al MCP Server (50+ bookings, 100+ cars). JSON es verboso y quema muchos tokens. TOON reduce 30-60% en arrays uniformes.

### Configuración Automática

El hook `json-to-toon` se activa automáticamente en `.claude/settings.json`:

```json
{
  "hooks": {
    "onPromptSubmit": [
      ".claude/hooks/json-to-toon.mjs"
    ]
  },
  "toonOptimization": {
    "enabled": true,
    "minArrayLength": 5,          // Solo arrays con 5+ items
    "minReductionPercent": 20     // Solo si > 20% ahorro
  }
}
```

### Ejemplo: Query de Autos

**Sin TOON (JSON)**:
```json
{
  "cars": [
    {"id": "uuid1", "brand": "Toyota", "status": "active", "daily_rate": 1500},
    {"id": "uuid2", "brand": "Honda", "status": "active", "daily_rate": 1700},
    ...
  ]
}
```

**Con TOON (Automático)**:
```toon
cars[100]{id,brand,status,daily_rate}:
 uuid1,Toyota,active,1500
 uuid2,Honda,active,1700
 ...
```

**Beneficio**: 50-60% reducción de tokens para 100 resultados

### Herramientas Disponibles

**Script de conversión manual**:
```bash
# Convertir JSON a TOON
node tools/toon-convert.mjs query-results.json output.toon

# Validar que es reversible
node tools/toon-convert.mjs output.toon check.json --validate

# Ver estadísticas
node tools/toon-convert.mjs large-dataset.json output.toon --stats
```

### Datos de Referencia

`docs/REFERENCE_DATA.toon` contiene tablas pre-optimizadas para reutilizar en prompts:

```bash
# Usar en prompts sin JSON overhead
> "Dame configuración del ambiente usando docs/REFERENCE_DATA.toon"

# Claude Code accede a datos optimizados:
# environments[3]{name,payment_system,webhook_url}:
#  Production,MercadoPago Real,Supabase Edge Function
#  Staging,MercadoPago Sandbox,Supabase Edge Function
#  Development,Mock Payment,Cloudflare Worker
```

### Casos de Uso

1. **MCP Queries**: Cuando Claude Code consulta cars/bookings/users
2. **Documentación**: Usar REFERENCE_DATA.toon en lugar de duplicar tablas
3. **Logs**: Convertir logs grandes a TOON para debugging
4. **Testing**: Fixtures TOON más compactos

### Configuración Avanzada

**Para habilitar debug**:
```json
{
  "toonOptimization": {
    "debug": true  // Ver qué se convierte
  }
}
```

**Para ajustar sensibilidad**:
```json
{
  "toonOptimization": {
    "minArrayLength": 10,         // Más estricto
    "minReductionPercent": 30     // Más selectivo
  }
}
```

### ROI Ejemplo

**Supuesto**: 5 Claude Code sessions/semana

| Caso | Tokens | Costo | Anual |
|------|--------|-------|-------|
| MCP Config | 300 | $0.015 | $0.78 |
| DB Queries (50+ items) | 10,000 | $0.50 | $26.00 |
| Docs/Reference | 2,000 | $0.10 | $5.20 |
| **Total** | **12,300** | **$0.65/session** | **$32/año** |

Con 5 sessions/semana: **$33/año en ahorros**

---

## Integración con Hooks

Puedes combinar estas features con hooks para crear workflows aún más sofisticados:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash(git commit:*)",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Commit realizado' && sleep 1",
            "statusMessage": "Validando commit..."
          }
        ]
      }
    ]
  }
}
```

## Testing de Permisos

### Verificar Configuración

```bash
# Ver permisos activos
cat .claude/settings.local.json | jq '.permissions'

# Ver si hay conflictos
grep -E '"ask":|"deny":' .claude/settings.local.json
```

### Simular Operación

```bash
# Ver qué permisos se necesitan (sin ejecutar)
# Ejecuta una operación en modo "plan"
# y revisa los permisos solicitados
```

## Mejores Prácticas

### ✅ DO

1. **Usar `defaultMode: "plan"`** cuando trabajas con cambios críticos
2. **Declarar skills frontmatter** en todos los runbooks operativos
3. **Usar deny list** para operaciones peligrosas
4. **Monitorear tool_use_id** para auditoría

### ❌ DON'T

1. No uses `defaultMode: "acceptEdits"` en operaciones críticas
2. No permitas `Bash(rm:*)` sin una muy buena razón
3. No dejes permisos muy abiertos (`All`) en settings.local.json
4. No desactives tracking (`toolUseTracking: false`) en producción

## Checklist de Implementación

- [ ] Actualizar `.claude/settings.json` con `toolUseTracking`
- [ ] Configurar `.claude/settings.local.json` con permisos granulares
- [ ] Agregar `skills` frontmatter a runbooks críticos
- [ ] Documentar workflow en equipo
- [ ] Probar permiso mode en desarrollo
- [ ] Monitorear tool_use_id en primeras ejecuciones
- [ ] Ajustar permisos basado en feedback

## Monitoreo Continuo

### Script de Control

```bash
#!/bin/bash
# .claude/monitor-permissions.sh

echo "=== Claude Code Permission Audit ==="
echo "Last 10 tool uses:"
tail -10 ~/.claude/logs/tools.log

echo ""
echo "Denied operations:"
grep "DENIED" ~/.claude/logs/tools.log | wc -l

echo ""
echo "Slowest operations:"
grep "Duration:" ~/.claude/logs/tools.log | \
  sort -t: -k2 -rn | head -5
```

Ejecuta con: `bash .claude/monitor-permissions.sh`

---

**Última actualización**: 2025-11-18
**Para**: AutoRenta Feature Cursor 2.0 + TOON Optimization
**Versión**: 1.1 (Added TOON Format Optimization example)
