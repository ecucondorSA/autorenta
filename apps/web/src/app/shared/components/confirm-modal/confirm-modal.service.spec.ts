import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmModalService } from './confirm-modal.service';

describe('ConfirmModalService', () => {
  let component: ConfirmModalService;
  let fixture: ComponentFixture<ConfirmModalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalService],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
