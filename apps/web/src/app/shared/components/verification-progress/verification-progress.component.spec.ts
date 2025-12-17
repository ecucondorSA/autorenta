import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationProgressComponent } from './verification-progress.component';

describe('VerificationProgressComponent', () => {
  let component: VerificationProgressComponent;
  let fixture: ComponentFixture<VerificationProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
