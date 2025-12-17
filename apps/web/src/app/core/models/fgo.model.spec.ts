import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fgo.model } from './fgo.model';

describe('fgo.model', () => {
  let component: fgo.model;
  let fixture: ComponentFixture<fgo.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [fgo.model],
    }).compileComponents();

    fixture = TestBed.createComponent(fgo.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
