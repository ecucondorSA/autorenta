import { ComponentFixture, TestBed } from '@angular/core/testing';
import { traffic-infraction.model } from './traffic-infraction.model';

describe('traffic-infraction.model', () => {
  let component: traffic-infraction.model;
  let fixture: ComponentFixture<traffic-infraction.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [traffic-infraction.model],
    }).compileComponents();

    fixture = TestBed.createComponent(traffic-infraction.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
