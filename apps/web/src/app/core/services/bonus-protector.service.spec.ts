import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonusProtectorService } from './bonus-protector.service';

describe('BonusProtectorService', () => {
  let component: BonusProtectorService;
  let fixture: ComponentFixture<BonusProtectorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonusProtectorService],
    }).compileComponents();

    fixture = TestBed.createComponent(BonusProtectorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
