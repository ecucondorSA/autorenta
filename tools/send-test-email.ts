/**
 * Script para enviar email de prueba via Gmail
 * Uso: GMAIL_USER=x GMAIL_APP_PASSWORD=y bun tools/send-test-email.ts [destinatario]
 */

const nodemailer = await import("nodemailer").catch(() => null);

if (!nodemailer) {
  console.log("Instalando nodemailer...");
  await Bun.$`bun add nodemailer`;
  console.log("Ejecuta el script de nuevo.");
  process.exit(0);
}

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const DESTINATARIO = process.argv[2] || "admin@autorentar.com";

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("Error: Faltan variables de entorno GMAIL_USER y GMAIL_APP_PASSWORD");
  process.exit(1);
}

const transporter = nodemailer.default.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: GMAIL_USER,
  to: DESTINATARIO,
  subject: "Test AutoRenta - Email Corporativo",
  text: `Este es un email de prueba para verificar que ${DESTINATARIO} funciona correctamente.\n\nSi recibes este mensaje, Cloudflare Email Routing está configurado correctamente.\n\n- AutoRenta Team`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #2563eb;">Test AutoRenta</h2>
      <p>Este es un email de prueba para verificar que <strong>${DESTINATARIO}</strong> funciona correctamente.</p>
      <p>Si recibes este mensaje, Cloudflare Email Routing está configurado correctamente.</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px;">- AutoRenta Team</p>
    </div>
  `,
};

console.log(`Enviando email de prueba a ${DESTINATARIO}...`);

try {
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email enviado exitosamente!`);
  console.log(`   Message ID: ${info.messageId}`);
  console.log(`\n📬 Revisa tu bandeja de entrada en ${DESTINATARIO}`);
} catch (error) {
  console.error("❌ Error enviando email:", error);
  process.exit(1);
}
