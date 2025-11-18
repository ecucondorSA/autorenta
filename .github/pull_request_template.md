# Pull Request

## 📋 Descripción

<!-- Proporciona una descripción clara y concisa de los cambios realizados -->

### Tipo de Cambio
- [ ] 🐛 Bug fix (cambio que corrige un problema)
- [ ] ✨ Nueva feature (cambio que agrega funcionalidad)
- [ ] 🔒 Security fix (cambio que corrige vulnerabilidad)
- [ ] 📚 Documentación (solo cambios en docs)
- [ ] 🔧 Refactoring (cambio de código sin cambiar funcionalidad)
- [ ] ⚡ Performance (mejora de rendimiento)
- [ ] 🧪 Tests (agregar o corregir tests)
- [ ] 🏗️ Build/CI (cambios en build system o CI)

### Relacionado con
<!-- Issue o PR relacionado -->
Closes #<!-- número de issue -->

---

## ✅ Checklist Pre-Submit

### Validación Local
- [ ] **Tests pasan localmente**: `npm run test` ejecutado y todos los tests pasan
- [ ] **Lint sin errores**: `npm run lint` ejecutado sin errores o warnings
- [ ] **Build exitoso**: `npm run build` completa sin errores
- [ ] **TypeScript válido**: No hay errores de tipos

### Code Quality
- [ ] **Código revisado**: Auto-revisado el código antes de abrir PR
- [ ] **Sin console.log**: Eliminados todos los `console.log` de producción
- [ ] **Comentarios claros**: Código complejo tiene comentarios explicativos
- [ ] **Nombres descriptivos**: Variables y funciones tienen nombres claros

### Testing
- [ ] **Tests agregados**: Nuevas features tienen tests correspondientes
- [ ] **Tests actualizados**: Tests existentes actualizados si es necesario
- [ ] **Tests pasan en CI**: Verificado que CI pasa (verificar GitHub Actions)

### Documentación
- [ ] **Cambios explicados**: Descripción clara de qué hace el PR
- [ ] **Screenshots incluidos**: Si es UI/feature, screenshots o GIFs agregados
- [ ] **SQLs documentados**: Si hay migrations, SQLs incluidos y explicados
- [ ] **Docs actualizadas**: Documentación actualizada si es necesario

### Seguridad & Auditoría
- [ ] **Sin secrets**: No hay secrets, tokens o credenciales en el código
- [ ] **Validación de input**: Input de usuario validado apropiadamente
- [ ] **RLS policies**: Si hay cambios de DB, RLS policies verificadas
- [ ] **MCP Audit**: Ejecutar auditoría de tablas modificadas
  ```bash
  ./tools/audit-before-code.sh [nombre_tabla]
  ```
  _O en Claude Code:_
  ```
  @autorenta-platform Audita RLS para [nombre_tabla]
  ```

### Database
- [ ] **Migrations revisadas**: Migrations revisadas y probadas en staging
- [ ] **Rollback plan**: Si hay migrations críticas, plan de rollback documentado
- [ ] **Backup considerado**: Backup de datos importante antes de migrations

---

## 🧪 Testing

### Tests Locales
```bash
# Ejecutar tests
npm run test

# Ejecutar lint
npm run lint

# Build
npm run build
```

### Tests en CI
<!-- Link al run de CI más reciente -->
[CI Run](https://github.com/ecucondorSA/autorenta/actions/runs/<!-- RUN_ID -->)

---

## 📸 Screenshots / Evidencia

<!-- Si es UI/feature, agregar screenshots aquí -->

### Antes
<!-- Screenshot o descripción del estado anterior -->

### Después
<!-- Screenshot o descripción del estado nuevo -->

---

## 🔍 Review Checklist para Revisores

### Revisión Técnica
- [ ] **Código sigue patterns**: Sigue los patrones establecidos del proyecto
- [ ] **No hay code smells**: Código limpio, sin duplicación innecesaria
- [ ] **Performance**: No hay problemas de performance evidentes
- [ ] **Seguridad**: No hay vulnerabilidades de seguridad

### Revisión de Tests
- [ ] **Cobertura adecuada**: Tests cubren los cambios realizados
- [ ] **Tests son útiles**: Tests validan comportamiento correcto
- [ ] **Edge cases**: Edge cases considerados si aplican

### Revisión de Database
- [ ] **Migrations seguras**: Migrations no rompen datos existentes
- [ ] **RLS correcto**: Row Level Security policies correctas
- [ ] **Performance DB**: No hay queries N+1 o problemas de performance

### Revisión de Documentación
- [ ] **Documentación clara**: Cambios están bien documentados
- [ ] **Ejemplos**: Si aplica, hay ejemplos de uso

---

## 📊 Métricas

### Archivos Modificados
<!-- Número de archivos cambiados -->
- **Total**: <!-- número -->
- **Nuevos**: <!-- número -->
- **Modificados**: <!-- número -->
- **Eliminados**: <!-- número -->

### Líneas de Código
<!-- Líneas agregadas/eliminadas -->
- **Agregadas**: <!-- número -->
- **Eliminadas**: <!-- número -->
- **Neto**: <!-- número -->

### Tiempo Estimado de Review
<!-- Estimación de tiempo necesario para revisar -->
- **Tiempo estimado**: <!-- ej: 30 minutos -->

---

## ⚠️ Breaking Changes

<!-- Si hay breaking changes, documentarlos aquí -->
- [ ] **Breaking changes**: Este PR incluye breaking changes
- **Descripción**: <!-- Explicar breaking changes -->

---

## 🚀 Deployment Notes

<!-- Notas especiales para deployment -->
- [ ] **Requiere migrations**: Ejecutar migrations antes de deploy
- [ ] **Requiere secrets**: Configurar nuevos secrets en producción
- [ ] **Requiere restart**: Servicios necesitan restart
- [ ] **Rollback plan**: <!-- Plan de rollback si es necesario -->

---

## 📝 Notas Adicionales

<!-- Cualquier información adicional que los revisores deban saber -->

---

## ✅ Aprobaciones Requeridas

- [ ] **Code Review**: Al menos 1 aprobación de code review
- [ ] **CI Passing**: Todos los checks de CI pasan
- [ ] **No Conflicts**: Sin conflictos con `main` branch

---

**IMPORTANTE**: Este PR no será mergeado hasta que:
1. ✅ Tenga al menos 1 aprobación de code review
2. ✅ Todos los checks de CI pasen
3. ✅ No haya conflictos con `main`
4. ✅ El checklist esté completo
