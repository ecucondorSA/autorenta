import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FgoPolicyEngineService } from './fgo-policy-engine.service';

describe('FgoPolicyEngineService', () => {
  let component: FgoPolicyEngineService;
  let fixture: ComponentFixture<FgoPolicyEngineService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FgoPolicyEngineService],
    }).compileComponents();

    fixture = TestBed.createComponent(FgoPolicyEngineService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
