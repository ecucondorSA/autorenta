/**
 * Script para enviar emails a inversores con One-Pagers adjuntos
 * Convierte HTML a PDF y envía emails personalizados
 */

import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(import.meta.dir, "../docs/investors");
const PDF_DIR = join(DOCS_DIR, "pdfs");

// Configuración de inversores
const INVESTORS = [
  {
    name: "Gabriela",
    fullName: "Gabriela Ruggeri",
    email: "gabriela@kamayventures.com",
    fund: "Kamay Ventures",
    htmlFile: "AutoRenta_OnePager_Kamay.html",
    pdfFile: "AutoRenta_OnePager_Kamay.pdf",
    focus: "su enfoque en startups de impacto en Argentina y la región",
  },
  {
    name: "Arjuna",
    fullName: "Arjuna Costa",
    email: "arjuna@flourishventures.com",
    fund: "Flourish Ventures",
    htmlFile: "AutoRenta_OnePager_Flourish.html",
    pdfFile: "AutoRenta_OnePager_Flourish.pdf",
    focus: "la misión de Flourish de construir un sistema financiero más justo e inclusivo",
  },
  {
    name: "José Luis",
    fullName: "José Luis Cimental",
    email: "jlcimental@angelhub.mx",
    fund: "AngelHub",
    htmlFile: "AutoRenta_OnePager_AngelHub.html",
    pdfFile: "AutoRenta_OnePager_AngelHub.pdf",
    focus: "el track record de AngelHub apoyando startups fintech en México y LATAM",
  },
];

// Template de email personalizado
function generateEmailHTML(investor: typeof INVESTORS[0]): string {
  return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #1f2937;">
  <p>Estimado/a ${investor.name},</p>

  <p>Mi nombre es <strong>Eduardo Marques</strong>, fundador de <strong>AutoRenta</strong>, la primera plataforma fintech de alquiler de autos en Latinoamérica que elimina la barrera de la tarjeta de crédito.</p>

  <p>Me dirijo a usted porque admiro ${investor.focus}, y creo que AutoRenta representa una oportunidad única de inversión alineada con esa visión.</p>

  <h3 style="color: #2563eb; margin-top: 24px;">El Problema</h3>
  <p>El 80% de la población latinoamericana no puede alquilar un auto porque las agencias tradicionales exigen tarjetas de crédito con cupos de +$1,500 USD como garantía. Esto excluye a millones de personas con capacidad de pago real.</p>

  <h3 style="color: #2563eb; margin-top: 24px;">Nuestra Solución</h3>
  <p>AutoRenta democratiza el acceso mediante:</p>
  <ul>
    <li><strong>Wallet propia:</strong> Aceptamos débito, transferencias y efectivo digital</li>
    <li><strong>Fondo de Garantía (FGO):</strong> Reemplaza los depósitos gigantes con una pequeña tasa de protección</li>
    <li><strong>Verificación biométrica con IA:</strong> Seguridad sin fricción</li>
  </ul>

  <h3 style="color: #2563eb; margin-top: 24px;">Tracción</h3>
  <ul>
    <li>+5,000 personas en lista de espera</li>
    <li>33 vehículos registrados</li>
    <li>159 reservas procesadas</li>
    <li>CAC < $1.50 USD</li>
  </ul>

  <h3 style="color: #2563eb; margin-top: 24px;">La Oportunidad</h3>
  <p>Buscamos <strong>$150k - $300k USD</strong> en nuestra ronda pre-seed para escalar en Argentina y expandir a México y Brasil.</p>

  <p>Adjunto encontrará nuestro One-Pager con más detalles. Me encantaría coordinar una llamada de 20 minutos para presentarle la oportunidad en detalle.</p>

  <p style="margin-top: 24px;">¿Tendría disponibilidad la próxima semana?</p>

  <p style="margin-top: 32px;">
    Saludos cordiales,<br><br>
    <strong>Eduardo Marques</strong><br>
    CEO & Co-founder, AutoRenta<br>
    <a href="https://autorentar.com" style="color: #2563eb;">autorentar.com</a> |
    <a href="https://ar.linkedin.com/in/eduardo-marques-b00739249" style="color: #2563eb;">LinkedIn</a><br>
    <a href="mailto:admin@autorentar.com" style="color: #2563eb;">admin@autorentar.com</a>
  </p>
</div>
  `.trim();
}

function generateEmailText(investor: typeof INVESTORS[0]): string {
  return `
Estimado/a ${investor.name},

Mi nombre es Eduardo Marques, fundador de AutoRenta, la primera plataforma fintech de alquiler de autos en Latinoamérica que elimina la barrera de la tarjeta de crédito.

Me dirijo a usted porque admiro ${investor.focus}, y creo que AutoRenta representa una oportunidad única de inversión alineada con esa visión.

EL PROBLEMA
El 80% de la población latinoamericana no puede alquilar un auto porque las agencias tradicionales exigen tarjetas de crédito con cupos de +$1,500 USD como garantía.

NUESTRA SOLUCIÓN
- Wallet propia: Aceptamos débito, transferencias y efectivo digital
- Fondo de Garantía (FGO): Reemplaza los depósitos gigantes
- Verificación biométrica con IA: Seguridad sin fricción

TRACCIÓN
- +5,000 personas en lista de espera
- 33 vehículos registrados
- 159 reservas procesadas
- CAC < $1.50 USD

LA OPORTUNIDAD
Buscamos $150k - $300k USD en nuestra ronda pre-seed.

Adjunto encontrará nuestro One-Pager. ¿Tendría disponibilidad para una llamada de 20 minutos la próxima semana?

Saludos cordiales,

Eduardo Marques
CEO & Co-founder, AutoRenta
https://autorentar.com
admin@autorentar.com
  `.trim();
}

async function convertHTMLtoPDF(htmlPath: string, pdfPath: string): Promise<void> {
  console.log(`📄 Convirtiendo ${htmlPath} a PDF...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const htmlContent = readFileSync(htmlPath, "utf-8");
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
  });

  await browser.close();
  console.log(`   ✅ PDF creado: ${pdfPath}`);
}

