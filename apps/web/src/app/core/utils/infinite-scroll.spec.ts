import { ComponentFixture, TestBed } from '@angular/core/testing';
import { infinite-scroll } from './infinite-scroll';

describe('infinite-scroll', () => {
  let component: infinite-scroll;
  let fixture: ComponentFixture<infinite-scroll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [infinite-scroll],
    }).compileComponents();

    fixture = TestBed.createComponent(infinite-scroll);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
