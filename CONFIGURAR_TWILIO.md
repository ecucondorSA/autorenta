# Guía para Configurar Twilio en Supabase

## Paso 1: Crear cuenta en Twilio

1. Ve a [https://www.twilio.com](https://www.twilio.com)
2. Crea una cuenta gratuita (trial)
3. Verifica tu número de teléfono
4. Obtén tus credenciales del Dashboard

## Paso 2: Obtener credenciales de Twilio

En el Dashboard de Twilio, encontrarás:

- **Account SID**: Comienza con `AC...`
- **Auth Token**: Token de autenticación
- **Phone Number**: Número de Twilio (opcional, se puede usar Message Service)

## Paso 3: Configurar en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Authentication** → **Providers** → **Phone**
3. Habilita el proveedor de teléfono
4. Completa los campos:

   - **Twilio Account SID**: Pega tu Account SID
   - **Twilio Auth Token**: Pega tu Auth Token
   - **Twilio Message Service SID** (opcional): Si usas Message Service
   - **Twilio Content SID** (opcional): Solo para WhatsApp (ver instrucciones abajo)

5. Configura las opciones:

   - ✅ **Enable phone confirmations**: Activa esto para requerir verificación
   - **SMS OTP Expiry**: 3600 segundos (1 hora) es recomendado
   - **SMS OTP Length**: 6 dígitos
   - **SMS Message**: `Tu código de verificación es: {{ .Code }}`

6. Guarda los cambios

## Paso 4: Probar con número de prueba

Twilio proporciona números de prueba. Puedes usar:

- Número de prueba: `+15005550006`
- OTP de prueba: `123456`

En Supabase, en la sección "Test Phone Numbers and OTPs", agrega:
```
+15005550006=123456
```

## Paso 6: Verificar configuración

1. Intenta enviar un OTP desde tu aplicación
2. Revisa los logs de Twilio en su Dashboard
3. Verifica que el SMS llegue correctamente

## Notas importantes

- **Costo**: Twilio cobra por SMS enviado (aprox. $0.0075 por SMS en Argentina)
- **Números de prueba**: Solo funcionan con números verificados en Twilio
- **Producción**: Necesitarás verificar números o comprar un número de Twilio
- **WhatsApp**: 
  - Requiere crear un Content Template en Twilio
  - El Content SID se obtiene de: Messaging → Content Templates
  - Requiere aprobación de Twilio para producción
  - El Sandbox solo funciona con números verificados

## Solución de problemas

### Error: "SMS provider not configured"
- Verifica que todas las credenciales estén correctas
- Asegúrate de que el proveedor esté habilitado

### Error: "Phone provider disabled"
- Revisa que Twilio esté correctamente configurado
- Verifica que tu cuenta de Twilio esté activa

### SMS no llega
- Revisa los logs de Twilio
- Verifica que el número esté en formato E.164 (+5491123456789)
- Asegúrate de tener crédito en tu cuenta de Twilio
