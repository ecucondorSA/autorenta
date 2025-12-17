import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrafficInfractionsService } from './traffic-infractions.service';

describe('TrafficInfractionsService', () => {
  let component: TrafficInfractionsService;
  let fixture: ComponentFixture<TrafficInfractionsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrafficInfractionsService],
    }).compileComponents();

    fixture = TestBed.createComponent(TrafficInfractionsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
