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
        subject: "AutoRentar: Plataforma de movilidad P2P para LATAM",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>Getaround cerró operaciones en USA tras levantar USD 750M. Turo no anunció expansión a LATAM. <strong>La ventana para liderar movilidad P2P en la región está abierta</strong> — y nosotros ya estamos operando.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Invertir en AutoRentar
    </p>
    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      AutoRentar es la <strong>primera plataforma de alquiler de autos P2P en LATAM que no requiere tarjeta de crédito</strong>. Aceptamos MercadoPago, débito y transferencias — algo que <strong>ninguna rentadora en la región ofrece</strong>. El 70% de la población de LATAM no tiene tarjeta de crédito: ese es nuestro mercado.
    </p>
    <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      <strong>Modelo de revenue:</strong>
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>15% fee de plataforma</strong> sobre cada reserva</li>
      <li><strong>Gestión de flota fraccionada:</strong> EVs financiados por micro-inversores, operados por nosotros</li>
      <li><strong>Marketplace P2P:</strong> Dueños listan sus autos, nosotros gestionamos reservas + seguros</li>
    </ul>
    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      <strong>Lo que nadie más hizo en LATAM:</strong>
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li>🏆 <strong>Primera rentadora sin tarjeta de crédito</strong> — inclusión financiera real</li>
      <li>🏆 <strong>Primeros en fragmentar un activo físico (BYD) pagable desde billetera virtual</strong> — cualquier persona con MercadoPago puede ser dueño de una fracción de un auto eléctrico</li>
      <li>🏆 <strong>Verificación biométrica + inspecciones AI</strong> — seguridad sin fricción</li>
    </ul>
    <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      <strong>Estado actual:</strong> Plataforma live en producción, operación lista para escalar, pipeline activo de incorporación de oferta (BYD + dueños particulares) y demanda en CABA, con regulación favorable (CNV 1069, Jun 2025).
    </p>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del proyecto</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "inmobiliaria":
    case "family_office":
      return {
        subject: "Nuevo activo real con renta mensual — AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>Ustedes ya le ofrecen a sus inversores <strong>retorno en USD sobre activos tangibles</strong>. Nosotros tenemos un activo nuevo que complementa su portfolio: <strong>vehículos eléctricos operativos</strong> que generan renta mensual desde el día 1.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Co-inversión a nivel flota
    </p>
    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      A diferencia de la participación abierta fraccionada (ver abajo), ofrecemos a inversores institucionales y family offices:
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Inversión a nivel vehículo completo:</strong> USD $24,490 por unidad (vs $12.50 público)</li>
      <li><strong>Portfolio de 5-10 EVs:</strong> Diversificación dentro del mismo activo, diferentes choferes y rutas</li>
      <li><strong>Distribuciones mensuales:</strong> Proporcionales al neto operativo de cada vehículo</li>
      <li><strong>Transparencia total:</strong> KM verificados por OBD2, dashboard en tiempo real, KPIs mensuales</li>
      <li><strong>Regulación:</strong> CNV Resolución 1069 (Jun 2025) habilita activos reales tokenizados en Argentina</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del modelo</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "crowdfunding":
      return {
        subject: "Partnership: Activo real con renta mensual para su plataforma",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>Ustedes ya tienen la <strong>infraestructura de crowdfunding y la base de inversores</strong>. Nosotros tenemos la operación: una plataforma de movilidad con vehículos eléctricos, choferes verificados, y tecnología de tracking en tiempo real.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Campaña de crowdfunding conjunta
    </p>
    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      Buscamos un partner que nos provea la infraestructura de levantamiento de capital para escalar nuestra flota de EVs:
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>El activo:</strong> Vehículos eléctricos BYD que operan en Buenos Aires generando renta mensual</li>
      <li><strong>El roadmap:</strong> 1 → 10 → 30 → 100 vehículos en 24 meses</li>
      <li><strong>La regulación:</strong> CNV Resolución 1069 (Jun 2025) habilita tokenización de activos reales en Argentina</li>
      <li><strong>El modelo:</strong> Ustedes manejan la captación de inversores + compliance, nosotros operamos los autos y distribuimos retornos</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del proyecto</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "fintech":
      return {
        subject: "Partnership tecnológico: tokenización de activos reales — CNV 1069",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>La CNV aprobó la <strong>Resolución 1069 (Junio 2025)</strong>, el primer marco regulatorio de tokenización de activos reales (RWA) en Argentina. AutoRentar tiene un caso de uso listo para producción y buscamos partners tecnológicos.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Partnership de infraestructura
    </p>
    <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      Nosotros tenemos el activo (vehículos eléctricos operativos) y la operación (plataforma, choferes, tracking). Necesitamos:
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Tokenización ERC-3643:</strong> Capa de smart contracts para representar participaciones vehiculares</li>
      <li><strong>Compliance automatizado:</strong> KYC/AML para inversores bajo el marco CNV 1069</li>
      <li><strong>Payment rails:</strong> Ya integramos MercadoPago — buscamos complementar con crypto/stablecoins</li>
      <li><strong>Roadmap:</strong> 1 → 10 → 100 vehículos, cada uno un activo tokenizable independiente</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del proyecto</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "flota":
      return {
        subject: "Sumá BYD eléctricos a tu flota sin CAPEX",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar financia vehículos eléctricos BYD mediante <strong>inversores fraccionados</strong> — 2,000 personas ponen USD $12.50 cada uno para comprar el auto. <strong>El operador de flota gestiona el vehículo y cobra por la operación, sin poner capital.</strong></p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Sumá EVs a tu flota sin CAPEX
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Cero CAPEX:</strong> El vehículo está financiado por inversores</li>
      <li><strong>60-85% ahorro en energía:</strong> BYD eléctrico vs GNC/nafta</li>
      <li><strong>Más margen por km:</strong> Costo de carga $0.67-1.39/100km vs $3.50 GNC</li>
      <li><strong>Tecnología integrada:</strong> OBD2, geocerca, dashboard en tiempo real</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-flotas" style="color: #2563eb; font-weight: 600;">Ver la propuesta de partnership completa</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "turismo":
      return {
        subject: "Alquiler de autos para tus huéspedes — partnership AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar es una plataforma de alquiler de autos P2P que <strong>no requiere tarjeta de crédito</strong> — acepta débito, transferencias y MercadoPago. El 80% de los turistas argentinos no tiene tarjeta de crédito con cupo suficiente para el depósito tradicional de las rentadoras.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Partnership para ${lead.company}
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Comisión:</strong> Por cada reserva originada desde su plataforma/hotel</li>
      <li><strong>Cero inversión:</strong> No necesitan comprar autos ni gestionar flota</li>
      <li><strong>Integración digital:</strong> Link personalizado o API para reservas directas</li>
      <li><strong>Flota eléctrica:</strong> BYD Dolphin Mini disponibles en destinos turísticos</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-turismo" style="color: #2563eb; font-weight: 600;">Ver la propuesta de partnership completa</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "competidor":
      return {
        subject: "Sinergia en movilidad: AutoRentar + " + "su plataforma",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar opera un modelo de <strong>propiedad fraccionada de vehículos eléctricos</strong> para plataformas de movilidad. Creemos que hay una oportunidad de <strong>sinergia estratégica</strong> entre lo que ustedes construyeron y lo que nosotros aportamos.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Sinergia estratégica
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Financiamiento descentralizado:</strong> 2,000 micro-inversores financian cada vehículo</li>
      <li><strong>Flota eléctrica:</strong> BYD Dolphin Mini con 60-85% ahorro en energía</li>
      <li><strong>Plataforma tecnológica:</strong> Wallet, verificación biométrica, inspecciones AI, OBD2</li>
      <li><strong>Modelo escalable:</strong> Sin depender de capital propio para crecer la flota</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del proyecto</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "seguro":
      return {
        subject: "Seguro para flota eléctrica fraccionada — partnership",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar opera vehículos eléctricos BYD en Buenos Aires bajo un modelo de propiedad fraccionada. Cada auto tiene <strong>seguro todo riesgo obligatorio</strong> + un Fondo de Garantía complementario. Estamos buscando un partner asegurador digital para escalar la flota.</p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Seguro para flota EV fraccionada
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Roadmap:</strong> 1 → 10 → 30 → 100 vehículos en 24 meses</li>
      <li><strong>Perfil de riesgo:</strong> Choferes verificados, OBD2, geocerca, controles operativos</li>
      <li><strong>Integración:</strong> API-first, cotización y emisión automatizada</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-inversores" style="color: #2563eb; font-weight: 600;">Ver el deck completo del proyecto</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };

    case "concesionaria":
      return {
        subject: "Canal de venta para BYD: propiedad fraccionada AutoRentar",
        body: (lead) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.7; color: #1f2937;">
  <p>Estimados,</p>

  <p>Me llamo <strong>Eduardo Marques</strong>, fundador serial de <strong>AutoRentar</strong> (movilidad P2P), <strong>Ecucondor</strong> (pagos internacionales AR/BR/EC) y <strong>Autamedica</strong> (healthtech). Les escribo porque ${lead.note.toLowerCase()}.</p>

  <p>AutoRentar compra vehículos eléctricos BYD financiados por <strong>2,000 micro-inversores</strong>. Cada auto se fracciona en participaciones de USD $12.50. Nuestro roadmap incluye 10 autos en 6 meses y 100 en 24 meses. <strong>Necesitamos un proveedor de vehículos confiable.</strong></p>

  <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
      🚀 Propuesta 1 — Canal de venta BYD
    </p>
    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151; font-size: 14px;">
      <li><strong>Volumen:</strong> 10-100 BYD Dolphin Mini en 24 meses</li>
      <li><strong>Pago:</strong> Contado (los fragmentos se venden antes de la compra)</li>
      <li><strong>Servicio:</strong> Mantenimiento incluido en el acuerdo</li>
    </ul>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-concesionarias" style="color: #2563eb; font-weight: 600;">Ver la propuesta completa para concesionarias</a>
    </p>
  </div>

  ${signature()}
</div>`,
      };
  }
}

function bydFractionalPitch(): string {
  return `
  <div style="margin-top: 28px; padding: 20px; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #0891b2; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; letter-spacing: 0.5px;">
      ⚡ Propuesta 2 — Participación abierta desde USD $12.50
    </p>
    <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      Independientemente de lo anterior, quiero compartirles algo que estamos lanzando de forma pública: la <strong>primera ronda de propiedad fraccionada</strong> de un vehículo eléctrico BYD Dolphin Mini. Son 2,000 fragmentos de <strong>USD $12.50</strong> cada uno — cualquier persona puede participar directamente desde MercadoPago, sin tarjeta de crédito internacional ni trámites bancarios.
    </p>
    <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      El auto opera en Buenos Aires con choferes verificados de Uber, Cabify y DiDi, y genera distribuciones mensuales proporcionales al neto. Los escenarios proyectados: <strong>Conservador 8% · Base 14% · Optimista 19% anual</strong> — sin retorno garantizado, con costos 100% transparentes y KM verificados por OBD2.
    </p>
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
      👉 <a href="https://autorentar.com/pitch-byd-inversores" style="color: #0891b2; font-weight: 600;">Ver el modelo completo y simulador de escenarios</a>
    </p>
  </div>`;
}

function signature(): string {
  return `
  ${bydFractionalPitch()}
  <p style="margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    Saludos,<br><br>
    <strong>Eduardo Marques</strong><br>
    Fundador serial — <strong>AutoRentar</strong> (movilidad P2P) · <strong>Ecucondor</strong> (pagos AR/BR/EC) · <strong>Autamedica</strong> (healthtech)<br>
    Alumno, Universidad de Buenos Aires — Medicina<br>
    <a href="https://autorentar.com" style="color: #0891b2;">autorentar.com</a> |
    <a href="https://wa.me/5491166599559" style="color: #0891b2;">WhatsApp</a> |
    <a href="mailto:admin@autorentar.com" style="color: #0891b2;">admin@autorentar.com</a>
  </p>
  <p style="margin-top: 16px; font-size: 12px; color: #9ca3af; line-height: 1.5;">
    PD: Para cuidar la privacidad del grupo, si querés conversar respondeme en privado (sin "Responder a todos") o por <a href="https://wa.me/5491166599559" style="color: #9ca3af;">WhatsApp</a>.
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
