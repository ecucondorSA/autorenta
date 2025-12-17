import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublishCarLocationService } from './publish-car-location.service';

describe('PublishCarLocationService', () => {
  let component: PublishCarLocationService;
  let fixture: ComponentFixture<PublishCarLocationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCarLocationService],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishCarLocationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
