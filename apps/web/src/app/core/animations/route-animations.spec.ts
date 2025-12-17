import { ComponentFixture, TestBed } from '@angular/core/testing';
import { route-animations } from './route-animations';

describe('route-animations', () => {
  let component: route-animations;
  let fixture: ComponentFixture<route-animations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [route-animations],
    }).compileComponents();

    fixture = TestBed.createComponent(route-animations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
