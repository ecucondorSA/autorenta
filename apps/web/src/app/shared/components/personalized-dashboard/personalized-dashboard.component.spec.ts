import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonalizedDashboardComponent } from './personalized-dashboard.component';

describe('PersonalizedDashboardComponent', () => {
  let component: PersonalizedDashboardComponent;
  let fixture: ComponentFixture<PersonalizedDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalizedDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalizedDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
