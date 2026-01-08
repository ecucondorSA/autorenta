import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

type KeyState = 'locked' | 'unlocking' | 'unlocked' | 'locking';

@Component({
  selector: 'app-digital-key',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './digital-key.component.html',
})
export class DigitalKeyComponent {
  // Mock state - in real implementation this would connect to Web Bluetooth
  readonly keyState = signal<KeyState>('locked');
  readonly isAvailable = signal(false); // Feature not available yet

  get isLocked(): boolean {
    return this.keyState() === 'locked';
  }

  get isUnlocked(): boolean {
    return this.keyState() === 'unlocked';
  }

  get isTransitioning(): boolean {
    return this.keyState() === 'unlocking' || this.keyState() === 'locking';
  }

  get buttonLabel(): string {
    switch (this.keyState()) {
      case 'locked':
        return 'Desbloquear';
      case 'unlocking':
        return 'Desbloqueando...';
      case 'unlocked':
        return 'Bloquear';
      case 'locking':
        return 'Bloqueando...';
      default:
        return 'Desbloquear';
    }
  }

  toggleLock(): void {
    if (!this.isAvailable() || this.isTransitioning) return;

    if (this.isLocked) {
      this.keyState.set('unlocking');
      // Simulate unlock delay
      setTimeout(() => {
        this.keyState.set('unlocked');
      }, 2000);
    } else {
      this.keyState.set('locking');
      // Simulate lock delay
      setTimeout(() => {
        this.keyState.set('locked');
      }, 2000);
    }
  }
}
