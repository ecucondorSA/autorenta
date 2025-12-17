import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type-guards } from './type-guards';

describe('type-guards', () => {
  let component: type-guards;
  let fixture: ComponentFixture<type-guards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [type-guards],
    }).compileComponents();

    fixture = TestBed.createComponent(type-guards);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
