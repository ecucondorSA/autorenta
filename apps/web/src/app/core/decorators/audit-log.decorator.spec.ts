import { ComponentFixture, TestBed } from '@angular/core/testing';
import { audit-log.decorator } from './audit-log.decorator';

describe('audit-log.decorator', () => {
  let component: audit-log.decorator;
  let fixture: ComponentFixture<audit-log.decorator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [audit-log.decorator],
    }).compileComponents();

    fixture = TestBed.createComponent(audit-log.decorator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
