import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublishCarFormService } from './publish-car-form.service';

describe('PublishCarFormService', () => {
  let component: PublishCarFormService;
  let fixture: ComponentFixture<PublishCarFormService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCarFormService],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishCarFormService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
