import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'ecucondor@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendEmail() {
  const mailOptions = {
    from: 'ECUCÓNDOR 🇪🇨🇦🇷 <ecucondor@gmail.com>',
    to: 'Reinamosquera2003@gmail.com',
    subject: '🏆 PREMIOS COMUNIDAD ECUATORIANA 2026 - ¡Salieron los resultados!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(90deg, #FFD700, #004990); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🇪🇨 🏆 🇦🇷</h1>
          <h2 style="color: white; margin: 10px 0;">PREMIOS COMUNIDAD ECUATORIANA</h2>
        </div>
        <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <p>¡Hola!</p>
          <p>Te compartimos los <strong>PREMIOS de nuestra Comunidad Ecuatoriana en Argentina</strong> - Edición 2026.</p>
          <p>📊 <strong>Datos destacados:</strong></p>
          <ul>
            <li>50,000+ mensajes analizados</li>
            <li>5,000+ miembros activos</li>
            <li>20+ grupos de la comunidad</li>
          </ul>
          <p>🏆 <strong>Categorías:</strong></p>
          <ul>
            <li>Chef Ecuatoriano del Año</li>
            <li>Colaborador Solidario</li>
            <li>Influencer Más Activo</li>
            <li>Profesional Destacado</li>
            <li>Comida Más Pedida</li>
            <li>Grupo Más Activo</li>
            <li>Y más...</li>
          </ul>
          <p>¡Descarga el PDF adjunto para ver todos los resultados! 📄</p>
          <br>
          <p style="color: #666;">Juntos somos más fuertes 🇪🇨❤️🇦🇷</p>
          <p><strong>ECUCÓNDOR</strong></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'Premios-Comunidad-Ecuatoriana-2026.pdf',
        path: './output/premios-comunidad-ecuatoriana-2026.pdf'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente!');
    console.log('Message ID:', info.messageId);
    console.log('To:', mailOptions.to);
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    process.exit(1);
  }
}

sendEmail();
