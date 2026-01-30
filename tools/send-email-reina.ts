import nodemailer from 'nodemailer';
import * as fs from 'fs';

const videoPath = '/home/edu/autorenta/marketing/demos/byd-publication-demo.mp4';

// Verificar que el video existe
if (!fs.existsSync(videoPath)) {
  console.error('❌ Video no encontrado:', videoPath);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.GMAIL_USER,
  to: 'reinamosquera2003@gmail.com',
  subject: '🚗 AutoRenta - Mira lo fácil que es publicar tu auto',
  html: `
    <h2>¡Hola Reina! 👋</h2>

    <p>Te comparto un video demo de cómo funciona <strong>AutoRenta</strong>, la plataforma que te ayuda a generar ingresos con tu vehículo.</p>

    <h3>¿Qué es AutoRenta?</h3>
    <p>Es una app donde puedes <strong>alquilar tu auto a otras personas</strong> cuando no lo estés usando. Tú pones el precio, eliges a quién se lo alquilas, y nosotros nos encargamos de:</p>

    <ul>
      <li>✅ <strong>Verificar a los conductores</strong> (documentos, antecedentes)</li>
      <li>✅ <strong>Proteger tu auto</strong> con seguro incluido</li>
      <li>✅ <strong>Procesar los pagos</strong> de forma segura</li>
      <li>✅ <strong>Soporte 24/7</strong> en caso de cualquier problema</li>
    </ul>

    <h3>¿Cómo funciona?</h3>
    <p>En el video adjunto puedes ver lo simple que es publicar un auto:</p>
    <ol>
      <li>Seleccionas la marca y modelo de tu vehículo</li>
      <li>Subes unas fotos</li>
      <li>Pones tu precio por día</li>
      <li>¡Y listo! Ya estás ganando dinero 💰</li>
    </ol>

    <h3>Lo mejor</h3>
    <p>El video muestra un <strong>BYD Dolphin EV 2024</strong> - un auto eléctrico que se puede alquilar por <strong>R$ 45/día</strong>. Imagina ganar eso mientras tu auto está estacionado.</p>

    <p>Si tienes alguna pregunta, no dudes en escribirme. ¡Estamos para ayudarte!</p>

    <p>Un abrazo,<br>
    <strong>Equipo AutoRenta</strong> 🚗</p>
  `,
  attachments: [
    {
      filename: 'demo-publicar-auto.mp4',
      path: videoPath,
    },
  ],
};

console.log('📧 Enviando email a Reina (reinamosquera2003@gmail.com)...');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  console.log('✅ Email enviado:', info.response);
});
