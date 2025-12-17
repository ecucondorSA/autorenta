import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublishCarV2Page } from './publish-car-v2.page';

describe('PublishCarV2Page', () => {
  let component: PublishCarV2Page;
  let fixture: ComponentFixture<PublishCarV2Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCarV2Page],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishCarV2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
