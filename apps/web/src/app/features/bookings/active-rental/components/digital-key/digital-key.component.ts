import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, Input, inject, computed } from '@angular/core';
import { BluetoothKeyService } from '@app/core/services/bluetooth-key.service';

@Component({
  selector: 'app-digital-key',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './digital-key.component.html',
})
export class DigitalKeyComponent {
  // Services
  private bluetoothService = inject(BluetoothKeyService);

  // Computed from Service
  isUnlocked = computed(() => this.bluetoothService.lockState() === 'unlocked');
  isLoading = computed(
    () =>
      this.bluetoothService.lockState() === 'unlocking' ||
      this.bluetoothService.lockState() === 'locking',
  );
  connectionState = this.bluetoothService.connectionState;

  // Inputs
  @Input() carName = 'Tesla Model 3'; // Example default

  constructor() {
    // Debug: Auto-connect attempt on init if needed, or leave manual
  }

  get isLocked(): boolean {
    return this.bluetoothService.lockState() === 'locked';
  }

  get buttonLabel(): string {
    switch (this.bluetoothService.lockState()) {
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

  toggleLock() {
    if (this.bluetoothService.connectionState() !== 'connected') {
      this.bluetoothService.connect();
      return;
    }
    this.bluetoothService.toggleLock();
  }
}
