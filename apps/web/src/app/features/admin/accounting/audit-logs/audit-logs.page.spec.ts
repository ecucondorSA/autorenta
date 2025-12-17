import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditLogsPage } from './audit-logs.page';

describe('AuditLogsPage', () => {
  let component: AuditLogsPage;
  let fixture: ComponentFixture<AuditLogsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
