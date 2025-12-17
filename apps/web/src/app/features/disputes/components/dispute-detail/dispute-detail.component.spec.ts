import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputeDetailComponent } from './dispute-detail.component';

describe('DisputeDetailComponent', () => {
  let component: DisputeDetailComponent;
  let fixture: ComponentFixture<DisputeDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputeDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
