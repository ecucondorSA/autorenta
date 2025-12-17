import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourRegistryService } from './tour-registry.service';

describe('TourRegistryService', () => {
  let component: TourRegistryService;
  let fixture: ComponentFixture<TourRegistryService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourRegistryService],
    }).compileComponents();

    fixture = TestBed.createComponent(TourRegistryService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
