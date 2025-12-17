import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaterfallSimulatorComponent } from './waterfall-simulator.component';

describe('WaterfallSimulatorComponent', () => {
  let component: WaterfallSimulatorComponent;
  let fixture: ComponentFixture<WaterfallSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaterfallSimulatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WaterfallSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
