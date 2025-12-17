import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let component: ShareService;
  let fixture: ComponentFixture<ShareService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareService],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
