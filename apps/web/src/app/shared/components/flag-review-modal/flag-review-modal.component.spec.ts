import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlagReviewModalComponent } from './flag-review-modal.component';

describe('FlagReviewModalComponent', () => {
  let component: FlagReviewModalComponent;
  let fixture: ComponentFixture<FlagReviewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagReviewModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagReviewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
