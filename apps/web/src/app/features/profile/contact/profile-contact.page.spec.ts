import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileContactPage } from './profile-contact.page';

describe('ProfileContactPage', () => {
  let component: ProfileContactPage;
  let fixture: ComponentFixture<ProfileContactPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileContactPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileContactPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
