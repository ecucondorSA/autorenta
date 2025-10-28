# 📝 Instrucciones para Claude Code

Este directorio contiene el roadmap completo para llevar AutoRenta de 40% a 100% production-ready.

## 🎯 Objetivo

Generar **7 documentos técnicos detallados** que expliquen paso a paso cómo:
1. Arreglar seguridad (secretos expuestos)
2. Implementar split payment
3. Corregir bugs críticos
4. Crear testing real (sin golpear producción)
5. Implementar infraestructura robusta
6. Pulir y optimizar
7. Checklist final de producción

## 📋 Documentos a Crear

### Documento 1: `01-FASE-CRITICA-SEGURIDAD.md`
**Contenido:**
- Análisis de dónde están expuestos los secretos actualmente
- Plan detallado para moverlos a variables de entorno
- Cómo configurar GitHub Secrets
- Cómo actualizar Cloudflare Workers con secrets
- Cómo actualizar Supabase Edge Functions
- Comandos exactos para cada paso
- Checklist de validación

### Documento 2: `02-FASE-CRITICA-SPLIT-PAYMENT.md`
**Contenido:**
- Explicación del problema actual (dinero va a plataforma, no a locador)
- Arquitectura del split payment con MercadoPago
- Implementación paso a paso
- Código de ejemplo para edge functions
- Validación de onboarding MP obligatorio
- Testing del flujo completo
- Manejo de errores y rollbacks

### Documento 3: `03-FASE-ALTA-BUGS-CRITICOS.md`
**Contenido:**
- Lista completa de bugs identificados:
  * risk_snapshot vs risk_snapshots (typo)
  * getCarName() devuelve literal
  * Mapbox obligatorio sin fallback
- Solución para cada bug con código
- Tests para validar cada fix
- Regression testing

### Documento 4: `04-FASE-ALTA-TESTING-REAL.md`
**Contenido:**
- Cómo crear proyecto Supabase de staging
- Configurar Playwright para usar staging
- Generar storage states correctamente
- Fix de sessionStorage en tests
- Separar tests de smoke/integration/e2e
- CI/CD para ambiente staging

### Documento 5: `05-FASE-MEDIA-INFRAESTRUCTURA.md`
**Contenido:**
- IaC con Terraform o Pulumi
- Setup de Sentry para monitoreo
- Logs centralizados (Axiom/Datadog)
- Alertas automáticas (PagerDuty/Slack)
- Dashboards de métricas
- Runbooks para incidentes

### Documento 6: `06-FASE-FINAL-POLISH.md`
**Contenido:**
- Features premium opcionales
- Performance optimization (lazy loading, caching)
- SEO avanzado
- PWA optimizations
- Documentación de usuario

### Documento 7: `07-CHECKLIST-PRODUCCION.md`
**Contenido:**
- Checklist exhaustivo de 100 items
- Seguridad (20 items)
- Funcionalidad (30 items)
- Performance (15 items)
- Infraestructura (20 items)
- Documentación (15 items)

## 🔧 Formato de Cada Documento

Cada documento debe seguir esta estructura:

```markdown
# [Título de la Fase]

**Prioridad:** P0/P1/P2  
**Tiempo estimado:** X días  
**Impacto:** X% → Y%

---

## 🎯 Objetivo

[Descripción del objetivo]

## 🔴 Problema Actual

[Análisis detallado del problema]

## ✅ Solución Propuesta

[Arquitectura y enfoque de la solución]

## 📝 Implementación Paso a Paso

### Paso 1: [Título]
**Qué hacer:**
[Explicación]

**Comandos:**
\`\`\`bash
# Comandos exactos
\`\`\`

**Código:**
\`\`\`typescript
// Código de ejemplo
\`\`\`

### Paso 2: [Título]
[Repetir estructura]

## 🧪 Testing y Validación

[Cómo validar que funciona]

## 🚨 Troubleshooting

[Problemas comunes y soluciones]

## ✅ Checklist

- [ ] Item 1
- [ ] Item 2

## 📚 Referencias

[Links útiles]
```

## 🚀 Cómo Usar con Claude Code

1. Abre Claude Code en otra sesión
2. Navega a `docs/production-roadmap/`
3. Pídele que genere cada documento siguiendo esta estructura
4. Revisa y ajusta según necesites

## 💡 Tips para Claude Code

- Sé específico con los comandos (paths exactos)
- Incluye código completo, no solo snippets
- Añade validaciones después de cada paso
- Incluye manejo de errores
- Documenta troubleshooting común

---

**Estado actual:** README y documento 00 creados  
**Pendiente:** Documentos 01-07

