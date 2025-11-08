# 📋 Proceso de Pull Requests - AutoRenta

Este documento describe el proceso completo de Pull Requests en AutoRenta, incluyendo code review obligatorio y validaciones.

---

## 🎯 Objetivo

Establecer un proceso robusto de PRs que asegure:
- ✅ Calidad de código
- ✅ Code review obligatorio
- ✅ Validación automática
- ✅ Documentación adecuada
- ✅ Menos bugs en producción

---

## 📝 Flujo de Trabajo

### 1. Antes de Crear el PR

#### ✅ Preparación Local

```bash
# 1. Asegúrate de estar en main y actualizado
git checkout main
git pull origin main

# 2. Crea un branch nuevo
git checkout -b feature/mi-nueva-feature

# 3. Desarrolla tu feature
# ... hacer cambios ...

# 4. Ejecuta validación local
./scripts/validate-pr.sh

# 5. Si pasa, commit y push
git add .
git commit -m "feat: descripción de cambios"
git push origin feature/mi-nueva-feature
```

#### ✅ Checklist Pre-PR

Antes de abrir el PR, verifica:

- [ ] **Tests pasan localmente**: `npm run test`
- [ ] **Lint sin errores**: `npm run lint`
- [ ] **Build exitoso**: `npm run build`
- [ ] **Script de validación**: `./scripts/validate-pr.sh` pasa
- [ ] **Sin secrets**: No hay credenciales en el código
- [ ] **Sin console.log**: Eliminados o reemplazados
- [ ] **Documentación**: Docs actualizadas si es necesario

---

### 2. Crear el PR

#### ✅ Usar el Template

Al crear el PR en GitHub, el template se llenará automáticamente. Completa:

1. **Descripción clara**: Qué hace el PR y por qué
2. **Tipo de cambio**: Marcar el tipo apropiado
3. **Checklist**: Marcar items completados
4. **Screenshots**: Si es UI/feature, agregar screenshots
5. **Relacionado con**: Link a issue si aplica

#### ✅ Título del PR

Seguir formato: `[tipo]: [descripción]`

Ejemplos:
- `feat: Add user profile editing`
- `fix: Resolve avatar upload RLS issue`
- `docs: Update PR process documentation`
- `refactor: Extract payment logic to service`

Tipos:
- `feat`: Nueva feature
- `fix`: Bug fix
- `docs`: Documentación
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Mantenimiento

---

### 3. Durante el Review

#### ✅ Para el Autor

1. **Esperar feedback**: No mergear sin aprobación
2. **Responder comentarios**: Responder a todos los comentarios
3. **Hacer cambios**: Implementar cambios solicitados
4. **Actualizar PR**: Push cambios y marcar comentarios como resueltos
5. **Notificar**: Notificar a revisores cuando hay cambios

#### ✅ Para el Revisor

1. **Revisar código**: Seguir [Code Review Guidelines](/.github/CODE_REVIEW_GUIDELINES.md)
2. **Dejar comentarios**: Comentarios constructivos y claros
3. **Aprobar o solicitar cambios**: Decisión clara
4. **Explicar decisiones**: Por qué aprobar o solicitar cambios

---

### 4. Validación Automática

Cuando abres un PR, GitHub Actions ejecuta automáticamente:

#### ✅ PR Validation Workflow

- ✅ Verifica tamaño del PR
- ✅ Busca secrets hardcoded
- ✅ Verifica console.log
- ✅ Valida PR template
- ✅ Ejecuta lint
- ✅ Ejecuta type check

#### ✅ CI Checks

- ✅ Build
- ✅ Tests
- ✅ Lint
- ✅ Security scan

**Todos estos checks deben pasar antes de poder mergear.**

---

### 5. Merge del PR

#### ✅ Requisitos para Merge

El PR **NO** puede ser mergeado hasta que:

1. ✅ **Code Review**: Al menos 1 aprobación
2. ✅ **CI Passing**: Todos los checks de CI pasan
3. ✅ **No Conflicts**: Sin conflictos con `main`
4. ✅ **Checklist Completo**: Todos los items críticos marcados
5. ✅ **Conversaciones Resueltas**: Todas las conversaciones resueltas

#### ✅ Proceso de Merge

1. **Verificar requisitos**: Todos los requisitos cumplidos
2. **Squash and Merge** (recomendado): Un commit limpio en main
3. **Eliminar branch**: Eliminar branch después de merge
4. **Verificar deploy**: Verificar que deploy funciona

---

## 🚦 Estados del PR

### 🟡 WIP (Work In Progress)

Si el PR no está listo para review:

1. Agregar `[WIP]` al título
2. Marcar como "Draft" en GitHub
3. No solicitar review hasta que esté listo

### 🟢 Ready for Review

Cuando el PR está listo:

1. Remover `[WIP]` del título
2. Marcar como "Ready for review"
3. Solicitar review (opcional, GitHub notificará automáticamente)

