import { ComponentFixture, TestBed } from '@angular/core/testing';
import { constants } from './constants';

describe('constants', () => {
  let component: constants;
  let fixture: ComponentFixture<constants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [constants],
    }).compileComponents();

    fixture = TestBed.createComponent(constants);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
