import { Booking } from '@core/models';
import { BookingRole } from './bookings-hub.types';

export function getBookingStatusLabel(booking: Booking, role: BookingRole): string {
  const status = booking.status;
  if (status === 'pending_payment') return 'En Pago';
  if (status === 'pending') {
    return role === 'owner' ? 'Por Aprobar' : 'Pendiente';
  }
  if (status === 'pending_review') return 'En Revisión';
  if (status === 'confirmed') return 'Confirmada';
  if (status === 'in_progress') return 'En Viaje';
  if (status === 'completed') return 'Finalizada';
  if (status === 'cancelled') return 'Cancelada';
  return status;
}

export function getBookingStatusChipClass(booking: Booking): string {
  const status = booking.status;
  if (status === 'pending' || status === 'pending_payment') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (status === 'pending_review') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (status === 'confirmed' || status === 'in_progress') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

export function getBookingDetailLink(booking: Booking, role: BookingRole): string[] {
  return role === 'owner' ? ['/bookings/owner', booking.id] : ['/bookings', booking.id];
}
