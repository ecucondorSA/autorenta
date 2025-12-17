import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileVerificationPage } from './profile-verification.page';

describe('ProfileVerificationPage', () => {
  let component: ProfileVerificationPage;
  let fixture: ComponentFixture<ProfileVerificationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileVerificationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileVerificationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
