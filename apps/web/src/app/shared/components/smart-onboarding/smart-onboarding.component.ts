
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '@core/services/auth/profile.service';

interface OnboardingQuestion {
  id: string;
  title: string;
  subtitle?: string;
  type: 'single' | 'multiple' | 'role' | 'location';
  options: Array<{
    value: string;
    label: string;
    icon?: string;
    description?: string;
  }>;
  required: boolean;
  conditional?: {
    dependsOn: string;
    value: string;
  };
}

@Component({
  standalone: true,
  selector: 'app-smart-onboarding',
  imports: [],
  templateUrl: './smart-onboarding.component.html',
  styleUrls: ['./smart-onboarding.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartOnboardingComponent implements OnInit {
  @Input() userRole?: string;
  @Output() completed = new EventEmitter<unknown>();

  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);

  readonly currentStep = signal(0);
  readonly loading = signal(false);
  readonly answers = signal<Record<string, string | string[]>>({});

  isOptionSelected(questionId: string, value: string): boolean {
    const answer = this.answers()[questionId];
    if (Array.isArray(answer)) {
      return answer.includes(value);
    }
    return answer === value;
  }

  readonly questions = signal<OnboardingQuestion[]>([
    {
      id: 'role',
      title: '¿Qué tipo de usuario sos?',
      subtitle: 'Esto nos ayuda a personalizar tu experiencia',
      type: 'role',
      required: true,
      options: [
        {
          value: 'locador',
          label: 'Locador',
          icon: '🚗',
          description: 'Tengo autos para alquilar',
        },
        {
          value: 'locatario',
          label: 'Locatario',
          icon: '🔍',
          description: 'Busco autos para alquilar',
        },
        {
          value: 'ambos',
          label: 'Ambos',
          icon: '🔄',
          description: 'Alquilo y busco autos',
        },
      ],
    },
    {
      id: 'location',
      title: '¿Dónde estás ubicado?',
      subtitle: 'Necesitamos saber tu ubicación para mostrarte opciones relevantes',
      type: 'location',
      required: true,
      options: [
        {
          value: 'montevideo',
          label: 'Montevideo',
          icon: '🏙️',
        },
        {
          value: 'punta_del_este',
          label: 'Punta del Este',
          icon: '🏖️',
        },
        {
          value: 'colonia',
          label: 'Colonia',
          icon: '🏰',
        },
        {
          value: 'otra',
          label: 'Otra ubicación',
          icon: '📍',
        },
      ],
    },
    {
      id: 'purpose',
      title: '¿Cuál es tu objetivo principal?',
      subtitle: 'Esto nos ayuda a mostrarte las mejores opciones',
      type: 'single',
      required: true,
      options: [
        {
          value: 'income',
          label: 'Generar ingresos',
          icon: '💰',
          description: 'Maximizar ganancias con mis autos',
        },
        {
          value: 'flexibility',
          label: 'Flexibilidad',
          icon: '🔄',
          description: 'Alquilar cuando no uso mis autos',
        },
        {
          value: 'convenience',
          label: 'Conveniencia',
          icon: '🚙',
          description: 'Necesito un auto cuando lo requiero',
        },
        {
          value: 'explore',
          label: 'Explorar opciones',
          icon: '🔍',
          description: 'Aún estoy evaluando qué hacer',
        },
      ],
    },
    {
      id: 'car_types',
      title: '¿Qué tipo de autos te interesan?',
      subtitle: 'Selecciona todas las opciones que apliquen',
      type: 'multiple',
      required: false,
      conditional: {
        dependsOn: 'role',
        value: 'locatario',
      },
      options: [
        {
          value: 'compact',
          label: 'Compactos',
          icon: '🚗',
          description: 'Pequeños y económicos',
        },
        {
          value: 'sedan',
          label: 'Sedanes',
          icon: '🚙',
          description: 'Cómodos para viajes largos',
        },
        {
          value: 'suv',
          label: 'SUVs',
          icon: '🚛',
          description: 'Espaciosos y versátiles',
        },
        {
          value: 'luxury',
          label: 'De lujo',
          icon: '🏎️',
          description: 'Autos deportivos y de lujo',
        },
        {
          value: 'electric',
          label: 'Eléctricos',
          icon: '⚡',
          description: 'Autos ecológicos y silenciosos',
        },
      ],
    },
    {
      id: 'rental_frequency',
      title: '¿Con qué frecuencia alquilas?',
      subtitle: 'Esto nos ayuda a personalizar recomendaciones',
      type: 'single',
      required: false,
      conditional: {
        dependsOn: 'role',
        value: 'locatario',
      },
      options: [
        {
          value: 'daily',
          label: 'Diariamente',
          icon: '📅',
          description: 'Necesito auto todos los días',
        },
        {
          value: 'weekly',
          label: 'Semanalmente',
          icon: '📊',
          description: 'Varias veces por semana',
        },
        {
          value: 'monthly',
          label: 'Mensualmente',
          icon: '📈',
          description: 'Ocasionalmente al mes',
        },
        {
          value: 'occasional',
          label: 'Ocasionalmente',
          icon: '🎯',
          description: 'Solo cuando lo necesito',
        },
      ],
    },
    {
      id: 'car_count',
      title: '¿Cuántos autos tienes para alquilar?',
      subtitle: 'Esto nos ayuda a optimizar tu experiencia',
      type: 'single',
      required: false,
      conditional: {
        dependsOn: 'role',
        value: 'locador',
      },
      options: [
        {
          value: '1',
          label: '1 auto',
          icon: '🚗',
        },
        {
          value: '2-3',
          label: '2-3 autos',
          icon: '🚗🚗',
        },
        {
          value: '4-5',
          label: '4-5 autos',
          icon: '🚗🚗🚗',
        },
        {
          value: '6+',
          label: 'Más de 6 autos',
          icon: '🏢',
          description: 'Tienes una flota',
        },
      ],
    },
  ]);

  readonly filteredQuestions = signal<OnboardingQuestion[]>([]);

  ngOnInit() {
    this.updateFilteredQuestions();
  }

  private updateFilteredQuestions() {
    const answers = this.answers();
    const filtered = this.questions().filter((question) => {
      if (!question.conditional) return true;

      const { dependsOn, value } = question.conditional;
      const answer = answers[dependsOn];
      return answer === value || answer === 'ambos'; // Para 'ambos', mostrar preguntas de ambos roles
    });

    this.filteredQuestions.set(filtered);
  }

  selectAnswer(questionId: string, value: string | string[]) {
    const currentAnswers = { ...this.answers() };
    currentAnswers[questionId] = value;
    this.answers.set(currentAnswers);

    // Actualizar preguntas filtradas si cambió el rol
    if (questionId === 'role') {
      this.updateFilteredQuestions();
    }
  }

  toggleMultipleAnswer(questionId: string, value: string) {
    const currentAnswers = { ...this.answers() };
    const currentValues = (currentAnswers[questionId] || []) as string[];

    if (currentValues.includes(value)) {
      // Remover valor
      currentAnswers[questionId] = currentValues.filter((v: string) => v !== value);
    } else {
      // Agregar valor
      currentAnswers[questionId] = [...currentValues, value];
    }

    this.answers.set(currentAnswers);
  }

  nextStep() {
    const currentQuestion = this.filteredQuestions()[this.currentStep()];
    if (!currentQuestion) return;

    // Validar respuesta requerida
    const answer = this.answers()[currentQuestion.id];
    if (currentQuestion.required && (!answer || (Array.isArray(answer) && answer.length === 0))) {
      return; // No avanzar si no hay respuesta
    }

    if (this.currentStep() < this.filteredQuestions().length - 1) {
      this.currentStep.update((step) => step + 1);
    } else {
      this.completeOnboarding();
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
    }
  }

  skipOnboarding() {
    this.completeOnboarding(true);
  }

  private async completeOnboarding(skipped = false) {
    this.loading.set(true);

    try {
      const onboardingData = {
        ...this.answers(),
        completed: !skipped,
        completedAt: new Date().toISOString(),
      };

      // Guardar preferencias en el perfil del usuario
      // Guardar datos de onboarding en metadata o en el perfil directamente
      // Por ahora solo marcamos como completo
      await this.profileService.completeOnboarding();

      // TODO: Guardar onboarding_data en metadata del perfil si se necesita

      this.completed.emit(onboardingData);

      // Redirigir basado en el rol
      const role = this.answers()['role'];
      if (role === 'locador' || role === 'ambos') {
        this.router.navigate(['/cars/publish']);
      } else {
        this.router.navigate(['/explore']);
      }
    } catch {
      console.error('Error completing onboarding');
      // Fallback: ir a home
      this.router.navigate(['/']);
    } finally {
      this.loading.set(false);
    }
  }

  getProgressPercentage(): number {
    if (this.filteredQuestions().length === 0) return 100;
    return Math.round(((this.currentStep() + 1) / this.filteredQuestions().length) * 100);
  }

  isAnswered(questionId: string): boolean {
    return !!this.answers()[questionId];
  }

  getCurrentQuestion(): OnboardingQuestion | undefined {
    return this.filteredQuestions()[this.currentStep()];
  }
}
