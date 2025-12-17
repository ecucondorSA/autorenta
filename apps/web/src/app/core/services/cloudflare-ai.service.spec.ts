import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CloudflareAiService } from './cloudflare-ai.service';

describe('CloudflareAiService', () => {
  let component: CloudflareAiService;
  let fixture: ComponentFixture<CloudflareAiService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloudflareAiService],
    }).compileComponents();

    fixture = TestBed.createComponent(CloudflareAiService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