### 🔴 Needs Changes

Si el revisor solicita cambios:

1. Implementar cambios solicitados
2. Push cambios
3. Marcar comentarios como resueltos
4. Notificar al revisor para re-revisión

### ✅ Approved

Cuando el PR es aprobado:

1. Verificar que CI pasa
2. Resolver conflictos si hay
3. Mergear cuando todo esté listo

---

## 📏 Tamaño de PR

### ✅ PRs Pequeños (Recomendado)

- **Archivos**: 1-10
- **Tiempo de review**: 15-30 min
- **Estado**: ✅ Ideal

### ⚠️ PRs Medianos

- **Archivos**: 11-30
- **Tiempo de review**: 30-60 min
- **Estado**: ⚠️ Aceptable, pero revisar si se puede dividir

### 🔴 PRs Grandes

- **Archivos**: 31-50
- **Tiempo de review**: 1-2 horas
- **Estado**: 🔴 Considerar dividir

### 🚫 PRs Muy Grandes

- **Archivos**: 50+
- **Tiempo de review**: 2+ horas
- **Estado**: 🚫 **Debe dividirse**

**Si tu PR es muy grande, divídelo en múltiples PRs más pequeños.**

---

## 🔒 Migrations

### ⚠️ PRs con Migrations

Si tu PR incluye migrations de base de datos:

#### ✅ Checklist Especial

- [ ] **Probado en staging**: Migrations ejecutadas en staging
- [ ] **Plan de rollback**: Documentado cómo revertir
- [ ] **Backup considerado**: Backup de datos importante antes
- [ ] **Performance**: Verificar que no hay queries lentas
- [ ] **RLS policies**: Verificar que RLS está correcto
- [ ] **Documentación**: SQL incluido y explicado en PR

#### ✅ Proceso

1. **Crear migration**: En `supabase/migrations/`
2. **Probar en staging**: Ejecutar en staging primero
3. **Documentar**: Explicar qué hace y por qué
4. **Rollback plan**: Documentar cómo revertir si es necesario
5. **Review especial**: Solicitar review de alguien con experiencia en DB

---

## 🧪 Testing

### ✅ Tests Requeridos

Para PRs que agregan funcionalidad:

- [ ] **Tests unitarios**: Para lógica nueva
- [ ] **Tests E2E**: Para flujos de usuario nuevos
- [ ] **Tests de integración**: Para integraciones nuevas
- [ ] **Regression tests**: Para bug fixes

### ✅ Cobertura

- **Objetivo**: > 80% cobertura
- **Mínimo**: Tests para código crítico
- **Verificación**: CI muestra cobertura en PR

---

## 📚 Documentación

### ✅ Docs Requeridas

- **Nuevas features**: Documentar en docs/
- **APIs nuevas**: Documentar en docs/
- **Cambios breaking**: Documentar en CHANGELOG.md
- **Configuración**: Actualizar .env.example si aplica

---

## 🚨 Troubleshooting

### Problema: "No puedo mergear aunque tengo aprobación"

**Solución**:
1. Verificar que todos los CI checks pasan
2. Verificar que no hay conflictos
3. Verificar que todas las conversaciones están resueltas
4. Verificar que branch está actualizado con main

### Problema: "CI checks fallan"

**Solución**:
1. Revisar logs de CI
2. Reproducir errores localmente
3. Corregir problemas
4. Push cambios
5. CI se ejecutará automáticamente

### Problema: "PR tiene conflictos"

**Solución**:
1. Actualizar branch con main:
   ```bash
   git checkout mi-branch
   git pull origin main
   git merge main
   # Resolver conflictos
   git push origin mi-branch
   ```
2. O usar rebase:
   ```bash
   git rebase main
   # Resolver conflictos
   git push origin mi-branch --force-with-lease
   ```

---

## 📊 Métricas

### Objetivos

- **Tiempo promedio de review**: < 24 horas
- **Tasa de aprobación en primer intento**: > 70%
- **Tamaño promedio de PR**: < 30 archivos
- **Cobertura de tests**: > 80%

### Tracking

Monitorear:
- Tiempo de review
- Tasa de aprobación
- Tamaño de PRs
- Cobertura de tests

---

## 📚 Recursos

### Documentación Relacionada

- [Code Review Guidelines](/.github/CODE_REVIEW_GUIDELINES.md)
- [PR Template](/.github/pull_request_template.md)
- [Branch Protection Setup](/.github/BRANCH_PROTECTION_SETUP.md)
- [Testing Plan](../testing/TESTING_PLAN.md)

### Scripts Útiles

- `./scripts/validate-pr.sh` - Validación local de PR
- `npm run lint` - Ejecutar lint
- `npm run test` - Ejecutar tests
- `npm run build` - Build

---

**Última actualización**: 2025-11-05  
**Mantenedor**: AutoRenta Team








