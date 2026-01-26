#!/usr/bin/env node
/**
 * Script para enviar emails de partnership a concesionarias brasileñas
 * Uso: node send-partnership-emails.js
 */

const nodemailer = require('nodemailer');

// Configuración
const CONFIG = {
  email: 'ecucondor@gmail.com',
  appPassword: 'vauw odwa xpcv etbj'.replace(/ /g, ''), // Sin espacios
  fromName: 'Autorentar'
};

// Lista de destinatarios
const RECIPIENTS = [
  { email: 'hfutilitarios@hotmail.com', name: 'HF Utilitários' },
  { email: 'nerymarion@hotmail.com', name: 'Nery Car' },
];

// Template del email
const EMAIL = {
  subject: 'Proposta parceria - Aluguel de veículos para argentinos',
  body: `Bom dia!

Sou da Autorentar (autorentar.com), plataforma de aluguel de carros com base em Buenos Aires.

Por qué los contacto:

Cada verano miles de argentinos viajan a Santa Catarina y necesitan auto. Nosotros ya tenemos ese público y buscamos un socio con flota en Brasil.

La propuesta:

• Ustedes ponen los vehículos
• Nosotros traemos los clientes argentinos
• Todo 100% digital

Precios y comisiones:

• Tarifa diaria en USD (dólares)
• Garantías en USD o BRL
  - Económico: USD 300 / BRL 1.500
  - SUV/Pickup: USD 800 / BRL 4.000
• Comisión Autorentar: 15% por reserva
• Sin costos fijos

Si les interesa, les doy acceso a la plataforma para que carguen un vehículo de prueba. Sin compromiso.

Saludos y felices fiestas!

Autorentar
+54 11 6656-5599 (WhatsApp)
autorentar.com`
};

// Crear transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: CONFIG.email,
    pass: CONFIG.appPassword
  }
});

async function sendEmail(recipient) {
  const mailOptions = {
    from: `"${CONFIG.fromName}" <${CONFIG.email}>`,
    to: recipient.email,
    subject: EMAIL.subject,
    text: EMAIL.body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Enviado a ${recipient.name} (${recipient.email}): ${info.messageId}`);
    return { success: true, recipient };
  } catch (error) {
    console.error(`❌ Error enviando a ${recipient.name}: ${error.message}`);
    return { success: false, recipient, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Autorentar - Envío de emails de partnership');
  console.log('='.repeat(50));
  console.log(`\nDestinatarios: ${RECIPIENTS.length}`);
  console.log(`Asunto: ${EMAIL.subject}\n`);

  const results = [];

  for (const recipient of RECIPIENTS) {
    const result = await sendEmail(recipient);
    results.push(result);
    // Esperar 2 segundos entre emails para evitar rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n' + '='.repeat(50));
  console.log('Resumen:');
  console.log(`  Enviados: ${results.filter(r => r.success).length}`);
  console.log(`  Fallidos: ${results.filter(r => !r.success).length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
