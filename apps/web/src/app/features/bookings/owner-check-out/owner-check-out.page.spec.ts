import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerCheckOutPage } from './owner-check-out.page';

describe('OwnerCheckOutPage', () => {
  let component: OwnerCheckOutPage;
  let fixture: ComponentFixture<OwnerCheckOutPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerCheckOutPage],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerCheckOutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
