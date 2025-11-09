# 📚 DÍA 2: DOCUMENTACIÓN Y PREPARACIÓN

**Tiempo estimado**: 4-6 horas
**Prioridad**: P1 IMPORTANTE
**Objetivo**: Preparar documentación para usuarios y materiales de lanzamiento

**Documentación completa**: [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md)
**Depende de**: Issue #1 (Día 1) completado ✅

---

## ☑️ 8. USER DOCUMENTATION (2 horas)

### 8.1 Create FAQ

Crear archivo: `docs/user-guide/FAQ.md`

- [ ] Archivo FAQ.md creado con secciones:
  - [ ] ¿Qué es AutoRenta?
  - [ ] ¿Cómo publico mi auto?
  - [ ] ¿Cómo rento un auto?
  - [ ] ¿Cómo funcionan los pagos?
  - [ ] ¿Qué pasa si hay daños?
  - [ ] Soporte y contacto

**Template**: Ver `LAUNCH_CHECKLIST.md` sección 8.1

---

### 8.2 Guía de Locador

Crear archivo: `docs/user-guide/GUIA_LOCADOR.md`

- [ ] Archivo creado con secciones:
  - [ ] Registro y verificación
  - [ ] Publicar auto (paso a paso)
  - [ ] Recibir bookings
  - [ ] Check-in (entregar auto)
  - [ ] Check-out (recibir auto)
  - [ ] Recibir pago y retirar fondos

**Debe incluir**:
- Screenshots de cada paso (hacer después de día 3)
- Comandos/pasos exactos
- Troubleshooting común

---

### 8.3 Guía de Locatario

Crear archivo: `docs/user-guide/GUIA_LOCATARIO.md`

- [ ] Archivo creado con secciones:
  - [ ] Registro y verificación
  - [ ] Buscar auto en mapa
  - [ ] Crear booking
  - [ ] Depositar fondos (MercadoPago)
  - [ ] Check-in (retirar auto)
  - [ ] Durante la renta
  - [ ] Check-out (devolver auto)
  - [ ] Dejar review

---

## ☑️ 9. LEGAL DOCUMENTS (1 hora)

⚠️ **IMPORTANTE**: Consultar con abogado para versión final. Los templates son **DRAFTS**.

### 9.1 Términos y Condiciones

Crear archivo: `docs/legal/TERMS_AND_CONDITIONS.md`

- [ ] Archivo creado con secciones mínimas:
  - [ ] Aceptación de términos
  - [ ] Definiciones
  - [ ] Servicios ofrecidos
  - [ ] Registro y verificación
  - [ ] Publicación de autos
  - [ ] Bookings y cancelaciones
  - [ ] Pagos y comisiones
  - [ ] Seguros y responsabilidades
  - [ ] Disputas
  - [ ] Privacidad (link a Privacy Policy)
  - [ ] Limitación de responsabilidad
  - [ ] Modificaciones
  - [ ] Ley aplicable y jurisdicción
  - [ ] Contacto

**Template**: Ver `LAUNCH_CHECKLIST.md` sección 9

- [ ] ⚠️ **TODO**: Revisar con abogado antes de lanzamiento público

---

### 9.2 Política de Privacidad

Crear archivo: `docs/legal/PRIVACY_POLICY.md`

- [ ] Archivo creado con secciones:
  - [ ] Información que recopilamos
  - [ ] Cómo usamos tu información
  - [ ] Encriptación de datos sensibles (✅ AES-256)
  - [ ] Compartir información con terceros
  - [ ] Tus derechos (GDPR):
    - [ ] Derecho de acceso
    - [ ] Derecho de rectificación
    - [ ] Derecho al olvido
    - [ ] Derecho de portabilidad
    - [ ] Derecho de oposición
  - [ ] Cookies
  - [ ] Retención de datos
  - [ ] Seguridad (encryption, HTTPS, RLS, backups)
  - [ ] Menores de edad (21 años mínimo)
  - [ ] Cambios a la política
  - [ ] Contacto y DPO

**CRÍTICO**: Debe mencionar PII encryption ✅

**Template**: Ver `LAUNCH_CHECKLIST.md` sección 10

- [ ] ⚠️ **TODO**: Revisar con abogado

---

### 9.3 Add Legal Links to App

Modificar footer de la app:

```typescript
// apps/web/src/app/app.component.html (o footer component)

<footer>
  <a routerLink="/legal/terms">Términos y Condiciones</a>
  <a routerLink="/legal/privacy">Política de Privacidad</a>
  <a href="mailto:soporte@autorenta.com">Contacto</a>
</footer>
```

- [ ] Routes creados (`/legal/terms`, `/legal/privacy`)
- [ ] Componentes creados (o mostrar markdown files)
- [ ] Links visibles en footer
- [ ] Cambios commiteados

---

## ☑️ 10. MARKETING MATERIALS (1-2 horas)

### 10.1 Landing Page Copy

- [ ] Hero section copy escrito
- [ ] "Cómo funciona" (locatarios y locadores)
- [ ] "Por qué AutoRenta" (benefits)
- [ ] CTA (Call to Action) buttons
- [ ] Footer content

**Opcional**: Si tienes página de marketing separada, actualizar copy allí.

---

### 10.2 Social Media Posts

Preparar posts para:

**Instagram**:
- [ ] Post de anuncio escrito
- [ ] Post para locadores escrito
- [ ] Post para locatarios escrito
- [ ] Imagen/diseño preparado (Canva, Figma, etc)

**Facebook**:
- [ ] Same content que Instagram

**Twitter/X**:
- [ ] Tweet de lanzamiento (280 chars)
- [ ] Thread explicando AutoRenta (3-5 tweets)

