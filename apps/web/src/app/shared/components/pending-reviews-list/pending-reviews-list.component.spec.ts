import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingReviewsListComponent } from './pending-reviews-list.component';

describe('PendingReviewsListComponent', () => {
  let component: PendingReviewsListComponent;
  let fixture: ComponentFixture<PendingReviewsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingReviewsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingReviewsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
