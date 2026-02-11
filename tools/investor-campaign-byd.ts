/**
 * AutoRentar — Campaña de Email Outreach BYD
 * 40+ leads organizados por vertical con templates diferenciados
 *
 * Uso:
 *   bun tools/investor-campaign-byd.ts --dry-run
 *   bun tools/investor-campaign-byd.ts --dry-run --tier=1
 *   bun tools/investor-campaign-byd.ts --dry-run --vertical=vc
 *   bun tools/investor-campaign-byd.ts --dry-run --company=kaszek
 *   bun tools/investor-campaign-byd.ts --tier=1
 *
 * Requiere: GMAIL_USER + GMAIL_APP_PASSWORD en env
 */

import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

// ============================================================
// TYPES
// ============================================================

type Vertical =
  | "vc"
  | "inmobiliaria"
  | "crowdfunding"
  | "fintech"
  | "flota"
  | "turismo"
  | "concesionaria"
  | "family_office"
  | "seguro"
  | "competidor";

type Tier = 1 | 2;

interface Lead {
  name: string;
  email: string;
  company: string;
  vertical: Vertical;
  tier: Tier;
  note: string;
}

interface CampaignLogEntry {
  company: string;
  email: string;
  vertical: Vertical;
  tier: Tier;
  subject: string;
  status: "sent" | "failed" | "dry-run";
  messageId?: string;
  error?: string;
  timestamp: string;
}

// ============================================================
// LEAD DATABASE
// ============================================================

