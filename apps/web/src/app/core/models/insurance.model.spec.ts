import { ComponentFixture, TestBed } from '@angular/core/testing';
import { insurance.model } from './insurance.model';

describe('insurance.model', () => {
  let component: insurance.model;
  let fixture: ComponentFixture<insurance.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [insurance.model],
    }).compileComponents();

    fixture = TestBed.createComponent(insurance.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
