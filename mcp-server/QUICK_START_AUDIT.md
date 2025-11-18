# Quick Start: MCP Auditor Module

Guía rápida para usar el módulo de auditoría especializado en AutoRenta.

## 🚀 Lo básico (5 minutos)

### 1. Generar Reporte Completo

```
@autorenta-platform Genera un reporte de auditoría completo
```

Esto te mostrará:
- Funciones SECURITY_DEFINER críticas
- Tablas sin RLS policies
- Tablas con seq_scans altos
- Acciones prioritarias con estimación de esfuerzo

### 2. Revisar Seguridad

```
@autorenta-platform ¿Qué funciones tienen riesgo SECURITY_DEFINER?
@autorenta-platform Audita funciones SECURITY_DEFINER con riesgo crítico
```

### 3. Crear RLS Policies

```
@autorenta-platform Genera RLS policies para la tabla bookings
@autorenta-platform Crea políticas RLS para la tabla wallet_transactions
```

### 4. Optimizar Indexes

```
@autorenta-platform Analiza la performance de la base de datos
@autorenta-platform Genera índices para la tabla bookings
```

---

## 📊 Flujos Comunes

### Flujo: Pre-Development (Antes de escribir código)

```
1. @autorenta-platform Genera reporte de auditoría
   → Revisar qué hay de crítico

2. @autorenta-platform Audita RLS coverage
   → Verificar tabla que voy a usar tiene RLS policies

3. Si no tiene:
   @autorenta-platform Genera RLS policies para [mi tabla]
   → Copiar SQL generado, revisar, ejecutar en Supabase

4. @autorenta-platform Muéstrame el resumen de seguridad
   → Verificar no hay otras issues críticas

5. Proceder con desarrollo ✅
```

### Flujo: Feature Development (Nuevo feature)

```
1. Crear nuevas tablas en migration
2. @autorenta-platform Genera RLS policies para [nueva_tabla]
3. Aplicar policies en Supabase
4. Sincronizar tipos: npm run sync:types
5. Escribir código seguro ✅
```

### Flujo: Performance Investigation

```
1. @autorenta-platform Analiza performance con umbral 5000
   → Ver tablas problemáticas

2. Para tabla problemática:
   @autorenta-platform Genera índices para [tabla]
   → Ver SQL sugerido

3. Evaluar qué índices crear
4. Crear en Supabase
5. Monitorear: @autorenta-platform Analiza performance
   → Verificar mejora ✅
```

### Flujo: Security Hardening (Trimestral)

```
1. @autorenta-platform Audita funciones SECURITY_DEFINER con riesgo high
   → Documentar cada una

2. Para cada función crítica:
   - Revisar código
   - Documentar por qué usa SECURITY_DEFINER
   - Considerar cambiar a SECURITY_INVOKER
   - Actualizar search_path si es necesario

3. @autorenta-platform Audita RLS coverage
   → Crear policies para tablas sin cobertura

4. Documentar cambios en CHANGELOG ✅
```

---

## 🎯 Recursos (URIs)

Accede directamente a recursos específicos:

```
# Auditoría completa
@autorenta-platform Muéstrame: autorenta://audit/security-summary

# Funciones SECURITY_DEFINER
@autorenta-platform Muéstrame: autorenta://audit/security-definer-functions

# RLS Policies
@autorenta-platform Muéstrame: autorenta://audit/rls-policies

# Performance
@autorenta-platform Muéstrame: autorenta://audit/performance

# Schema Analysis (JSON)
@autorenta-platform Muéstrame: autorenta://audit/schema-analysis
```

---

## 🛠️ Herramientas (Tools)

Ejecuta acciones específicas:

```
# RLS Policy Boilerplate
@autorenta-platform Ejecuta: generate_rls_policy
  tableName: bookings
  userIdColumn: user_id

# Generar Índices
@autorenta-platform Ejecuta: generate_indexes
  tableName: bookings

# Auditar SECURITY_DEFINER
@autorenta-platform Ejecuta: audit_security_definer
  minRiskLevel: critical

# Auditar RLS Coverage
@autorenta-platform Ejecuta: audit_rls_coverage
  requirePolicies: true

# Analizar Performance
@autorenta-platform Ejecuta: analyze_performance
  seqScansThreshold: 10000

# Reporte Completo
@autorenta-platform Ejecuta: generate_audit_report
```