**LinkedIn**:
- [ ] Post profesional de lanzamiento
- [ ] Mención de tech stack (Angular, Supabase, etc)
- [ ] Call to action

**Templates**: Ver `LAUNCH_CHECKLIST.md` sección 11.2

---

### 10.3 Email Template para Early Adopters

Si tienes lista de espera:

```markdown
Asunto: 🚀 AutoRenta ya está VIVO!

Hola [Nombre],

Te registraste en nuestra lista de espera y hoy es el día...
[Ver template completo en LAUNCH_CHECKLIST.md sección 15.2]
```

- [ ] Email template escrito
- [ ] Lista de early adopters identificada
- [ ] Email listo para enviar (día 3)

---

## ☑️ 11. PRE-LAUNCH CHECKS (1 hora)

### 11.1 Technical Pre-Flight

```bash
# 1. App funcionando
curl -I https://autorenta-web.pages.dev
# Debe retornar: HTTP/2 200

# 2. API funcionando
curl -I https://obxvffplochgeiclibng.supabase.co/rest/v1/cars?limit=1
# Debe retornar: HTTP/2 200

# 3. Health check
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
# Debe retornar: {"status":"healthy",...}
```

- [ ] Web app respondiendo (200 OK)
- [ ] API respondiendo (200 OK)
- [ ] Health check OK

---

### 11.2 Feature Checklist

**Core Features**:
- [ ] Registration funciona
- [ ] Login funciona
- [ ] Magic link funciona
- [ ] Password reset funciona
- [ ] Profile edit funciona (con encryption ✅)
- [ ] Upload documents funciona
- [ ] Verificación admin funciona

**Locador Features**:
- [ ] Publicar auto funciona
- [ ] Upload fotos funciona (mínimo 5)
- [ ] Editar auto funciona
- [ ] Configurar disponibilidad funciona
- [ ] Recibir booking requests funciona
- [ ] Aprobar/rechazar bookings funciona
- [ ] Check-in FGO funciona (persistido ✅)
- [ ] Check-out FGO funciona (persistido ✅)

**Locatario Features**:
- [ ] Buscar autos en mapa funciona
- [ ] Filtros funcionan (fecha, precio, ubicación)
- [ ] Ver detalle de auto funciona
- [ ] Crear booking funciona
- [ ] Depositar fondos funciona (MercadoPago)
- [ ] Ver bookings activos funciona
- [ ] Check-in funciona
- [ ] Check-out funciona
- [ ] Leave review funciona

**Wallet Features**:
- [ ] Depositar fondos funciona
- [ ] Ver balance funciona
- [ ] Agregar cuenta bancaria funciona (encrypted ✅)
- [ ] Solicitar retiro funciona
- [ ] Ver transacciones funciona

**Admin Features**:
- [ ] Login admin funciona
- [ ] Ver pending verifications funciona
- [ ] Aprobar/rechazar verificaciones funciona
- [ ] Ver todos los bookings funciona
- [ ] Procesar refunds funciona

---

### 11.3 Security Verification

- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] PII data encrypted in DB ✅
- [ ] Rate limiting active ✅ (test con 6 login attempts)
- [ ] Sentry capturing errors ✅
- [ ] Console.logs sensibles removed ✅
- [ ] RLS policies working (test con 2 users diferentes)

**Test RLS**:
```sql
-- Login como user A, intentar acceder datos de user B
-- Debe ser bloqueado por RLS
```

---

## ☑️ 12. CONTENT PREPARATION (30 min)

### 12.1 Demo Users

Crear 2-3 autos demo para mostrar:

- [ ] User demo locador creado
- [ ] 3 autos demo publicados:
  - [ ] Auto económico (ej: Fiat Cronos)
  - [ ] Auto mid-range (ej: Toyota Corolla)
  - [ ] Auto premium (ej: Volkswagen Vento)
- [ ] Cada auto con:
  - [ ] 5-10 fotos de calidad
  - [ ] Descripción completa
  - [ ] Precio competitivo
  - [ ] Ubicación en Buenos Aires

---

### 12.2 Screenshots para Marketing

Tomar screenshots de:

- [ ] Homepage con mapa de autos
- [ ] Detalle de auto
- [ ] Proceso de booking
- [ ] Wallet dashboard
- [ ] Profile verification

**Guardar en**: `docs/marketing/screenshots/`

---

## ✅ VERIFICACIÓN FINAL DÍA 2

- [ ] ✅ Documentación de usuario completa
  - [ ] FAQ creado
  - [ ] Guía locador creada
  - [ ] Guía locatario creada

- [ ] ✅ Documentos legales (DRAFT)
  - [ ] Términos y condiciones
  - [ ] Política de privacidad
  - [ ] Links en footer de app
  - [ ] ⚠️ TODO: Revisar con abogado

- [ ] ✅ Marketing materials preparados
  - [ ] Landing page copy
  - [ ] Social media posts (4 plataformas)
  - [ ] Email template para early adopters

- [ ] ✅ Pre-launch checks pasados
  - [ ] Technical checks OK
  - [ ] Feature checklist complete
  - [ ] Security verification OK

- [ ] ✅ Demo content creado
  - [ ] 3 autos demo publicados
  - [ ] Screenshots tomados

---

## 🎉 DÍA 2 COMPLETADO

**Si TODOS los checkboxes están ✅**:

1. Cerrar este issue
2. Crear/Abrir Issue #3: Día 3 - Lanzamiento 🚀
3. Descansar bien - mañana es el BIG DAY!

**Opcional antes de dormir**:

- [ ] Revisar una última vez el checklist de Día 3
- [ ] Programar posts en redes sociales (Buffer, Hootsuite)
- [ ] Preparar café ☕ para mañana

---

**Tiempo invertido**: _____ horas
**Fecha de completado**: _____
