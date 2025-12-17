import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaCapabilitiesComponent } from './pwa-capabilities.component';

describe('PwaCapabilitiesComponent', () => {
  let component: PwaCapabilitiesComponent;
  let fixture: ComponentFixture<PwaCapabilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaCapabilitiesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaCapabilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
