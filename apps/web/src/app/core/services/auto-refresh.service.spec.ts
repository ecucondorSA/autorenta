import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutoRefreshService } from './auto-refresh.service';

describe('AutoRefreshService', () => {
  let component: AutoRefreshService;
  let fixture: ComponentFixture<AutoRefreshService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoRefreshService],
    }).compileComponents();

    fixture = TestBed.createComponent(AutoRefreshService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
