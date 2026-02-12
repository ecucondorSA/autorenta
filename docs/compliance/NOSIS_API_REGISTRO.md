# Registro API Nosis/CertiSend (Argentina)

> Guía para obtener los tokens de API necesarios para la verificación crediticia en AutoRenta.

## Resumen

La verificación crediticia de usuarios argentinos se realiza a través de **Nosis** (bureau de crédito) via la plataforma **CertiSend** de Sysworld.

### Tokens Requeridos

| Variable | Descripción |
|----------|-------------|
| `NOSIS_TOKEN_SUSC` | Token de suscripción a nivel empresa |
| `NOSIS_TOKEN_API` | Token específico para la API de Nosis |

---

## Paso 1: Contactar a CertiSend/Sysworld

### Opción A: Contacto Directo
- **Web:** https://www.certisend.com
- **Panel:** https://web.certisend.com/panel
- **Soporte:** https://helpcenter.sysworld.com.ar

### Opción B: Via ApiLanding
- **Web:** https://apilanding.com
- Buscar "API Report Nosis" (ID: 76)
- Registrarse gratuitamente para obtener **Token de Prueba**

---

## Paso 2: Solicitar Acceso Comercial

Al contactar, solicitar acceso a:

1. **API Report Nosis** - Informes crediticios completos
   - Endpoint: `https://cont1-virtual1.certisend.com/web/container/api/v1/database/identity/ar/buro/nosis/report`

### Datos que provee la API:
- Score crediticio (1-999)
- Calificación BCRA (Banco Central)
- Cheques rechazados
- Juicios activos
- Concursos y quiebras
- Deuda fiscal y previsional
- Ingreso estimado
- Empleador actual

---

## Paso 3: Configurar Panel Comercial

Una vez aprobado el acceso:

1. Ingresar a **web.certisend.com/panel**
2. Usar las credenciales proporcionadas:
   - Usuario
   - Contraseña
   - Valor Empresa
   - Valor Sector

3. Ir a **Configuraciones → Datos de configuración**
4. Obtener los tokens:
   - `token-susc` → Tu token de suscripción
   - `token-api` → Token específico para Nosis

---

## Paso 4: Configurar en AutoRenta

### Desarrollo Local
```bash
# .env.local
NOSIS_TOKEN_SUSC=tu-token-suscripcion
NOSIS_TOKEN_API=tu-token-api
```

### Supabase (Producción)
```bash
supabase secrets set NOSIS_TOKEN_SUSC=tu-token-suscripcion
supabase secrets set NOSIS_TOKEN_API=tu-token-api
```

---

## Paso 5: Deployar Edge Function

```bash
# Aplicar migración de base de datos
supabase db push

# Deployar la función
supabase functions deploy nosis-verify
```

---

## Entornos Disponibles

| Entorno | URL Base |
|---------|----------|
| **Producción** | `https://cont1-virtual1.certisend.com/...` |
| **Homologación/Test** | `http://cont1-test1.certisend.com/...` |

---

## Costos Estimados

Los costos de la API de Nosis varían según:
- Volumen de consultas mensuales
- Tipo de plan (básico, empresarial)
- Datos adicionales requeridos

**Contactar a CertiSend para cotización específica.**

---

## Seguridad Adicional (Opcional)

CertiSend ofrece métodos de seguridad extra:
- Conexión VPN
- Filtrado por IP de origen
- Autenticación OAuth2

---

## Documentación Técnica

- [ApiLanding - Nosis Report](https://apilanding.com/web/apidetail.php?id=76)
- [Nosis Informes Comerciales](https://www.nosis.com/es/informes-comerciales/api)
- [CertiSend Help Center](https://helpcenter.sysworld.com.ar)
- [Manual CertiSend API V2](https://www.studocu.com/es-ar/document/universidad-de-buenos-aires/lenguajes-de-programacion/manual-certisend-api-v2/97800773)

---

## Uso en el Código

```typescript
import { NosisService } from '@core/services/verification';

// Inyectar servicio
const nosis = inject(NosisService);

// Verificar crédito de usuario
const result = await nosis.verifyCredit('DNI', '12345678');

// Verificar elegibilidad para alquilar
const eligibility = await nosis.checkEligibility();

if (!eligibility.eligible) {
  // Usuario no puede alquilar
  console.log(eligibility.reason);
} else if (eligibility.requires_higher_deposit) {
  // Requiere depósito adicional
  depositAmount *= eligibility.suggested_deposit_multiplier;
}
```

---

## Notas Importantes

1. **Validez del reporte:** 30 días (configurable en `REPORT_VALIDITY_DAYS`)
2. **Cache automático:** La Edge Function cachea reportes válidos
3. **Documentos soportados:** DNI, CUIT, CUIL
4. **País:** Solo Argentina (AR)

---

*Documento creado: 2026-01-20*
*AutoRenta - Sistema de Verificación Crediticia*
