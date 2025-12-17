import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let component: MarketplaceService;
  let fixture: ComponentFixture<MarketplaceService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceService],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
