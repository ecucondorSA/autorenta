# 🔒 Fix: "Este contenido está bloqueado" - Google Calendar

## 🚨 Problema

Cuando intentas ver el calendario embebido en la página del auto, Google muestra:

```
Este contenido está bloqueado.
Para solucionar el problema, ponte en contacto con el propietario del sitio web.
```

## 🔍 Causa Raíz

Google Calendar **no permite embed de calendarios privados**. El iframe solo funciona con calendarios que tienen:

1. **ACL (Access Control List) pública**: Configuración `role: reader, scope: default`
2. **Calendario secundario**: Los calendarios creados via API (con `@group.calendar.google.com`)
3. **URL correcta**: Usando parámetro `cid` en lugar de `src` para calendarios secundarios

## ✅ Soluciones Implementadas

### 1. **Mejora en OAuth Flow** 
`supabase/functions/google-calendar-oauth/index.ts`

```typescript
// Después de crear el calendario
await makeCalendarPublic(newCalendar.id, accessToken);
```

La función `makeCalendarPublic()` ahora:
- ✅ Agrega ACL rule con `role: reader` y `scope: default`
- ✅ Actualiza descripción del calendario
- ✅ Maneja errores de forma no-fatal
- ✅ Logs detallados para debugging

### 2. **Detección de Tipo de Calendario**
`google-calendar.component.ts`

```typescript
const isSecondaryCalendar = config.calendarId.includes('@group.calendar.google.com');

if (isSecondaryCalendar) {
  params.set('cid', config.calendarId); // ✅ Mejor para calendarios públicos
} else {
  params.set('src', config.calendarId); // Para calendarios primarios
}
```

### 3. **Edge Function para Arreglar Calendarios Existentes**
`supabase/functions/make-calendar-public/index.ts`

Nueva función que permite hacer público un calendario ya creado:

```typescript
// Uso desde el frontend:
POST /functions/v1/make-calendar-public
Body: { "car_id": "uuid-del-auto" }
```

## 🛠️ Cómo Arreglar Calendarios Existentes

### Opción A: Reconectar Google Calendar (RECOMENDADO)

1. Ir a `/profile/calendar`
2. Click en "Desconectar"
3. Click en "Conectar Google Calendar"
4. Los calendarios se recrearán con permisos públicos correctos

### Opción B: Arreglar Sin Desconectar

Ejecutar la función manualmente desde la consola del navegador:

```javascript
// En la página de car-detail
const carId = 'uuid-de-tu-auto';

fetch('/functions/v1/make-calendar-public', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ car_id: carId })
})
.then(r => r.json())
.then(data => console.log(data));
```

### Opción C: Hacer Público Manualmente en Google Calendar

