import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplacePage } from './marketplace-page';

describe('MarketplacePage', () => {
  let component: MarketplacePage;
  let fixture: ComponentFixture<MarketplacePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplacePage],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplacePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
