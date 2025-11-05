# 🧪 Experimentación con Claude Skills - AutoRenta

## 📅 Fecha: 16 de Octubre de 2025

Este documento guía la experimentación práctica con Claude Skills en AutoRenta cuando estén disponibles.

---

## 🎯 Objetivo

Validar que los **6 Skills recomendados** funcionan correctamente con la arquitectura de AutoRenta y medir el impacto real en productividad.

---

## 📋 Skills a Experimentar

### 1. Angular Standalone Architecture Skill
- **Estado**: ⏳ Pendiente (Skills no disponibles aún)
- **Prioridad**: Alta
- **Test Case**: Crear módulo de "reviews" completo

### 2. Supabase RLS Debugger Skill
- **Estado**: ⏳ Pendiente
- **Prioridad**: Alta
- **Test Case**: Reproducir error RLS intencionalmente

### 3. TypeScript Database Sync Skill
- **Estado**: ⏳ Pendiente
- **Prioridad**: Media
- **Test Case**: Detectar inconsistencias en database.types.ts

### 4. Angular Test Generator Skill
- **Estado**: ⏳ Pendiente
- **Prioridad**: Alta
- **Test Case**: Generar tests para cars.service.ts

### 5. Performance Optimizer Skill
- **Estado**: ⏳ Pendiente
- **Prioridad**: Media
- **Test Case**: Optimizar bundle size actual (560KB → 500KB)

### 6. Security Audit Skill
- **Estado**: ⏳ Pendiente
- **Prioridad**: Alta
- **Test Case**: Auditoría completa del proyecto

---

## 🧪 Experimentos Planificados

### Experimento 1: Crear Feature "Reviews" con Angular Skill

**Objetivo**: Validar generación automática de código siguiendo patterns de AutoRenta

**Setup**:
```bash
# 1. Verificar documentación lista
cat PATTERNS.md
cat CLAUDE.md

# 2. Verificar metadata en package.json
cat package.json | grep -A 20 "autorenta"
```

**Prompt de Prueba**:
```
Crear módulo completo de "reviews" para AutoRenta que permita a los locatarios
calificar autos después de una reserva. Incluir:
- Lista de reviews por auto
- Detalle de review individual
- Formulario para crear review
- Service con operaciones CRUD
- RLS policies para Supabase
- Tests unitarios
```

**Resultado Esperado**:
- ✅ Estructura de archivos siguiendo convenciones
- ✅ Service con `injectSupabase()` pattern
- ✅ Components standalone con lazy-loading
- ✅ TypeScript interfaces type-safe
- ✅ RLS policies correctas
- ✅ Tests con 80%+ coverage

**Métricas a Medir**:
- ⏱️ Tiempo de generación: ___ minutos
- 📊 Archivos generados: ___ files
- ✅ Tests passing: ___/%
- 🐛 Errores encontrados: ___
- 🔧 Ajustes necesarios: ___

**Validación Manual**:
```bash
# Build sin errores
npm run build

# Tests pasando
npm run test

# Lint clean
npm run lint
```

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

### Experimento 2: Debug RLS con Supabase Skill

**Objetivo**: Validar detección automática de errores RLS

**Setup**:
```bash
# Crear error RLS intencionalmente
# Modificar profile.service.ts para incluir bucket prefix
```

**Código de Prueba** (error intencional):
```typescript
// apps/web/src/app/core/services/profile.service.ts
async uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // ❌ ERROR INTENCIONAL: Incluir bucket prefix
  const filePath = `avatars/${user.id}/${uuidv4()}.jpg`;

  const { error } = await this.supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (error) throw error;
  // ...
}
```

**Prompt de Prueba**:
```
Estoy obteniendo este error al subir avatar:
"new row violates row-level security policy for table storage.objects"

Ayúdame a debuggear el problema.
```

**Resultado Esperado**:
- ✅ Skill detecta bucket prefix en path
- ✅ Skill identifica mismatch con RLS policy
- ✅ Skill genera fix específico
- ✅ Skill valida que fix no introduce nuevos issues

**Métricas a Medir**:
- ⏱️ Tiempo de análisis: ___ minutos
- 🎯 Precisión del diagnóstico: Correcto / Incorrecto
- 🔧 Fix generado funcional: Sí / No

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

### Experimento 3: Sync Database Types

**Objetivo**: Validar detección de inconsistencias entre código y DB

