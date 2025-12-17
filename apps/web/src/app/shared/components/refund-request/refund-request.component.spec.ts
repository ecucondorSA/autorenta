import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefundRequestComponent } from './refund-request.component';

describe('RefundRequestComponent', () => {
  let component: RefundRequestComponent;
  let fixture: ComponentFixture<RefundRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefundRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RefundRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
