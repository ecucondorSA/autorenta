import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RealtimeConnectionService } from './realtime-connection.service';

describe('RealtimeConnectionService', () => {
  let component: RealtimeConnectionService;
  let fixture: ComponentFixture<RealtimeConnectionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RealtimeConnectionService],
    }).compileComponents();

    fixture = TestBed.createComponent(RealtimeConnectionService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
