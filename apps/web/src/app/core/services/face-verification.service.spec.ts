import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaceVerificationService } from './face-verification.service';

describe('FaceVerificationService', () => {
  let component: FaceVerificationService;
  let fixture: ComponentFixture<FaceVerificationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaceVerificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(FaceVerificationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
