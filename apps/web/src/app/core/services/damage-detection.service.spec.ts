import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DamageDetectionService } from './damage-detection.service';

describe('DamageDetectionService', () => {
  let component: DamageDetectionService;
  let fixture: ComponentFixture<DamageDetectionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DamageDetectionService],
    }).compileComponents();

    fixture = TestBed.createComponent(DamageDetectionService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
