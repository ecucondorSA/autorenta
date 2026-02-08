export type ProfileNavTone = 'blue' | 'violet' | 'emerald' | 'gray' | 'amber' | 'red' | 'orange';

export type ProfileNavBadgeSource = 'pending_approvals' | 'unread_notifications';

export type ProfileNavBadge =
  | { kind: 'new'; text: 'NEW' }
  | { kind: 'count'; source: ProfileNavBadgeSource };

export interface ProfileNavItem {
  id: string;
  label: string;
  route: string;
  tone?: ProfileNavTone;
  desktopIcon: string; // assets/icons/sprite.svg
  mobileIcon: string; // assets/icons/menu-icons.svg (without "menu-" prefix)
  badge?: ProfileNavBadge;
}

export interface ProfileNavSection {
  id: string;
  title: string;
  tone: ProfileNavTone;
  items: ProfileNavItem[];
}

export interface ProfileNavToneClasses {
  heading: string;
  iconBg: string;
  iconText: string;
  iconBgHover: string;
}

export const PROFILE_NAV_TONE_CLASSES: Record<ProfileNavTone, ProfileNavToneClasses> = {
  blue: {
    heading: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-600',
    iconBgHover: 'group-hover:bg-blue-500/20',
  },
  violet: {
    heading: 'text-violet-600',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600',
    iconBgHover: 'group-hover:bg-violet-500/20',
  },
  emerald: {
    heading: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600',
    iconBgHover: 'group-hover:bg-emerald-500/20',
  },
  gray: {
    heading: 'text-gray-500',
    iconBg: 'bg-gray-500/10',
    iconText: 'text-gray-600',
    iconBgHover: 'group-hover:bg-gray-500/20',
  },
  amber: {
    heading: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600',
    iconBgHover: 'group-hover:bg-amber-500/20',
  },
  red: {
    heading: 'text-red-600',
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-600',
    iconBgHover: 'group-hover:bg-red-500/20',
  },
  orange: {
    heading: 'text-orange-600',
    iconBg: 'bg-orange-500/10',
    iconText: 'text-orange-600',
    iconBgHover: 'group-hover:bg-orange-500/20',
  },
};

const PROFILE_NAV_BASE_SECTIONS: ProfileNavSection[] = [
  {
    id: 'activities',
    title: 'Mis Actividades',
    tone: 'blue',
    items: [
      {
        id: 'my_bookings',
        label: 'Mis Reservas',
        route: '/bookings',
        desktopIcon: 'calendar',
        mobileIcon: 'calendar',
      },
      {
        id: 'favorites',
        label: 'Favoritos',
        route: '/favorites',
        desktopIcon: 'heart',
        mobileIcon: 'heart',
      },
    ],
  },
  {
    id: 'communication',
    title: 'Comunicación',
    tone: 'violet',
    items: [
      {
        id: 'messages',
        label: 'Mensajes',
        route: '/messages',
        desktopIcon: 'message',
        mobileIcon: 'message',
      },
      {
        id: 'notifications',
        label: 'Notificaciones',
        route: '/notifications',
        desktopIcon: 'bell',
        mobileIcon: 'bell',
        badge: { kind: 'count', source: 'unread_notifications' },
      },
    ],
  },
  {
    id: 'cars',
    title: 'Mis autos',
    tone: 'emerald',
    items: [
      {
        id: 'my_cars',
        label: 'Mis Autos',
        route: '/cars/my',
        desktopIcon: 'archive',
        mobileIcon: 'archive',
      },
      {
        id: 'pending_requests',
        label: 'Solicitudes Pendientes',
        route: '/bookings/owner',
        desktopIcon: 'clipboard',
        mobileIcon: 'document',
        tone: 'orange',
        badge: { kind: 'count', source: 'pending_approvals' },
      },
      {
        id: 'owner_calendar',
        label: 'Calendario',
        route: '/bookings/calendar',
        desktopIcon: 'calendar-days',
        mobileIcon: 'calendar-days',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finanzas',
    tone: 'emerald',
    items: [
      {
        id: 'finanzas',
        label: 'Finanzas',
        route: '/finanzas',
        desktopIcon: 'wallet',
        mobileIcon: 'wallet',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configuración',
    tone: 'gray',
    items: [
      {
        id: 'edit_profile',
        label: 'Editar Perfil',
        route: '/profile',
        desktopIcon: 'user',
        mobileIcon: 'user',
      },
      {
        id: 'security',
        label: 'Seguridad',
        route: '/profile/security',
        desktopIcon: 'shield',
        mobileIcon: 'shield',
      },
      {
        id: 'security_center',
        label: 'Centro de Seguridad',
        route: '/dashboard/security',
        desktopIcon: 'shield',
        mobileIcon: 'shield',
        tone: 'red',
      },
      {
        id: 'preferences',
        label: 'Preferencias',
        route: '/profile/preferences',
        desktopIcon: 'settings',
        mobileIcon: 'settings',
      },
      {
        id: 'driver',
        label: 'Conductor',
        route: '/profile/driver-profile',
        desktopIcon: 'document',
        mobileIcon: 'document',
      },
    ],
  },
  {
    id: 'help',
    title: 'Ayuda',
    tone: 'amber',
    items: [
      {
        id: 'help_center',
        label: 'Centro de Ayuda',
        route: '/help',
        desktopIcon: 'help',
        mobileIcon: 'help',
        badge: { kind: 'new', text: 'NEW' },
      },
      {
        id: 'support',
        label: 'Contactar Soporte',
        route: '/profile/contact',
        desktopIcon: 'phone',
        mobileIcon: 'phone',
      },
    ],
  },
];

export interface ResolvedProfileNavItem extends ProfileNavItem {
  resolvedTone: ProfileNavTone;
  badgeText?: string;
  badgeKind?: 'new' | 'count';
}

export interface ResolvedProfileNavSection extends ProfileNavSection {
  items: ResolvedProfileNavItem[];
}

export function resolveProfileNavSections(params: {
  pendingApprovalCount: number;
  unreadNotificationsCount: number;
}): ResolvedProfileNavSection[] {
  const { pendingApprovalCount, unreadNotificationsCount } = params;

  const resolveBadge = (badge: ProfileNavBadge | undefined): { text: string; kind: 'new' | 'count' } | null => {
    if (!badge) return null;
    if (badge.kind === 'new') return { text: badge.text, kind: 'new' };
    if (badge.source === 'pending_approvals') {
      return pendingApprovalCount > 0 ? { text: String(pendingApprovalCount), kind: 'count' } : null;
    }
    if (badge.source === 'unread_notifications') {
      return unreadNotificationsCount > 0 ? { text: String(unreadNotificationsCount), kind: 'count' } : null;
    }
    return null;
  };

  return PROFILE_NAV_BASE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const resolvedTone = item.tone ?? section.tone;
      const resolvedBadge = resolveBadge(item.badge);
      return {
        ...item,
        resolvedTone,
        badgeText: resolvedBadge?.text,
        badgeKind: resolvedBadge?.kind,
      };
    }),
  }));
}

