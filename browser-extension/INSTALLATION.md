# Instalación de Claude Code Browser Control

Guía completa para instalar la extensión en Chrome.

---

## 📦 Método 1: Instalar Sin Empaquetar (Desarrollo)

**Mejor para**: Testing y desarrollo

### Pasos:

1. Abre Chrome y ve a:
   ```
   chrome://extensions
   ```

2. Activa **"Developer mode"** (esquina superior derecha)

3. Click **"Load unpacked"**

4. Selecciona el directorio:
   ```
   /home/edu/autorenta/browser-extension
   ```

5. ✅ La extensión aparecerá inmediatamente

**Ventajas:**
- ✅ Cambios instantáneos (solo reload)
- ✅ Fácil debugging
- ✅ No requiere empaquetado

**Desventajas:**
- ❌ Solo funciona en modo developer
- ❌ No se puede distribuir

---

## 📦 Método 2: Empaquetar e Instalar (Producción)

**Mejor para**: Distribución a otros usuarios

### A. Empaquetar la Extensión

#### Opción A: Desde Chrome UI

1. Ve a `chrome://extensions`

2. Click **"Pack extension"** (arriba)

3. En el diálogo:
   - **Directorio raíz**: `/home/edu/autorenta/browser-extension`
   - **Clave privada**: (déjalo vacío la primera vez)

4. Click **"Pack Extension"**

5. Se crearán 2 archivos:
   ```
   browser-extension.crx  ← Extensión empaquetada
   browser-extension.pem  ← Clave privada (GUÁRDAR!)
   ```

#### Opción B: Desde Terminal

```bash
cd /home/edu/autorenta/browser-extension
./pack-extension.sh
```

Archivos en `dist/`:
```
claude-code-browser-control.crx  ← Distribuir
extension.pem                    ← NO distribuir (guardar seguro)
```

### B. Instalar el .crx

**⚠️ IMPORTANTE**: Chrome bloquea instalación de .crx desde fuera de Chrome Web Store.

**Solución 1**: Instalar en modo developer
```
1. chrome://extensions
2. Developer mode ON
3. Arrastra el .crx a la ventana
```

**Solución 2**: Usar Chrome Enterprise Policy (para organizaciones)
```
Ver: chrome://policy
```

**Solución 3**: Publicar en Chrome Web Store (recomendado para distribución)

---

## 🌐 Método 3: Chrome Web Store (Público)

**Mejor para**: Distribución masiva

### Requisitos:

- Cuenta de desarrollador de Chrome ($5 USD una sola vez)
- Extensión empaquetada (.zip)
- Screenshots de la extensión
- Descripción y permisos claros

### Pasos:

1. **Crear cuenta**: https://chrome.google.com/webstore/devconsole

2. **Preparar .zip**:
   ```bash
   cd /home/edu/autorenta
   zip -r browser-extension.zip browser-extension/ \
     -x "*/dist/*" "*/node_modules/*" "*/.git/*" "*.pem"
   ```

3. **Subir a Chrome Web Store**:
   - Dashboard → "New Item"
   - Upload `browser-extension.zip`
   - Completar información
   - Screenshots (1280x800 o 640x400)
   - Submit for review

4. **Review** (2-3 días hábiles)

5. **Publicar** ✅

**URL final**:
```
chrome://extensions/?id=XXXXXXXXXXXXXXXXXXXXX
```

---

## 🔑 Manejo de Claves Privadas

### ⚠️ CRÍTICO: Guardar el .pem

El archivo `extension.pem` es **tu clave privada**:

- ✅ **Guárdalo en lugar seguro** (1Password, LastPass, etc.)
- ✅ **Backup en múltiples lugares**
- ❌ **NO lo compartas públicamente**
- ❌ **NO lo commitees a git** (ya está en .gitignore)

**¿Por qué es importante?**

Sin el `.pem`, **NO puedes actualizar** la extensión. Cada nueva versión debe ser firmada con la misma clave.

### Actualizar Extensión

Cuando hagas cambios:

```bash
# 1. Modificar código en browser-extension/

# 2. Incrementar versión en manifest.json
"version": "1.0.1"  # was 1.0.0

# 3. Re-empaquetar con la MISMA clave
chrome://extensions → Pack extension
  Directory: /home/edu/autorenta/browser-extension
  Key file: /path/to/browser-extension.pem  ← ¡Usar el mismo!

# 4. Distribuir nuevo .crx
```

---

## 🐛 Troubleshooting

### "Package is invalid: CRX_HEADER_INVALID"

**Causa**: Chrome bloqueó instalación de .crx externo

**Solución**: Usa modo developer + drag & drop

### "This extension is not listed in the Chrome Web Store"

**Causa**: Chrome Web Store policy desde 2018

**Soluciones**:
1. Modo developer (testing)
2. Publicar en Chrome Web Store (distribución)
3. Chrome Enterprise (organizaciones)

### "Extension ID changed"

**Causa**: Empaquetaste sin usar el .pem original

**Solución**: SIEMPRE usa el mismo .pem para updates

### Extension no aparece después de instalar

**Verificar**:
```
1. chrome://extensions
2. Buscar "Claude Code Browser Control"
3. Debe estar ENABLED (switch azul ON)
4. Click en ícono de extensiones (puzzle) → Pin la extensión
```

---

## 📋 Checklist de Distribución

Antes de distribuir el .crx:

- [ ] Version incrementada en `manifest.json`
- [ ] Código testeado y funcionando
- [ ] README.md actualizado
- [ ] .pem guardado de forma segura
- [ ] .crx empaquetado con clave correcta
- [ ] Tested en Chrome limpio (no developer mode)
- [ ] Instrucciones de instalación incluidas

---

## 🚀 Distribución Recomendada

### Para Testing Interno:
```
✅ Modo developer + carpeta sin empaquetar
```

### Para Equipo Pequeño:
```
✅ .crx + .pem compartido vía 1Password
```

### Para Usuarios Finales:
```
✅ Chrome Web Store (público)
```

---

## 📧 Soporte

Si tienes problemas con la instalación:

1. Check `chrome://extensions` → Console logs
2. Verifica permisos en manifest.json
3. Lee troubleshooting arriba
4. Crea issue en GitHub

---

**Creado**: 2025-11-19
**Version**: 1.0.0
**Chrome Version Mínima**: 88+
