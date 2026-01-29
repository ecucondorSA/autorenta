import { TestBed } from '@angular/core/testing';
import { RentarfastAgentService } from '@core/services/ai/rentarfast-agent.service';
import { testProviders } from '@app/testing/test-providers';

describe('RentarfastAgentService', () => {
  let service: RentarfastAgentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, RentarfastAgentService],
    });
    service = TestBed.inject(RentarfastAgentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have sendMessageRealtime method', () => {
    expect(typeof service.sendMessageRealtime).toBe('function');
  });

  it('should have sendMessageRealtimeWithContext method', () => {
    expect(typeof service.sendMessageRealtimeWithContext).toBe('function');
  });

  it('should have addLocalAgentMessage method', () => {
    expect(typeof service.addLocalAgentMessage).toBe('function');
  });

  it('should have addLocalUserMessage method', () => {
    expect(typeof service.addLocalUserMessage).toBe('function');
  });

  it('should have updateMessageContent method', () => {
    expect(typeof service.updateMessageContent).toBe('function');
  });

  it('should have startRecording method', () => {
    expect(typeof service.startRecording).toBe('function');
  });

  it('should have sendAudioChunk method', () => {
    expect(typeof service.sendAudioChunk).toBe('function');
  });

  it('should have stopRecording method', () => {
    expect(typeof service.stopRecording).toBe('function');
  });

  it('should have sendMessage method', () => {
    expect(typeof service.sendMessage).toBe('function');
  });

  it('should have clearHistory method', () => {
    expect(typeof service.clearHistory).toBe('function');
  });
});