const LEADS: Lead[] = [
  // ── TIER 1: Contactar esta semana ──
  {
    name: "Murchison Ventures",
    email: "info@murchisonventures.com.ar",
    company: "Murchison Ventures",
    vertical: "vc",
    tier: 1,
    note: "Construyen ecosistema movilidad LATAM, invierten en MyKeego + Kavak",
  },
  {
    name: "Jose Trusso",
    email: "jose@autonomy.com.ar",
    company: "Autonomy",
    vertical: "competidor",
    tier: 1,
    note: "Mismo modelo (comprar auto, alquilarlo), USD 10M raised",
  },
  {
    name: "DeRentas",
    email: "info@derentas.io",
    company: "DeRentas",
    vertical: "competidor",
    tier: 1,
    note: "3,500+ autos, competidor directo - merger = dominancia",
  },
  {
    name: "Crowdium",
    email: "hola@crowdium.com.ar",
    company: "Crowdium",
    vertical: "crowdfunding",
    tier: 1,
    note: "200K usuarios, infraestructura de fideicomiso lista",
  },
  {
    name: "Bricksave",
    email: "sales@bricksave.com",
    company: "Bricksave",
    vertical: "crowdfunding",
    tier: 1,
    note: 'Vende "retorno USD en activos reales" a inversores argentinos',
  },
  {
    name: "Kaszek Ventures",
    email: "pitch@kaszek.com",
    company: "Kaszek Ventures",
    vertical: "vc",
    tier: 1,
    note: "Mayor VC de LATAM, invirtieron en Kavak",
  },
  {
    name: "FAEVYT",
    email: "info@faevyt.org.ar",
    company: "FAEVYT",
    vertical: "turismo",
    tier: 1,
    note: "Acceso a 1,800+ agencias de viajes en un solo deal",
  },
  {
    name: "Javier Schrager",
    email: "info@adduntia.com",
    company: "Adduntia Family Office",
    vertical: "family_office",
    tier: 1,
    note: "Inversiones alternativas para HNWI, Javier Schrager CEO",
  },

  // ── TIER 2: Inmobiliarias ──
  {
    name: "Sumar Inversion",
    email: "info@sumarinversion.com.ar",
    company: "Sumar Inversion",
    vertical: "inmobiliaria",
    tier: 2,
    note: 'Ya tiene producto "renting", perfil inversor identico',
  },
  {
    name: "Spazios",
    email: "info@spazios.com.ar",
    company: "Spazios",
    vertical: "inmobiliaria",
    tier: 2,
    note: "#1 desarrolladora BA, volumen masivo de pozo",
  },
  {
    name: "KUAN",
    email: "info@kuansa.com.ar",
    company: "KUAN",
    vertical: "inmobiliaria",
    tier: 2,
    note: 'Foco explicito en "maximo retorno para inversores"',
  },
  {
    name: "Gustavo Menayed",
    email: "comercial@grupoportland.com",
    company: "Grupo Portland",
    vertical: "inmobiliaria",
    tier: 2,
    note: "Innovadores, Gustavo Menayed CEO",
  },
  {
    name: "Federico Gagliardo",
    email: "ventas@vitriumcapital.com",
    company: "Vitrium Capital",
    vertical: "inmobiliaria",
    tier: 2,
    note: "Multi-pais, Federico Gagliardo fundador",
  },
  {
    name: "Consultatio",
    email: "info@consultatio.com.ar",
    company: "Consultatio",
    vertical: "inmobiliaria",
    tier: 2,
    note: "Nordelta, inversores high-net-worth",
  },
  {
    name: "TGLT",
    email: "ventas@tglt.com",
    company: "TGLT",
    vertical: "inmobiliaria",
    tier: 2,
    note: "600K m2, cotiza en bolsa",
  },
  {
    name: "Grupo Briones",
    email: "calidad@grupobriones.com.ar",
    company: "Grupo Briones",
    vertical: "inmobiliaria",
    tier: 2,
    note: "Ya enviado pitch anterior",
  },

  // ── TIER 2: Fintech / VC / Tokenizacion ──
  {
    name: "NXTP Ventures",
    email: "info@nxtp.vc",
    company: "NXTP Ventures",
    vertical: "vc",
    tier: 2,
    note: "Premier VC B2B LATAM, USD 500K-5M",
  },
  {
    name: "Galicia Ventures",
    email: "contacto@galicia-ventures.com.ar",
    company: "Galicia Ventures",
    vertical: "vc",
    tier: 2,
    note: "CVC de banco Galicia, fintech",
  },
  {
    name: "Draper Cygnus",
    email: "info@cygnusvc.com",
    company: "Draper Cygnus",
    vertical: "vc",
    tier: 2,
    note: "Red Draper global, USD 50M+ fondo",
  },
  {
    name: "Mariano Mayer",
    email: "info@newtopia.vc",
    company: "Newtopia VC",
    vertical: "vc",
    tier: 2,
    note: "Mariano Mayer = presidente ARCAP",
  },
  {
    name: "DAppsFactory",
    email: "info@dappsfactory.io",
    company: "DAppsFactory",
    vertical: "fintech",
    tier: 2,
    note: "Tokenizacion ERC-3643, sandbox CNV",
  },
  {
    name: "Matias Fermin",
    email: "matias.fermin@camarafintech.org",
    company: "Camara Fintech",
    vertical: "fintech",
    tier: 2,
    note: "Gateway a 300+ fintechs",
  },
  {
    name: "Endeavor Argentina",
    email: "scaleup@endeavor.org.ar",
    company: "Endeavor Argentina",
    vertical: "vc",
    tier: 2,
    note: "Sello de credibilidad + red inversores",
  },

  // ── TIER 2: Flotas y Movilidad ──
  {
    name: "RDA Mobility / Keko",
    email: "info@kekoapp.co",
    company: "RDA Mobility",
    vertical: "flota",
    tier: 2,
    note: "12K+ vehiculos, ya en carsharing",
  },
  {
    name: "AutoCorp",
    email: "info@autocorp.com.ar",
    company: "AutoCorp",
    vertical: "flota",
    tier: 2,
    note: "Flotas corporativas ociosas fines de semana",
  },
  {
    name: "Localiza Argentina",
    email: "reservas@localiza.com.ar",
    company: "Localiza Argentina",
    vertical: "flota",
    tier: 2,
    note: "Mayor rental LATAM, modelo franquicia",
  },
  {
    name: "iunigo",
    email: "hola@iunigo.com",
    company: "iunigo (San Cristobal)",
    vertical: "seguro",
    tier: 2,
    note: "Seguro 100% digital, API-ready",
  },
  {
    name: "RiskGroup",
    email: "info@riskgroup.com.ar",
    company: "RiskGroup",
    vertical: "seguro",
    tier: 2,
    note: "Broker digital multi-aseguradora",
  },
  {
    name: "Taraborelli",
    email: "info@taraborellirentacar.com",
    company: "Taraborelli",
    vertical: "flota",
    tier: 2,
    note: "40 años, presencia fisica BA+Bariloche",
  },

  // ── TIER 2: Turismo y Hospitality ──
  {
    name: "OLA Mayorista",
    email: "contacto@ola.com.ar",
    company: "OLA Mayorista",
    vertical: "turismo",
    tier: 2,
    note: "Distribuye a 3,000+ agencias",
  },
  {
    name: "Amerian Hoteles",
    email: "info@amerian.com",
    company: "Amerian Hoteles",
    vertical: "turismo",
    tier: 2,
    note: "23 hoteles en destinos turisticos",
  },
  {
    name: "Rochester Hotels",
    email: "eventos@rochester-hotel.com",
    company: "Rochester Hotels",
    vertical: "turismo",
    tier: 2,
    note: "Patagonia = alta demanda de autos",
  },
  {
    name: "HOSTY Rental",
    email: "info@hostyrental.com",
    company: "HOSTY Rental",
    vertical: "turismo",
    tier: 2,
    note: "Admin de Airbnb, acceso directo a turistas",
  },
  {
    name: "BA Rent",
    email: "info@barent.com.ar",
    company: "BA Rent",
    vertical: "turismo",
    tier: 2,
    note: "Alquiler temporario BA",
  },
  {
    name: "4TOURISTS MICE",
    email: "consultas@4tourists.com.ar",
    company: "4TOURISTS MICE",
    vertical: "turismo",
    tier: 2,
    note: "Turismo corporativo",
  },
  {
    name: "Casa Campus",
    email: "info@casacampus.com",
    company: "Casa Campus",
    vertical: "turismo",
    tier: 2,
    note: "Mayor coliving LATAM, digital nomads",
  },
  {
    name: "AHTRA",
    email: "info@ahtra.com.ar",
    company: "AHTRA",
    vertical: "turismo",
    tier: 2,
    note: "Asociacion hoteles de toda Argentina",
  },

  // ── TIER 2: Concesionarias ──
  {
    name: "Grupo Quijada",
    email: "info@grupoquijada.com.ar",
    company: "Grupo Quijada",
    vertical: "concesionaria",
    tier: 2,
    note: "BMW, Chevrolet, Avec, Cordoba",
  },
  {
    name: "Euro Import",
    email: "conformidade@automob.com.br",
    company: "Euro Import",
    vertical: "concesionaria",
    tier: 2,
    note: "20 concesionarias premium Brasil",
  },
];

