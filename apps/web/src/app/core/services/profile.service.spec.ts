import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let component: ProfileService;
  let fixture: ComponentFixture<ProfileService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileService],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
