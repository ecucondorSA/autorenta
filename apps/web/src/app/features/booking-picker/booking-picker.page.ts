import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format, parseISO } from 'date-fns';

@Component({
  selector: 'app-booking-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './booking-picker.page.html',
})
export class BookingPickerPage {
  start = '';
  end = '';

  readonly submitted = signal(false);

  submit() {
    if (!this.start || !this.end) return alert('Seleccioná inicio y fin');

    try {
      const s = parseISO(this.start);
      const e = parseISO(this.end);

      if (s > e) return alert('La fecha de inicio debe ser anterior a la de fin');

      // Show formatted dates as demo; in production call your backend RPC
      alert(`Reserva: ${format(s, 'PP')} → ${format(e, 'PP')}`);
      this.submitted.set(true);
    } catch (err) {
      console.error(err);
      alert('Formato de fecha inválido');
    }
  }
}
