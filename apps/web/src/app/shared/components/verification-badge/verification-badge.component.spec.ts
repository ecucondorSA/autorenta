import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationBadgeComponent } from './verification-badge.component';

describe('VerificationBadgeComponent', () => {
  let component: VerificationBadgeComponent;
  let fixture: ComponentFixture<VerificationBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
