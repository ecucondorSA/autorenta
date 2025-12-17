import { ComponentFixture, TestBed } from '@angular/core/testing';
import { wallet.model } from './wallet.model';

describe('wallet.model', () => {
  let component: wallet.model;
  let fixture: ComponentFixture<wallet.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [wallet.model],
    }).compileComponents();

    fixture = TestBed.createComponent(wallet.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