1. Ir a [calendar.google.com](https://calendar.google.com)
2. Encontrar el calendario "Autorenta - [Tu Auto]"
3. Click en ⚙️ Settings
4. En "Access permissions", marcar: **"Make available to public"**
5. Seleccionar: **"See all event details"**
6. Guardar

## 📊 Verificar Estado de Calendarios

Ejecuta este script SQL en Supabase:

```sql
-- Ver calendarios creados
SELECT 
  cgc.google_calendar_id,
  cgc.calendar_name,
  c.brand,
  c.model,
  cgc.created_at
FROM car_google_calendars cgc
LEFT JOIN cars c ON c.id = cgc.car_id
WHERE cgc.owner_id = 'tu-user-id';
```

Luego verifica manualmente en Google Calendar si son públicos.

## 🔬 Debug: Verificar URL del Iframe

Abre las DevTools y busca el elemento iframe:

```javascript
// En la consola del navegador
const iframe = document.querySelector('iframe[title="Google Calendar"]');
console.log('Calendar URL:', iframe?.src);
```

La URL correcta debe verse así:

```
✅ CORRECTO (calendario secundario con cid):
https://calendar.google.com/calendar/embed?cid=abc123@group.calendar.google.com&mode=month&hl=es&color=%23039BE5

✅ CORRECTO (calendario primario con src):
https://calendar.google.com/calendar/embed?src=user@gmail.com&mode=month&hl=es

❌ INCORRECTO:
- Sin parámetro cid/src
- Calendario privado (no tiene ACL)
```

## 🎯 Checklist de Troubleshooting

Si el calendario sigue mostrando "contenido bloqueado":

- [ ] **Verificar que el calendar ID existe en la BD**
  ```sql
  SELECT google_calendar_id FROM car_google_calendars WHERE car_id = 'xxx';
  ```

- [ ] **Verificar que el token NO está expirado**
  ```sql
  SELECT expires_at > NOW() as is_valid FROM google_calendar_tokens WHERE user_id = 'xxx';
  ```

- [ ] **Verificar que el calendario es secundario**
  - Debe terminar en `@group.calendar.google.com`
  - NO puede ser un email como `user@gmail.com`

- [ ] **Verificar ACL en Google Calendar**
  - Ir a [calendar.google.com](https://calendar.google.com)
  - Settings del calendario → Access permissions
  - Debe estar marcado "Make available to public"

- [ ] **Verificar URL del iframe en DevTools**
  - Debe usar `cid` para calendarios secundarios
  - Debe incluir el parámetro `color`

- [ ] **Probar la URL directamente en otra pestaña**
  - Copiar el `src` del iframe
  - Pegar en nueva pestaña
  - Debería abrir el calendario sin pedir login

## 📝 Logs Importantes

Cuando se crea un calendario, busca estos logs en Supabase Functions:

```
✅ CORRECTO:
🚀 Creating calendars for user cars: <user-id>
📋 Found 1 car(s) for user
📅 Creating calendar: "Autorenta - Toyota Corolla"
✅ Calendar created with ID: abc123@group.calendar.google.com
🔓 Making calendar public: abc123@group.calendar.google.com
✅ ACL rule added: {...}
✅ Calendar settings updated
🌐 Calendar abc123@group.calendar.google.com is now public
✅ Calendar saved to database for car <car-id>

❌ ERROR:
❌ ACL creation failed: {...}  // El calendario no es público
⚠️ Failed to make calendar public (non-fatal)  // Se creó pero es privado
```

## 🚀 Testing después del Fix

1. **Desconectar y reconectar Google Calendar**:
   ```
   http://localhost:4200/profile/calendar
   ```

2. **Verificar que se creó el calendario**:
   - Ir a [calendar.google.com](https://calendar.google.com)
   - Deberías ver "Autorenta - [Tu Auto]" en la lista

3. **Verificar que es público**:
   - Settings del calendario
   - "Access permissions" → "Make available to public" ✅

4. **Ver en car-detail**:
   ```
   http://localhost:4200/cars/{tu-auto-id}
   ```
   - Scroll hasta "Disponibilidad en Google Calendar"
   - El calendario debería mostrarse sin error

## 💡 Alternativa: Mostrar Eventos Sin Iframe

Si el iframe sigue fallando, puedes usar la API directamente para mostrar eventos:

```typescript
// Opción B: Mostrar lista de eventos en lugar de iframe
this.googleCalendarService
  .getCarCalendarAvailability(carId, from, to)
  .subscribe(availability => {
    // Renderizar lista de eventos o calendario custom
    this.events.set(availability.events);
  });
```

Esto no requiere que el calendario sea público y siempre funciona.

## 📚 Referencias

- **Google Calendar Embed Guide**: https://support.google.com/calendar/answer/41207
- **Google Calendar API ACL**: https://developers.google.com/calendar/api/v3/reference/acl
- **Troubleshooting Embedded Calendars**: https://support.google.com/calendar/thread/2855504

---

**Última actualización**: 2025-11-14  
**Estado**: ✅ Fix implementado  
**Requiere**: Desplegar edge functions y reconectar Google Calendar
