# Communication Experience Module

Este módulo centraliza todos los componentes y servicios relacionados con comunicación (chat, mensajería, notificaciones) según el blueprint de reorganización.

## Estructura

```
communication/
├── chat-shell/              # Componente base de chat (antes BaseChatComponent)
├── chat-context-wrappers/   # Wrappers específicos (booking-chat, car-chat)
├── conversation-surfaces/   # Badges y drawers de conversación (futuro)
├── contact-bridge/          # WhatsApp fallback y contacto alterno (futuro)
├── offline/                # Indicadores offline y cola de mensajes (futuro)
├── types/                  # Tipos compartidos (ChatContext, etc.)
└── index.ts                # Barrel exports
```

## Componentes

### ChatShellComponent
Componente base que unifica la UI y lógica compartida entre chats de booking y car.

**Ubicación anterior:** `shared/components/base-chat/`  
**Ubicación nueva:** `experiences/communication/chat-shell/`

**Selector:** `app-chat-shell`

### BookingChatWrapperComponent
Wrapper para chats de reservas. Construye el `ChatContext` y define reglas específicas.

**Ubicación anterior:** `shared/components/booking-chat/`  
**Ubicación nueva:** `experiences/communication/chat-context-wrappers/`

**Selector:** `app-booking-chat` (mantiene compatibilidad)

## Uso

```typescript
// Importar desde el barrel
import { 
  ChatShellComponent, 
  BookingChatWrapperComponent,
  type ChatContext 
} from '../../experiences/communication';

// O usar alias para compatibilidad
import { 
  BookingChatWrapperComponent as BookingChatComponent,
  ChatShellComponent as BaseChatComponent 
} from '../../experiences/communication';
```

## Migración

Los componentes antiguos en `shared/components/` pueden mantenerse temporalmente para compatibilidad, pero se recomienda migrar a la nueva estructura.

## Próximos Pasos (Fase 1)

- [ ] Crear `ConversationBadgeComponent` en `conversation-surfaces/`
- [ ] Crear `ConversationDrawerComponent` en `conversation-surfaces/`
- [ ] Mover `WhatsappFabComponent` a `contact-bridge/`
- [ ] Implementar indicadores offline en `offline/`
- [ ] Agregar outputs tipados (`typing`, `menu`) al ChatShellComponent
