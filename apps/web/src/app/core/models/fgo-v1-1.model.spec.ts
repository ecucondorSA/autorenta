import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fgo-v1-1.model } from './fgo-v1-1.model';

describe('fgo-v1-1.model', () => {
  let component: fgo-v1-1.model;
  let fixture: ComponentFixture<fgo-v1-1.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [fgo-v1-1.model],
    }).compileComponents();

    fixture = TestBed.createComponent(fgo-v1-1.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
