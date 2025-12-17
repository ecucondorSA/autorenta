import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaTitlebarComponent } from './pwa-titlebar.component';

describe('PwaTitlebarComponent', () => {
  let component: PwaTitlebarComponent;
  let fixture: ComponentFixture<PwaTitlebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaTitlebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaTitlebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
