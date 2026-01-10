import { Injectable, computed, signal } from '@angular/core';

export interface UserLevel {
  id: number;
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
  benefits: string[];
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  isUnlocked: boolean;
}

export interface GamificationStats {
  currentXP: number;
  totalXP: number;
  level: UserLevel;
  nextLevel: UserLevel | null;
  xpToNextLevel: number;
  xpProgress: number; // 0-100
  badges: GamificationBadge[];
  unlockedBadgesCount: number;
  tripsCompleted: number;
  reviewsGiven: number;
  reviewsReceived: number;
  averageRating: number;
  memberSince: Date;
  streak: number; // días consecutivos activo
}

export interface HostStats {
  earningsThisMonth: number;
  earningsLastMonth: number;
  earningsChange: number; // percentage
  activeReservations: number;
  pendingReservations: number;
  occupancyRate: number;
  occupancyChange: number;
  totalCars: number;
  responseTime: number; // hours
  acceptanceRate: number;
}

export interface QuickAction {
  id: string;
  type: 'trip' | 'message' | 'credit' | 'alert' | 'reservation';
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  badge?: string;
  urgency?: 'low' | 'medium' | 'high';
}

@Injectable({ providedIn: 'root' })
export class GamificationService {
  // Definición de niveles
  private readonly levels: UserLevel[] = [
    {
      id: 1,
      name: 'Principiante',
      minXP: 0,
      maxXP: 99,
      icon: '🌱',
      color: '#94a3b8',
      benefits: ['Acceso básico a la plataforma'],
    },
    {
      id: 2,
      name: 'Explorador',
      minXP: 100,
      maxXP: 499,
      icon: '🧭',
      color: '#22c55e',
      benefits: ['5% descuento en primer alquiler', 'Badge exclusivo'],
    },
    {
      id: 3,
      name: 'Viajero',
      minXP: 500,
      maxXP: 1499,
      icon: '✈️',
      color: '#3b82f6',
      benefits: ['10% descuento en seguros', 'Soporte prioritario'],
    },
    {
      id: 4,
      name: 'Experto',
      minXP: 1500,
      maxXP: 4999,
      icon: '⭐',
      color: '#a855f7',
      benefits: ['15% descuento', 'Acceso anticipado a nuevos autos'],
    },
    {
      id: 5,
      name: 'Embajador',
      minXP: 5000,
      maxXP: Infinity,
      icon: '👑',
      color: '#f59e0b',
      benefits: ['20% descuento', 'Soporte VIP 24/7', 'Eventos exclusivos'],
    },
  ];

  // Badges disponibles
  private readonly availableBadges: GamificationBadge[] = [
    { id: 'first_trip', name: 'Primer Viaje', description: 'Completaste tu primer alquiler', icon: '🚗', isUnlocked: false },
    { id: 'verified', name: 'Verificado', description: 'Completaste todas las verificaciones', icon: '✓', isUnlocked: false },
    { id: 'reviewer', name: 'Crítico', description: 'Dejaste 5 reviews', icon: '📝', isUnlocked: false },
    { id: 'superhost', name: 'Superhost', description: 'Rating promedio mayor a 4.8', icon: '🌟', isUnlocked: false },
    { id: 'referrer', name: 'Embajador', description: 'Referiste 3 amigos', icon: '👥', isUnlocked: false },
    { id: 'explorer', name: 'Explorador', description: 'Alquilaste en 3 ciudades distintas', icon: '🗺️', isUnlocked: false },
    { id: 'loyal', name: 'Fiel', description: '10 alquileres completados', icon: '💎', isUnlocked: false },
    { id: 'early_adopter', name: 'Early Adopter', description: 'Te uniste en el primer año', icon: '🚀', isUnlocked: false },
  ];

