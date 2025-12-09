import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-cars-conversion',
  standalone: true,
  imports: [RouterLink, IconComponent, FormsModule],
  templateUrl: './cars-conversion.page.html',
  styleUrls: ['./cars-conversion.page.css'],
})
export class CarsConversionPage {
  private readonly router = inject(Router);

  searchQuery = signal('');

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query) {
      void this.router.navigate(['/cars/list'], { queryParams: { q: query } });
    } else {
      void this.router.navigate(['/cars/list']);
    }
  }

  navigateToList(): void {
    void this.router.navigate(['/cars/list']);
  }
}
