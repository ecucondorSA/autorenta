import type { Booking } from '@core/models';
import type { BookingRole } from '@core/services/bookings/booking-ui.service';

export type { BookingRole };
export type BookingFilter =
  | 'all'
  | 'action'
  | 'active'
  | 'upcoming'
  | 'history'
  | 'approvals'
  | 'review';

// Operational phase grouping for hub command center
export type OperationalPhase =
  | 'urgent' // needs action NOW (payment expiring, approval needed)
  | 'today' // checkin/checkout happening today
  | 'active' // trips in progress
  | 'awaiting' // waiting on other party
  | 'upcoming' // confirmed, start_at > 24h away
  | 'history'; // terminal states

export interface OperationalGroup {
  phase: OperationalPhase;
  label: string;
  icon: string;
  bookings: Booking[];
}

export interface FilterItem {
  id: BookingFilter;
  label: string;
  count: number;
}

export interface BookingQuickAction {
  id: string;
  label: string;
  icon: string;
  link: string;
  query?: Record<string, string>;
  badge?: number;
}

export interface FocusCard {
  title: string;
  subtitle: string;
  badge: string;
  actionLabel: string | null;
  actionLink: string[] | null;
  actionQuery?: Record<string, string> | null;
  toneClass: string;
  icon: string;
  booking: Booking | null;
}

export interface InsightItem {
  id: string;
  label: string;
  value: number | string;
  type: 'money' | 'count' | 'text';
  icon: string;
}
