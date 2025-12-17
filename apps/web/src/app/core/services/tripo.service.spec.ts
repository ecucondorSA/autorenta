import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripoService } from './tripo.service';

describe('TripoService', () => {
  let component: TripoService;
  let fixture: ComponentFixture<TripoService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripoService],
    }).compileComponents();

    fixture = TestBed.createComponent(TripoService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
