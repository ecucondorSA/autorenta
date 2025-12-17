import { ComponentFixture, TestBed } from '@angular/core/testing';
import { feature-flag.model } from './feature-flag.model';

describe('feature-flag.model', () => {
  let component: feature-flag.model;
  let fixture: ComponentFixture<feature-flag.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [feature-flag.model],
    }).compileComponents();

    fixture = TestBed.createComponent(feature-flag.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
