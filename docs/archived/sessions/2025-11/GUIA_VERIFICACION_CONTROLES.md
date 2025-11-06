# 📱 Guía de Controles Interactivos - Sistema de Verificación

## 🎯 Tu Estado Actual (después de sincronización)

- ✅ **Email**: VERIFICADO (16 de octubre, 2025)
- ⏳ **Teléfono**: PENDIENTE (no configurado)
- 🔒 **Level 2**: BLOQUEADO (requiere completar Level 1)
- 🔒 **Level 3**: BLOQUEADO (requiere completar Level 2)

**Progreso actual: 20% (solo email)**

---

## 📍 Ubicación de los Controles

### **Página**: `/perfil` (Profile)
### **Pestaña**: "Verificación" (cuarto tab)

---

## 1️⃣ VERIFICACIÓN DE EMAIL ✅ (Completado)

### **Ubicación en pantalla:**
```
┌─────────────────────────────────────────┐
│ ✓ Verificación de Email                │
│ ecucondor@gmail.com         [Verificado]│
├─────────────────────────────────────────┤
│ ✅ Email verificado exitosamente        │
│    Verificado el 16 de octubre de 2025  │
└─────────────────────────────────────────┘
```

### **Controles disponibles:**
❌ **Ninguno** - Ya está verificado, no hay acciones disponibles

### **Estado en base de datos:**
```sql
email_confirmed_at: 2025-10-16 15:19:43
```

---

## 2️⃣ VERIFICACIÓN DE TELÉFONO ⏳ (Pendiente)

### **Ubicación en pantalla:**
Justo debajo del componente de Email, deberías ver:

```
┌─────────────────────────────────────────┐
│ ○ Verificación de Teléfono              │
│ No configurado              [Pendiente] │
├─────────────────────────────────────────┤
│ ℹ️  Ingresa tu número de teléfono para  │
│    recibir un código de verificación    │
│    por SMS.                              │
│                                          │
│ Número de teléfono:                      │
│ ┌─────┐ ┌──────────────────────────┐   │
│ │🇦🇷+54│ │  11 2345 6789            │   │
│ └─────┘ └──────────────────────────┘   │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │   📱  Enviar código                  ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### **Controles disponibles:**

#### **A. Selector de País** 🌍
- **Tipo**: Dropdown
- **Opciones**:
  - 🇦🇷 +54 (Argentina) - Por defecto
  - 🇺🇸 +1 (USA)
  - 🇲🇽 +52 (México)
  - 🇧🇷 +55 (Brasil)
  - 🇨🇱 +56 (Chile)
- **Acción**: Selecciona tu código de país

#### **B. Campo de Teléfono** 📞
- **Tipo**: Input de texto
- **Formato**: Solo números, sin el 0 inicial
- **Ejemplo**: `11 2345 6789` (Buenos Aires)
- **Placeholder**: "11 2345 6789"
- **Máximo**: 15 caracteres
- **Acción**: Ingresa tu número de teléfono

#### **C. Botón "Enviar código"** 📱
- **Tipo**: Botón primario (azul)
- **Estado**:
  - ✅ Activo cuando el teléfono tiene 10+ dígitos
  - ❌ Deshabilitado si falta número o cooldown activo
- **Acción**: Envía código OTP por SMS
- **Cooldown**: 60 segundos entre envíos
- **Límite**: 3 intentos por hora

### **Flujo de verificación:**

**PASO 1: Ingresar teléfono**
1. Selecciona código de país: `🇦🇷 +54`
2. Ingresa número: `11 2345 6789`
3. Click en **"Enviar código"**

**PASO 2: Verificar OTP (aparece después del PASO 1)**
```
┌─────────────────────────────────────────┐
│ ℹ️  Código enviado a +54 11 2345 6789   │
│    Ingresa el código de 6 dígitos      │
│                                          │
│ Código de verificación:                 │
│ ┌─┬─┬─┬─┬─┬─┐                           │
│ │ │ │ │ │ │ │  (6 dígitos)             │
│ └─┴─┴─┴─┴─┴─┘                           │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │   ✓  Verificar código                ││
│ └──────────────────────────────────────┘│
│                                          │
│ [Reenviar código] [Cancelar]            │
└─────────────────────────────────────────┘
```

4. Revisa SMS en tu teléfono
5. Ingresa código de 6 dígitos
6. Click en **"Verificar código"**

**PASO 3: Verificación exitosa**
```
┌─────────────────────────────────────────┐
│ ✓ Verificación de Teléfono              │
│ +54 11 2345 6789         [Verificado]   │
├─────────────────────────────────────────┤
│ ✅ Teléfono verificado exitosamente     │
│    Verificado el [fecha actual]         │
└─────────────────────────────────────────┘
```

### **Estado en base de datos (después de verificar):**
```sql
phone: '+5491123456789'
phone_confirmed_at: [timestamp actual]
```

---

## 3️⃣ VERIFICACIÓN LEVEL 2 🔒 (Bloqueado hasta completar Level 1)

### **Ubicación en pantalla:**
**NO VISIBLE** hasta que completes Email + Teléfono

### **Cuando se desbloquee, verás:**
```
┌─────────────────────────────────────────┐
│ 📄 Verificación de Documentos (Level 2) │
│                             [Pendiente] │
├─────────────────────────────────────────┤
│ ℹ️  Sube tus documentos de identidad    │
│                                          │
│ DNI / Documento de Identidad:           │
│ ┌──────────────────────────────────────┐│
│ │  📷 Subir Documento (Frente)         ││
│ └──────────────────────────────────────┘│
│                                          │
│ Licencia de Conducir:                   │
│ ┌──────────────────────────────────────┐│
│ │  📷 Subir Licencia                   ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### **Controles (cuando se desbloquee):**

