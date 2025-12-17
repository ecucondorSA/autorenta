import { ComponentFixture, TestBed } from '@angular/core/testing';
import { marketplace.model } from './marketplace.model';

describe('marketplace.model', () => {
  let component: marketplace.model;
  let fixture: ComponentFixture<marketplace.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [marketplace.model],
    }).compileComponents();

    fixture = TestBed.createComponent(marketplace.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
