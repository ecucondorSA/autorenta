import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export type SoundType = 'click' | 'tick' | 'swoosh' | 'success' | 'pop';

type WebkitAudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext };

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private readonly logger = inject(LoggerService);
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      const AudioContextCtor =
        window.AudioContext || (window as WebkitAudioContextWindow).webkitAudioContext;
      if (AudioContextCtor) {
        this.audioCtx = new AudioContextCtor();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.3; // System volume
        this.masterGain.connect(this.audioCtx.destination);
      }
    } catch (e) {
      this.logger.warn('Web Audio API not supported', 'SoundService', e);
    }
  }

  play(type: SoundType) {
    if (this.isMuted || !this.audioCtx || !this.masterGain) return;

    // Resume context if suspended (browser policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    switch (type) {
      case 'click':
        this.playClick();
        this.vibrate(10);
        break;
      case 'tick':
        this.playTick();
        this.vibrate(5);
        break;
      case 'pop':
        this.playPop();
        this.vibrate(15);
        break;
      case 'swoosh':
        this.playSwoosh();
        // No haptic for swoosh usually
        break;
      case 'success':
        this.playSuccess();
        this.vibrate([10, 30, 10, 30]);
        break;
    }
  }

  vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  private playClick() {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  private playTick() {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Wood-block-ish tick
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);

    gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.02);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.02);
  }

  private playPop() {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  private playSwoosh() {
    // White noise buffer
    if (!this.audioCtx || !this.masterGain) return;
    const bufferSize = this.audioCtx.sampleRate * 0.3; // 300ms
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(800, this.audioCtx.currentTime + 0.2);
    filter.frequency.linearRampToValueAtTime(200, this.audioCtx.currentTime + 0.3);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime); // Quiet
    gain.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  private playSuccess() {
    if (!this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;

    // Simple C Major Chord
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.5);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.6);
    });
  }
}
