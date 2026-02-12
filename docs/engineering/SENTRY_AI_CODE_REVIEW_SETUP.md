# 🤖 Configuración: Sentry AI Code Review

**Guía paso a paso para activar AI Code Review en AutoRenta**

---

## ✅ Estado Actual

Ya tienes configurado:
- ✅ Sentry DSN configurado (`ecu-iu.sentry.io`)
- ✅ Source maps subiendo automáticamente en CI/CD
- ✅ `SENTRY_AUTH_TOKEN` configurado desde CLI
- ✅ Sentry CLI instalado y autenticado
- ✅ Organización `ecu-iu` configurada
- ✅ Proyecto `autorenta` identificado
- ✅ AI Code Review activado en Sentry (según tu confirmación)

**Falta:** Instalar la Sentry GitHub App y conectar el repositorio (requiere UI de GitHub).

---

## 🚀 Configuración desde CLI (Ya Completada)

### Scripts Disponibles:

1. **Configuración inicial:**
   ```bash
   ./tools/setup-sentry-ai-cli.sh
   ```
   - Configura el token de autenticación
   - Configura organización y proyecto por defecto
   - Verifica la configuración

2. **Verificar estado:**
   ```bash
   ./tools/verify-sentry-ai-status.sh
   ```
   - Verifica autenticación
   - Verifica organización y proyecto
   - Muestra estado de configuración

### Configuración Manual desde CLI:

```bash
# 1. Instalar Sentry CLI (si no está instalado)
npm install -g @sentry/cli

# 2. Configurar token
export SENTRY_AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"
sentry-cli login --auth-token "$SENTRY_AUTH_TOKEN"

# 3. Verificar información
sentry-cli info

# 4. Listar organizaciones
sentry-cli organizations list

# 5. Listar proyectos
sentry-cli projects list --org ecu-iu
```

### Token Configurado:

El token está guardado en `~/.sentryclirc`:
```
[auth]
token=YOUR_AUTH_TOKEN_HERE
defaults.org=ecu-iu
```

---

## 🚀 Paso 1: Instalar Sentry GitHub App

### Desde Sentry UI:

1. **Ve a Sentry:** https://ecu-iu.sentry.io
2. **Settings → Integrations → GitHub**
3. **Click en "Install" o "Configure"**
4. **Selecciona tu organización de GitHub** (donde está el repo `autorenta`)
5. **Selecciona repositorios:**
   - ✅ `autorenta` (o el nombre exacto de tu repo)
6. **Permisos necesarios:**
   - ✅ Read access to code
   - ✅ Read access to pull requests
   - ✅ Write access to pull requests (para comentar)
   - ✅ Read access to issues (opcional)

### Desde GitHub directamente:

1. **Ve a:** https://github.com/apps/sentry
2. **Click en "Configure"**
3. **Selecciona tu organización/repositorio**
4. **Acepta los permisos**

---

## 🔗 Paso 2: Conectar Repositorio en Sentry

1. **Ve a Sentry:** https://ecu-iu.sentry.io
2. **Settings → Integrations → GitHub**
3. **Click en "Add Repository"**
4. **Selecciona:** `autorenta` (o tu repo)
5. **Verifica que aparezca como "Connected"**

---

## ✅ Paso 3: Verificar Configuración

### En Sentry:

1. **Ve a:** https://ecu-iu.sentry.io/prevent/ai-code-review/
2. **Verifica que aparezca:**
   - ✅ "AI Code Review" enabled
   - ✅ "Show Generative AI Features" enabled
   - ✅ Repositorio conectado

### En GitHub:

1. **Ve a tu repositorio:** `https://github.com/[tu-org]/autorenta`
2. **Settings → Integrations → GitHub Apps**
3. **Verifica que "Sentry" aparezca instalado**

---

## 🧪 Paso 4: Probar AI Code Review

### Opción 1: Automático

1. **Crea un Pull Request** (o usa uno existente)
2. **Márcalo como "Ready for review"**
3. **Espera 1-2 minutos**
4. **Revisa los comentarios del bot de Sentry**

### Opción 2: Manual

1. **Abre un Pull Request**
2. **Comenta:** `@sentry review`
3. **Espera la respuesta del bot**

---

## 📋 Permisos Necesarios en GitHub

La Sentry GitHub App necesita estos permisos:

| Permiso | Necesario | Para qué |
|---------|-----------|----------|
| **Read access to code** | ✅ Sí | Leer código del PR |
| **Read access to pull requests** | ✅ Sí | Ver PRs |
| **Write access to pull requests** | ✅ Sí | Comentar en PRs |
| **Read access to issues** | ⚠️ Opcional | Si quieres que analice issues |

---

## 🔍 Verificar que Funciona

### Test Rápido:

1. **Crea un PR de prueba** con código que tenga un bug obvio:

```typescript
// test-ai-review.ts
export function divide(a: number, b: number): number {
  return a / b; // ❌ No valida b === 0
}
```

2. **Márcalo como "Ready for review"**
3. **Espera 1-2 minutos**
4. **Deberías ver un comentario de Sentry** detectando el bug

---

## 🚨 Troubleshooting

### Problema: "AI Code Review no aparece en PRs"

**Solución:**
1. Verifica que la GitHub App esté instalada: https://github.com/apps/sentry
2. Verifica que el repositorio esté conectado en Sentry
3. Verifica que los toggles estén activados en Sentry Settings

### Problema: "No tengo permisos para instalar la App"

**Solución:**
- Necesitas ser **admin** de la organización de GitHub
- O pedirle a un admin que instale la App

### Problema: "Sentry no comenta en PRs"

**Solución:**
1. Verifica que la App tenga permisos de "Write" en PRs
2. Verifica que el PR esté marcado como "Ready for review"
3. Espera 2-3 minutos (puede tardar)

---

## 📚 Recursos

- **Documentación oficial:** https://docs.sentry.io/product/prevent/ai-code-review/
- **Sentry Dashboard:** https://ecu-iu.sentry.io/prevent/ai-code-review/
- **GitHub App:** https://github.com/apps/sentry

---

## ✅ Checklist Final

- [ ] Sentry GitHub App instalada
- [ ] Repositorio conectado en Sentry
- [ ] Permisos correctos (Read code, Write PRs)
- [ ] AI Code Review enabled en Sentry Settings
- [ ] Probado con un PR de prueba
- [ ] Funciona correctamente

---

**Última actualización:** 2026-01-26
