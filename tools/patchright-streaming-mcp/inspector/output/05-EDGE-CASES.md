# ⚠️ Edge Cases - AutoRenta

> Casos límite y situaciones especiales detectadas

## Casos Detectados

✅ No se detectaron casos límite problemáticos.

## Casos a Considerar

### 1. Autenticación

| Caso | Comportamiento Esperado |
|------|------------------------|
| Token expirado | Redirect a login, mostrar mensaje |
| Credenciales inválidas | Mostrar error en formulario |
| Sesión en otro dispositivo | Notificar o cerrar sesión |
| Pérdida de conexión durante login | Retry automático o mensaje |

### 2. Navegación

| Caso | Comportamiento Esperado |
|------|------------------------|
| Ruta no existente | Mostrar página 404 |
| Acceso sin auth a ruta protegida | Redirect a login |
| Deep link con sesión expirada | Guardar destino, login, redirect |
| Back button en flujo de pago | Confirmar abandono |

### 3. Formularios

| Caso | Comportamiento Esperado |
|------|------------------------|
| Campos requeridos vacíos | Validación visual + mensaje |
| Formato inválido (email, teléfono) | Validación en tiempo real |
| Envío duplicado | Deshabilitar botón, debounce |
| Pérdida de conexión | Guardar draft, reintentar |

### 4. Mapas y Geolocalización

| Caso | Comportamiento Esperado |
|------|------------------------|
| WebGL no soportado | Fallback a lista de autos |
| Permiso de ubicación denegado | Usar ubicación por defecto |
| GPS no disponible | Input manual de ubicación |

### 5. Pagos

| Caso | Comportamiento Esperado |
|------|------------------------|
| Pago rechazado | Mensaje claro, opción de reintentar |
| Timeout de pasarela | No cobrar, mostrar error |
| Doble cobro | Detectar y revertir |
| Conexión perdida post-pago | Verificar estado en backend |

## Recomendaciones

1. **Implementar retry logic** para llamadas de red críticas
2. **Usar optimistic UI** para mejor UX
3. **Cachear datos** para funcionamiento offline parcial
4. **Logging de errores** con Sentry o similar
5. **Feature flags** para rollback rápido
