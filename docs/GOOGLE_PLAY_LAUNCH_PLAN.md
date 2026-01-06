# Plan de Lanzamiento Google Play Store - AutoRenta

## Resumen Ejecutivo

**Objetivo:** Publicar AutoRenta en Google Play Store para usuarios públicos
**Estado Actual:** AAB subido a Internal Track (Draft)
**Tiempo Estimado Total:** 2-3 semanas

---

## Fase 1: Requisitos Técnicos Completados ✅

| Requisito | Estado | Notas |
|-----------|--------|-------|
| AAB firmado | ✅ | v1.0.8, versionCode 42 |
| Keystore seguro | ✅ | Secrets en GitHub |
| CI/CD Pipeline | ✅ | Deploy automático a Play Store |
| Target SDK 34+ | ✅ Verificar | Requerido para nuevas apps 2024+ |

---

## Fase 2: Store Listing (3-5 días)

### 2.1 Información Básica Requerida

| Campo | Requisito | Estado | Acción |
|-------|-----------|--------|--------|
| Nombre de la app | Max 30 caracteres | ⏳ | "AutoRenta - Alquiler de Autos" |
| Descripción corta | Max 80 caracteres | ⏳ | Redactar |
| Descripción completa | Max 4000 caracteres | ⏳ | Redactar con keywords SEO |
| Icono | 512x512 PNG, 32-bit | ⏳ | Verificar assets |
| Feature Graphic | 1024x500 PNG/JPG | ⏳ | Diseñar |
| Screenshots | Min 2, recomendado 8 | ⏳ | Capturar de app real |
| Video promocional | Opcional, YouTube | ⏳ | Considerar para conversión |

### 2.2 Screenshots Requeridos

| Tipo | Dimensiones | Cantidad | Pantallas Sugeridas |
|------|-------------|----------|---------------------|
| Teléfono | 1080x1920 o 1920x1080 | 2-8 | Marketplace, Detalle Auto, Booking, Perfil |
| Tablet 7" | 1080x1920 | 0-8 | Opcional pero recomendado |
| Tablet 10" | 1920x1200 | 0-8 | Opcional |

### 2.3 Categorización

```
Categoría Principal: Viajes y guías locales
Categoría Secundaria: (opcional)
Tags: alquiler autos, rent a car, p2p, compartir auto
```

---

## Fase 3: Políticas y Compliance (2-3 días)

### 3.1 Política de Privacidad (OBLIGATORIO)

**Requisito:** URL pública con política de privacidad

**Debe incluir:**
- [ ] Qué datos se recopilan (email, teléfono, ubicación, fotos)
- [ ] Cómo se usan los datos
- [ ] Con quién se comparten (MercadoPago, Supabase, etc.)
- [ ] Derechos del usuario (acceso, eliminación)
- [ ] Retención de datos
- [ ] Información de contacto

**Acción:** Crear página en `autorentar.com/privacy-policy`

### 3.2 Data Safety Form (OBLIGATORIO desde 2022)

Declarar en Play Console:

| Tipo de Dato | Recopilado | Compartido | Propósito |
|--------------|------------|------------|-----------|
| Email | Sí | No | Cuenta, comunicación |
| Teléfono | Sí | No | Verificación, contacto |
| Nombre | Sí | Sí (propietarios) | Identificación en reservas |
| Ubicación precisa | Sí | No | Buscar autos cercanos |
| Fotos | Sí | Sí (check-in/out) | Verificación estado vehículo |
| Info financiera | Sí | Sí (MercadoPago) | Pagos |
| Documentos ID | Sí | No | Verificación identidad |

### 3.3 Content Rating (OBLIGATORIO)

Completar cuestionario IARC:
- **Rating esperado:** PEGI 3 / Everyone (sin contenido violento/adulto)
- Declarar: No hay compras in-app de items virtuales
- Declarar: Sí hay transacciones de dinero real (reservas)

### 3.4 Declaraciones Adicionales

| Declaración | Aplica | Notas |
|-------------|--------|-------|
| Contiene anuncios | No | Sin ads |
| Dirigido a niños | No | Usuarios 18+ (licencia de conducir) |
| App de noticias | No | |
| App gubernamental | No | |
| App COVID-19 | No | |
| App financiera | Parcial | Procesa pagos pero no es fintech |

---

## Fase 4: Testing Escalonado (5-7 días)

### 4.1 Internal Testing (Actual)
- **Testers:** Hasta 100 personas
- **Duración:** 2-3 días mínimo
- **Objetivo:** Validar flujos críticos

**Checklist de Testing:**
- [ ] Registro/Login (email, Google, Apple)
- [ ] Verificación de teléfono
- [ ] Búsqueda de autos
- [ ] Flujo completo de reserva
- [ ] Pago con MercadoPago (test mode)
- [ ] Check-in con fotos
- [ ] Check-out con fotos
- [ ] Mensajería entre usuario/propietario
- [ ] Notificaciones push
- [ ] Offline behavior
- [ ] Deep links

### 4.2 Closed Testing (Alpha/Beta)
- **Testers:** Hasta 10,000 personas
- **Duración:** 3-5 días
- **Requisito:** Feedback estable de Internal

