import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonalizedLocationComponent } from './personalized-location.component';

describe('PersonalizedLocationComponent', () => {
  let component: PersonalizedLocationComponent;
  let fixture: ComponentFixture<PersonalizedLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalizedLocationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalizedLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