**Setup**:
```sql
-- Agregar columna nueva en Supabase
ALTER TABLE bookings ADD COLUMN rating INTEGER;

-- NO regenerar types de TypeScript (dejar inconsistencia)
```

**Prompt de Prueba**:
```
Validar que los types de TypeScript estén sincronizados con el schema
de Supabase. Detectar cualquier inconsistencia.
```

**Resultado Esperado**:
- ✅ Detecta campo `rating` faltante en interface
- ✅ Sugiere regenerar types con `npm run sync:types`
- ✅ Identifica servicios que pueden verse afectados

**Métricas a Medir**:
- 🎯 Inconsistencias detectadas: ___
- ✅ False positives: ___
- ⏱️ Tiempo de análisis: ___ minutos

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

### Experimento 4: Generar Tests Automáticamente

**Objetivo**: Validar generación de tests siguiendo patterns de AutoRenta

**Setup**:
```bash
# Verificar que cars.service.ts no tiene tests
ls apps/web/src/app/core/services/cars.service.spec.ts
# Debería no existir o estar incompleto
```

**Prompt de Prueba**:
```
Generar tests unitarios completos para cars.service.ts siguiendo
los patterns de AutoRenta. Incluir:
- Tests de happy path
- Tests de error handling
- Mocks de Supabase
- Coverage mínimo 80%
```

**Resultado Esperado**:
- ✅ `cars.service.spec.ts` generado
- ✅ Tests para todos los métodos públicos
- ✅ Mocks correctos de Supabase
- ✅ Coverage 80%+
- ✅ Tests passing

**Métricas a Medir**:
- ⏱️ Tiempo de generación: ___ minutos
- 📊 Test cases generados: ___
- ✅ Tests passing: ___/%
- 📈 Coverage: ___%

**Validación**:
```bash
# Ejecutar tests
npm run test:coverage

# Verificar coverage
open apps/web/coverage/index.html
```

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

### Experimento 5: Optimizar Performance

**Objetivo**: Reducir bundle size de 560KB a 500KB

**Setup**:
```bash
# Build actual
npm run build

# Output:
# ⚠️ bundle initial exceeded maximum budget by 60.40 kB
# Current: 560.40 kB
# Budget: 500.00 kB
```

**Prompt de Prueba**:
```
Analizar el bundle de producción y sugerir optimizaciones para
reducir el tamaño a menos de 500KB. Enfocarse en:
- Mapbox GL (1.61 MB lazy chunk)
- CSS oversize (cars-list.page.css: 6.44KB)
```

**Resultado Esperado**:
- ✅ Detecta imports no optimizados de Mapbox
- ✅ Sugiere dynamic import
- ✅ Identifica CSS duplicado
- ✅ Genera código optimizado

**Métricas a Medir**:
- 📊 Bundle size antes: 560KB
- 📊 Bundle size después: ___ KB
- 📉 Reducción: ___%
- ⏱️ LCP before/after: ___ s

**Validación**:
```bash
# Build optimizado
npm run build

# Verificar tamaños
ls -lh apps/web/dist/web/browser/*.js
```

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

### Experimento 6: Security Audit Completo

**Objetivo**: Identificar vulnerabilidades de seguridad

**Prompt de Prueba**:
```
Realizar auditoría de seguridad completa de AutoRenta. Validar:
- RLS policies en todas las tablas
- Storage bucket permissions
- Configuración de CORS
- Environment variables exposure
- Auth interceptor configuration
- Rate limiting
```

**Resultado Esperado**:
- ✅ Lista de issues encontrados
- ✅ Priorización (Alta/Media/Baja)
- ✅ Fixes específicos para cada issue
- ✅ Validation scripts

**Métricas a Medir**:
- 🔒 Issues críticos: ___
- ⚠️ Issues medios: ___
- 💡 Mejoras sugeridas: ___
- ⏱️ Tiempo de audit: ___ minutos

**Resultado Real**: _Por completar cuando Skills estén disponibles_

---

## 📊 Tabla de Resultados Consolidados

| Skill | Estado | Tiempo | Precisión | Ajustes Necesarios | ROI |
|-------|--------|--------|-----------|-------------------|-----|
| Angular Scaffolder | ⏳ | - | - | - | - |
| RLS Debugger | ⏳ | - | - | - | - |
| TypeScript Sync | ⏳ | - | - | - | - |
| Test Generator | ⏳ | - | - | - | - |
| Performance Optimizer | ⏳ | - | - | - | - |
| Security Auditor | ⏳ | - | - | - | - |

