import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationBlockingModalComponent } from './verification-blocking-modal.component';

describe('VerificationBlockingModalComponent', () => {
  let component: VerificationBlockingModalComponent;
  let fixture: ComponentFixture<VerificationBlockingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationBlockingModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationBlockingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
