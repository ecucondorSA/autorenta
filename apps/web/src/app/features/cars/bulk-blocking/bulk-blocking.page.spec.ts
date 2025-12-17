import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BulkBlockingPage } from './bulk-blocking.page';

describe('BulkBlockingPage', () => {
  let component: BulkBlockingPage;
  let fixture: ComponentFixture<BulkBlockingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkBlockingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkBlockingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
