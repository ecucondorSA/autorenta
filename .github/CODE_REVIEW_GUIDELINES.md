# 📋 Code Review Guidelines - AutoRenta

Este documento establece las pautas y estándares para realizar code reviews en AutoRenta.

## 🎯 Objetivos del Code Review

1. **Calidad de Código**: Asegurar que el código cumple con estándares de calidad
2. **Conocimiento Compartido**: Compartir conocimiento entre el equipo
3. **Detección de Bugs**: Encontrar bugs antes de que lleguen a producción
4. **Consistencia**: Mantener consistencia en el código base
5. **Seguridad**: Identificar vulnerabilidades de seguridad

---

## ⏱️ Tiempo de Review

### Tamaño de PR y Tiempo Estimado

| Tamaño de PR | Archivos | Tiempo Estimado | Prioridad |
|--------------|----------|-----------------|-----------|
| **Pequeño** | 1-10 archivos | 15-30 min | ✅ Normal |
| **Mediano** | 11-30 archivos | 30-60 min | ⚠️ Revisar |
| **Grande** | 31-50 archivos | 1-2 horas | ⚠️ Considerar dividir |
| **Muy Grande** | 50+ archivos | 2+ horas | 🔴 **Dividir PR** |

**Regla de Oro**: Si un PR te toma más de 2 horas revisar, debería dividirse.

---

## ✅ Checklist de Revisión

### 1. Funcionalidad y Lógica

- [ ] **¿El código hace lo que dice?**: La implementación cumple con la descripción del PR
- [ ] **¿Hay edge cases considerados?**: Se manejan casos límite apropiadamente
- [ ] **¿Hay validaciones adecuadas?**: Input de usuario validado correctamente
- [ ] **¿Manejo de errores?**: Errores manejados apropiadamente
- [ ] **¿No hay bugs obvios?**: Revisar lógica por bugs evidentes

### 2. Arquitectura y Diseño

- [ ] **¿Sigue patrones del proyecto?**: Código sigue los patrones establecidos
- [ ] **¿Separación de responsabilidades?**: Cada módulo/servicio tiene responsabilidad clara
- [ ] **¿No hay duplicación?**: No hay código duplicado innecesario
- [ ] **¿Dependencias correctas?**: Dependencias entre módulos son apropiadas
- [ ] **¿Escalabilidad?**: Solución es escalable si aplica

### 3. Code Quality

- [ ] **¿Nombres descriptivos?**: Variables, funciones, clases tienen nombres claros
- [ ] **¿Funciones pequeñas?**: Funciones hacen una cosa y la hacen bien
- [ ] **¿Comentarios útiles?**: Comentarios explican el "por qué", no el "qué"
- [ ] **¿Sin código muerto?**: No hay código comentado o no usado
- [ ] **¿Sin console.log?**: No hay `console.log` en código de producción

### 4. Testing

- [ ] **¿Tests agregados?**: Nuevas features tienen tests correspondientes
- [ ] **¿Tests útiles?**: Tests validan comportamiento correcto
- [ ] **¿Cobertura adecuada?**: Tests cubren los casos importantes
- [ ] **¿Tests pasan?**: Verificar que tests pasan en CI
- [ ] **¿Tests mantenibles?**: Tests son fáciles de mantener

### 5. Seguridad

- [ ] **¿Sin secrets?**: No hay secrets, tokens o credenciales
- [ ] **¿Validación de input?**: Input validado y sanitizado
- [ ] **¿RLS policies?**: Si hay cambios de DB, RLS policies correctas
- [ ] **¿SQL injection?**: No hay riesgo de SQL injection
- [ ] **¿XSS protection?**: Si aplica, protección contra XSS

### 6. Performance

- [ ] **¿Queries eficientes?**: No hay queries N+1 o problemas de performance
- [ ] **¿Lazy loading?**: Si aplica, lazy loading implementado
- [ ] **¿Bundle size?**: No hay impacto negativo en bundle size
- [ ] **¿Memory leaks?**: No hay posibles memory leaks

### 7. Database

