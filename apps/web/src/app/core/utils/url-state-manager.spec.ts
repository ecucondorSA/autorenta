import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrlStateManager } from './url-state-manager';

describe('UrlStateManager', () => {
  let component: UrlStateManager;
  let fixture: ComponentFixture<UrlStateManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrlStateManager],
    }).compileComponents();

    fixture = TestBed.createComponent(UrlStateManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
