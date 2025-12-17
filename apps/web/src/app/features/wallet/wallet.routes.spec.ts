import { ComponentFixture, TestBed } from '@angular/core/testing';
import { wallet.routes } from './wallet.routes';

describe('wallet.routes', () => {
  let component: wallet.routes;
  let fixture: ComponentFixture<wallet.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [wallet.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(wallet.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
