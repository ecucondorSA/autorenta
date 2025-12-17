import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FgoV1_1Service } from './fgo-v1-1.service';

describe('FgoV1_1Service', () => {
  let component: FgoV1_1Service;
  let fixture: ComponentFixture<FgoV1_1Service>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FgoV1_1Service],
    }).compileComponents();

    fixture = TestBed.createComponent(FgoV1_1Service);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
