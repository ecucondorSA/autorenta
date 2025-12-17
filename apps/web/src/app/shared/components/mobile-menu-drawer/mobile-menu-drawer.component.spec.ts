import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileMenuDrawerComponent } from './mobile-menu-drawer.component';

describe('MobileMenuDrawerComponent', () => {
  let component: MobileMenuDrawerComponent;
  let fixture: ComponentFixture<MobileMenuDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileMenuDrawerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileMenuDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
