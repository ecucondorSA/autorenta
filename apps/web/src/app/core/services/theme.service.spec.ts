import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let component: ThemeService;
  let fixture: ComponentFixture<ThemeService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeService],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
