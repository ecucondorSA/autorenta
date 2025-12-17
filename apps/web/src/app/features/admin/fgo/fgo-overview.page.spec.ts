import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FgoOverviewPage } from './fgo-overview.page';

describe('FgoOverviewPage', () => {
  let component: FgoOverviewPage;
  let fixture: ComponentFixture<FgoOverviewPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FgoOverviewPage],
    }).compileComponents();

    fixture = TestBed.createComponent(FgoOverviewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
