import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerCheckInPage } from './owner-check-in.page';

describe('OwnerCheckInPage', () => {
  let component: OwnerCheckInPage;
  let fixture: ComponentFixture<OwnerCheckInPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerCheckInPage],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerCheckInPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
