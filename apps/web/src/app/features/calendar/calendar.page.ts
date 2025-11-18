import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.css'],
})
export class CalendarPage {
  currentDate = signal(new Date());

  get monthName(): string {
    return this.currentDate().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  get daysInMonth(): number {
    return new Date(
      this.currentDate().getFullYear(),
      this.currentDate().getMonth() + 1,
      0
    ).getDate();
  }

  get firstDayOfMonth(): number {
    return new Date(
      this.currentDate().getFullYear(),
      this.currentDate().getMonth(),
      1
    ).getDay();
  }

  get calendarDays(): (number | null)[] {
    const days: (number | null)[] = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < this.firstDayOfMonth; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= this.daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }

  onDateClick(day: number | null): void {
    if (day) {
      const selectedDate = new Date(
        this.currentDate().getFullYear(),
        this.currentDate().getMonth(),
        day
      );
      alert(`Seleccionaste la fecha: ${selectedDate.toISOString().split('T')[0]}`);
    }
  }

  previousMonth(): void {
    this.currentDate.set(
      new Date(this.currentDate().getFullYear(), this.currentDate().getMonth() - 1)
    );
  }

  nextMonth(): void {
    this.currentDate.set(
      new Date(this.currentDate().getFullYear(), this.currentDate().getMonth() + 1)
    );
  }
}
