import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let component: EncryptionService;
  let fixture: ComponentFixture<EncryptionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncryptionService],
    }).compileComponents();

    fixture = TestBed.createComponent(EncryptionService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
