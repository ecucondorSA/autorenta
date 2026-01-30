import nodemailer from 'nodemailer';
import * as fs from 'fs';

const videoPath = '/home/edu/autorenta/marketing/demos/byd-iphone15-promax.mp4';

// Verificar que el video existe
if (!fs.existsSync(videoPath)) {
  console.error('❌ Video no encontrado:', videoPath);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // App Password, no la contraseña normal
  },
});

const mailOptions = {
  from: process.env.GMAIL_USER,
  to: 'ecucondor@gmail.com',
  subject: '🎬 Demo BYD AutoRenta - iPhone 15 Pro Max',
  html: `
    <h2>Demo de Publicación BYD en AutoRenta</h2>
    <p>Adjunto el video demo mostrando el flujo completo de publicación de un <strong>BYD Dolphin EV 2024</strong> en la plataforma AutoRenta.</p>
    <ul>
      <li>📱 Grabado en perfil iPhone 15 Pro Max</li>
      <li>📸 3 fotos generadas con Gemini AI</li>
      <li>🚗 Marca BYD agregada al sistema</li>
    </ul>
    <p>Saludos,<br>AutoRenta Team</p>
  `,
  attachments: [
    {
      filename: 'byd-demo-iphone15-promax.mp4',
      path: videoPath,
    },
  ],
};

console.log('📧 Enviando email a ecucondor@gmail.com...');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  console.log('✅ Email enviado:', info.response);
});
