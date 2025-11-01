import { Injectable, signal } from '@angular/core';

/**
 * 🔊 Service for playing notification sounds
 * Handles audio playback with proper error handling and user interaction requirements
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationSoundService {
  private readonly audioContext?: AudioContext;
  private readonly isSoundEnabled = signal(true);
  private hasUserInteracted = false;

  constructor() {
    // Initialize AudioContext (modern approach)
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        this.audioContext = new AudioContext();
      } catch (e) {
        console.warn('AudioContext not available:', e);
      }
    }

    // Track user interaction (required for autoplay)
    if (typeof window !== 'undefined') {
      const markInteraction = () => {
        this.hasUserInteracted = true;
        // Resume audio context if suspended
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      };

      window.addEventListener('click', markInteraction, { once: true });
      window.addEventListener('touchstart', markInteraction, { once: true });
      window.addEventListener('keydown', markInteraction, { once: true });
    }
  }

  /**
   * Play a notification sound
   * Uses Web Audio API to generate a pleasant notification tone
   */
  async playNotificationSound(): Promise<void> {
    if (!this.isSoundEnabled() || !this.hasUserInteracted) {
      return;
    }

    try {
      if (this.audioContext) {
        await this.playWithWebAudio();
      } else {
        await this.playWithAudioElement();
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Play using Web Audio API (preferred - more control)
   */
  private async playWithWebAudio(): Promise<void> {
    if (!this.audioContext) return;

    // Resume context if suspended (iOS requirement)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const duration = 0.15;

    // Create oscillator for the tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure pleasant notification sound (two-tone)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.setValueAtTime(1000, now + duration);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 2);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration * 2);
  }

  /**
   * Fallback: Play using Audio element
   */
  private async playWithAudioElement(): Promise<void> {
    // Create a data URL for a simple beep sound
    const audio = new Audio(
      'data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==',
    );
    audio.volume = 0.3;
    await audio.play();
  }

  /**
   * Play a message sent sound (different tone)
   */
  async playMessageSentSound(): Promise<void> {
    if (!this.isSoundEnabled() || !this.hasUserInteracted || !this.audioContext) {
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const duration = 0.1;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Lower, softer tone for sent messages
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('Failed to play sent sound:', error);
    }
  }

  /**
   * Toggle sound on/off
   */
  toggleSound(): boolean {
    this.isSoundEnabled.update((enabled) => !enabled);
    return this.isSoundEnabled();
  }

  /**
   * Get current sound state
   */
  isSoundEnabledSignal() {
    return this.isSoundEnabled;
  }

  /**
   * Enable sound
   */
  enableSound(): void {
    this.isSoundEnabled.set(true);
  }

  /**
   * Disable sound
   */
  disableSound(): void {
    this.isSoundEnabled.set(false);
  }
}
