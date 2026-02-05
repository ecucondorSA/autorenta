import type { Booking } from '@core/models';

export type BookingRole = 'renter' | 'owner';
export type BookingFilter =
  | 'all'
  | 'action'
  | 'active'
  | 'upcoming'
  | 'history'
  | 'approvals'
  | 'review';

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
