/**
 * Seed de secuencias de email (bienvenida, re-engagement)
 *
 * Usage: bun scripts/seed-email-sequences.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Variables requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

interface SequenceStep {
  step_number: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  html_content: string;
}

// ============================================================================
// SECUENCIA: BIENVENIDA PROPIETARIOS
// ============================================================================
const WELCOME_OWNER_STEPS: SequenceStep[] = [
  {
    step_number: 1,
    delay_days: 0,
    delay_hours: 0,
    subject: "🚗 ¡Bienvenido a AutoRenta, {{first_name}}!",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">🚗 ¡Bienvenido a AutoRenta!</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">¡Hola <strong>{{first_name}}</strong>!</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Nos emociona que te hayas unido a la comunidad de propietarios de AutoRenta. Estás a un paso de empezar a generar ingresos con tu vehículo.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;"><strong>¿Qué sigue?</strong></p>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Completa tu perfil y verificación</li>
            <li>Registra tu primer vehículo</li>
            <li>Configura tu disponibilidad y precios</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Ir a mi Dashboard</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 2,
    delay_days: 1,
    delay_hours: 0,
    subject: "📸 Cómo tomar fotos que venden tu auto",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #3b82f6; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">📸 Tips para fotos profesionales</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Las fotos son lo primero que ven los arrendatarios. Aquí te compartimos algunos tips:</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 12px 0; color: #1e40af;"><strong>🌤️ Luz natural</strong><br><span style="color: #4b5563;">Fotografía tu auto en exteriores, preferiblemente por la mañana.</span></p>
            <p style="margin: 12px 0; color: #1e40af;"><strong>🧹 Limpieza</strong><br><span style="color: #4b5563;">Un auto limpio se alquila 3x más rápido.</span></p>
            <p style="margin: 12px 0; color: #1e40af;"><strong>📐 Ángulos</strong><br><span style="color: #4b5563;">Toma fotos de frente, laterales, trasera e interior.</span></p>
          </div>
          <p style="text-align: center;">
            <a href="https://autorentar.com/cars/new" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Registrar mi auto</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 3,
    delay_days: 3,
    delay_hours: 0,
    subject: "💰 Cuánto puedes ganar con tu auto",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #059669; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">💰 Potencial de ganancias</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, ¿sabías que nuestros propietarios más activos ganan hasta <strong>$800 USD mensuales</strong>?</p>
          <div style="background: #ecfdf5; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">PROMEDIO MENSUAL</p>
            <p style="margin: 8px 0; color: #047857; font-size: 42px; font-weight: 700;">$400 - $800</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">dependiendo del tipo de vehículo y ubicación</p>
          </div>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">La clave está en:</p>
          <ul style="color: #4b5563;">
            <li>Precios competitivos</li>
            <li>Disponibilidad consistente</li>
            <li>Respuestas rápidas a solicitudes</li>
          </ul>
          <p style="text-align: center;">
            <a href="https://autorentar.com/pricing-calculator" style="display: inline-block; padding: 14px 32px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Calcular mis ganancias</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 4,
    delay_days: 7,
    delay_hours: 0,
    subject: "🛡️ Cómo protegemos tu vehículo",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #7c3aed; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">🛡️ Tu auto está protegido</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, sabemos que confiar tu auto a desconocidos puede generar dudas. Por eso, AutoRenta incluye:</p>
          <div style="margin: 20px 0;">
            <div style="display: flex; align-items: start; margin-bottom: 16px;">
              <span style="font-size: 24px; margin-right: 12px;">✓</span>
              <div>
                <strong style="color: #374151;">Verificación de identidad</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0;">Todos los arrendatarios pasan por KYC con documento y selfie.</p>
              </div>
            </div>
            <div style="display: flex; align-items: start; margin-bottom: 16px;">
              <span style="font-size: 24px; margin-right: 12px;">✓</span>
              <div>
                <strong style="color: #374151;">Depósito de garantía</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0;">Pre-autorización en tarjeta del arrendatario.</p>
              </div>
            </div>
            <div style="display: flex; align-items: start; margin-bottom: 16px;">
              <span style="font-size: 24px; margin-right: 12px;">✓</span>
              <div>
                <strong style="color: #374151;">Inspección con video</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0;">Documentación del estado antes y después del alquiler.</p>
              </div>
            </div>
            <div style="display: flex; align-items: start;">
              <span style="font-size: 24px; margin-right: 12px;">✓</span>
              <div>
                <strong style="color: #374151;">Soporte 24/7</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0;">Estamos disponibles para cualquier emergencia.</p>
              </div>
            </div>
          </div>
          <p style="text-align: center;">
            <a href="https://autorentar.com/help/owner-protection" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Conocer más</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 5,
    delay_days: 14,
    delay_hours: 0,
    subject: "🎯 ¿Ya publicaste tu primer auto?",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">🎯 ¡Tu auto te está esperando!</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, notamos que aún no has publicado tu primer vehículo.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Entendemos que puede haber dudas. ¿Hay algo en lo que podamos ayudarte?</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 15px;"><strong>¿Necesitas ayuda?</strong> Agenda una llamada con nuestro equipo y te guiamos paso a paso.</p>
          </div>
          <p style="text-align: center;">
            <a href="https://autorentar.com/cars/new" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">Publicar mi auto</a>
            <a href="https://autorentar.com/help/contact" style="display: inline-block; padding: 14px 32px; background-color: white; color: #f59e0b; text-decoration: none; border-radius: 6px; font-weight: 600; border: 2px solid #f59e0b;">Hablar con soporte</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
];

// ============================================================================
// SECUENCIA: BIENVENIDA ARRENDATARIOS
// ============================================================================
const WELCOME_RENTER_STEPS: SequenceStep[] = [
  {
    step_number: 1,
    delay_days: 0,
    delay_hours: 0,
    subject: "🚗 ¡Bienvenido a AutoRenta, {{first_name}}!",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">🚗 ¡Bienvenido a AutoRenta!</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">¡Hola <strong>{{first_name}}</strong>!</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Gracias por unirte a AutoRenta. Ahora tienes acceso a cientos de vehículos en Ecuador, Argentina, Uruguay y Brasil.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;"><strong>¿Cómo funciona?</strong></p>
          <ol style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Busca el auto perfecto para tu viaje</li>
            <li>Reserva y paga de forma segura</li>
            <li>Recoge el auto y disfruta tu viaje</li>
          </ol>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/marketplace" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Explorar autos</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 2,
    delay_days: 2,
    delay_hours: 0,
    subject: "💳 Conoce la Billetera Virtual AutoRenta",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #10b981; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">💳 Billetera Virtual</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, ¿sabías que puedes alquilar autos sin tarjeta de crédito?</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Con la <strong>Billetera Virtual AutoRenta</strong> puedes:</p>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Recargar saldo desde cualquier método de pago</li>
            <li>Pagar alquileres sin necesidad de tarjeta de crédito</li>
            <li>Recibir reembolsos instantáneos</li>
          </ul>
          <p style="text-align: center;">
            <a href="https://autorentar.com/wallet" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Activar mi billetera</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 3,
    delay_days: 5,
    delay_hours: 0,
    subject: "🗺️ Los destinos más populares este mes",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #8b5cf6; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">🗺️ Destinos populares</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, ¿planeas un viaje pronto?</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Estos son los destinos más buscados este mes:</p>
          <div style="margin: 20px 0;">
            <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <strong style="color: #5b21b6;">🇪🇨 Ecuador:</strong> Quito, Guayaquil, Cuenca
            </div>
            <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <strong style="color: #5b21b6;">🇦🇷 Argentina:</strong> Buenos Aires, Mendoza, Córdoba
            </div>
            <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <strong style="color: #5b21b6;">🇺🇾 Uruguay:</strong> Montevideo, Punta del Este
            </div>
            <div style="background: #f5f3ff; padding: 16px; border-radius: 8px;">
              <strong style="color: #5b21b6;">🇧🇷 Brasil:</strong> São Paulo, Rio de Janeiro
            </div>
          </div>
          <p style="text-align: center;">
            <a href="https://autorentar.com/marketplace" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Buscar autos</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
];

// ============================================================================
// SECUENCIA: RE-ENGAGEMENT
// ============================================================================
const REENGAGEMENT_STEPS: SequenceStep[] = [
  {
    step_number: 1,
    delay_days: 0,
    delay_hours: 0,
    subject: "👋 Te extrañamos, {{first_name}}",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #ef4444; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">👋 ¡Te extrañamos!</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Ha pasado un tiempo desde tu última visita a AutoRenta. ¿Hay algo en lo que podamos ayudarte?</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Mientras no estabas, hemos añadido:</p>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Nuevos vehículos en tu zona</li>
            <li>Mejoras en la app</li>
            <li>Más opciones de pago</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com" style="display: inline-block; padding: 14px 32px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Volver a AutoRenta</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
  {
    step_number: 2,
    delay_days: 7,
    delay_hours: 0,
    subject: "🎁 Un incentivo especial para ti",
    html_content: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">🎁 Oferta especial</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">{{first_name}}, queremos verte de vuelta.</p>
          <div style="background: #fef3c7; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 600;">10% de descuento en tu próxima reserva</p>
            <p style="margin: 8px 0 0 0; color: #78350f; font-size: 32px; font-weight: 700;">VUELVE10</p>
          </div>
          <p style="color: #4b5563; font-size: 14px; text-align: center;">Válido por 7 días</p>
          <p style="text-align: center;">
            <a href="https://autorentar.com/marketplace?promo=VUELVE10" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Usar mi descuento</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  },
];

// ============================================================================
// MAIN
// ============================================================================
async function getSequenceId(slug: string): Promise<string | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/email_sequences?slug=eq.${slug}&select=id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const data = await response.json();
  return data[0]?.id || null;
}

async function insertSteps(sequenceId: string, steps: SequenceStep[]) {
  for (const step of steps) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/email_sequence_steps`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        sequence_id: sequenceId,
        ...step,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ⚠️ Error en paso ${step.step_number}: ${error}`);
    } else {
      console.log(`   ✅ Paso ${step.step_number}: ${step.subject.substring(0, 40)}...`);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("   Seed de Secuencias de Email");
  console.log("═══════════════════════════════════════\n");

  // Welcome Owner
  console.log("📧 Secuencia: Bienvenida Propietarios");
  const ownerSeqId = await getSequenceId("welcome-owner");
  if (ownerSeqId) {
    await insertSteps(ownerSeqId, WELCOME_OWNER_STEPS);
  } else {
    console.log("   ❌ Secuencia no encontrada");
  }

  // Welcome Renter
  console.log("\n📧 Secuencia: Bienvenida Arrendatarios");
  const renterSeqId = await getSequenceId("welcome-renter");
  if (renterSeqId) {
    await insertSteps(renterSeqId, WELCOME_RENTER_STEPS);
  } else {
    console.log("   ❌ Secuencia no encontrada");
  }

  // Re-engagement
  console.log("\n📧 Secuencia: Re-engagement");
  const reengSeqId = await getSequenceId("re-engagement");
  if (reengSeqId) {
    await insertSteps(reengSeqId, REENGAGEMENT_STEPS);
  } else {
    console.log("   ❌ Secuencia no encontrada");
  }

  console.log("\n✅ Seed completado");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
