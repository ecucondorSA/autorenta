import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HdriBackgroundComponent } from './hdri-background.component';

describe('HdriBackgroundComponent', () => {
  let component: HdriBackgroundComponent;
  let fixture: ComponentFixture<HdriBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HdriBackgroundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HdriBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
