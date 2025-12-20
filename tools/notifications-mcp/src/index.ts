#!/usr/bin/env node
/**
 * AutoRenta Notifications MCP Server
 *
 * Permite enviar notificaciones personalizadas a usuarios de AutoRenta
 * desde Claude Code.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ4Mjc4MywiZXhwIjoyMDc4MDU4NzgzfQ.SiACo6rXnbu0B091FZEgmyoXK0-EzxKd9YeO4pls0eQ';

// Notification types available
const NOTIFICATION_TYPES = [
  'welcome',
  'verification_approved',
  'verification_rejected',
  'new_booking_for_owner',
  'booking_cancelled_for_owner',
  'booking_cancelled_for_renter',
  'new_chat_message',
  'payment_successful',
  'payout_successful',
  'inspection_reminder',
  'generic_announcement',
  'mp_onboarding_required',
  'booking_reminder_24h',
  'booking_reminder_2h',
  'document_expiry_license',
  'owner_inactive_reminder',
  'optimization_tip',
  'booking_ended_review',
  'monthly_report',
  'nearby_cars',
  'car_views_milestone',
  'car_recommendation',
  'renter_tip',
  'price_drop_alert',
  'favorite_car_available',
  'pending_requests_reminder',
] as const;

type NotificationType = typeof NOTIFICATION_TYPES[number];

// Initialize Supabase client
let supabase: SupabaseClient;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// Tool definitions
const tools: Tool[] = [
  {
    name: 'send_notification',
    description: `Envía una notificación personalizada a un usuario específico de AutoRenta.

Tipos disponibles: ${NOTIFICATION_TYPES.join(', ')}

Ejemplos de uso:
- Notificar a un usuario sobre una promoción
- Enviar recordatorio personalizado
- Comunicar actualizaciones importantes`,
    inputSchema: {
      type: 'object',
      properties: {
        user_email: {
          type: 'string',
          description: 'Email del usuario destinatario',
        },
        user_id: {
          type: 'string',
          description: 'ID del usuario (alternativa al email)',
        },
        title: {
          type: 'string',
          description: 'Título de la notificación (puede incluir emojis)',
        },
        body: {
          type: 'string',
          description: 'Cuerpo/mensaje de la notificación',
        },
        type: {
          type: 'string',
          enum: NOTIFICATION_TYPES as unknown as string[],
          description: 'Tipo de notificación',
          default: 'generic_announcement',
        },
        cta_link: {
          type: 'string',
          description: 'Link al que redirige el botón "Ver detalles" (ej: /profile, /bookings/123)',
        },
      },
      required: ['title', 'body'],
      oneOf: [
        { required: ['user_email'] },
        { required: ['user_id'] },
      ],
    },
  },
  {
    name: 'broadcast_notification',
    description: `Envía una notificación a múltiples usuarios según criterios.

Criterios disponibles:
- all: Todos los usuarios
- owners: Solo propietarios (tienen autos publicados)
- renters: Solo inquilinos (han hecho reservas)
- verified: Solo usuarios verificados
- unverified: Usuarios sin verificar`,
    inputSchema: {
      type: 'object',
      properties: {
        audience: {
          type: 'string',
          enum: ['all', 'owners', 'renters', 'verified', 'unverified'],
          description: 'Audiencia objetivo',
        },
        title: {
          type: 'string',
          description: 'Título de la notificación',
        },
        body: {
          type: 'string',
          description: 'Cuerpo del mensaje',
        },
        type: {
          type: 'string',
          enum: NOTIFICATION_TYPES as unknown as string[],
          default: 'generic_announcement',
        },
        cta_link: {
          type: 'string',
          description: 'Link de acción',
        },
        limit: {
          type: 'number',
          description: 'Límite de usuarios (para pruebas)',
          default: 100,
        },
      },
      required: ['audience', 'title', 'body'],
    },
  },
  {
    name: 'list_notifications',
    description: 'Lista las notificaciones recientes de un usuario o del sistema',
    inputSchema: {
      type: 'object',
      properties: {
        user_email: {
          type: 'string',
          description: 'Email del usuario (opcional)',
        },
        type: {
          type: 'string',
          description: 'Filtrar por tipo',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima',
          default: 20,
        },
        unread_only: {
          type: 'boolean',
          description: 'Solo no leídas',
          default: false,
        },
      },
    },
  },
  {
    name: 'get_notification_stats',
    description: 'Obtiene estadísticas de notificaciones del sistema',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Días hacia atrás para las estadísticas',
          default: 7,
        },
      },
    },
  },
  {
    name: 'list_users',
    description: 'Lista usuarios para seleccionar destinatarios de notificaciones',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Buscar por nombre o email',
        },
        filter: {
          type: 'string',
          enum: ['all', 'owners', 'renters', 'verified'],
          default: 'all',
        },
        limit: {
          type: 'number',
          default: 20,
        },
      },
    },
  },
  {
    name: 'delete_notification',
    description: 'Elimina una notificación específica por ID',
    inputSchema: {
      type: 'object',
      properties: {
        notification_id: {
          type: 'string',
          description: 'ID de la notificación a eliminar',
        },
      },
      required: ['notification_id'],
    },
  },
];

// Tool handlers
async function sendNotification(args: {
  user_email?: string;
  user_id?: string;
  title: string;
  body: string;
  type?: NotificationType;
  cta_link?: string;
}): Promise<string> {
  const db = getSupabase();
  let userId = args.user_id;

  // Get user_id from email if provided
  if (args.user_email && !userId) {
    const { data: profile, error } = await db
      .from('profiles')
      .select('id, full_name')
      .eq('email', args.user_email)
      .single();

    if (error || !profile) {
      // Try auth.users
      const { data: authUser } = await db.auth.admin.listUsers();
      const user = authUser.users.find(u => u.email === args.user_email);
      if (!user) {
        return `Error: Usuario con email ${args.user_email} no encontrado`;
      }
      userId = user.id;
    } else {
      userId = profile.id;
    }
  }

  if (!userId) {
    return 'Error: Debes proporcionar user_email o user_id';
  }

  // Insert notification
  const { data, error } = await db
    .from('notifications')
    .insert({
      user_id: userId,
      title: args.title,
      body: args.body,
      type: args.type || 'generic_announcement',
      cta_link: args.cta_link || null,
      is_read: false,
      metadata: { sent_via: 'mcp', sent_at: new Date().toISOString() },
    })
    .select()
    .single();

  if (error) {
    return `Error al enviar notificación: ${error.message}`;
  }

  return `Notificación enviada exitosamente:
- ID: ${data.id}
- Usuario: ${userId}
- Título: ${args.title}
- Tipo: ${args.type || 'generic_announcement'}`;
}

async function broadcastNotification(args: {
  audience: 'all' | 'owners' | 'renters' | 'verified' | 'unverified';
  title: string;
  body: string;
  type?: NotificationType;
  cta_link?: string;
  limit?: number;
}): Promise<string> {
  const db = getSupabase();
  let query = db.from('profiles').select('id, full_name, email');

  // Apply audience filter
  switch (args.audience) {
    case 'owners':
      // Users who have cars
      const { data: ownerIds } = await db
        .from('cars')
        .select('owner_id')
        .eq('status', 'active');
      const uniqueOwnerIds = [...new Set(ownerIds?.map(c => c.owner_id) || [])];
      query = query.in('id', uniqueOwnerIds);
      break;
    case 'renters':
      // Users who have made bookings
      const { data: renterIds } = await db
        .from('bookings')
        .select('renter_id');
      const uniqueRenterIds = [...new Set(renterIds?.map(b => b.renter_id) || [])];
      query = query.in('id', uniqueRenterIds);
      break;
    case 'verified':
      query = query.eq('id_verified', true);
      break;
    case 'unverified':
      query = query.eq('id_verified', false);
      break;
    // 'all' - no filter needed
  }

  query = query.limit(args.limit || 100);

  const { data: users, error: usersError } = await query;

  if (usersError) {
    return `Error obteniendo usuarios: ${usersError.message}`;
  }

  if (!users || users.length === 0) {
    return 'No se encontraron usuarios con los criterios especificados';
  }

  // Create notifications for all users
  const notifications = users.map(user => ({
    user_id: user.id,
    title: args.title,
    body: args.body,
    type: args.type || 'generic_announcement',
    cta_link: args.cta_link || null,
    is_read: false,
    metadata: {
      sent_via: 'mcp_broadcast',
      audience: args.audience,
      sent_at: new Date().toISOString(),
    },
  }));

  const { data, error } = await db
    .from('notifications')
    .insert(notifications)
    .select('id');

  if (error) {
    return `Error enviando broadcast: ${error.message}`;
  }

  return `Broadcast enviado exitosamente:
- Audiencia: ${args.audience}
- Usuarios notificados: ${data?.length || 0}
- Título: ${args.title}
- Tipo: ${args.type || 'generic_announcement'}`;
}

async function listNotifications(args: {
  user_email?: string;
  type?: string;
  limit?: number;
  unread_only?: boolean;
}): Promise<string> {
  const db = getSupabase();
  let query = db
    .from('notifications')
    .select(`
      id,
      title,
      body,
      type,
      is_read,
      created_at,
      user_id,
      profiles!inner(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(args.limit || 20);

  if (args.user_email) {
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', args.user_email)
      .single();

    if (profile) {
      query = query.eq('user_id', profile.id);
    }
  }

  if (args.type) {
    query = query.eq('type', args.type);
  }

  if (args.unread_only) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return 'No se encontraron notificaciones';
  }

  const formatted = data.map((n: any) =>
    `- [${n.is_read ? 'Leída' : 'No leída'}] ${n.title}
   Tipo: ${n.type} | Usuario: ${n.profiles?.full_name || 'N/A'}
   Fecha: ${new Date(n.created_at).toLocaleString('es-AR')}
   ID: ${n.id}`
  ).join('\n\n');

  return `Notificaciones (${data.length}):\n\n${formatted}`;
}

async function getNotificationStats(args: { days?: number }): Promise<string> {
  const db = getSupabase();
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - (args.days || 7));

  // Get counts by type
  const { data: byType } = await db
    .from('notifications')
    .select('type')
    .gte('created_at', daysAgo.toISOString());

  // Get read/unread counts
  const { data: readStats } = await db
    .from('notifications')
    .select('is_read')
    .gte('created_at', daysAgo.toISOString());

  // Count by type
  const typeCounts: Record<string, number> = {};
  byType?.forEach((n: any) => {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  });

  const readCount = readStats?.filter((n: any) => n.is_read).length || 0;
  const unreadCount = readStats?.filter((n: any) => !n.is_read).length || 0;
  const total = readStats?.length || 0;

  const typeBreakdown = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `  - ${type}: ${count}`)
    .join('\n');

  return `Estadísticas de Notificaciones (últimos ${args.days || 7} días):

Total: ${total}
- Leídas: ${readCount} (${total > 0 ? Math.round(readCount / total * 100) : 0}%)
- No leídas: ${unreadCount} (${total > 0 ? Math.round(unreadCount / total * 100) : 0}%)

Por tipo:
${typeBreakdown || '  Sin datos'}`;
}

async function listUsers(args: {
  search?: string;
  filter?: 'all' | 'owners' | 'renters' | 'verified';
  limit?: number;
}): Promise<string> {
  const db = getSupabase();
  let query = db
    .from('profiles')
    .select('id, full_name, email, id_verified, created_at')
    .order('created_at', { ascending: false })
    .limit(args.limit || 20);

  if (args.search) {
    query = query.or(`full_name.ilike.%${args.search}%,email.ilike.%${args.search}%`);
  }

  if (args.filter === 'verified') {
    query = query.eq('id_verified', true);
  }

  const { data, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return 'No se encontraron usuarios';
  }

  const formatted = data.map((u: any) =>
    `- ${u.full_name || 'Sin nombre'}
   Email: ${u.email || 'N/A'}
   ID: ${u.id}
   Verificado: ${u.id_verified ? 'Sí' : 'No'}`
  ).join('\n\n');

  return `Usuarios (${data.length}):\n\n${formatted}`;
}

async function deleteNotification(args: { notification_id: string }): Promise<string> {
  const db = getSupabase();

  const { error } = await db
    .from('notifications')
    .delete()
    .eq('id', args.notification_id);

  if (error) {
    return `Error eliminando notificación: ${error.message}`;
  }

  return `Notificación ${args.notification_id} eliminada exitosamente`;
}

// Main server setup
async function main() {
  const server = new Server(
    {
      name: 'autorenta-notifications',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case 'send_notification':
          result = await sendNotification(args as any);
          break;
        case 'broadcast_notification':
          result = await broadcastNotification(args as any);
          break;
        case 'list_notifications':
          result = await listNotifications(args as any);
          break;
        case 'get_notification_stats':
          result = await getNotificationStats(args as any);
          break;
        case 'list_users':
          result = await listUsers(args as any);
          break;
        case 'delete_notification':
          result = await deleteNotification(args as any);
          break;
        default:
          result = `Herramienta desconocida: ${name}`;
      }

      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AutoRenta Notifications MCP Server running');
}

main().catch(console.error);
