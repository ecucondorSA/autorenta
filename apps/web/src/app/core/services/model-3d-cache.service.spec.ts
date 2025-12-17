import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Model3DCacheService } from './model-3d-cache.service';

describe('Model3DCacheService', () => {
  let component: Model3DCacheService;
  let fixture: ComponentFixture<Model3DCacheService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Model3DCacheService],
    }).compileComponents();

    fixture = TestBed.createComponent(Model3DCacheService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
