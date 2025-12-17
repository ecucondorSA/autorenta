import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileValidators } from './profile-validators';

describe('ProfileValidators', () => {
  let component: ProfileValidators;
  let fixture: ComponentFixture<ProfileValidators>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileValidators],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileValidators);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
