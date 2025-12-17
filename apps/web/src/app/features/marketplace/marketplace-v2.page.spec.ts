import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketplaceV2Page } from './marketplace-v2.page';

describe('MarketplaceV2Page', () => {
  let component: MarketplaceV2Page;
  let fixture: ComponentFixture<MarketplaceV2Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceV2Page],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceV2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
