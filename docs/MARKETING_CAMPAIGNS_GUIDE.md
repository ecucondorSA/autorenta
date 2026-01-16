# 🎯 AutoRenta Marketing Campaigns Guide

Documentación completa del sistema de campañas de marketing automatizadas.

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Campañas disponibles](#campañas-disponibles)
4. [Uso de Templates](#uso-de-templates)
5. [Generación de Imágenes](#generación-de-imágenes)
6. [Horarios Óptimos](#horarios-óptimos)
7. [A/B Testing](#ab-testing)
8. [Analytics y ROI](#analytics-y-roi)
9. [Workflows de GitHub](#workflows-de-github)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

El sistema de campañas de marketing de AutoRenta automatiza:

- ✅ **Generación de contenido** - Templates con variables dinámicas
- ✅ **Imágenes AI** - Generadas con Gemini + Stable Diffusion
- ✅ **Horarios óptimos** - Calculados según plataforma y audiencia
- ✅ **A/B testing** - Sistema completo de estadística
- ✅ **Analytics en tiempo real** - Trackeo de eventos y ROI
- ✅ **Publicación automática** - GitHub Actions + Supabase

### Métricas principales

| Métrica | Objetivo |
|---------|----------|
| CAC (Costo por Adquisición) | < $50 USD |
| CTR (Click-Through Rate) | > 2% |
| CVR (Conversion Rate) | > 3% |
| ROI | > 150% |

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│  MARKETING CAMPAIGNS SYSTEM                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. TEMPLATES                                   │
│     ├─ Owner Acquisition (6 templates)          │
│     ├─ Renter Acquisition (7 templates)         │
│     ├─ Category Spotlight (6 templates)         │
│     └─ Event Special (6 templates)              │
│                                                  │
│  2. GENERATORS                                  │
│     ├─ Image Generator (Gemini + SD)            │
│     ├─ Posting Time Calculator                  │
│     └─ A/B Test Manager                         │
│                                                  │
│  3. AUTOMATION                                  │
│     ├─ GitHub Workflows (5 campaigns)           │
│     ├─ Supabase Edge Functions                  │
│     └─ Cron Jobs (daily, weekly, monthly)       │
│                                                  │
│  4. ANALYTICS                                   │
│     ├─ Event Tracking                           │
│     ├─ ROI Calculation                          │
│     └─ Performance Views                        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Base de Datos

```sql
-- Tablas principales
marketing_campaigns        -- Campañas principales
campaign_events           -- Eventos de tracking
ab_tests                  -- A/B tests configurados
ab_test_metrics           -- Métricas de tests
marketing_metrics_daily   -- Agregación diaria

-- Views
campaign_performance      -- Vista de performance
```

---

## Campañas Disponibles

### 1. Owner Acquisition (Captación de Propietarios)

**Objetivo:** Atraer propietarios de autos para publicar.

**Templates:**
- `testimonial_earnings` - Testimonio de owner exitoso (Mon/Wed/Fri)
- `comparison_vs_turo` - Comparación ventajosa vs Turo (Tue/Thu)
- `tutorial_publish_car` - Tutorial de 5 pasos
- `dashboard_preview` - Preview del dashboard
- `earnings_breakdown` - Desglose de ganancias
- `fgo_protection` - Protección del FGO
- `reward_pool_benefit` - Reward pool feature

**Plataformas:** Facebook, Instagram, TikTok, LinkedIn

**Horario recomendado:** 13:00 ART (propietarios en descanso de almuerzo)

```bash
# Trigger manual
gh workflow run campaign-owner-acquisition.yml \
  -f template=testimonial_earnings \
  -f platform=facebook \
  -f dry_run=false
```

### 2. Renter Acquisition (Captación de Arrendatarios)

**Objetivo:** Convertir usuarios en su primera renta.

**Templates:**
- `free_credit_300` - Crédito gratis de $300 USD
- `no_credit_card` - Renta sin tarjeta de crédito
- `price_comparison` - 30% más barato que competencia
- `rentarfast_ai_chat` - RentarFast chatbot
- `ai_inspection_verification` - IA detecta daños
- `dynamic_pricing_savings` - Precios dinámicos
- `instant_confirmation` - Confirmación en 5 segundos

**Plataformas:** TikTok, Instagram, Facebook, Twitter

**Horario recomendado:** 19:00-21:00 ART (noche, alto engagement)

```bash
# Trigger manual
gh workflow run campaign-renter-acquisition.yml \
  -f template=free_credit_300 \
  -f platform=tiktok \
  -f dry_run=false
```

### 3. Category Spotlight (Promoción de Categorías)

**Objetivo:** Promocionar categorías específicas según temporada.

**Categorías:**
- `sports_cars` - 🏎️ Deportivos (adrenalina)
- `suv_family` - 🚙 SUVs (familia)
- `electric_cars` - 🌱 Eléctricos (sostenible)
- `luxury_cars` - 👔 Lujo (ejecutivo)
- `beach_cars` - 🏖️ Playa (verano)
- `economy_budget` - 💰 Económicos (presupuesto)

**Triggers:**
- Verano → Beach cars
- Ejecutivos → Luxury cars
- Eco-conscious → Electric

### 4. Event Special (Eventos Especiales)

**Objetivo:** Aprovechar fechas estacionales.

**Eventos:**
- `black_friday` - 40% descuento (Noviembre)
- `cyber_monday` - Flash sales (Diciembre)
- `new_year_travel` - Viajes de fin de año (Dic-Enero)
- `carnival_celebration` - Carnaval (Febrero)
- `easter_travel` - Semana Santa (Abril)
- `winter_adventure` - Invierno (Julio)

**Descuentos incluidos:**
```
Black Friday:      -40%
Cyber Monday:      -35%
New Year:          -30%
Carnival:          -30%
Easter:            -25%
Winter:            -25%
```

---

## Uso de Templates

### TypeScript API

```typescript
import {
  ownerAcquisitionTemplates,
  renterAcquisitionTemplates,
  renderTemplate,
  getRandomTemplate
} from './scripts/marketing/templates/owner-acquisition-templates.ts';

// 1. Obtener template
const template = ownerAcquisitionTemplates['testimonial_earnings'];

// 2. Reemplazar variables
const { caption, hashtags } = renderTemplate(template, {
  ownerName: 'Juan García',
  earnings: 'R$ 2.500',
  carBrand: 'Toyota',
  carModel: 'Corolla',
  city: 'São Paulo',
  rating: '4.9',
  occupancyRate: '85%',
  cta: 'https://app.autorenta.com/owner/register'
});

// 3. Usar contenido
console.log(caption);
console.log(hashtags);
```

### Variables disponibles

**Owner Templates:**
```
{ownerName}          - Nombre del propietario
{earnings}           - Ganancias (ej: R$ 2.500)
{carBrand}           - Marca (Toyota, BMW, etc)
{carModel}           - Modelo (Corolla, i3, etc)
{carYear}            - Año del auto
{city}               - Ciudad
{rating}             - Rating (4.9, etc)
{occupancyRate}      - Tasa de ocupación (85%)
{cta}                - Link CTA
```

**Renter Templates:**
```
{city}               - Ciudad objetivo
{region}             - Región (Brasil)
{discount}           - Descuento (30%)
{cta}                - Link CTA
```

---

## Generación de Imágenes

### Componentes

```typescript
import {
  MarketingImageGenerator,
  createImageRequest,
  imageContextPresets
} from './scripts/marketing/generators/image-generator.ts';

// 1. Inicializar generador
const generator = new MarketingImageGenerator(
  process.env.GEMINI_API_KEY,
  process.env.STABILITY_API_KEY,
  process.env.SUPABASE_URL
);

// 2. Crear request
const imageRequest = createImageRequest(
  'owner_acquisition',      // campaignType
  'testimonial_earnings',   // template
  {                         // context
    ownerName: 'Juan García',
    earnings: 'R$ 2.500'
  },
  'facebook'                // platform (determina size)
);

// 3. Generar imagen
const image = await generator.generateMarketingImage(imageRequest);
console.log(image.url);
```

### Dimensiones por plataforma

| Plataforma | Dimensiones | Aspect Ratio |
|------------|-------------|--------------|
| Facebook  | 1200x628    | 1.91:1      |
| Instagram | 1080x1080   | 1:1         |
| TikTok    | 1080x1920   | 9:16        |
| Twitter   | 1200x675    | 16:9        |

### Prompts personalizados

Cada template tiene un `imagePrompt` que Gemini mejora automáticamente:

```typescript
// Ejemplo de prompt base
const basePrompt = `
Photo-realistic image of a satisfied AutoRenta owner standing next to their car.
Happy expression, professional attire, modern urban background.
Car: spotless, well-maintained.
Include earnings chart visible on their phone.
Professional photography style, golden hour lighting.
`;

// Gemini lo mejora a:
// "High-quality professional photograph of a successful AutoRenta owner..."
```

---

## Horarios Óptimos

### Algoritmo

El sistema calcula horarios óptimos basándose en:

1. **Plataforma** (Facebook, Instagram, TikTok, etc)
2. **Audiencia** (Owners vs Renters)
3. **Tipo de contenido** (Promoción, Educativo, Urgencia, etc)
4. **Día de la semana** (Lunes-Domingo)

### Uso

```typescript
import { OptimalPostingTimeCalculator } from './scripts/marketing/generators/optimal-posting-time-calculator.ts';

// Calcular mejor hora
const result = OptimalPostingTimeCalculator.calculateOptimalTimes(
  'instagram',      // plataforma
  'renters',        // audiencia
  'urgency'         // contentType
);

console.log(result.bestTime);         // 19:00
console.log(result.recommendations[0].expectedEngagement); // high

// Generar plan semanal
const weeklyPlan = generateWeeklyPublishingPlan(
  ['facebook', 'instagram', 'tiktok'],
  'renters'
);

// Resultado:
// {
//   Monday: { facebook: '13:00', instagram: '19:00', tiktok: '20:00' },
//   Tuesday: { ... },
//   ...
// }
```

### Horarios recomendados (ART UTC-3)

**Owners (propietarios):**
- Lunes-Viernes: 13:00 (almuerzo)
- Fines de semana: 12:00

**Renters (arrendatarios):**
- Lunes-Viernes: 19:00-21:00 (after work)
- Fines de semana: 15:00-19:00

---

## A/B Testing

### Crear test

```typescript
import { ABTestManager, variantFactory } from './scripts/marketing/generators/ab-test-manager.ts';

const manager = new ABTestManager();

// Crear test
const test = manager.createTest(
  'owner-acq-q1-2026',
  'Owner Acquisition Headline Test',
  'facebook',
  'owners',

  // Variant A
  {
    id: 'A',
    headline: 'Gana R$ 500 con tu auto',
    cta: '/owners/register',
    ctaText: 'Publicar Mi Auto'
  },

  // Variant B
  {
    id: 'B',
    headline: '75% del pago es para ti',
    cta: '/owners/register',
    ctaText: 'Ver Ventajas'
  },

  { A: 50, B: 50 },  // traffic split
  100,               // min sample size
  0.95               // confidence level (95%)
);

// Iniciar test
manager.startTest(test.id);
```

### Registrar métricas

```typescript
// Registrar eventos continuamente
manager.recordMetrics(test.id, 'A', {
  impressions: 1000,
  clicks: 25,
  conversions: 5,
  cost: 100
});

manager.recordMetrics(test.id, 'B', {
  impressions: 1000,
  clicks: 30,
  conversions: 8,
  cost: 100
});
```

### Determinar ganador

```typescript
// Ejecutar test de significancia estadística
const { winner, significant, pValue } = manager.determineWinner(test.id);

console.log(`Winner: ${winner}`);
console.log(`Significant: ${significant}`);
console.log(`p-value: ${pValue}`);

// Completar test
manager.completeTest(test.id);

// Generar reporte
const report = manager.getReport(test.id);
console.log(report);
```

### Exportar resultados

```typescript
// CSV export
const csv = manager.exportToCSV(test.id);
// "Metric,Variant A,Variant B,Difference
//  Impressions,1000,1000,0
//  Clicks,25,30,5
//  ..."

// HTML report
const html = generateHTMLReport(manager.getReport(test.id));
```

---

## Analytics y ROI

### Trackear eventos

```typescript
// En el cliente/frontend
async function trackCampaignEvent(
  campaignId: string,
  eventType: string,
  value?: number
) {
  const response = await fetch(
    `${supabase.url}/functions/v1/track-campaign-performance`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        campaign_id: campaignId,
        event_type: eventType,  // impression, click, signup, conversion
        platform: 'facebook',
        metadata: {
          utm_source: 'facebook',
          utm_medium: 'post',
          device: 'mobile'
        },
        value: value  // para conversiones (ej: R$ 100)
      })
    }
  );
  return response.json();
}

// Usar
trackCampaignEvent('owner-acq-001', 'impression');
trackCampaignEvent('owner-acq-001', 'click');
trackCampaignEvent('owner-acq-001', 'conversion', 100);
```

### Calcular ROI

```typescript
// Llamar edge function
async function calculateROI(campaignId: string) {
  const response = await fetch(
    `${supabase.url}/functions/v1/calculate-campaign-roi`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        campaign_id: campaignId
      })
    }
  );

  const roi = await response.json();

  return {
    roi_percentage: roi.calculated.roi_percentage,    // 150%
    cpa: roi.calculated.cpa,                          // R$ 33
    roi_absolute: roi.calculated.roi_absolute,        // R$ 5000
    status: roi.status                                // 'profiting'
  };
}
```

### Métricas disponibles

```sql
-- Vista de performance
SELECT * FROM campaign_performance
WHERE campaign_id = 'owner-acq-001';

-- Resultado:
-- impressions: 50000
-- clicks: 1250
-- signups: 125
-- conversions: 50
-- ctr_percentage: 2.5
-- conversion_rate_percentage: 40.0
-- total_revenue: 5000
-- roi_percentage: 150
```

---

## Workflows de GitHub

### Trigger automático

```yaml
# Owner acquisition - 3 veces por semana (Mon, Wed, Fri a las 8 AM ART)
schedule:
  - cron: '0 11 * * 1,3,5'

# Renter acquisition - 4 veces por semana (Tue, Thu, Sat, Sun a las 11 AM ART)
schedule:
  - cron: '0 14 * * 2,4,6,0'
```

### Trigger manual

```bash
# Owner acquisition
gh workflow run campaign-owner-acquisition.yml \
  -f template=testimonial_earnings \
  -f platform=facebook \
  -f dry_run=false \
  -f generate_image=true

# Renter acquisition
gh workflow run campaign-renter-acquisition.yml \
  -f template=free_credit_300 \
  -f platform=tiktok \
  -f dry_run=true

# Category spotlight
gh workflow run campaign-category-spotlight.yml \
  -f category=beach_cars \
  -f platform=instagram

# Event special
gh workflow run campaign-event-special.yml \
  -f event=black_friday \
  -f platform=facebook
```

### Monitorear workflows

```bash
# Ver último run
gh workflow view campaign-owner-acquisition.yml

# Ver logs
gh run view --log <run-id>

# Ver fallos
gh run view --log-failed <run-id>
```

---

## Troubleshooting

### Error: "Image generation failed"

**Causas:**
- API key de Gemini/Stability inválida
- Rate limit excedido
- Network timeout

**Solución:**
```bash
# Verificar API keys en secrets
gh secret list | grep -i gemini
gh secret list | grep -i stability

# Reintentar manualmente
gh workflow run campaign-owner-acquisition.yml -f dry_run=true
```

### Error: "Template not found"

**Causas:**
- Nombre de template incorrecto
- Archivo no compila

**Solución:**
```bash
# Listar templates disponibles
bun run scripts/marketing/list-templates.ts

# Verificar compilación
bun build scripts/marketing/templates/owner-acquisition-templates.ts
```

### Error: "Database connection failed"

**Causas:**
- Supabase URL/key inválida
- RLS policies incorrectas
- Tabla no existe

**Solución:**
```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'marketing%';

-- Verificar RLS
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'marketing_campaigns';

-- Aplicar migraciones
supabase db push
```

### Error: "Campaign events not tracking"

**Causas:**
- UTM parameters no configurados
- Event tracking disabled
- Supabase event insert failing

**Solución:**
```typescript
// Verificar que los posts incluyan UTM
const url = new URL(cta);
url.searchParams.set('utm_source', 'facebook');
url.searchParams.set('utm_medium', 'post');
url.searchParams.set('utm_campaign', 'owner-acquisition-q1');
console.log(url.toString());

// Verificar eventos en BD
supabase
  .from('campaign_events')
  .select('*')
  .eq('campaign_id', 'owner-acq-001')
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Próximos Pasos

- [ ] Implementar influencer partnerships
- [ ] Crear referral program automático
- [ ] Integrar con Google Analytics 4
- [ ] Setup de pixel tracking (Facebook, TikTok)
- [ ] Reportes automáticos semanales
- [ ] Webhooks de notificación en Slack
- [ ] Dashboard en tiempo real

---

**Última actualización:** 2026-01-16
**Versión:** 1.0.0
**Autor:** AutoRenta Marketing Team

