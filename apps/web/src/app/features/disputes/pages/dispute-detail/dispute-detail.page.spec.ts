import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputeDetailPage } from './dispute-detail.page';

describe('DisputeDetailPage', () => {
  let component: DisputeDetailPage;
  let fixture: ComponentFixture<DisputeDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputeDetailPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputeDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