// ============================================================
// PITCH DECK MAPPING (HTML → vertical)
// ============================================================

const PRESENTATIONS_DIR = join(import.meta.dir, "presentations");
const PDF_CACHE_DIR = join(import.meta.dir, "campaign-pdfs");

function getPitchFile(vertical: Vertical): string {
  switch (vertical) {
    case "flota":
      return "pitch-flotas.html";
    case "turismo":
      return "pitch-turismo.html";
    case "concesionaria":
      return "pitch-concesionarias.html";
    default:
      return "pitch-byd-inversores.html";
  }
}

function getPdfName(vertical: Vertical): string {
  switch (vertical) {
    case "flota":
      return "AutoRentar_Partnership_Flotas.pdf";
    case "turismo":
      return "AutoRentar_Partnership_Turismo.pdf";
    case "concesionaria":
      return "AutoRentar_Partnership_Concesionarias.pdf";
    default:
      return "AutoRentar_BYD_Propiedad_Fraccionada.pdf";
  }
}

// ============================================================
// EMAIL TEMPLATES POR VERTICAL
// ============================================================

interface EmailTemplate {
  subject: string;
  body: (lead: Lead) => string;
}

function getTemplate(vertical: Vertical): EmailTemplate {
  switch (vertical) {
    case "vc":
      return {
        subject: "AutoRentar: Propiedad fraccionada de EVs en LATAM",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>Getaround cerró operaciones en USA tras levantar USD 750M. Turo no anunció expansión a LATAM. <strong>La ventana para liderar movilidad P2P en la región está abierta.</strong></p>

  <p>AutoRentar opera un modelo de <strong>propiedad fraccionada de vehículos eléctricos</strong> (BYD Dolphin Mini) donde 2,000 inversores participan desde USD $12.50 por fragmento. El auto opera en Buenos Aires con choferes de Uber/Cabify, generando distribuciones mensuales proporcionales al neto.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">Por qué ahora</h3>
  <ul>
    <li><strong>CNV Resolución 1069 (Jun 2025):</strong> Primer marco regulatorio de tokenización de activos reales en Argentina</li>
    <li><strong>Mercado validado:</strong> +400 autos en plataformas de alquiler para apps solo en CABA, +10,000 choferes registrados</li>
    <li><strong>Ventaja eléctrica:</strong> 60-85% ahorro en energía vs GNC → más margen → mejor retorno</li>
  </ul>

  <p>Adjunto el deck con el modelo completo, escenarios y unit economics. Me encantaría coordinar 20 minutos para presentarles la oportunidad.</p>

  ${signature()}
</div>`,
      };

    case "inmobiliaria":
    case "family_office":
      return {
        // TODO(human): Escribir el subject y body para la vertical inmobiliaria/family office
        // Este template es el más importante porque estos inversores ya piensan en "yield sobre activos reales"
        // pero necesitan entender por qué un auto eléctrico es comparable a un departamento en pozo
        subject: "Activos reales con renta desde USD $12.50 — AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <!-- TODO(human): Completar el hook y body para inmobiliarias -->
  <!-- La idea es conectar "yield sobre activos reales" (que ellos ya venden con departamentos)
       con "participación fraccionada en vehículos eléctricos que generan renta mensual".
       Puntos clave:
       - Sus inversores ya buscan retorno en USD sobre activos tangibles
       - Un BYD operando genera distribuciones mensuales (no hay que esperar 24 meses de obra)
       - Desde USD $12.50 por MercadoPago (democratización radical vs mínimo de pozo)
       - Escenarios: Conservador 8%, Base 14%, Optimista 19% anual
       - No es retorno garantizado, son escenarios reales con costos transparentes
  -->

  <p>Adjunto el deck con el modelo completo. Me encantaría coordinar una llamada breve para explorar sinergias.</p>

  ${signature()}
</div>`,
      };

    case "crowdfunding":
      return {
        subject: "Partnership: Infraestructura de crowdfunding para flota EV",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>Ustedes ya tienen la <strong>infraestructura de crowdfunding y la base de inversores</strong>. Nosotros tenemos un <strong>activo real que genera renta mensual</strong>: un BYD Dolphin Mini eléctrico que opera en Buenos Aires con choferes de apps de movilidad.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">La propuesta</h3>
  <ul>
    <li><strong>El activo:</strong> BYD Dolphin Mini EV, USD $24,490, fraccionado en 2,000 participaciones de $12.50</li>
    <li><strong>La operación:</strong> El auto se alquila a choferes verificados que operan Uber/Cabify/DiDi</li>
    <li><strong>La distribución:</strong> 60% del neto mensual al pool de inversores, proporcional a participaciones</li>
    <li><strong>Escenarios:</strong> Conservador 8% · Base 14% · Optimista 19% anual</li>
  </ul>

  <p>La CNV aprobó la Resolución 1069 (Jun 2025) habilitando tokenización de activos reales. <strong>Esto es un producto financiero legal hoy en Argentina.</strong></p>

  <p>Adjunto el deck completo. ¿Podríamos coordinar una llamada para explorar cómo integrar este activo en su plataforma?</p>

  ${signature()}
</div>`,
      };

    case "fintech":
      return {
        subject: "Tokenización de flota vehicular — Resolución CNV 1069",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>La CNV aprobó la <strong>Resolución 1069 (Junio 2025)</strong>, el primer marco regulatorio de tokenización de activos reales (RWA) en Argentina. AutoRentar tiene un caso de uso listo para producción: <strong>propiedad fraccionada de vehículos eléctricos</strong>.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">El producto</h3>
  <ul>
    <li><strong>Activo:</strong> BYD Dolphin Mini EV (USD $24,490) fraccionado en 2,000 participaciones</li>
    <li><strong>Ticket:</strong> Desde USD $12.50 por MercadoPago</li>
    <li><strong>Renta:</strong> Distribuciones mensuales del neto operativo (chofer de apps)</li>
    <li><strong>Transparencia:</strong> KM verificados por OBD2, KPIs públicos mensuales</li>
  </ul>

  <p>Buscamos partners tecnológicos para la capa de tokenización ERC-3643 y compliance. ¿Podríamos coordinar una llamada?</p>

  ${signature()}
</div>`,
      };

    case "flota":
      return {
        subject: "Sumá BYD eléctricos a tu flota sin CAPEX",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar financia vehículos eléctricos BYD mediante <strong>inversores fraccionados</strong> — 2,000 personas ponen USD $12.50 cada uno para comprar el auto. <strong>El operador de flota gestiona el vehículo y cobra por la operación, sin poner capital.</strong></p>

  <h3 style="color: #0891b2; margin-top: 20px;">Ventajas para el operador</h3>
  <ul>
    <li><strong>Cero CAPEX:</strong> El vehículo está financiado por inversores</li>
    <li><strong>60-85% ahorro en energía:</strong> BYD eléctrico vs GNC/nafta</li>
    <li><strong>Más margen por km:</strong> Costo de carga $0.67-1.39/100km vs $3.50 GNC</li>
    <li><strong>Tecnología integrada:</strong> OBD2, geocerca, dashboard en tiempo real</li>
  </ul>

  <p>Adjunto la propuesta de partnership. ¿Podríamos agendar una llamada para explorar la integración con su flota?</p>

  ${signature()}
</div>`,
      };

    case "turismo":
      return {
        subject: "Alquiler de autos para tus huéspedes — partnership AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar es una plataforma de alquiler de autos P2P que <strong>no requiere tarjeta de crédito</strong> — acepta débito, transferencias y MercadoPago. El 80% de los turistas argentinos no tiene tarjeta de crédito con cupo suficiente para el depósito tradicional de las rentadoras.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">Partnership para ${lead.company}</h3>
  <ul>
    <li><strong>Comisión:</strong> Por cada reserva originada desde su plataforma/hotel</li>
    <li><strong>Cero inversión:</strong> No necesitan comprar autos ni gestionar flota</li>
    <li><strong>Integración digital:</strong> Link personalizado o API para reservas directas</li>
    <li><strong>Flota eléctrica:</strong> BYD Dolphin Mini disponibles en destinos turísticos</li>
  </ul>

  <p>Adjunto la propuesta. ¿Les interesaría una llamada para explorar la integración?</p>

  ${signature()}
</div>`,
      };

    case "competidor":
      return {
        subject: "Sinergia en movilidad: AutoRentar + " + "su plataforma",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar opera un modelo de <strong>propiedad fraccionada de vehículos eléctricos</strong> para plataformas de movilidad. Creemos que hay una oportunidad de <strong>sinergia estratégica</strong> entre lo que ustedes construyeron y lo que nosotros aportamos.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">Lo que traemos</h3>
  <ul>
    <li><strong>Financiamiento descentralizado:</strong> 2,000 micro-inversores financian cada vehículo</li>
    <li><strong>Flota eléctrica:</strong> BYD Dolphin Mini con 60-85% ahorro en energía</li>
    <li><strong>Plataforma tecnológica:</strong> Wallet, verificación biométrica, inspecciones AI, OBD2</li>
    <li><strong>Modelo escalable:</strong> Sin depender de capital propio para crecer la flota</li>
  </ul>

  <p>Adjunto el deck. ¿Tendría sentido explorar una conversación?</p>

  ${signature()}
</div>`,
      };

    case "seguro":
      return {
        subject: "Seguro para flota eléctrica fraccionada — partnership",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar opera vehículos eléctricos BYD en Buenos Aires bajo un modelo de propiedad fraccionada. Cada auto tiene <strong>seguro todo riesgo obligatorio</strong> + un Fondo de Garantía complementario. Estamos buscando un partner asegurador digital para escalar la flota.</p>

  <h3 style="color: #0891b2; margin-top: 20px;">Oportunidad</h3>
  <ul>
    <li><strong>Roadmap:</strong> 1 → 10 → 30 → 100 vehículos en 24 meses</li>
    <li><strong>Perfil de riesgo:</strong> Choferes verificados, OBD2, geocerca, controles operativos</li>
    <li><strong>Integración:</strong> API-first, cotización y emisión automatizada</li>
  </ul>

  <p>¿Podríamos agendar una llamada para explorar un producto de seguro para flota EV?</p>

  ${signature()}
</div>`,
      };

    case "concesionaria":
      return {
        subject: "Canal de venta para BYD: propiedad fraccionada AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador de <strong>AutoRentar</strong>. Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar compra vehículos eléctricos BYD financiados por <strong>2,000 micro-inversores</strong>. Cada auto se fracciona en participaciones de USD $12.50. Nuestro roadmap incluye 10 autos en 6 meses y 100 en 24 meses. <strong>Necesitamos un proveedor de vehículos confiable.</strong></p>

  <h3 style="color: #0891b2; margin-top: 20px;">Propuesta</h3>
  <ul>
    <li><strong>Volumen:</strong> 10-100 BYD Dolphin Mini en 24 meses</li>
    <li><strong>Pago:</strong> Contado (los fragmentos se venden antes de la compra)</li>
    <li><strong>Servicio:</strong> Mantenimiento incluido en el acuerdo</li>
  </ul>

  <p>Adjunto el deck del proyecto. ¿Podríamos coordinar una reunión?</p>

  ${signature()}
</div>`,
      };
  }
}

function signature(): string {
  return `
  <p style="margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    Saludos,<br><br>
    <strong>Eduardo Marques</strong><br>
    Fundador, AutoRentar<br>
    Alumno, Universidad de Buenos Aires — Medicina<br>
    <a href="https://autorentar.com" style="color: #0891b2;">autorentar.com</a> |
    <a href="https://wa.me/5491166599559" style="color: #0891b2;">WhatsApp</a> |
    <a href="mailto:adm@autorentar.com" style="color: #0891b2;">adm@autorentar.com</a>
  </p>`;
}

// ============================================================
// PDF GENERATION (cached per vertical)
// ============================================================

const pdfCache = new Map<string, string>();

async function getPdf(vertical: Vertical): Promise<string> {
  const pitchFile = getPitchFile(vertical);
  if (pdfCache.has(pitchFile)) return pdfCache.get(pitchFile)!;

  if (!existsSync(PDF_CACHE_DIR)) mkdirSync(PDF_CACHE_DIR, { recursive: true });

  const htmlPath = join(PRESENTATIONS_DIR, pitchFile);
  const pdfPath = join(PDF_CACHE_DIR, getPdfName(vertical));

  if (!existsSync(htmlPath)) {
    console.error(`  ❌ Pitch no encontrado: ${htmlPath}`);
    process.exit(1);
  }

  console.log(`  📄 Generando PDF: ${pitchFile} → ${getPdfName(vertical)}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const htmlContent = readFileSync(htmlPath, "utf-8");
  await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 30000 });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
  });

  await browser.close();
  pdfCache.set(pitchFile, pdfPath);
  console.log(`  ✅ PDF listo: ${pdfPath}`);
  return pdfPath;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const DRY_RUN = args.includes("--dry-run");
  const tierFilter = args.find((a) => a.startsWith("--tier="))?.split("=")[1];
  const verticalFilter = args.find((a) => a.startsWith("--vertical="))?.split("=")[1];
  const companyFilter = args.find((a) => a.startsWith("--company="))?.split("=")[1];

  console.log("⚡ AutoRentar — Campaña BYD Investor Outreach\n");
  if (DRY_RUN) console.log("🔒 MODO DRY-RUN: No se enviarán emails reales\n");

  // Filter leads
  let leads = [...LEADS];
  if (tierFilter) leads = leads.filter((l) => l.tier === parseInt(tierFilter));
  if (verticalFilter) leads = leads.filter((l) => l.vertical === verticalFilter);
  if (companyFilter) leads = leads.filter((l) => l.company.toLowerCase().includes(companyFilter.toLowerCase()));

  if (leads.length === 0) {
    console.error("❌ No se encontraron leads con esos filtros");
    process.exit(1);
  }

  // Summary
  const byVertical = new Map<string, number>();
  for (const l of leads) byVertical.set(l.vertical, (byVertical.get(l.vertical) || 0) + 1);

  console.log(`📋 ${leads.length} leads seleccionados:`);
  for (const [v, count] of [...byVertical.entries()].sort()) {
    console.log(`   ${v}: ${count}`);
  }
  console.log();

  // Generate PDFs (only unique verticals needed)
  const uniqueVerticals = [...new Set(leads.map((l) => l.vertical))];
  if (!DRY_RUN) {
    console.log("═".repeat(50));
    console.log("PASO 1: Generando PDFs por vertical");
    console.log("═".repeat(50));
    for (const v of uniqueVerticals) {
      await getPdf(v as Vertical);
    }
    console.log();
  }

  // Send emails
  console.log("═".repeat(50));
  console.log(DRY_RUN ? "PREVIEW: Emails a enviar" : "PASO 2: Enviando emails");
  console.log("═".repeat(50));

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!DRY_RUN && (!GMAIL_USER || !GMAIL_APP_PASSWORD)) {
    console.error("❌ Faltan GMAIL_USER y GMAIL_APP_PASSWORD en environment");
    process.exit(1);
  }

  const transporter = DRY_RUN
    ? null
    : nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });

  const log: CampaignLogEntry[] = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const template = getTemplate(lead.vertical);
    const subject = template.subject.includes("su plataforma")
      ? template.subject.replace("su plataforma", lead.company)
      : template.subject;

    console.log(`\n[${i + 1}/${leads.length}] ${lead.company} (${lead.vertical}, tier ${lead.tier})`);
    console.log(`  To: ${lead.email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Attachment: ${getPdfName(lead.vertical)}`);

    if (DRY_RUN) {
      log.push({
        company: lead.company,
        email: lead.email,
        vertical: lead.vertical,
        tier: lead.tier,
        subject,
        status: "dry-run",
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      const pdfPath = await getPdf(lead.vertical);
      const html = template.body(lead);

      const info = await transporter!.sendMail({
        from: `"Eduardo Marques — AutoRentar" <${GMAIL_USER}>`,
        to: lead.email,
        subject,
        html,
        attachments: [{ filename: getPdfName(lead.vertical), path: pdfPath }],
      });

      console.log(`  ✅ Enviado: ${info.messageId}`);
      log.push({
        company: lead.company,
        email: lead.email,
        vertical: lead.vertical,
        tier: lead.tier,
        subject,
        status: "sent",
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Error: ${errorMsg}`);
      log.push({
        company: lead.company,
        email: lead.email,
        vertical: lead.vertical,
        tier: lead.tier,
        subject,
        status: "failed",
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    }

    // Rate limit: 3s between sends
    if (i < leads.length - 1 && !DRY_RUN) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Write campaign log
  const logFile = join(import.meta.dir, `campaign-log-${new Date().toISOString().split("T")[0]}.json`);
  writeFileSync(logFile, JSON.stringify(log, null, 2));

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("RESUMEN");
  console.log("═".repeat(50));
  const sent = log.filter((l) => l.status === "sent").length;
  const failed = log.filter((l) => l.status === "failed").length;
  const dryRun = log.filter((l) => l.status === "dry-run").length;
  console.log(`  Total: ${log.length}`);
  if (sent > 0) console.log(`  ✅ Enviados: ${sent}`);
  if (failed > 0) console.log(`  ❌ Fallidos: ${failed}`);
  if (dryRun > 0) console.log(`  🔒 Dry-run: ${dryRun}`);
  console.log(`  📄 Log: ${logFile}`);
}

main().catch(console.error);
