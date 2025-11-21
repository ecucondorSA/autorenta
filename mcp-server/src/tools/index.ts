import type { MCPServer } from '../lib/server.js';
import type { SupabaseClient } from '../lib/supabase.js';
import type { AuditClient } from '../lib/audit-client.js';
import { registerAuditTools } from './audit.js';
import { z } from 'zod';

// Types for Cloudflare API responses
interface CloudflareError {
  code: number;
  message: string;
  error_chain?: CloudflareError[];
}

interface CloudflareZone {
  id: string;
  name: string;
}

interface CloudflareDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  created_on?: string;
}

interface CloudflareAPIResponse<T> {
  success: boolean;
  result: T;
  errors?: CloudflareError[];
  messages?: string[];
}

export function registerTools(server: MCPServer, supabase: SupabaseClient, audit?: AuditClient) {
  // Register audit tools if audit client is provided
  if (audit) {
    registerAuditTools(server, audit);
  }
  // Tool: Aprobar una reserva pendiente
  server.registerTool(
    'approve_booking',
    async (args: any) => {
      const schema = z.object({
        bookingId: z.string().uuid('Invalid booking ID format')
      });

      const { bookingId } = schema.parse(args);
      const result = await supabase.updateBookingStatus(bookingId, 'approved');

      return {
        success: true,
        message: `Booking ${bookingId} approved successfully`,
        booking: {
          id: result.id,
          status: result.status,
          updated_at: result.updated_at
        }
      };
    },
    {
      description: 'Aprobar una reserva pendiente',
      inputSchema: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID de la reserva a aprobar'
          }
        },
        required: ['bookingId']
      }
    }
  );

  // Tool: Rechazar una reserva
  server.registerTool(
    'reject_booking',
    async (args: any) => {
      const schema = z.object({
        bookingId: z.string().uuid(),
        reason: z.string().optional()
      });

      const { bookingId, reason } = schema.parse(args);
      const result = await supabase.updateBookingStatus(bookingId, 'cancelled');

      return {
        success: true,
        message: `Booking ${bookingId} rejected`,
        reason: reason || 'No reason provided',
        booking: {
          id: result.id,
          status: result.status,
          updated_at: result.updated_at
        }
      };
    },
    {
      description: 'Rechazar una reserva',
      inputSchema: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID de la reserva'
          },
          reason: {
            type: 'string',
            description: 'Razón del rechazo (opcional)'
          }
        },
        required: ['bookingId']
      }
    }
  );

  // Tool: Bloquear disponibilidad de un auto
  server.registerTool(
    'block_car_availability',
    async (args: any) => {
      const schema = z.object({
        carId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string()
      });

      const { carId, startDate, endDate, reason } = schema.parse(args);
      const result = await supabase.createCarAvailabilityBlock(
        carId,
        startDate,
        endDate,
        reason
      );

      return {
        success: true,
        message: `Availability blocked for car ${carId}`,
        block: {
          id: result.id,
          car_id: result.car_id,
          start_date: result.start_date,
          end_date: result.end_date,
          reason: result.reason
        }
      };
    },
    {
      description: 'Bloquear la disponibilidad de un auto para ciertas fechas',
      inputSchema: {
        type: 'object',
        properties: {
          carId: {
            type: 'string',
            description: 'ID del auto'
          },
          startDate: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          },
          reason: {
            type: 'string',
            description: 'Razón del bloqueo'
          }
        },
        required: ['carId', 'startDate', 'endDate', 'reason']
      }
    }
  );

  // Tool: Generar reporte de ingresos
  server.registerTool(
    'generate_revenue_report',
    async (args: any) => {
      const schema = z.object({
        ownerId: z.string().uuid().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      });

      const { ownerId, startDate, endDate } = schema.parse(args);
      const client = supabase.getClient();

      // Query para obtener transacciones
      let query = client
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'payment_received')
        .eq('status', 'completed');

      if (ownerId) {
        query = query.eq('user_id', ownerId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const transactionCount = transactions?.length || 0;
      const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

      return {
        report: {
          period: {
            start: startDate || 'all-time',
            end: endDate || 'current'
          },
          owner_id: ownerId || 'platform-wide',
          metrics: {
            total_revenue: totalRevenue,
            transaction_count: transactionCount,
            average_transaction: averageTransaction,
            currency: 'ARS'
          },
          top_transactions: transactions
            ?.sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map(t => ({
              id: t.id,
              amount: t.amount,
              date: t.created_at,
              description: t.description
            }))
        }
      };
    },
    {
      description: 'Generar reporte de ingresos',
      inputSchema: {
        type: 'object',
        properties: {
          ownerId: {
            type: 'string',
            description: 'ID del propietario (opcional, para reporte específico)'
          },
          startDate: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          }
        }
      }
    }
  );

  // Tool: Buscar usuario por email o nombre
  server.registerTool(
    'find_user',
    async (args: any) => {
      const schema = z.object({
        query: z.string().min(3)
      });

      const { query } = schema.parse(args);
      const client = supabase.getClient();

      const { data: users, error } = await client
        .from('profiles')
        .select('id, full_name, email, role, verification_status')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      return {
        query,
        results_count: users?.length || 0,
        users: users?.map(u => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          role: u.role,
          verified: u.verification_status === 'verified'
        }))
      };
    },
    {
      description: 'Buscar usuario por email o nombre',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda (email o nombre)'
          }
        },
        required: ['query']
      }
    }
  );

  // Tool: Obtener disponibilidad de un auto
  server.registerTool(
    'check_car_availability',
    async (args: any) => {
      const schema = z.object({
        carId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      });

      const { carId, startDate, endDate } = schema.parse(args);
      const client = supabase.getClient();

      // Verificar bookings existentes
      const { data: bookings, error } = await client
        .from('bookings')
        .select('id, start_date, end_date, status')
        .eq('car_id', carId)
        .in('status', ['approved', 'active'])
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      if (error) throw error;

      // Verificar bloqueos manuales
      const { data: blocks, error: blocksError } = await client
        .from('car_availability')
        .select('*')
        .eq('car_id', carId)
        .eq('is_available', false)
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      if (blocksError) throw blocksError;

      const isAvailable = (!bookings || bookings.length === 0) &&
                          (!blocks || blocks.length === 0);

      return {
        car_id: carId,
        period: {
          start: startDate,
          end: endDate
        },
        is_available: isAvailable,
        conflicts: {
          bookings: bookings?.map(b => ({
            id: b.id,
            start: b.start_date,
            end: b.end_date,
            status: b.status
          })) || [],
          blocks: blocks?.map(b => ({
            start: b.start_date,
            end: b.end_date,
            reason: b.reason
          })) || []
        }
      };
    },
    {
      description: 'Verificar disponibilidad de un auto para fechas específicas',
      inputSchema: {
        type: 'object',
        properties: {
          carId: {
            type: 'string',
            description: 'ID del auto'
          },
          startDate: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          }
        },
        required: ['carId', 'startDate', 'endDate']
      }
    }
  );

  // Tool: Limpiar caché
  server.registerTool(
    'clear_cache',
    async (args: any) => {
      const schema = z.object({
        prefix: z.string().optional()
      });

      const { prefix } = schema.parse(args);
      supabase.clearCache(prefix);

      return {
        success: true,
        message: prefix
          ? `Cache cleared for prefix: ${prefix}`
          : 'All cache cleared',
        timestamp: new Date().toISOString()
      };
    },
    {
      description: 'Limpiar caché del servidor MCP',
      inputSchema: {
        type: 'object',
        properties: {
          prefix: {
            type: 'string',
            description: 'Prefijo de caché a limpiar (opcional)'
          }
        }
      }
    }
  );

  // Tool: Agregar registro DNS en Cloudflare
  server.registerTool(
    'add_cloudflare_dns_record',
    async (args: any) => {
      const schema = z.object({
        domain: z.string().min(1, 'Domain is required'),
        type: z.enum(['TXT', 'A', 'AAAA', 'CNAME', 'MX', 'NS']).default('TXT'),
        name: z.string().default('@'),
        content: z.string().min(1, 'Content is required'),
        ttl: z.number().optional().default(3600),
        comment: z.string().optional()
      });

      const { domain, type, name, content, ttl, comment } = schema.parse(args);

      // Obtener API token de Cloudflare desde variables de entorno
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;
      if (!apiToken) {
        throw new Error('CLOUDFLARE_API_TOKEN environment variable is required. Get it from: https://dash.cloudflare.com/profile/api-tokens');
      }

      // Obtener Zone ID
      const zoneResponse = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!zoneResponse.ok) {
        const error = await zoneResponse.json() as CloudflareAPIResponse<null>;
        throw new Error(`Failed to get zone ID: ${error.errors?.[0]?.message || zoneResponse.statusText}`);
      }

      const zoneData = await zoneResponse.json() as CloudflareAPIResponse<CloudflareZone[]>;
      if (!zoneData.success || !zoneData.result || zoneData.result.length === 0) {
        throw new Error(`Domain ${domain} not found in Cloudflare. Make sure it's added to your account.`);
      }

      const zoneId = zoneData.result[0].id;

      // Verificar si el registro ya existe
      const existingResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${type}&name=${name === '@' ? domain : `${name}.${domain}`}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (existingResponse.ok) {
        const existingData = await existingResponse.json() as CloudflareAPIResponse<CloudflareDNSRecord[]>;
        if (existingData.result && existingData.result.length > 0) {
          // Verificar si es el mismo contenido
          const existingRecord = existingData.result.find((r) => r.content === content);
          if (existingRecord) {
            return {
              success: true,
              message: `DNS record already exists`,
              record: {
                id: existingRecord.id,
                type: existingRecord.type,
                name: existingRecord.name,
                content: existingRecord.content,
                ttl: existingRecord.ttl
              }
            };
          }
        }
      }

      // Agregar el registro DNS
      const addResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          name: name === '@' ? domain : `${name}.${domain}`,
          content,
          ttl,
          comment: comment || `Added via MCP - ${new Date().toISOString()}`
        })
      });

      if (!addResponse.ok) {
        const error = await addResponse.json() as CloudflareAPIResponse<null>;
        throw new Error(`Failed to add DNS record: ${error.errors?.[0]?.message || addResponse.statusText}`);
      }

      const addData = await addResponse.json() as CloudflareAPIResponse<CloudflareDNSRecord>;
      if (!addData.success) {
        throw new Error(`Failed to add DNS record: ${addData.errors?.[0]?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        message: `DNS ${type} record added successfully for ${domain}`,
        record: {
          id: addData.result.id,
          type: addData.result.type,
          name: addData.result.name,
          content: addData.result.content,
          ttl: addData.result.ttl,
          proxied: addData.result.proxied,
          created_at: addData.result.created_on
        },
        note: 'Wait 5-10 minutes for DNS propagation before verifying in TikTok Developers'
      };
    },
    {
      description: 'Agregar un registro DNS en Cloudflare (TXT, A, CNAME, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Dominio en Cloudflare (ej: autorentar.com)'
          },
          type: {
            type: 'string',
            enum: ['TXT', 'A', 'AAAA', 'CNAME', 'MX', 'NS'],
            description: 'Tipo de registro DNS',
            default: 'TXT'
          },
          name: {
            type: 'string',
            description: 'Nombre del registro (@ para dominio raíz)',
            default: '@'
          },
          content: {
            type: 'string',
            description: 'Contenido del registro DNS'
          },
          ttl: {
            type: 'number',
            description: 'TTL en segundos (3600 = 1 hora)',
            default: 3600
          },
          comment: {
            type: 'string',
            description: 'Comentario opcional para el registro'
          }
        },
        required: ['domain', 'content']
      }
    }
  );

  console.error('Tools registered successfully');
}
