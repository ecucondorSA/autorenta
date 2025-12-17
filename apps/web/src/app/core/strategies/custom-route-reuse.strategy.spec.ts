import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomRouteReuseStrategy } from './custom-route-reuse.strategy';

describe('CustomRouteReuseStrategy', () => {
  let component: CustomRouteReuseStrategy;
  let fixture: ComponentFixture<CustomRouteReuseStrategy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomRouteReuseStrategy],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomRouteReuseStrategy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
