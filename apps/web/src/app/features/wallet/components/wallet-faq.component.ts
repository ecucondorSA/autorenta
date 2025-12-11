import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FaqItem {
  question: string;
  answer: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-wallet-faq',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-surface-raised dark:bg-surface-raised rounded-xl shadow-sm border border-border-default dark:border-border-muted p-6"
    >
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-text-primary dark:text-text-secondary mb-2">
          💡 Preguntas Frecuentes sobre Wallet AutoRenta
        </h2>
        <p class="text-sm text-text-secondary dark:text-text-secondary">
          Todo lo que necesitás saber sobre cómo funciona tu billetera virtual
        </p>
      </div>

      <!-- FAQ Items -->
      <div class="space-y-3">
        <div
          *ngFor="let item of faqItems(); let i = index"
          class="border border-border-default dark:border-border-muted rounded-lg overflow-hidden transition-all duration-200"
          [class.ring-2]="item.expanded"
          [class.ring-cta-default]="item.expanded"
        >
          <!-- Question -->
          <button
            type="button"
            (click)="toggleItem(i)"
            class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-border-default/20 dark:hover:bg-surface-base transition-colors duration-200"
          >
            <span class="font-semibold text-text-primary dark:text-text-secondary pr-4">
              {{ item.question }}
            </span>
            <svg
              class="w-5 h-5 text-cta-default flex-shrink-0 transition-transform duration-200"
              [class.rotate-180]="item.expanded"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Answer -->
          <div
            *ngIf="item.expanded"
            class="px-4 pb-4 pt-2 bg-border-default/10 dark:bg-surface-base/50 border-t border-border-default dark:border-border-muted"
          >
            <p
              class="text-sm text-text-secondary dark:text-text-secondary leading-relaxed"
              [innerHTML]="item.answer"
            ></p>
          </div>
        </div>
      </div>

      <!-- Additional Help -->
      <div
        class="mt-6 p-4 bg-cta-default/10 dark:bg-cta-default/20 border border-cta-default/40 dark:border-cta-default rounded-lg"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 text-cta-default dark:text-cta-default flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <div>
            <h3 class="font-semibold text-cta-default dark:text-cta-default mb-1">
              ¿Necesitás más ayuda?
            </h3>
            <p class="text-sm text-cta-default dark:text-cta-default">
              Contactá a nuestro equipo de soporte en
              <a href="mailto:autorentardev@gmail.com" class="underline hover:text-cta-default"
                >autorentardev&#64;gmail.com</a
              >
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WalletFaqComponent {
  readonly faqItems = signal<FaqItem[]>([
    {
      question: '¿Qué es la Wallet AutoRenta?',
      answer: `La Wallet AutoRenta es tu <strong>billetera virtual</strong> dentro de la plataforma. Te permite:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Recibir pagos como locador (propietario de autos)</li>
          <li>Pagar reservas sin tarjeta</li>
          <li>Mantener garantías reutilizables para futuras reservas</li>
          <li>Transferir fondos entre usuarios de AutoRenta</li>
        </ul>`,
      expanded: false,
    },
    {
      question: '¿Cómo cargo dinero en mi Wallet?',
      answer: `Podés cargar saldo de <strong>3 formas</strong>:
        <ul class="list-decimal list-inside mt-2 space-y-1">
          <li><strong>MercadoPago</strong>: Con tarjeta de crédito/débito (carga instantánea)</li>
          <li><strong>Transferencia bancaria</strong>: Desde tu cuenta bancaria (demora 24-48hs)</li>
          <li><strong>Efectivo</strong>: En puntos de pago habilitados (PagoFácil, RapiPago, etc.)</li>
        </ul>
        <p class="mt-2 text-xs text-warning-strong dark:text-warning-500">⚠️ Los fondos cargados en efectivo <strong>no son retirables</strong>, pero sí reutilizables para reservas.</p>`,
      expanded: false,
    },
    {
      question: '¿Cómo recibo pagos como locador?',
      answer: `Cuando alquilás tu auto, recibís el pago <strong>automáticamente en tu Wallet</strong>:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>85% del alquiler</strong> va directo a tu wallet (15% es comisión de plataforma)</li>
          <li>Los fondos se acreditan <strong>al finalizar la reserva</strong></li>
          <li>Podés retirar el dinero a tu cuenta bancaria o usarlo para tus propias reservas</li>
        </ul>`,
      expanded: false,
    },
    {
      question: '¿Qué es el "Crédito de Seguridad" y cómo funciona?',
      answer: `El <strong>Crédito de Seguridad</strong> es una garantía de <strong>US$ 600</strong> que se bloquea al hacer una reserva sin tarjeta:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Se bloquea en tu wallet pero <strong>NO se cobra</strong></li>
          <li>Si no hay daños, <strong>se libera automáticamente</strong> al terminar el alquiler</li>
          <li>Una vez liberado, <strong>queda disponible</strong> en tu wallet para futuras reservas</li>
          <li>Es <strong>reutilizable</strong>: no necesitás volver a cargarlo cada vez</li>
        </ul>
        <p class="mt-2 text-xs text-success-700 dark:text-success-strong">💡 <strong>Ventaja:</strong> Con US$ 600 en tu wallet, podés hacer reservas ilimitadas sin volver a cargar.</p>`,
      expanded: false,
    },
    {
      question: '¿Puedo retirar mi dinero de la Wallet?',
      answer: `<strong>Sí</strong>, podés retirar fondos con estas condiciones:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Retirables:</strong> Pagos recibidos como locador y cargas por transferencia/MercadoPago</li>
          <li><strong>NO retirables:</strong> Fondos cargados en efectivo (pero sí reutilizables en reservas)</li>
          <li><strong>Proceso:</strong> 2-5 días hábiles para transferencia a tu cuenta bancaria</li>
          <li><strong>Sin comisión</strong> por retiro</li>
        </ul>`,
      expanded: false,
    },
    {
      question: '¿Qué pasa si tengo fondos insuficientes?',
      answer: `Si tu wallet no tiene saldo suficiente para una reserva:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>La opción de pago con wallet aparecerá <strong>deshabilitada</strong></li>
          <li>Podés <strong>cargar más saldo</strong> desde la página de Wallet</li>
          <li>O elegir <strong>pagar con tarjeta</strong> (pre-autorización con MercadoPago)</li>
        </ul>
        <p class="mt-2"><strong>Monto necesario:</strong> Alquiler + US$ 600 de garantía</p>`,
      expanded: false,
    },
    {
      question: '¿Es segura la Wallet AutoRenta?',
      answer: `<strong>Absolutamente.</strong> Tu dinero está protegido:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Encriptación</strong> de extremo a extremo en todas las transacciones</li>
          <li><strong>MercadoPago</strong> como procesador de pagos certificado</li>
          <li><strong>Auditoría de saldos</strong> automática diaria</li>
          <li><strong>Protección contra fraude</strong> con monitoreo 24/7</li>
          <li><strong>Cumplimiento regulatorio</strong> con normativas financieras de Argentina</li>
        </ul>`,
      expanded: false,
    },
    {
      question: '¿Cuál es la diferencia entre pagar con Wallet vs. Tarjeta?',
      answer: `
        <table class="w-full text-xs mt-2 border-collapse" data-testid="wallet-table">
          <thead>
            <tr class="bg-border-default/30 dark:bg-surface-base">
              <th class="border border-border-default dark:border-border-muted px-3 py-2 text-left text-sm">Característica</th>
              <th class="border border-border-default dark:border-border-muted px-3 py-2 text-sm">Wallet</th>
              <th class="border border-border-default dark:border-border-muted px-3 py-2 text-sm">Tarjeta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-sm"><strong>Confirmación</strong></td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">⚡ Instantánea</td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">⏱️ 1-2 min</td>
            </tr>
            <tr class="bg-border-default/10 dark:bg-surface-base/30">
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-sm"><strong>Comisiones</strong></td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">✅ Sin comisiones</td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">➖ Según tu banco</td>
            </tr>
            <tr>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-sm"><strong>Garantía</strong></td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">♻️ Reutilizable</td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">🔒 Se libera post-alquiler</td>
            </tr>
            <tr class="bg-border-default/10 dark:bg-surface-base/30">
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-sm"><strong>Requisito</strong></td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">💰 Saldo previo</td>
              <td class="border border-border-default dark:border-border-muted px-3 py-2 text-center text-sm">💳 Tarjeta válida</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3 text-sm"><strong>Recomendación:</strong> Wallet ideal para locadores y usuarios frecuentes. Tarjeta para alquileres ocasionales.</p>`,
      expanded: false,
    },
    {
      question: '¿Puedo transferir dinero a otro usuario?',
      answer: `<strong>Sí</strong>, podés transferir fondos entre usuarios de AutoRenta:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Transferencias <strong>instantáneas y gratuitas</strong></li>
          <li>Solo necesitás el <strong>email o ID</strong> del destinatario</li>
          <li>Útil para <strong>compartir gastos</strong> de alquiler entre amigos</li>
          <li><strong>Sin límite</strong> de monto (sujeto a tu saldo disponible)</li>
        </ul>`,
      expanded: false,
    },
    {
      question: '¿Mi crédito AutoRenta tiene plazo de validez?',
      answer: `<strong>SÍ</strong>, el <strong>Crédito AutoRenta</strong> (bonificación inicial de $300) tiene validez de <strong>1 año</strong>:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Crédito AutoRenta ($300):</strong> Vence en 1 año desde la emisión</li>
          <li><strong>Renovación automática:</strong> Se extiende por 1 año más si completás 10+ reservas sin siniestros</li>
          <li><strong>Fondos regulares:</strong> Tus depósitos (MercadoPago, transferencia) NO vencen nunca</li>
          <li><strong>Garantía reutilizable ($600):</strong> Es parte de tus fondos regulares, NO vence</li>
        </ul>
        <p class="mt-2 text-xs text-cta-default dark:text-cta-default">💡 <strong>Tip:</strong> Mantener buen historial de conducción renueva automáticamente tu Crédito AutoRenta.</p>
        <p class="mt-2 text-xs text-warning-strong dark:text-warning-500">⚠️ <strong>Importante:</strong> Solo el Crédito AutoRenta (bonificación) vence. Tus depósitos regulares permanecen indefinidamente.</p>`,
      expanded: false,
    },
    {
      question: 'Si tengo un siniestro, ¿cuánto pagaré el próximo año?',
      answer: `Depende de la <strong>severidad</strong> y <strong>culpabilidad</strong> del siniestro:
        <p class="mt-2 font-semibold">Siniestros CON culpa tuya:</p>
        <ul class="list-disc list-inside space-y-1">
          <li><strong>Leve</strong> (rayón, espejo): Clase +1 → Fee +5%, Garantía +10% (≈ +$15 USD en alquiler $100)</li>
          <li><strong>Moderado</strong> (abolladura, parabrisas): Clase +2 → Fee +10%, Garantía +20% (≈ +$30 USD)</li>
          <li><strong>Grave</strong> (daño estructural): Clase +3 → Fee +15%, Garantía +40% (≈ +$55 USD)</li>
        </ul>
        <p class="mt-2"><strong>Siniestros SIN culpa tuya:</strong> NO afectan tu clase ni tus precios. ✅</p>
        <p class="mt-2 text-xs text-cta-default dark:text-cta-default">💡 <strong>Buena noticia:</strong> El siniestro se cubre primero con tu Crédito de Protección ($300 USD), luego tu wallet, y por último pago externo.</p>
        <p class="mt-2 text-xs text-success-700 dark:text-success-strong">🛡️ <strong>Protector de Bonus:</strong> Podés comprar un "Protector" ($15-$45) que previene el aumento de clase en 1-3 siniestros.</p>`,
      expanded: false,
    },
    {
      question: '¿Cómo diferencia AutoRenta buenos de malos conductores?',
      answer: `AutoRenta usa <strong>3 sistemas independientes</strong> para evaluar conductores de forma objetiva:
        <p class="mt-2"><strong>1. Clase de Riesgo (0-10):</strong></p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>Clase 0-2 (🏆 Excelente):</strong> Descuentos hasta 25% en garantía</li>
          <li><strong>Clase 5 (➖ Base):</strong> Sin historial, precio estándar</li>
          <li><strong>Clase 8-10 (🔴 Alto riesgo):</strong> Recargos hasta 80%</li>
        </ul>
        <p class="mt-2"><strong>2. Score Telemático (0-100):</strong></p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>GPS + acelerómetro miden tu conducción real</li>
          <li>Penaliza: frenadas bruscas, excesos de velocidad, zonas de riesgo</li>
          <li>Ajuste adicional de ±5% en fee</li>
        </ul>
        <p class="mt-2"><strong>3. Historial de Reservas Limpias:</strong></p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Porcentaje de reservas sin incidentes</li>
          <li>Requerido 80%+ para renovación de beneficios</li>
        </ul>
        <p class="mt-2 text-xs text-success-700 dark:text-success-strong">✅ <strong>Transparencia total:</strong> Podés ver tu historial completo, badges de desempeño y progreso hacia mejor clase.</p>`,
      expanded: false,
    },
    {
      question: '¿Hay sistema de bonus o recompensas por buen comportamiento?',
      answer: `<strong>¡SÍ!</strong> AutoRenta premia a los buenos conductores con un sistema de bonus robusto:
        <p class="mt-2"><strong>🎁 Bonus Automáticos:</strong></p>
        <ul class="list-disc list-inside space-y-1">
          <li><strong>Crédito de Protección inicial:</strong> $300 USD para cubrir siniestros (se carga a tu cuenta)</li>
          <li><strong>Renovación cada 10 reservas:</strong> +$300 USD adicionales sin siniestros</li>
          <li><strong>Mejora anual de clase:</strong> -1 clase cada año sin siniestros (hasta llegar a clase 0)</li>
          <li><strong>Descuentos progresivos:</strong> Hasta -15% en fee y -25% en garantía para clase 0</li>
        </ul>
        <p class="mt-2"><strong>🛡️ Bonus Comprables:</strong></p>
        <ul class="list-disc list-inside space-y-1">
          <li><strong>Protector de Bonus Nivel 1:</strong> $15 USD (protege 1 siniestro)</li>
          <li><strong>Protector de Bonus Nivel 2:</strong> $30 USD (protege 2 siniestros)</li>
          <li><strong>Protector de Bonus Nivel 3:</strong> $45 USD (protege 3 siniestros)</li>
        </ul>
        <p class="mt-2 text-xs text-cta-default dark:text-cta-default">💡 <strong>Ejemplo:</strong> Clase 0 + alquiler $100 = <strong>ahorros de $40 USD</strong> por viaje (fee -$15 + garantía -$25).</p>
        <p class="mt-2 text-xs text-success-700 dark:text-success-strong">🏆 <strong>Gamificación:</strong> Badges visuales, mensajes motivacionales, y progreso visible hacia tu próxima mejora de clase.</p>`,
      expanded: false,
    },
    {
      question: '¿Qué pasa con mis $300 USD si tengo 1 siniestro y soy culpable?',
      answer: `El Crédito de Protección <strong>NO se pierde todo</strong> - solo se consume <strong>lo que cuesta el daño</strong>:
        <p class="mt-2"><strong>💰 Consumo del Crédito:</strong></p>
        <table class="w-full text-xs mt-2 border-collapse" data-testid="wallet-table">
          <thead>
            <tr class="bg-border-default/30 dark:bg-surface-base">
              <th class="border border-border-default dark:border-border-muted px-2 py-1">Daño</th>
              <th class="border border-border-default dark:border-border-muted px-2 py-1">CP Usado</th>
              <th class="border border-border-default dark:border-border-muted px-2 py-1">CP Restante</th>
              <th class="border border-border-default dark:border-border-muted px-2 py-1">Pagás de tu bolsillo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$100</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$100</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-success-strong">✅ $200</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-success-strong">$0</td>
            </tr>
            <tr class="bg-border-default/10 dark:bg-surface-base/30">
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$250</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$250</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-warning-strong">⚠️ $50</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-success-strong">$0</td>
            </tr>
            <tr>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$400</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center">$300</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-error-strong">❌ $0</td>
              <td class="border border-border-default dark:border-border-muted px-2 py-1 text-center text-error-strong">$100</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-2"><strong>❌ Lo que SÍ perdés (y es grave):</strong></p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li><strong>Renovación gratuita:</strong> Necesitás 10 reservas sin siniestros para recuperarla</li>
          <li><strong>Clase aumenta:</strong> +1 (leve), +2 (moderado) o +3 (grave) → futuras rentas más caras</li>
          <li><strong>Ejemplo:</strong> Clase 5→6 = próximo alquiler +$25 USD extra</li>
        </ul>
        <p class="mt-2"><strong>✅ Lo que SÍ conservás:</strong></p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>El CP restante sigue válido hasta vencimiento original</li>
          <li>Podés usarlo en futuros siniestros</li>
          <li>Tu wallet no se afecta</li>
        </ul>
        <p class="mt-2 text-xs text-cta-default dark:text-cta-default">💡 <strong>Tip:</strong> El costo REAL de un siniestro con culpa no es perder el CP, sino perder descuentos y renovación automática.</p>
        <p class="mt-2 text-xs text-success-700 dark:text-success-strong">🛡️ <strong>Protector de Bonus:</strong> Compralo antes ($15-$45) para que tu clase NO aumente aunque tengas siniestro.</p>`,
      expanded: false,
    },
    {
      question: '¿Qué pasa con mi garantía si hay daños en el auto?',
      answer: `Si hay daños durante tu alquiler:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>El locador <strong>reporta el daño</strong> con fotos y descripción</li>
          <li>AutoRenta <strong>evalúa el caso</strong> (24-48hs)</li>
          <li>Si se confirma el daño, <strong>se descuenta de tu garantía</strong></li>
          <li>El saldo restante <strong>se libera a tu wallet</strong></li>
        </ul>
        <p class="mt-2"><strong>Coberturas:</strong> Hasta US$ 1.000 por daños/robo, US$ 1.500 por vuelco (según el vehículo)</p>`,
      expanded: false,
    },
  ]);

  toggleItem(index: number): void {
    this.faqItems.update((items) =>
      items.map((item, i) => ({
        ...item,
        expanded: i === index ? !item.expanded : item.expanded,
      })),
    );
  }
}
