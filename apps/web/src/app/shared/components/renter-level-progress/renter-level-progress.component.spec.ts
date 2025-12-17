import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RenterLevelProgressComponent } from './renter-level-progress.component';

describe('RenterLevelProgressComponent', () => {
  let component: RenterLevelProgressComponent;
  let fixture: ComponentFixture<RenterLevelProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenterLevelProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RenterLevelProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
