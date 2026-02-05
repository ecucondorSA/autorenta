import { Booking } from '@core/models';
import { BookingRole } from './bookings-hub.types';

export function getBookingStatusLabel(booking: Booking, role: BookingRole): string {
  const s = booking.status;
  if (s === 'pending_payment') return 'Pendiente de pago';
  if (s === 'pending') return role === 'owner' ? 'Por aprobar' : 'Pendiente';
  if (s === 'pending_approval') return role === 'owner' ? 'Por aprobar' : 'En aprobacion';
  if (s === 'pending_review') return 'En revision';
  if (s === 'confirmed') return 'Confirmada';
  if (s === 'in_progress') return 'En curso';
  if (s === 'completed') return 'Finalizada';
  if (s === 'cancelled' || s === 'cancelled_renter' || s === 'cancelled_owner' || s === 'cancelled_system')
    return 'Cancelada';
  if (s === 'expired') return 'Expirada';
  if (s === 'rejected') return 'Rechazada';
  if (s === 'no_show') return 'No se presento';
  if (s === 'returned') return 'Devuelto';
  if (s === 'inspected_good') return 'Inspeccion OK';
  if (s === 'damage_reported') return 'Dano reportado';
  if (s === 'disputed' || s === 'pending_dispute_resolution') return 'En disputa';
  if (s === 'resolved') return 'Resuelto';
  if (s === 'payment_validation_failed') return 'Pago fallido';
  return s;
}

export type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

export function getBookingStatusTone(booking: Booking): StatusTone {
  const s = booking.status;
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_approval') return 'warning';
  if (s === 'pending_review' || s === 'returned') return 'info';
  if (s === 'confirmed' || s === 'in_progress' || s === 'inspected_good') return 'success';
  if (s === 'completed' || s === 'resolved') return 'neutral';
  if (
    s === 'cancelled' || s === 'cancelled_renter' || s === 'cancelled_owner' || s === 'cancelled_system' ||
    s === 'expired' || s === 'rejected' || s === 'no_show' || s === 'payment_validation_failed' ||
    s === 'damage_reported' || s === 'disputed' || s === 'pending_dispute_resolution'
  ) return 'danger';
  return 'neutral';
}

export function getStatusDotColor(booking: Booking): string {
  const tone = getBookingStatusTone(booking);
  switch (tone) {
    case 'warning': return 'bg-amber-400';
    case 'info': return 'bg-blue-400';
    case 'success': return 'bg-emerald-400';
    case 'danger': return 'bg-red-400';
    default: return 'bg-slate-400';
  }
}

export function getStatusBgColor(booking: Booking): string {
  const tone = getBookingStatusTone(booking);
  switch (tone) {
    case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'danger': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export function getBookingStatusChipClass(booking: Booking): string {
  return getStatusBgColor(booking);
}

export function getBookingDetailLink(booking: Booking, role: BookingRole): string[] {
  return role === 'owner' ? ['/bookings/owner', booking.id] : ['/bookings', booking.id];
}
