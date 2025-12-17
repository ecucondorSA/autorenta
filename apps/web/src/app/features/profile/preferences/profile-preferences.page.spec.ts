import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePreferencesPage } from './profile-preferences.page';

describe('ProfilePreferencesPage', () => {
  let component: ProfilePreferencesPage;
  let fixture: ComponentFixture<ProfilePreferencesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePreferencesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePreferencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