---

## 🔍 Interpretación Rápida

### Risk Levels

| Level | Acción | Timeline | Esfuerzo |
|-------|--------|----------|----------|
| **CRITICAL** | Auditar inmediatamente | Hoy | 45-60m |
| **HIGH** | Incluir en próximo sprint | 2 semanas | 30-45m |
| **MEDIUM** | Backlog de seguridad | 1 mes | 15-30m |

### Performance

| Seq Scans | Acción | Impacto |
|-----------|--------|--------|
| **>100k** | CRÍTICO - crear índices | Carga de DB baja |
| **10k-100k** | ALTO - planificar | Queries pueden ser lentas |
| **1k-10k** | MEDIO - monitorear | Generalmente OK |

### RLS Status

- ✅ **Table has RLS + Policies**: Segura
- ⚠️ **Table has RLS but NO Policies**: Alto riesgo
- ❌ **Table NO RLS**: Crítico - habilitar

---

## ✅ Checklist: Primera Auditoría

- [ ] Genera reporte completo: `generate_audit_report`
- [ ] Revisar funciones críticas SECURITY_DEFINER
- [ ] Auditar RLS coverage: `audit_rls_coverage`
- [ ] Analizar performance: `analyze_performance`
- [ ] Listar tablas sin RLS
- [ ] Listar tablas con seq_scans altos
- [ ] Priorizar fixes por criticidad
- [ ] Estimar esfuerzo total
- [ ] Crear backlog en GitHub Issues

---

## 📚 Documentación Completa

Para más detalles, ver: [AUDIT_MODULE.md](./AUDIT_MODULE.md)

---

## 💡 Tips & Tricks

### Tip 1: Guardar Reportes

Guarda el JSON del reporte para comparar después:

```
@autorenta-platform Genera reporte completo
# Copy JSON output → save to file
# Ejecutar nuevamente después de fixes
# Comparar métricas
```

### Tip 2: Auditar Regularmente

- **Semanal**: Analizar performance
- **Mensual**: Reporte completo
- **Trimestral**: Auditoría SECURITY_DEFINER
- **Ad-hoc**: Cuando agregas nuevas tablas

### Tip 3: Automatizar en Workflow

Incluir auditorías en tu CI/CD:

```bash
# Pre-commit hook
npm run audit:security

# Pre-deploy
npm run audit:report
```

### Tip 4: Documentar Decisiones

Cuando ignores una recomendación, documenta por qué:

```sql
COMMENT ON TABLE sensitive_data IS
  'SECURITY_DEFINER used because X needs access without Y'

COMMENT ON POLICY policy_name ON table_name IS
  'Allows Z because business requirement A'
```

---

## 🆘 Troubleshooting

### Problema: "No se pueden acceder a estadísticas de performance"

**Causa**: RPC functions no disponibles

**Solución**: El auditor usará fallback a `information_schema`. Funciona, pero sin datos de seq_scans.

### Problema: "Generó demasiadas funciones críticas"

**Causa**: Sistema heredado con muchas funciones SECURITY_DEFINER

**Solución**: Auditar por batches:
- Primera semana: Top 10 críticas
- Segunda: Siguientes 20
- Tercera: Resto

### Problema: "Las políticas RLS generadas no funcionan"

**Causa**: Lógica específica del negocio no capturada

**Solución**: El boilerplate es una base. Ajusta según:
- Estructura de datos real
- Relaciones entre tablas
- Roles y permisos

---

## 🚀 Próximos Pasos

1. Ejecuta: `@autorenta-platform Genera reporte completo`
2. Copia el JSON en un archivo local
3. Crea GitHub Issues para cada acción prioritaria
4. Planifica sprints de remediación
5. Audita regularmente

Happy auditing! 🔐

