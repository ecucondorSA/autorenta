#!/usr/bin/env bun
/**
 * EXTRACTOR PROFESIONAL DE HISTORIAL COMPLETO DE WHATSAPP
 * Usa la sesión activa de Evolution API/Baileys para extraer TODOS los chats y mensajes
 */

const API_KEY = '7d0d63e938c69bb8db9e3ca64f8d2bed2135266fa3c0c925c93dbfebe7f6f68f';
const BASE_URL = 'http://localhost:8080';
const INSTANCE = 'autorentar-main';

interface Message {
  id: string;
  from: string;
  to?: string;
  text?: string;
  timestamp: number;
  isFromMe: boolean;
  type: string;
}

interface Chat {
  id: string;
  name: string;
  messages: Message[];
  messageCount: number;
  lastMessageTime: number;
}

interface ExportResult {
  exportDate: string;
  totalChats: number;
  totalMessages: number;
  chats: Chat[];
}

console.log('🔍 EXTRACTOR PROFESIONAL DE WHATSAPP\n');

/**
 * Método 1: Conectar directamente al contenedor Docker y acceder a la base de datos PostgreSQL
 */
async function extractFromDatabase(): Promise<ExportResult> {
  console.log('📊 Método 1: Extrayendo desde PostgreSQL...\n');

  try {
    // Obtener ID de la instancia
    const instanceQuery = `
      SELECT id, name FROM evolution_api."Instance"
      WHERE name = '${INSTANCE}' LIMIT 1;
    `;

    const instanceResult = await Bun.spawn([
      'docker', 'exec', 'evolution_postgres',
      'psql', '-U', 'evolution_user', '-d', 'evolution_db',
      '-t', '-A', '-c', instanceQuery
    ]).text();

    if (!instanceResult.trim()) {
      console.log('❌ No se encontró la instancia en la base de datos\n');
      return { exportDate: new Date().toISOString(), totalChats: 0, totalMessages: 0, chats: [] };
    }

    const [instanceId] = instanceResult.trim().split('|');
    console.log(`✅ Instancia encontrada: ${instanceId}\n`);

    // Contar chats
    const chatCountQuery = `
      SELECT COUNT(*) FROM evolution_api."Chat"
      WHERE "instanceId" = '${instanceId}';
    `;

    const chatCount = await Bun.spawn([
      'docker', 'exec', 'evolution_postgres',
      'psql', '-U', 'evolution_user', '-d', 'evolution_db',
      '-t', '-A', '-c', chatCountQuery
    ]).text();

    console.log(`📊 Total de chats en DB: ${chatCount.trim()}\n`);

    // Contar mensajes
    const messageCountQuery = `
      SELECT COUNT(*) FROM evolution_api."Message"
      WHERE "instanceId" = '${instanceId}';
    `;

    const messageCount = await Bun.spawn([
      'docker', 'exec', 'evolution_postgres',
      'psql', '-U', 'evolution_user', '-d', 'evolution_db',
      '-t', '-A', '-c', messageCountQuery
    ]).text();

    console.log(`💬 Total de mensajes en DB: ${messageCount.trim()}\n`);

    // Si hay mensajes, extraerlos
    if (parseInt(messageCount.trim()) > 0) {
      console.log('📥 Extrayendo mensajes desde PostgreSQL...\n');

      // Obtener todos los chats con sus mensajes
      const extractQuery = `
        SELECT
          c.id as chat_id,
          c."remoteJid" as chat_remote_jid,
          m.id as message_id,
          m."keyRemoteJid" as message_remote_jid,
          m."keyFromMe" as is_from_me,
          m."messageTimestamp" as timestamp,
          m."message" as message_content,
          m."pushName" as push_name
        FROM evolution_api."Chat" c
        LEFT JOIN evolution_api."Message" m ON m."keyRemoteJid" = c."remoteJid"
        WHERE c."instanceId" = '${instanceId}'
        ORDER BY c."remoteJid", m."messageTimestamp" DESC
        LIMIT 10000;
      `;

      const messages = await Bun.spawn([
        'docker', 'exec', 'evolution_postgres',
        'psql', '-U', 'evolution_user', '-d', 'evolution_db',
        '-t', '-A', '-F', '|', '-c', extractQuery
      ]).text();

      // Parsear resultados
      const chatsMap = new Map<string, Chat>();

      for (const line of messages.trim().split('\n')) {
        if (!line) continue;

        const [chatId, chatRemoteJid, messageId, messageRemoteJid, isFromMe, timestamp, messageContent, pushName] = line.split('|');

        if (!chatsMap.has(chatRemoteJid)) {
          chatsMap.set(chatRemoteJid, {
            id: chatRemoteJid,
            name: pushName || chatRemoteJid,
            messages: [],
            messageCount: 0,
            lastMessageTime: 0,
          });
        }

        const chat = chatsMap.get(chatRemoteJid)!;

        if (messageId) {
          chat.messages.push({
            id: messageId,
            from: messageRemoteJid,
            text: messageContent,
            timestamp: parseInt(timestamp),
            isFromMe: isFromMe === 't',
            type: 'text',
          });
          chat.messageCount++;
          chat.lastMessageTime = Math.max(chat.lastMessageTime, parseInt(timestamp));
        }
      }

      return {
        exportDate: new Date().toISOString(),
        totalChats: chatsMap.size,
        totalMessages: parseInt(messageCount.trim()),
        chats: Array.from(chatsMap.values()),
      };
    }

    return {
      exportDate: new Date().toISOString(),
      totalChats: parseInt(chatCount.trim()),
      totalMessages: 0,
      chats: [],
    };

  } catch (error) {
    console.error('❌ Error extrayendo desde base de datos:', error);
    return { exportDate: new Date().toISOString(), totalChats: 0, totalMessages: 0, chats: [] };
  }
}

