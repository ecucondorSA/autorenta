import { Component, Input, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '@core/services/chat/chat.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-[500px] bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      
      <!-- Header -->
      <div class="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 class="font-bold text-gray-800">Mensajes</h3>
          <p class="text-xs text-gray-500">Comunicación segura end-to-end</p>
        </div>
        <div class="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Seguro
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50" #scrollContainer>
        @for (msg of messages(); track msg.id) {
          
          <!-- System Message -->
          @if (msg.is_system_message) {
            <div class="flex justify-center my-4">
              <span class="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">
                {{ msg.body }}
              </span>
            </div>
          } @else {
            <!-- User Message -->
            <div class="flex" [ngClass]="{'justify-end': msg.is_mine, 'justify-start': !msg.is_mine}">
              <div class="max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative group"
                [ngClass]="{
                  'bg-blue-600 text-white rounded-tr-none': msg.is_mine,
                  'bg-white text-gray-800 border border-gray-100 rounded-tl-none': !msg.is_mine
                }">
                
                <p class="text-sm">{{ msg.body }}</p>
                
                <!-- Meta info -->
                <div class="text-[10px] mt-1 flex items-center justify-end gap-1"
                  [ngClass]="{'text-blue-200': msg.is_mine, 'text-gray-400': !msg.is_mine}">
                  {{ msg.created_at | date:'HH:mm' }}
                  @if (msg.is_mine) {
                    <span>✓</span> <!-- Simple tick for sent -->
                  }
                </div>

                <!-- Warning if flagged -->
                @if (msg.is_flagged) {
                  <div class="absolute -bottom-5 right-0 text-[10px] text-orange-500 flex items-center gap-1">
                    ⚠️ Revisión de seguridad
                  </div>
                }
              </div>
            </div>
          }
        } @empty {
          <div class="h-full flex flex-col items-center justify-center text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <p class="text-sm">Inicia la conversación</p>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="p-4 bg-white border-t border-gray-100">
        <form (ngSubmit)="send()" class="flex gap-2">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="message"
            [disabled]="sending()"
            placeholder="Escribe un mensaje..." 
            class="flex-1 bg-gray-100 border-0 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            autocomplete="off"
          >
          <button 
            type="submit" 
            [disabled]="!newMessage.trim() || sending()"
            class="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md flex items-center justify-center w-12">
            @if (sending()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            } @else {
              <svg class="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            }
          </button>
        </form>
        <p class="text-[10px] text-gray-400 mt-2 text-center">
          Protegemos tus datos. No compartas teléfonos ni emails fuera de la plataforma.
        </p>
      </div>
    </div>
  `
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() bookingId?: string;
  @Input() carId?: string;
  @Input({ required: true }) recipientId!: string;

  private chatService = inject(ChatService);
  
  messages = this.chatService.messages;
  newMessage = '';
  sending = signal(false);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.chatService.loadMessages({ 
      bookingId: this.bookingId, 
      carId: this.carId 
    }).catch(err => console.error(err));
  }

  ngOnDestroy() {
    this.chatService.cleanup();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch {
      // Ignore scroll errors if container not ready
    }
  }

  async send() {
    if (!this.newMessage.trim()) return;

    this.sending.set(true);
    try {
      await this.chatService.sendMessage({
        bookingId: this.bookingId,
        carId: this.carId,
        recipientId: this.recipientId,
        body: this.newMessage
      });
      this.newMessage = '';
    } catch {
      // Error already handled by service toast
    } finally {
      this.sending.set(false);
    }
  }
}
