import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dashboard.model } from './dashboard.model';

describe('dashboard.model', () => {
  let component: dashboard.model;
  let fixture: ComponentFixture<dashboard.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [dashboard.model],
    }).compileComponents();

    fixture = TestBed.createComponent(dashboard.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
