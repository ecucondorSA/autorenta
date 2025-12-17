import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefundService } from './refund.service';

describe('RefundService', () => {
  let component: RefundService;
  let fixture: ComponentFixture<RefundService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefundService],
    }).compileComponents();

    fixture = TestBed.createComponent(RefundService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
