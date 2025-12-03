import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
// TODO: Re-add when marketplace components are created
// import { HeroSearchComponent } from '../../../shared/components/marketplace/hero-search/hero-search.component';
// import { TrustBadgesComponent } from '../../../shared/components/marketplace/trust-badges/trust-badges.component';

interface SearchQuery {
  location: string;
  from: string | null;
  to: string | null;
}

@Component({
  selector: 'app-cars-conversion',
  standalone: true,
  imports: [RouterLink, IconComponent], // TODO: Re-add HeroSearchComponent, TrustBadgesComponent
  templateUrl: './cars-conversion.page.html',
  styleUrls: ['./cars-conversion.page.css'],
})
export class CarsConversionPage {
  private readonly router = inject(Router);

  onSearch(query: SearchQuery): void {
    // HeroSearchComponent already handles navigation internally
    // This is a backup handler
    console.log('Search query:', query);
  }
}
