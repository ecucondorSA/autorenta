import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let component: MoneyPipe;
  let fixture: ComponentFixture<MoneyPipe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoneyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(MoneyPipe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
