import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileSecurityPage } from './profile-security.page';

describe('ProfileSecurityPage', () => {
  let component: ProfileSecurityPage;
  let fixture: ComponentFixture<ProfileSecurityPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSecurityPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSecurityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
