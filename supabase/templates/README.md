# Supabase Auth Email Templates

Configuracion de SMTP personalizado y templates de email para AutoRenta.

## Configuracion SMTP con Resend

### 1. Credenciales SMTP

```
Host: smtp.resend.com
Puerto: 465 (SSL) o 587 (TLS)
Usuario: resend
Password: re_XXXXXXXX (tu API Key de Resend)
```

### 2. Configurar en Supabase Dashboard

1. Ir a **Project Settings** → **Authentication** → **SMTP Settings**
2. Habilitar **Enable Custom SMTP**
3. Completar los campos:
   - **Sender email**: `noreply@autorentar.com`
   - **Sender name**: `AutoRenta`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: `re_XXXXXXXX` (API Key)

### 3. Verificar Dominio en Resend

Antes de usar SMTP, verifica el dominio `autorentar.com` en Resend:

1. Dashboard Resend → Domains → Add Domain
2. Agregar registros DNS (MX, SPF, DKIM)
3. Esperar verificacion (~5 min)

---

## Templates de Autenticacion

Ubicacion: `/supabase/templates/auth/`

| Template | Archivo | Descripcion |
|----------|---------|-------------|
| Confirm Signup | `confirm-signup.html` | Verificar email al registrarse |
| Invite User | `invite-user.html` | Invitar a nuevos usuarios |
| Magic Link | `magic-link.html` | Login sin password |
| Change Email | `change-email.html` | Confirmar cambio de email |
| Reset Password | `reset-password.html` | Recuperar contrasena |
| Reauthentication | `reauthentication.html` | Verificar antes de acciones sensibles |

---

## Templates de Seguridad

Ubicacion: `/supabase/templates/auth/security/`

| Template | Archivo | Cuando se envia |
|----------|---------|-----------------|
| Password Changed | `password-changed.html` | Despues de cambiar contrasena |
| Email Changed | `email-changed.html` | Despues de cambiar email |
| Phone Changed | `phone-changed.html` | Despues de cambiar telefono |
| Identity Linked | `identity-linked.html` | Al vincular Google/etc |
| Identity Unlinked | `identity-unlinked.html` | Al desvincular proveedor |
| MFA Added | `mfa-added.html` | Al activar 2FA |
| MFA Removed | `mfa-removed.html` | Al desactivar 2FA |

---

## Variables Disponibles

Supabase Auth inyecta estas variables automaticamente:

| Variable | Descripcion |
|----------|-------------|
| `{{ .ConfirmationURL }}` | URL de confirmacion (signup, reset, etc) |
| `{{ .Token }}` | Token/codigo de verificacion |
| `{{ .TokenHash }}` | Hash del token |
| `{{ .SiteURL }}` | URL base del sitio |
| `{{ .Email }}` | Email del usuario |
| `{{ .Data.xxx }}` | Metadatos custom del usuario |

### Ejemplo de uso:

```html
<a href="{{ .ConfirmationURL }}">Confirmar Email</a>
<p>Tu codigo es: {{ .Token }}</p>
```

---

## Aplicar Templates en Supabase

### Opcion A: Dashboard (Manual)

1. Ir a **Authentication** → **Email Templates**
2. Seleccionar cada tipo de email
3. Copiar contenido HTML del archivo correspondiente
4. Guardar
5. Clic en **Send test email** para probar

### Opcion B: Supabase CLI (Automatizado)

```bash
# Los templates se aplican via config.toml o API
# Por ahora, usar Dashboard es mas sencillo
```

---

## Patron de Diseno

Todos los templates siguen el mismo patron visual:

```
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Background: #f9fafb (gray-50)
- Card: white, border-radius: 8px, shadow
- Header: Border-bottom color segun tipo:
  - #3b82f6 (blue): Acciones normales
  - #10b981 (green): Confirmaciones exitosas
  - #f59e0b (amber): Advertencias
  - #ef4444 (red): Alertas de seguridad
- CTA Button: #3b82f6, border-radius: 6px, padding 14px 32px
- Width: 600px max
- Footer: soporte@autorentar.com
```

---

## Testing

### Probar envio de emails:

1. Registrar usuario nuevo → Recibe confirm-signup
2. Usar "Forgot password" → Recibe reset-password
3. Cambiar email en perfil → Recibe change-email
4. Activar MFA → Recibe mfa-added

### Verificar en Resend Dashboard:

- Resend Dashboard → Emails → Ver logs
- Verificar delivery status, bounces, opens

---

## Troubleshooting

### Email no llega

1. Verificar logs en Supabase Dashboard → Logs → Auth
2. Verificar que dominio este verificado en Resend
3. Revisar carpeta spam del destinatario
4. Verificar credenciales SMTP correctas

### Template no se aplica

1. Asegurar que el HTML es valido
2. Verificar variables con sintaxis correcta `{{ .Variable }}`
3. Guardar y refrescar la pagina

### Errores de SMTP

```
Error: Connection refused
→ Verificar puerto (465 SSL o 587 TLS)

Error: Authentication failed
→ Verificar API Key de Resend

Error: Domain not verified
→ Completar verificacion DNS en Resend
```

---

## Mantenimiento

- Actualizar copyright al inicio de cada ano
- Revisar links de soporte si cambian
- Testear templates despues de actualizaciones de Supabase
