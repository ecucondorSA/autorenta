import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyCarsPage } from './my-cars.page';

describe('MyCarsPage', () => {
  let component: MyCarsPage;
  let fixture: ComponentFixture<MyCarsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyCarsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MyCarsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
