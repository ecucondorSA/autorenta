import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineMessagesPanelComponent } from './offline-messages-panel.component';

describe('OfflineMessagesPanelComponent', () => {
  let component: OfflineMessagesPanelComponent;
  let fixture: ComponentFixture<OfflineMessagesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineMessagesPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineMessagesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
