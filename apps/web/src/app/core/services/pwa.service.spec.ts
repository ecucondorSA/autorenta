import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let component: PwaService;
  let fixture: ComponentFixture<PwaService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaService],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
