import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  let component: DisputesService;
  let fixture: ComponentFixture<DisputesService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputesService],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputesService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
