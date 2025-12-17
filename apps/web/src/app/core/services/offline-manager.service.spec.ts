import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineManagerService } from './offline-manager.service';

describe('OfflineManagerService', () => {
  let component: OfflineManagerService;
  let fixture: ComponentFixture<OfflineManagerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineManagerService],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineManagerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
