import { ComponentFixture, TestBed } from '@angular/core/testing';
import { renter-tours } from './renter-tours';

describe('renter-tours', () => {
  let component: renter-tours;
  let fixture: ComponentFixture<renter-tours>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [renter-tours],
    }).compileComponents();

    fixture = TestBed.createComponent(renter-tours);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
