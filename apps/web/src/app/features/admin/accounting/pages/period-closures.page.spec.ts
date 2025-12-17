import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeriodClosuresPage } from './period-closures.page';

describe('PeriodClosuresPage', () => {
  let component: PeriodClosuresPage;
  let fixture: ComponentFixture<PeriodClosuresPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodClosuresPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodClosuresPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