async function sendEmail(
  transporter: nodemailer.Transporter,
  investor: typeof INVESTORS[0],
  pdfPath: string
): Promise<void> {
  console.log(`📧 Enviando email a ${investor.fullName} (${investor.email})...`);

  const mailOptions = {
    from: `"Eduardo Marques - AutoRenta" <${process.env.GMAIL_USER}>`,
    to: investor.email,
    subject: `AutoRenta: Oportunidad de Inversión Pre-Seed - ${investor.fund}`,
    text: generateEmailText(investor),
    html: generateEmailHTML(investor),
    attachments: [
      {
        filename: `AutoRenta_OnePager_${investor.fund.replace(/\s+/g, "_")}.pdf`,
        path: pdfPath,
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`   ✅ Email enviado! Message ID: ${info.messageId}`);
}

async function main() {
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const DRY_RUN = process.argv.includes("--dry-run");
  const INVESTOR_FILTER = process.argv.find(arg => arg.startsWith("--investor="))?.split("=")[1];

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("❌ Error: Faltan GMAIL_USER y GMAIL_APP_PASSWORD");
    process.exit(1);
  }

  console.log("🚀 AutoRenta - Envío de Emails a Inversores\n");

  if (DRY_RUN) {
    console.log("⚠️  MODO DRY-RUN: No se enviarán emails reales\n");
  }

  // Crear directorio de PDFs si no existe
  if (!existsSync(PDF_DIR)) {
    mkdirSync(PDF_DIR, { recursive: true });
  }

  // Filtrar inversores si se especifica
  const investors = INVESTOR_FILTER
    ? INVESTORS.filter(i => i.name.toLowerCase().includes(INVESTOR_FILTER.toLowerCase()))
    : INVESTORS;

  if (investors.length === 0) {
    console.error("❌ No se encontraron inversores con ese filtro");
    process.exit(1);
  }

  console.log(`📋 Inversores a contactar: ${investors.map(i => i.name).join(", ")}\n`);

  // Paso 1: Convertir HTMLs a PDFs
  console.log("═".repeat(50));
  console.log("PASO 1: Generando PDFs");
  console.log("═".repeat(50));

  for (const investor of investors) {
    const htmlPath = join(DOCS_DIR, investor.htmlFile);
    const pdfPath = join(PDF_DIR, investor.pdfFile);

    if (!existsSync(htmlPath)) {
      console.error(`❌ No se encontró: ${htmlPath}`);
      process.exit(1);
    }

    await convertHTMLtoPDF(htmlPath, pdfPath);
  }

  // Paso 2: Enviar emails
  console.log("\n" + "═".repeat(50));
  console.log("PASO 2: Enviando Emails");
  console.log("═".repeat(50));

  if (DRY_RUN) {
    for (const investor of investors) {
      console.log(`\n📧 [DRY-RUN] Email para ${investor.fullName}:`);
      console.log(`   To: ${investor.email}`);
      console.log(`   Subject: AutoRenta: Oportunidad de Inversión Pre-Seed - ${investor.fund}`);
      console.log(`   Attachment: ${investor.pdfFile}`);
    }
    console.log("\n✅ Dry-run completado. Usa sin --dry-run para enviar realmente.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  for (const investor of investors) {
    const pdfPath = join(PDF_DIR, investor.pdfFile);
    await sendEmail(transporter, investor, pdfPath);
    // Esperar 2 segundos entre emails para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n" + "═".repeat(50));
  console.log("✅ COMPLETADO");
  console.log("═".repeat(50));
  console.log(`\n📊 Resumen:`);
  console.log(`   - Emails enviados: ${investors.length}`);
  console.log(`   - PDFs generados: ${investors.length}`);
  console.log(`\n📬 Los inversores recibirán los emails en sus bandejas de entrada.`);
}

main().catch(console.error);