/**
 * Método 2: Forzar sincronización a través de la API
 */
async function forceSyncViaAPI(): Promise<void> {
  console.log('\n🔄 Método 2: Forzando sincronización via API...\n');

  // Reiniciar instancia con syncFullHistory habilitado
  console.log('⚙️ Configurando syncFullHistory: true...\n');

  const settingsPayload = {
    rejectCall: false,
    msgCall: '',
    groupsIgnore: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: true,
  };

  try {
    const response = await fetch(`${BASE_URL}/settings/set/${INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsPayload),
    });

    if (response.ok) {
      console.log('✅ syncFullHistory habilitado\n');
    } else {
      console.log(`⚠️ No se pudo habilitar syncFullHistory: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`❌ Error configurando settings: ${error}\n`);
  }

  console.log('💡 TIP: La sincronización completa puede tomar varios minutos.\n');
  console.log('   Los mensajes se sincronizarán en background y aparecerán en la base de datos.\n');
}

/**
 * Main
 */
async function main() {
  console.log('='.repeat(60));
  console.log('EXTRACTOR PROFESIONAL DE HISTORIAL DE WHATSAPP');
  console.log('='.repeat(60));
  console.log('');

  // Primero, forzar sincronización
  await forceSyncViaAPI();

  // Luego, extraer lo que ya está en la base de datos
  const result = await extractFromDatabase();

  // Guardar resultados
  const outputFile = '/home/edu/autorenta/tools/whatsapp-context/whatsapp-export.json';
  await Bun.write(outputFile, JSON.stringify(result, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('RESULTADOS');
  console.log('='.repeat(60));
  console.log(`📊 Total de chats: ${result.totalChats}`);
  console.log(`💬 Total de mensajes: ${result.totalMessages}`);
  console.log(`📁 Archivo generado: ${outputFile}`);
  console.log('');

  if (result.totalMessages === 0) {
    console.log('⚠️  NO HAY MENSAJES EN LA BASE DE DATOS AÚN\n');
    console.log('Posibles razones:');
    console.log('1. La sincronización inicial todavía no comenzó');
    console.log('2. Baileys solo sincroniza mensajes que llegan DESPUÉS de conectar');
    console.log('3. Necesitás recibir al menos 1 mensaje nuevo para disparar la sincronización\n');
    console.log('💡 SOLUCIÓN: Enviate un mensaje de prueba desde otro teléfono');
    console.log('   y ejecutá este script nuevamente en 1 minuto.\n');
  } else {
    console.log('✅ Datos extraídos exitosamente!\n');

    // Mostrar primeros 3 chats como preview
    console.log('📋 Preview de los primeros chats:\n');
    for (const chat of result.chats.slice(0, 3)) {
      console.log(`  - ${chat.name} (${chat.messageCount} mensajes)`);
    }
    console.log('');
  }
}

main().catch(console.error);
