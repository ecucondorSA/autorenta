import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Services
import { BookingsService } from '../../../core/services/bookings.service';
import { CarsService } from '../../../core/services/cars.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationsService } from '../../../core/services/user-notifications.service';
import { WalletService } from '../../../core/services/wallet.service';

// Models
import type { Booking, Car } from '../../../core/models';

// Utils
import { getCarImageUrl } from '../../utils/car-placeholder.util';

interface DashboardStats {
  activeBookings: number;
  pendingBookings: number;
  totalEarnings: number;
  availableCars: number;
  rentedCars: number;
  walletBalance: number;
  unreadNotifications: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  priority: number;
}

@Component({
  standalone: true,
  selector: 'app-personalized-dashboard',
  imports: [CommonModule],
  templateUrl: './personalized-dashboard.component.html',
  styleUrls: ['./personalized-dashboard.component.css'],
})
export class PersonalizedDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly notificationsService = inject(NotificationsService);

  // Estado reactivo
  readonly userRole = signal<'owner' | 'renter' | 'both' | null>(null);
  readonly userName = signal<string>('');
  readonly loading = signal(true);
  readonly stats = signal<DashboardStats>({
    activeBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0,
    availableCars: 0,
    rentedCars: 0,
    walletBalance: 0,
    unreadNotifications: 0,
  });

  readonly recentCars = signal<Car[]>([]);
  readonly recentBookings = signal<Booking[]>([]);

  // Acciones rápidas basadas en rol
  readonly quickActions = computed<QuickAction[]>(() => {
    const role = this.userRole();

    const actions: QuickAction[] = [
      // Acciones comunes
      {
        id: 'notifications',
        title: 'Notificaciones',
        description: `${this.stats().unreadNotifications} sin leer`,
        icon: '🔔',
        route: '/notifications',
        color: 'bg-cta-default',
        priority: 1,
      },
      {
        id: 'wallet',
        title: 'Mi Wallet',
        description: `$${this.stats().walletBalance.toLocaleString()} ARS`,
        icon: '💰',
        route: '/wallet',
        color: 'bg-success-light',
        priority: 2,
      },
    ];

    // Acciones específicas por rol
    if (role === 'owner' || role === 'both') {
      actions.push(
        {
          id: 'publish-car',
          title: 'Publicar Auto',
          description: 'Gana dinero alquilando',
          icon: '🚗',
          route: '/cars/publish',
          color: 'bg-purple-500',
          priority: 3,
        },
        {
          id: 'my-cars',
          title: 'Mis Autos',
          description: `${this.stats().availableCars} publicados`,
          icon: '🏢',
          route: '/cars/my',
          color: 'bg-cta-default',
          priority: 4,
        },
        {
          id: 'owner-bookings',
          title: 'Reservas Recibidas',
          description: `${this.stats().pendingBookings} pendientes`,
          icon: '📅',
          route: '/bookings/owner',
          color: 'bg-warning-light',
          priority: 5,
        },
      );
    }

    if (role === 'renter' || role === 'both') {
      actions.push(
        {
          id: 'find-car',
          title: 'Buscar Auto',
          description: 'Encuentra el ideal',
          icon: '🔍',
          route: '/cars',
          color: 'bg-cta-default',
          priority: 3,
        },
        {
          id: 'my-bookings',
          title: 'Mis Reservas',
          description: `${this.stats().activeBookings} activas`,
          icon: '📋',
          route: '/bookings',
          color: 'bg-success-light',
          priority: 4,
        },
      );
    }

    // Ordenar por prioridad
    return actions.sort((a, b) => a.priority - b.priority);
  });

  // Mensaje de bienvenida personalizado
  readonly welcomeMessage = computed(() => {
    const name = this.userName();
    const role = this.userRole();

    if (!name) return '¡Bienvenido!';

    const timeOfDay = this.getTimeOfDay();
    let roleMessage = '';

    switch (role) {
      case 'owner':
        roleMessage = '¿Listo para ganar dinero con tus autos?';
        break;
      case 'renter':
        roleMessage = '¿Necesitas un auto hoy?';
        break;
      case 'both':
        roleMessage = '¿Quieres alquilar o publicar un auto?';
        break;
      default:
        roleMessage = '¿Qué te trae por aquí hoy?';
    }

    return `¡${timeOfDay}, ${name}! ${roleMessage}`;
  });

  async ngOnInit() {
    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    try {
      this.loading.set(true);

      // Cargar perfil del usuario
      const profile = await this.profileService.getMe();
      const role = profile.role === 'admin' ? 'owner' : profile.role || 'renter';
      this.userRole.set(role as 'owner' | 'renter' | 'both' | null);
      this.userName.set(profile.full_name?.split(' ')[0] || 'Usuario');

      // Cargar estadísticas
      await Promise.all([this.loadStats(), this.loadRecentData()]);
    } catch (_error) {
      console.error('Error loading dashboard data:', _error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStats() {
    const role = this.userRole();

    try {
      // Notificaciones no leídas
      const unreadCount = this.notificationsService.unreadCount();
      this.stats.update((stats) => ({ ...stats, unreadNotifications: unreadCount }));

      // Balance de wallet
      const walletBalance = await firstValueFrom(this.walletService.getBalance());
      this.stats.update((stats) => ({
        ...stats,
        walletBalance: walletBalance.available_balance,
      }));

      if (role === 'owner' || role === 'both') {
        // Autos del owner
        const cars = await this.carsService.listMyCars();
        const availableCars = cars.filter((car) => car.status === 'active').length;
        const rentedCars = 0; // No existe status 'rented' en CarStatus

        this.stats.update((stats) => ({
          ...stats,
          availableCars,
          rentedCars,
        }));

        // Reservas pendientes para owner
        const ownerBookings = await this.bookingsService.getOwnerBookings();
        const pendingBookings = ownerBookings.filter((b: Booking) => b.status === 'pending').length;

        this.stats.update((stats) => ({
          ...stats,
          pendingBookings,
        }));
      }

      if (role === 'renter' || role === 'both') {
        // Reservas activas del renter
        const result = await this.bookingsService.getMyBookings();
        const activeBookings = result.bookings.filter(
          (b: Booking) => b.status === 'confirmed' || b.status === 'in_progress',
        ).length;

        this.stats.update((stats) => ({
          ...stats,
          activeBookings,
        }));
      }
    } catch (_error) {
      console.error('Error loading stats:', _error);
    }
  }

  private async loadRecentData() {
    const role = this.userRole();

    try {
      if (role === 'owner' || role === 'both') {
        // Autos recientes del owner
        const cars = await this.carsService.listMyCars();
        this.recentCars.set(cars.slice(0, 3));
      }

      if (role === 'renter' || role === 'both') {
        // Reservas recientes del renter
        const result = await this.bookingsService.getMyBookings();
        this.recentBookings.set(result.bookings.slice(0, 3));
      }
    } catch (_error) {
      console.error('Error loading recent data:', _error);
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  getCarPhotoUrl(car: Car): string {
    const rawPhotos =
      car.photos || ((car as unknown as Record<string, unknown>)['car_photos'] as string[]);
    const photos =
      Array.isArray(rawPhotos) && typeof rawPhotos[0] === 'string'
        ? (rawPhotos as string[]).map((url) => ({ url }))
        : rawPhotos;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getCarImageUrl(photos as any, {
      brand: car.brand || car.brand_name || '',
      model: car.model || car.model_name || '',
      year: car.year,
      id: car.id,
    });
  }
}
