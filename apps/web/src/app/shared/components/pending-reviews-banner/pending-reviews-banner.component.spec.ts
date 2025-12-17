import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingReviewsBannerComponent } from './pending-reviews-banner.component';

describe('PendingReviewsBannerComponent', () => {
  let component: PendingReviewsBannerComponent;
  let fixture: ComponentFixture<PendingReviewsBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingReviewsBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingReviewsBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
