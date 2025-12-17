import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationPromptBannerComponent } from './verification-prompt-banner.component';

describe('VerificationPromptBannerComponent', () => {
  let component: VerificationPromptBannerComponent;
  let fixture: ComponentFixture<VerificationPromptBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationPromptBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationPromptBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
