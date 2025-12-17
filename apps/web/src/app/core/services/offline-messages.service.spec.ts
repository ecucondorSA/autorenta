import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineMessagesService } from './offline-messages.service';

describe('OfflineMessagesService', () => {
  let component: OfflineMessagesService;
  let fixture: ComponentFixture<OfflineMessagesService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineMessagesService],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineMessagesService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
