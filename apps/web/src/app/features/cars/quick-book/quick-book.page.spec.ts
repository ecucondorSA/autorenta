import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickBookPage } from './quick-book.page';

describe('QuickBookPage', () => {
  let component: QuickBookPage;
  let fixture: ComponentFixture<QuickBookPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickBookPage],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickBookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
