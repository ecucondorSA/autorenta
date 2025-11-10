import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PwaService } from '../../../core/services/pwa.service';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-share-menu',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './share-menu.component.html',
  styleUrl: './share-menu.component.css',
})
export class ShareMenuComponent {
  @Input() title = '';
  @Input() text = '';
  @Input() url = '';

  private readonly shareService = inject(ShareService);
  private readonly toastService = inject(ToastService);

  readonly menuOpen = signal(false);
  readonly sharing = signal(false);

  constructor(public pwaService: PwaService) {}

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  async shareNative(): Promise<void> {
    this.sharing.set(true);

    // Usar ShareService que tiene mejor fallback
    const success = await this.shareService.share({
      title: this.title,
      text: this.text,
      url: this.url,
    });

    this.sharing.set(false);

    if (success) {
      this.menuOpen.set(false);
      this.toastService.success('Éxito', '¡Compartido exitosamente!');
    }
  }

  async shareWithContacts(): Promise<void> {
    this.sharing.set(true);

    const contacts = await this.pwaService.pickContacts(['name', 'email'], true);

    if (contacts && contacts.length > 0) {
      // Aquí podrías enviar emails o crear mensajes

      // Por ahora, mostrar mensaje de éxito
      alert(`Se compartirá con ${contacts.length} contacto(s)`);
      this.menuOpen.set(false);
    }

    this.sharing.set(false);
  }

  async copyLink(): Promise<void> {
    const success = await this.pwaService.writeToClipboard({
      text: this.url,
      html: `<a href="${this.url}">${this.title}</a>`,
    });

    if (success) {
      this.menuOpen.set(false);
      this.toastService.success('Éxito', 'Enlace copiado al portapapeles');
    }
  }
}
