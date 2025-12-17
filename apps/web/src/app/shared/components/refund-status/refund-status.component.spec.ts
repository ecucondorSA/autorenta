import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefundStatusComponent } from './refund-status.component';

describe('RefundStatusComponent', () => {
  let component: RefundStatusComponent;
  let fixture: ComponentFixture<RefundStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefundStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RefundStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