### 4.3 Open Testing (Beta Pública)
- **Testers:** Ilimitado
- **Duración:** 2-3 días mínimo
- **Requisito:** Sin crashes críticos en Closed

### 4.4 Production Release
- **Rollout sugerido:** Gradual (10% → 25% → 50% → 100%)
- **Monitorear:** Crash rate, ANRs, reviews

---

## Fase 5: Requisitos de Google Play (Evitar Rechazos)

### 5.1 Políticas Críticas

| Política | Riesgo | Mitigación |
|----------|--------|------------|
| **Permisos** | Medio | Solo pedir permisos necesarios, justificar ubicación |
| **Pagos** | Alto | Usar pasarela externa (MercadoPago) está permitido para servicios físicos |
| **Datos sensibles** | Alto | Encriptar documentos, no almacenar CVV |
| **Identidad** | Medio | Verificar que login funcione sin errores |
| **Contenido generado** | Bajo | Moderar reseñas si es necesario |

### 5.2 Errores Comunes que Causan Rechazo

| Error | Cómo Evitarlo |
|-------|---------------|
| App no funciona | Testing exhaustivo antes de submit |
| Política de privacidad faltante | Agregar URL válida |
| Screenshots engañosos | Usar capturas reales de la app |
| Permisos excesivos | Justificar cada permiso en descripción |
| Crashes en revisión | Probar en múltiples dispositivos |
| Login roto | Tener cuenta de test para reviewers |
| Metadata incompleta | Llenar TODOS los campos requeridos |

### 5.3 Cuenta de Test para Revisores

**Crear credenciales de prueba:**
```
Email: reviewer@autorentar.com
Password: [seguro pero compartible]
Notas: Cuenta con saldo de wallet precargado
```

---

## Fase 6: Assets Requeridos

### 6.1 Gráficos

| Asset | Dimensiones | Formato | Estado |
|-------|-------------|---------|--------|
| Icono Hi-res | 512x512 | PNG 32-bit | ⏳ |
| Feature Graphic | 1024x500 | PNG/JPG | ⏳ |
| Promo Graphic | 180x120 | PNG/JPG | Opcional |
| TV Banner | 1280x720 | PNG/JPG | N/A |

### 6.2 Screenshots por Dispositivo

```
/assets/screenshots/
├── phone/
│   ├── 01_marketplace.png (1080x1920)
│   ├── 02_car_detail.png
│   ├── 03_booking.png
│   ├── 04_payment.png
│   ├── 05_checkin.png
│   ├── 06_profile.png
│   ├── 07_wallet.png
│   └── 08_messages.png
└── tablet/
    └── (opcional)
```

---

## Cronograma Estimado

```
Semana 1 (Días 1-7):
├── Día 1-2: Crear política de privacidad
├── Día 2-3: Preparar screenshots y assets
├── Día 3-4: Completar Store Listing
├── Día 4-5: Llenar Data Safety Form
├── Día 5-6: Content Rating questionnaire
└── Día 6-7: Agregar testers internos

Semana 2 (Días 8-14):
├── Día 8-10: Internal Testing
├── Día 10-11: Fix bugs críticos
├── Día 11-12: Promover a Closed Testing
└── Día 13-14: Monitorear métricas

Semana 3 (Días 15-21):
├── Día 15-16: Open Testing (si métricas OK)
├── Día 17-18: Preparar para Production
├── Día 19: Submit para revisión
├── Día 20-21: Esperar aprobación (1-3 días)
└── Día 21+: LANZAMIENTO 🚀
```

---

## Checklist Final Pre-Lanzamiento

### Técnico
- [ ] targetSdkVersion >= 34
- [ ] Sin crashes en últimas 48h
- [ ] ANR rate < 0.47%
- [ ] Crash rate < 1.09%
- [ ] App size optimizado (< 150MB recomendado)
- [ ] ProGuard/R8 habilitado
- [ ] Logs de debug removidos

### Legal/Compliance
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados
- [ ] Data Safety Form completo
- [ ] Content Rating obtenido
- [ ] Declaración de permisos

### Marketing
- [ ] Screenshots de alta calidad
- [ ] Feature graphic atractivo
- [ ] Descripción con keywords
- [ ] Video promocional (opcional)
- [ ] Categoría correcta

### Operacional
- [ ] Soporte al cliente listo
- [ ] Email de contacto configurado
- [ ] Monitoreo de reviews activo
- [ ] Plan de respuesta a bugs críticos

---

## Contacto y Recursos

**Google Play Console:** https://play.google.com/console
**Documentación:** https://developer.android.com/distribute
**Políticas:** https://play.google.com/about/developer-content-policy/

**Cuenta Developer:**
- Email: [tu-email]
- Fee: $25 USD (único pago)

---

## Notas Adicionales

### Sobre Pagos P2P
Google permite apps que facilitan pagos por servicios físicos (como alquiler de autos) usando pasarelas externas. No es necesario usar Google Play Billing para esto.

### Sobre Verificación de Identidad
Para apps que manejan transacciones financieras significativas, Google puede solicitar verificación adicional del desarrollador. Tener documentación lista.

### Rollout Gradual Recomendado
- 10% primeras 24h - monitorear crashes
- 25% si estable
- 50% después de 48h
- 100% después de 72h sin issues

---

*Última actualización: Enero 2026*
*Versión del documento: 1.0*