**Leyenda de Estado**:
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
- ❌ Fallido

---

## 🎯 Criterios de Éxito

Para considerar un Skill exitoso:

1. **Funcionalidad**: ✅ Genera código/análisis correcto
2. **Precisión**: ✅ 90%+ de accuracy
3. **Tiempo**: ✅ 50%+ más rápido que manual
4. **Patterns**: ✅ Sigue convenciones de AutoRenta
5. **Tests**: ✅ Código generado pasa todos los tests

---

## 🔄 Proceso de Experimentación

### Fase 1: Preparación (✅ Completado)
- [x] Crear PATTERNS.md con templates
- [x] Agregar metadata a package.json
- [x] Documentar arquitectura en CLAUDE.md
- [x] Crear este documento de experimentación

### Fase 2: Experimentos Iniciales (⏳ Cuando Skills estén disponibles)
- [ ] Experimento 1: Angular Scaffolder
- [ ] Experimento 4: Test Generator
- [ ] Validar resultados y ajustar prompts

### Fase 3: Experimentos Avanzados
- [ ] Experimento 2: RLS Debugger
- [ ] Experimento 3: TypeScript Sync
- [ ] Experimento 5: Performance Optimizer

### Fase 4: Producción
- [ ] Experimento 6: Security Audit
- [ ] Integración en CI/CD
- [ ] Documentación de learnings

---

## 📝 Template de Registro de Experimento

Para cada experimento completado, copiar esta plantilla:

```markdown
## Experimento: [Nombre del Skill]
**Fecha**: YYYY-MM-DD
**Ejecutado por**: [Nombre]

### Setup
[Descripción del setup]

### Prompt Usado
```
[Prompt exacto usado]
```

### Resultado Obtenido
[Descripción detallada]

### Métricas Reales
- Tiempo: X minutos
- Precisión: X%
- Ajustes: X cambios necesarios

### Learnings
- ✅ Qué funcionó bien
- ❌ Qué no funcionó
- 💡 Mejoras sugeridas

### Código Generado
[Snippet relevante o link a commit]

### Screenshots
[Si aplica]
```

---

## 💡 Tips para Experimentación

### 1. Prompts Efectivos

**✅ Bueno**:
```
Crear módulo completo de "reviews" siguiendo los patterns de AutoRenta
definidos en PATTERNS.md. Incluir service, components, routes y tests.
```

**❌ Malo**:
```
Crear reviews
```

### 2. Contexto Suficiente

Asegurar que Claude tenga acceso a:
- CLAUDE.md (arquitectura)
- PATTERNS.md (templates)
- package.json metadata
- Código existente relevante

### 3. Validación Rigurosa

Siempre validar con:
```bash
npm run build   # Sin errores
npm run lint    # Sin warnings
npm run test    # Todos passing
```

### 4. Iteración

Si el resultado no es perfecto:
1. Analizar qué falló
2. Ajustar documentación/prompts
3. Re-intentar
4. Documentar learnings

---

## 📚 Recursos

- **CLAUDE.md**: Arquitectura y workflows
- **PATTERNS.md**: Templates de código
- **CLAUDE_SKILLS_GUIDE.md**: Guía de Skills
- **tools/claude-workflows.sh**: Scripts de automatización

---

## 🎓 Learnings Esperados

Al finalizar la experimentación, deberíamos saber:

1. ✅ Qué Skills son más útiles para AutoRenta
2. ✅ Cómo escribir prompts efectivos para cada Skill
3. ✅ Qué ajustes hacer a PATTERNS.md para mejor resultado
4. ✅ ROI real vs. estimado de cada Skill
5. ✅ Integración óptima en workflow diario

---

## 📈 Próximos Pasos

1. **Esperar disponibilidad de Skills**
   - Monitorear release notes de Claude Code
   - Probar en cuanto estén disponibles

2. **Ejecutar experimentos en orden**
   - Empezar con Angular Scaffolder (más impactante)
   - Continuar con Test Generator
   - Finalizar con Security Audit

3. **Documentar resultados**
   - Actualizar este documento con resultados reales
   - Crear guía de mejores prácticas
   - Compartir learnings con equipo

4. **Optimizar para producción**
   - Ajustar PATTERNS.md según learnings
   - Integrar Skills en workflow CI/CD
   - Entrenar equipo en uso efectivo

---

**Última actualización**: 16 de Octubre de 2025
**Estado**: Preparación completada, esperando disponibilidad de Skills
**Responsable**: AutoRenta Development Team
