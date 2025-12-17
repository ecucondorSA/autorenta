import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let component: NavigationService;
  let fixture: ComponentFixture<NavigationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationService],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