- [ ] **¿Migrations seguras?**: Migrations no rompen datos existentes
- [ ] **¿Rollback posible?**: Migrations pueden revertirse si es necesario
- [ ] **¿Indexes apropiados?**: Nuevas queries tienen indexes si es necesario
- [ ] **¿RLS correcto?**: Row Level Security policies verificadas

### 8. Documentación

- [ ] **¿Documentación actualizada?**: Docs actualizadas si es necesario
- [ ] **¿Comentarios útiles?**: Código complejo tiene comentarios
- [ ] **¿Ejemplos claros?**: Si aplica, hay ejemplos de uso

---

## 🎨 Estilo de Comentarios

### Comentarios Constructivos

✅ **BUENO**:
```
Buen enfoque! Solo una sugerencia: podríamos extraer esta lógica a una función 
separada para mejorar testabilidad. ¿Qué opinas?
```

✅ **BUENO**:
```
Esta es una buena solución. Sin embargo, noté que hay un edge case: ¿qué pasa 
si `user` es null? Deberíamos agregar una validación aquí.
```

❌ **MALO**:
```
Esto está mal.
```

❌ **MALO**:
```
¿Por qué hiciste esto así? No tiene sentido.
```

### Usar Emojis para Claridad

- ✅ `✅` - Aprobado / Buen trabajo
- 💡 `💡` - Sugerencia
- ⚠️ `⚠️` - Advertencia / Preocupación
- 🐛 `🐛` - Bug encontrado
- ❓ `❓` - Pregunta
- 🔍 `🔍` - Necesita más investigación
- 📚 `📚` - Referencia a documentación

### Ejemplo de Review

```
✅ Buen trabajo en general! La implementación es clara.

💡 Sugerencia: Podríamos extraer la lógica de validación a una función separada:
```typescript
function validateUserInput(input: UserInput): ValidationResult {
  // ...
}
```

⚠️ Preocupación: Hay un edge case aquí cuando `user.profile` es null. 
Deberíamos agregar una validación.

🐛 Bug: En la línea 45, hay un posible null reference. Debería ser:
```typescript
const name = user?.profile?.name ?? 'Unknown';
```

❓ Pregunta: ¿Por qué usamos `any` aquí? ¿Podríamos tiparlo mejor?
```

---

## 🚦 Decisiones de Review

### ✅ Approve (Aprobar)

**Cuándo aprobar**:
- ✅ Código cumple con todos los estándares
- ✅ Tests pasan y son adecuados
- ✅ No hay problemas de seguridad
- ✅ Funcionalidad es correcta
- ✅ Performance es aceptable

**Acción**: Hacer clic en "Approve" y dejar comentario positivo.

### 💬 Comment (Comentar)

**Cuándo comentar**:
- 💡 Tienes sugerencias de mejora (no bloqueantes)
- ❓ Tienes preguntas sobre la implementación
- 📚 Quieres referenciar documentación

**Acción**: Dejar comentarios sin aprobar/rechazar.

### ⚠️ Request Changes (Solicitar Cambios)

**Cuándo solicitar cambios**:
- 🐛 Hay bugs que necesitan corrección
- 🔒 Hay problemas de seguridad
- ⚠️ Hay problemas de performance críticos
- 📝 Falta documentación importante
- 🧪 Tests faltantes o insuficientes
- 🔴 Código no sigue patrones establecidos

**Acción**: Hacer clic en "Request Changes" y explicar qué necesita cambiar.

---

## 🔍 Qué Buscar en el Review

### Red Flags (Alerta Roja)

🔴 **CRÍTICO - Bloquear PR**:
- Secrets o credenciales en el código
- Vulnerabilidades de seguridad obvias
- Migrations que pueden romper datos
- Código que puede causar data loss
- Falta de tests para código crítico

### Yellow Flags (Alerta Amarilla)

⚠️ **REVISAR CON CUIDADO**:
- PRs muy grandes (>50 archivos)
- Cambios complejos sin documentación
- Performance issues potenciales
- Tests faltantes
- Código duplicado

