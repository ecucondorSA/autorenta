import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicProfilePage } from './public-profile.page';

describe('PublicProfilePage', () => {
  let component: PublicProfilePage;
  let fixture: ComponentFixture<PublicProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicProfilePage],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