  // Signals para estado actual (mock data por ahora)
  private readonly _currentXP = signal(340);
  private readonly _badges = signal<GamificationBadge[]>(this.availableBadges.map((b, i) => ({
    ...b,
    isUnlocked: i < 3, // Primeros 3 desbloqueados para demo
    unlockedAt: i < 3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
  })));
  private readonly _tripsCompleted = signal(8);
  private readonly _reviewsGiven = signal(5);
  private readonly _reviewsReceived = signal(12);
  private readonly _averageRating = signal(4.8);
  private readonly _memberSince = signal(new Date('2024-01-15'));
  private readonly _streak = signal(7);

  // Host stats (mock)
  private readonly _isHost = signal(true);
  private readonly _hostStats = signal<HostStats>({
    earningsThisMonth: 125000,
    earningsLastMonth: 98000,
    earningsChange: 27.5,
    activeReservations: 3,
    pendingReservations: 2,
    occupancyRate: 92,
    occupancyChange: 5,
    totalCars: 2,
    responseTime: 1.5,
    acceptanceRate: 98,
  });

  // Quick actions (mock)
  private readonly _quickActions = signal<QuickAction[]>([
    {
      id: '1',
      type: 'trip',
      title: 'Tu próximo viaje',
      subtitle: 'Toyota Corolla • 15 Ene - 18 Ene',
      icon: '🚗',
      route: '/bookings/upcoming',
      badge: 'En 3 días',
    },
    {
      id: '2',
      type: 'message',
      title: '1 mensaje sin leer',
      subtitle: 'Carlos R. te envió un mensaje',
      icon: '💬',
      route: '/messages',
      urgency: 'medium',
    },
    {
      id: '3',
      type: 'credit',
      title: 'Crédito disponible',
      subtitle: '$5,000 por referir a Juan',
      icon: '🎁',
      route: '/wallet',
    },
  ]);

  // Premium membership
  private readonly _isPremium = signal(false);
  private readonly _premiumPrice = signal(2999);

  // Computed values
  readonly currentLevel = computed(() => {
    const xp = this._currentXP();
    return this.levels.find(l => xp >= l.minXP && xp <= l.maxXP) || this.levels[0];
  });

  readonly nextLevel = computed(() => {
    const current = this.currentLevel();
    const nextIndex = this.levels.findIndex(l => l.id === current.id) + 1;
    return nextIndex < this.levels.length ? this.levels[nextIndex] : null;
  });

  readonly xpProgress = computed(() => {
    const current = this.currentLevel();
    const xp = this._currentXP();
    const levelXP = xp - current.minXP;
    const levelRange = current.maxXP - current.minXP;
    return Math.min(100, Math.round((levelXP / levelRange) * 100));
  });

  readonly xpToNextLevel = computed(() => {
    const next = this.nextLevel();
    if (!next) return 0;
    return next.minXP - this._currentXP();
  });

  readonly stats = computed<GamificationStats>(() => ({
    currentXP: this._currentXP(),
    totalXP: this._currentXP(),
    level: this.currentLevel(),
    nextLevel: this.nextLevel(),
    xpToNextLevel: this.xpToNextLevel(),
    xpProgress: this.xpProgress(),
    badges: this._badges(),
    unlockedBadgesCount: this._badges().filter(b => b.isUnlocked).length,
    tripsCompleted: this._tripsCompleted(),
    reviewsGiven: this._reviewsGiven(),
    reviewsReceived: this._reviewsReceived(),
    averageRating: this._averageRating(),
    memberSince: this._memberSince(),
    streak: this._streak(),
  }));

  readonly isHost = this._isHost.asReadonly();
  readonly hostStats = this._hostStats.asReadonly();
  readonly quickActions = this._quickActions.asReadonly();
  readonly isPremium = this._isPremium.asReadonly();
  readonly premiumPrice = this._premiumPrice.asReadonly();

  // Methods to add XP (for future use)
  addXP(amount: number, reason: string): void {
    this._currentXP.update(xp => xp + amount);
    console.log(`+${amount} XP: ${reason}`);
  }

  unlockBadge(badgeId: string): void {
    this._badges.update(badges =>
      badges.map(b =>
        b.id === badgeId ? { ...b, isUnlocked: true, unlockedAt: new Date() } : b
      )
    );
  }
}
