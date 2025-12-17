import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetaService } from './meta.service';

describe('MetaService', () => {
  let component: MetaService;
  let fixture: ComponentFixture<MetaService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetaService],
    }).compileComponents();

    fixture = TestBed.createComponent(MetaService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
