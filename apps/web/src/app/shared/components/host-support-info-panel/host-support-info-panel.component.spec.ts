import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HostSupportInfoPanelComponent } from './host-support-info-panel.component';

describe('HostSupportInfoPanelComponent', () => {
  let component: HostSupportInfoPanelComponent;
  let fixture: ComponentFixture<HostSupportInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostSupportInfoPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostSupportInfoPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
