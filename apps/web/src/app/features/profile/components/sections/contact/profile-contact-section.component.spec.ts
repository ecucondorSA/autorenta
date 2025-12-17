import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileContactSectionComponent } from './profile-contact-section.component';

describe('ProfileContactSectionComponent', () => {
  let component: ProfileContactSectionComponent;
  let fixture: ComponentFixture<ProfileContactSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileContactSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileContactSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