#### **A. Botón "Subir Documento (Frente)"** 📄
- **Tipo**: File input button
- **Formatos**: JPG, PNG, PDF
- **Tamaño máximo**: 10MB
- **Acción**: Abre selector de archivos

#### **B. Botón "Subir Licencia"** 🪪
- **Tipo**: File input button
- **Formatos**: JPG, PNG, PDF
- **Tamaño máximo**: 10MB
- **Acción**: Abre selector de archivos

---

## 4️⃣ VERIFICACIÓN FACIAL (Level 3) 🔒 (Bloqueado hasta Level 2)

### **Estado actual:**
```
┌─────────────────────────────────────────┐
│ ○ Verificación Facial (Level 3)         │
│ Verifica tu identidad con selfie video  │
│                             [Pendiente] │
├─────────────────────────────────────────┤
│ ⚠️  Debes completar Level 2 (documentos)│
│     antes de verificar tu identidad con │
│     selfie.                              │
└─────────────────────────────────────────┘
```

### **Cuando se desbloquee, verás:**
```
┌─────────────────────────────────────────┐
│ 📹 Cámara lista para grabar             │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │        [Placeholder de video]       │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ℹ️  Instrucciones:                      │
│ • Lugar bien iluminado                  │
│ • Mira directamente a la cámara         │
│ • Mantén rostro centrado                │
│ • Grabación durará 3-5 segundos         │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │   🎥  Iniciar Grabación              ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### **Controles (cuando se desbloquee):**

#### **A. Botón "Iniciar Grabación"** 🎥
- **Tipo**: Botón primario (azul)
- **Acción**: Solicita permiso de cámara y comienza grabación
- **Duración**: 3-5 segundos (automático)

#### **B. Después de grabar:**
```
┌─────────────────────────────────────────┐
│ ▶️ Preview del video grabado             │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │   ✓  Verificar Identidad             ││
│ └──────────────────────────────────────┘│
│                                          │
│ [Volver a Grabar]                       │
└─────────────────────────────────────────┘
```

- **Botón "Verificar Identidad"**: Envía video para análisis facial
- **Botón "Volver a Grabar"**: Descarta y graba nuevamente

---

## 🎯 PRÓXIMOS PASOS PARA TI

### **1. Recarga la página**
Presiona `F5` o `Ctrl+R` para que se actualicen los datos sincronizados

### **2. Ve a la pestaña "Verificación"**
Navega a: **Perfil → Verificación**

### **3. Deberías ver ahora:**
- ✅ **Email**: Verificado (sin botones)
- ⏳ **Teléfono**: FORMULARIO CON:
  - Selector de país
  - Campo de teléfono
  - Botón "Enviar código"

### **4. Para verificar tu teléfono:**
1. Ingresa tu número (ej: `11 2345 6789`)
2. Click en "Enviar código"
3. Espera SMS
4. Ingresa código de 6 dígitos
5. Click en "Verificar código"

### **5. Después de verificar teléfono:**
- Progreso: 20% → 40%
- Se desbloquea Level 2 (documentos)
- Podrás subir DNI y licencia

---

## 🐛 Si NO ves los controles después de recargar

Ejecuta esto en la consola del navegador (F12):

```javascript
// Ver estado de PhoneVerificationService
console.log('Phone Status:',
  window.ng?.getComponent(document.querySelector('app-phone-verification'))
    ?.phoneVerificationService?.status()
);
```

Deberías ver:
```json
{
  "isVerified": false,
  "phone": null,
  "verifiedAt": null,
  "canResend": true,
  "cooldownSeconds": 0,
  "otpSent": false
}
```

Si ves `isVerified: true`, hay un problema de caché. Solución:
1. Cierra sesión
2. Limpia cookies del sitio
3. Inicia sesión nuevamente

---

## 📞 Soporte

Si después de recargar NO ves el formulario de teléfono, avísame y te ayudo a debuggear el problema.

---

**Última actualización**: 5 de noviembre de 2025
**Datos sincronizados**: ✅ Email verificado
**Siguiente paso**: Verificar teléfono
