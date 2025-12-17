import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShepherdAdapterService } from './shepherd-adapter.service';

describe('ShepherdAdapterService', () => {
  let component: ShepherdAdapterService;
  let fixture: ComponentFixture<ShepherdAdapterService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShepherdAdapterService],
    }).compileComponents();

    fixture = TestBed.createComponent(ShepherdAdapterService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
