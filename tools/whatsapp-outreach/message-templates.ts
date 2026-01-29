/**
 * Templates de mensajes para WhatsApp Outreach - autorentar
 * Tono: Inspirador, cercano, sin mencionar competencia
 */

export interface Contact {
  firstName: string;
  lastName: string;
  fullName: string;
  city: string;
  province: string;
  phone: string;
  whatsappId: string;
  isAmba: boolean;
}

// Variantes del mensaje principal
export const MESSAGE_TEMPLATES = {
  // Template 1: Misión y pasión
  mision: (contact: Contact) => `Hola ${contact.firstName}!

Soy Eduardo. Estamos lanzando autorentar, una app de alquiler de autos entre personas.

Nuestra misión es simple: que los propietarios ganen más y los que alquilan paguen menos. Sin intermediarios que se queden con todo.

La franquicia la pagamos nosotros. Vos solo ponés tu auto a trabajar.

Estamos arrancando en ${contact.isAmba ? 'Buenos Aires' : contact.province} y me encantaría contarte más. ¿Te interesa?`,

  // Template 2: Propósito
  proposito: (contact: Contact) => `Hola ${contact.firstName}, cómo estás?

Te escribo porque estamos construyendo algo diferente: autorentar.

Creemos que tu auto puede generarte ingresos extras sin que pierdas el control. Sin sorpresas, sin letras chicas, sin comisiones abusivas.

No vamos a descansar hasta que alquilar tu auto sea tan simple como debería ser.

¿Te gustaría ser parte desde el inicio?

Eduardo - autorentar`,

  // Template 3: Comunidad
  comunidad: (contact: Contact) => `Hola ${contact.firstName}!

Estamos armando una comunidad de propietarios en ${contact.isAmba ? 'Buenos Aires' : contact.province} que creen en algo mejor.

autorentar nace de una idea simple: vos ponés el auto, nosotros ponemos la tecnología y la protección. La franquicia corre por nuestra cuenta.

Queremos que seas parte de los primeros. ¿Hablamos?

Eduardo`,

  // Template 4: Directo al beneficio
  beneficio: (contact: Contact) => `Hola ${contact.firstName}!

3 cosas que hacen diferente a autorentar:

1. Comisión justa del 15% (nosotros cubrimos la franquicia)
2. Cobrás en 24 horas, no en semanas
3. Vos decidís precio, disponibilidad y a quién le alquilás

Estamos lanzando en ${contact.isAmba ? 'Buenos Aires' : contact.province} y buscamos propietarios que quieran ganar más con su auto.

¿Te cuento cómo funciona?

Eduardo`,

  // Template 5: Historia personal
  historia: (contact: Contact) => `Hola ${contact.firstName}!

Soy Eduardo. Creamos autorentar porque estábamos cansados de ver cómo los propietarios perdían plata con comisiones altísimas y procesos complicados.

Decidimos que había que cambiarlo. Y no vamos a parar hasta lograrlo.

Si tenés un auto y querés hacerlo producir de verdad, me encantaría contarte qué estamos construyendo.

¿Tenés 2 minutos?`,
};

// Función para seleccionar template aleatorio
export function getRandomTemplate(contact: Contact): string {
  const templates = Object.values(MESSAGE_TEMPLATES);
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex](contact);
}

// Templates de seguimiento
export const FOLLOWUP_TEMPLATES = {
  // 3 días - suave
  dia3: (contact: Contact) => `Hola ${contact.firstName}!

Te escribí hace unos días sobre autorentar. Sé que estás ocupado/a, solo quería saber si pudiste ver el mensaje.

Estoy acá para cualquier duda. Un abrazo!

Eduardo`,

  // 7 días - valor
  dia7: (contact: Contact) => `Hola ${contact.firstName}!

Quería compartirte algo: los propietarios que ya se sumaron a autorentar en ${contact.isAmba ? 'Buenos Aires' : contact.province} están generando entre $150.000 y $300.000 extra por mes.

Si te interesa saber cómo, escribime. Si no es para vos, ningún problema, no te molesto más.

Abrazo!
Eduardo`,

  // 14 días - último
  dia14: (contact: Contact) => `Hola ${contact.firstName}!

Último mensaje, no quiero ser pesado.

Si en algún momento querés poner tu auto a trabajar con gente que realmente se preocupa por los propietarios, acá estamos.

Te deseo lo mejor!
Eduardo - autorentar`,

  // 60 días - reactivación
  dia60: (contact: Contact) => `Hola ${contact.firstName}! Tanto tiempo!

autorentar creció mucho desde la última vez que hablamos. Ya tenemos varios propietarios activos en ${contact.isAmba ? 'Buenos Aires' : contact.province} y la demanda está muy buena.

¿Seguís con ganas de generar ingresos con tu auto? Me encantaría ponerte al día.

Eduardo`,
};

// Respuestas a preguntas frecuentes
export const FAQ_RESPONSES = {
  comision: `La comisión de autorentar es 15% fijo.

Esto incluye TODO:
- La plataforma
- El Fondo de Garantía para daños menores
- La franquicia del seguro (la pagamos nosotros, no vos)

Sin sorpresas, sin costos ocultos.`,

  seguro: `En autorentar la protección funciona así:

1. Todo alquiler tiene cobertura automática
2. Los daños menores los cubre el Fondo de Garantía
3. La franquicia la pagamos nosotros, no el propietario
4. Para daños mayores, el arrendatario deja un depósito

Tu auto está protegido. Esa es nuestra promesa.`,

  pago: `El pago es súper simple:

1. El arrendatario paga al reservar
2. El dinero queda seguro hasta que termina el alquiler
3. A las 24hs de devolver el auto, te transferimos a tu MercadoPago

Nada de esperar semanas. Tu plata, rápido.`,

  como_empezar: `Arrancar es muy fácil:

1. Te registrás en la app (te paso el link)
2. Verificás tu identidad (foto DNI + selfie, 2 minutos)
3. Subís tu auto con fotos
4. Definís tu precio y cuándo está disponible

¡Y listo! Empezás a recibir solicitudes.

¿Te mando el link?`,

  franquicia: `La franquicia la pagamos nosotros, no vos.

Así es: si hay un siniestro y hay que pagar franquicia del seguro, autorentar se hace cargo.

Es parte de nuestro compromiso con los propietarios. Queremos que alquiles tranquilo, sin preocuparte por gastos sorpresa.`,
};