### Green Flags (Buenas Señales)

✅ **INDICADORES POSITIVOS**:
- Tests completos y útiles
- Documentación clara
- Código limpio y mantenible
- Seguimiento de patrones establecidos
- Screenshots/evidencia para UI changes

---

## 📏 Reglas Específicas por Tipo de PR

### PRs de Features

- ✅ Tests agregados para nueva funcionalidad
- ✅ Documentación actualizada
- ✅ Screenshots incluidos si es UI
- ✅ Edge cases considerados

### PRs de Bug Fixes

- ✅ Test que reproduce el bug (regression test)
- ✅ Test que verifica el fix
- ✅ Explicación del root cause
- ✅ Verificación de que no introduce nuevos bugs

### PRs de Refactoring

- ✅ Tests existentes siguen pasando
- ✅ No hay cambio de funcionalidad
- ✅ Mejora medible (performance, legibilidad, etc.)
- ✅ Documentación actualizada si estructura cambia

### PRs de Migrations

- ✅ Migration probada en staging
- ✅ Rollback plan documentado
- ✅ Backup considerado
- ✅ Impacto en datos existentes evaluado
- ✅ Performance de migration aceptable

---

## 🤝 Proceso de Review

### Para el Autor del PR

1. **Antes de abrir PR**:
   - ✅ Auto-revisar tu código
   - ✅ Ejecutar tests localmente
   - ✅ Ejecutar lint
   - ✅ Completar checklist del PR template

2. **Después de abrir PR**:
   - ✅ Esperar feedback
   - ✅ Responder a comentarios
   - ✅ Hacer cambios solicitados
   - ✅ Marcar comentarios como resueltos

3. **Después de cambios**:
   - ✅ Notificar a revisores
   - ✅ Esperar re-revisión si es necesario

### Para el Revisor

1. **Antes de revisar**:
   - ✅ Leer descripción del PR completamente
   - ✅ Revisar checklist del PR
   - ✅ Verificar que CI pasa

2. **Durante el review**:
   - ✅ Revisar código línea por línea
   - ✅ Ejecutar tests localmente si es necesario
   - ✅ Dejar comentarios constructivos
   - ✅ Usar checklist de revisión

3. **Después de revisar**:
   - ✅ Aprobar o solicitar cambios
   - ✅ Explicar decisiones
   - ✅ Estar disponible para preguntas

---

## 📊 Métricas de Review

### Objetivos

- **Tiempo promedio de review**: < 24 horas
- **Tasa de aprobación en primer intento**: > 70%
- **Tamaño promedio de PR**: < 30 archivos
- **Cobertura de tests**: > 80%

### Tracking

- Monitorear tiempo de review
- Identificar PRs que toman mucho tiempo
- Identificar patrones comunes de cambios solicitados

---

## 🎓 Recursos de Aprendizaje

### Artículos Recomendados

- [Effective Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [How to Make Good Code Reviews Better](https://stackoverflow.blog/2019/09/30/how-to-make-good-code-reviews-better/)

### Internal Resources

- `CLAUDE.md` - Arquitectura del proyecto
- `.cursorrules` - Reglas de código
- `PATTERNS.md` - Patrones de código establecidos

---

## ❓ Preguntas Frecuentes

### ¿Debo aprobar un PR si tengo dudas menores?

**Respuesta**: Sí, puedes aprobar con comentarios. Solo solicita cambios si hay problemas que bloquean el merge.

### ¿Qué hacer si un PR es demasiado grande?

**Respuesta**: Solicitar que se divida en PRs más pequeños. Es mejor tener múltiples PRs pequeños que uno grande.

### ¿Debo ejecutar los tests localmente?

**Respuesta**: Si el PR es grande o complejo, sí. Si es pequeño y CI pasa, confiar en CI está bien.

### ¿Qué hacer si no estoy seguro de algo?

**Respuesta**: Dejar comentario con pregunta. Es mejor preguntar que aprobar algo que no entiendes.

---

**Última actualización**: 2025-11-05  
**Mantenedor**: AutoRenta Team




