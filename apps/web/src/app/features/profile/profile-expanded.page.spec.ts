import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileExpandedPage } from './profile-expanded.page';

describe('ProfileExpandedPage', () => {
  let component: ProfileExpandedPage;
  let fixture: ComponentFixture<ProfileExpandedPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileExpandedPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileExpandedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
