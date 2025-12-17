import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileStore } from './profile.store';

describe('ProfileStore', () => {
  let component: ProfileStore;
  let fixture: ComponentFixture<ProfileStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileStore],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileStore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
