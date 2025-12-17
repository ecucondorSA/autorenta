import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromotionService } from './promotion.service';

describe('PromotionService', () => {
  let component: PromotionService;
  let fixture: ComponentFixture<PromotionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromotionService],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotionService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
