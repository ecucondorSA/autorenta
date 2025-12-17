import { ComponentFixture, TestBed } from '@angular/core/testing';
import { tour-definition.interface } from './tour-definition.interface';

describe('tour-definition.interface', () => {
  let component: tour-definition.interface;
  let fixture: ComponentFixture<tour-definition.interface>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [tour-definition.interface],
    }).compileComponents();

    fixture = TestBed.createComponent(tour-definition.interface);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
