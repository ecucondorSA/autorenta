import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth/auth.service';
import { ReferralsService } from '@core/services/auth/referrals.service';

/**
 * Become Renter Page
 *
 * Página de onboarding para convertirse en Renter (propietario que renta su auto).
 * Similar al "Conviértete en anfitrión" de Airbnb.
 *
 * Features:
 * - Hero section con beneficios
 * - Calculadora de ingresos potenciales
 * - Proceso paso a paso
 * - Testimonios de Renters exitosos
 * - CTA para iniciar publicación
 * - Información del programa de referidos
 */
@Component({
  selector: 'app-become-renter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './become-renter.page.html',
  styleUrls: ['./become-renter.page.css'],
})
export class BecomeRenterPage implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly referralsService = inject(ReferralsService);

  // State
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly loading = signal(false);

  // Calculadora de ingresos
  readonly carValue = signal(50000); // Valor del auto en ARS (por defecto $50k)
  readonly daysPerMonth = signal(10); // Días rentados por mes
  readonly pricePerDay = signal(8000); // Precio por día en ARS

  // Computed: Ingresos mensuales estimados
  readonly estimatedMonthlyIncome = computed(() => {
    return this.daysPerMonth() * this.pricePerDay();
  });

  // Computed: Ingresos anuales
  readonly estimatedYearlyIncome = computed(() => {
    return this.estimatedMonthlyIncome() * 12;
  });

  // Computed: ROI aproximado
  readonly estimatedROI = computed(() => {
    const yearly = this.estimatedYearlyIncome();
    const carValueNum = this.carValue();
    if (carValueNum === 0) return 0;
    return (yearly / carValueNum) * 100;
  });

  // Testimonials
  readonly testimonials = [
    {
      name: 'María González',
      location: 'Buenos Aires',
      photo: '/assets/images/testimonials/maria.jpg',
      carBrand: 'Toyota Corolla 2020',
      earning: '$120,000/mes',
      quote:
        'Publicar mi auto en Autorentar fue la mejor decisión. Genero ingresos mientras no lo uso y los locatarios son muy cuidadosos.',
      rating: 5,
    },
    {
      name: 'Carlos Pérez',
      location: 'Córdoba',
      photo: '/assets/images/testimonials/carlos.jpg',
      carBrand: 'Volkswagen Gol 2019',
      earning: '$80,000/mes',
      quote:
        'El proceso es super simple. En 24 horas ya tenía mi auto publicado y recibí mi primera reserva en menos de una semana.',
      rating: 5,
    },
    {
      name: 'Laura Martínez',
      location: 'Rosario',
      photo: '/assets/images/testimonials/laura.jpg',
      carBrand: 'Chevrolet Onix 2021',
      earning: '$150,000/mes',
      quote:
        'Lo que más me gusta es la flexibilidad. Yo controlo cuándo mi auto está disponible y el precio. ¡Es como tener un ingreso pasivo!',
      rating: 5,
    },
  ];

  // Steps
  readonly steps = [
    {
      number: 1,
      title: 'Creá tu cuenta',
      description: 'Registrate gratis y completá tu perfil en minutos.',
      icon: 'pencil',
    },
    {
      number: 2,
      title: 'Publicá tu auto',
      description: 'Cargá fotos, detalles y configurá tu precio.',
      icon: 'camera',
    },
    {
      number: 3,
      title: 'Verificá tu identidad',
      description: 'Validamos tu identidad para seguridad de todos.',
      icon: 'checkmark',
    },
    {
      number: 4,
      title: 'Recibí reservas',
      description: 'Aprobá solicitudes y comenzá a generar ingresos.',
      icon: 'money-bag',
    },
  ];

  // Benefits
  readonly benefits = [
    {
      title: 'Ingresos extras',
      description: 'Generá entre $50,000 y $200,000 por mes según tu auto y disponibilidad.',
      icon: 'dollar-bill',
    },
    {
      title: 'Vos decidís',
      description: 'Controlás precios, disponibilidad y quién puede rentar tu auto.',
      icon: 'target',
    },
    {
      title: 'Seguro incluido',
      description: 'Todas las rentas están protegidas con seguro contra terceros.',
      icon: 'shield',
    },
    {
      title: 'Soporte 24/7',
      description: 'Nuestro equipo está disponible para ayudarte cuando lo necesites.',
      icon: 'handshake',
    },
    {
      title: 'Cobros automáticos',
      description: 'Recibís tu dinero directamente en tu wallet, sin complicaciones.',
      icon: 'lightning',
    },
    {
      title: 'Programa de referidos',
      description: 'Ganás bonos por invitar a otros propietarios a la plataforma.',
      icon: 'gift',
    },
  ];

  // FAQs
  readonly faqs = [
    {
      question: '¿Cuánto puedo ganar?',
      answer:
        'Los ingresos varían según el tipo de auto, ubicación y disponibilidad. En promedio, nuestros Renters ganan entre $50,000 y $200,000 por mes. Usá nuestra calculadora arriba para estimar tus ingresos.',
      open: false,
    },
    {
      question: '¿Qué pasa si mi auto se daña?',
      answer:
        'Todas las rentas incluyen seguro contra terceros. Si hay daños, el locatario es responsable hasta el monto de la franquicia. Además, validamos la identidad de todos los usuarios.',
      open: false,
    },
    {
      question: '¿Puedo cancelar una reserva?',
      answer:
        'Sí, podés cancelar reservas, pero te recomendamos hacerlo solo en casos necesarios. Las cancelaciones frecuentes pueden afectar tu reputación y visibilidad en la plataforma.',
      open: false,
    },
    {
      question: '¿Cuánto cobra Autorentar?',
      answer:
        'Cobramos una comisión del 15% sobre cada renta. Vos te quedás con el 85% de los ingresos. No hay cargos ocultos ni costos de publicación.',
      open: false,
    },
    {
      question: '¿Cómo funciona el programa de referidos?',
      answer:
        'Por cada amigo que invites y publique su auto, ganás $1,500 ARS en bonos. Tu amigo también recibe $500 ARS de bienvenida. ¡Es ganar-ganar!',
      open: false,
    },
  ];

  ngOnInit(): void {
    // Si está autenticado, pre-cargar su código de referidos
    if (this.isAuthenticated()) {
      this.referralsService.getOrCreateMyReferralCode().catch(() => {
        // Silently fail - not critical
      });
    }
  }

  /**
   * Toggle FAQ
   */
  toggleFAQ(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  /**
   * Scroll a sección
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Navegar a publicar auto (si está autenticado) o a login
   */
  startPublishing(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/cars/publish']);
    } else {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/cars/publish' },
      });
    }
  }

  /**
   * Navegar a referidos
   */
  goToReferrals(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/referrals']);
    } else {
      this.router.navigate(['/login'], {
        queryParams: { redirect: '/referrals' },
      });
    }
  }
}
