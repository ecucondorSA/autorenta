import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExternalNavigationService } from './external-navigation.service';

describe('ExternalNavigationService', () => {
  let component: ExternalNavigationService;
  let fixture: ComponentFixture<ExternalNavigationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalNavigationService],
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalNavigationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
