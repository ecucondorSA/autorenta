import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloatingActionFabComponent } from './floating-action-fab.component';

describe('FloatingActionFabComponent', () => {
  let component: FloatingActionFabComponent;
  let fixture: ComponentFixture<FloatingActionFabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingActionFabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingActionFabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
