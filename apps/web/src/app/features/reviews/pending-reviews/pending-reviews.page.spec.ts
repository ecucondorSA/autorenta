import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingReviewsPage } from './pending-reviews.page';

describe('PendingReviewsPage', () => {
  let component: PendingReviewsPage;
  let fixture: ComponentFixture<PendingReviewsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingReviewsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingReviewsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
