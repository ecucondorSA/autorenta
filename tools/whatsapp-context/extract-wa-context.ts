#!/usr/bin/env bun

/**
 * WhatsApp Context Extractor - READ ONLY
 *
 * Extracts WhatsApp chat history from SQLite database for AI context.
 * DOES NOT send any messages - 100% read-only operation.
 *
 * Usage:
 *   bun extract-wa-context.ts export          # Export all chats
 *   bun extract-wa-context.ts stats           # Show statistics
 *   bun extract-wa-context.ts search "query"  # Search in chats
 *   bun extract-wa-context.ts read "name"     # Read specific chat
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ============================================
// CONFIGURATION
// ============================================

const DB_PATH_ANDROID = "/data/data/com.whatsapp/databases/msgstore.db";
const DB_PATH_BUSINESS = "/data/data/com.whatsapp.w4b/databases/msgstore.db";
const LOCAL_DB_PATH = "/tmp/msgstore.db";
const EXPORT_PATH = "/tmp/wa_context_export.json";

interface WhatsAppMessage {
  id: string;
  from: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  chatId: string;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  participants?: string[];
  lastMessageTime: string;
  messageCount: number;
  messages: WhatsAppMessage[];
}

interface WhatsAppContext {
  exportDate: string;
  totalChats: number;
  totalMessages: number;
  chats: WhatsAppChat[];
}

// ============================================
// DATABASE EXTRACTION
// ============================================

async function extractDatabase(): Promise<boolean> {
  console.log('[WA Context] Extracting WhatsApp database via ADB...');

  // Check if device is connected
  const checkDevice = Bun.spawn(['adb', 'devices'], { stdout: 'pipe' });
  const deviceOutput = await new Response(checkDevice.stdout).text();

  if (!deviceOutput.includes('device') || deviceOutput.split('\n').length < 3) {
    console.error('[WA Context] Error: No Android device connected');
    console.error('[WA Context] Connect device and enable USB debugging');
    return false;
  }

  console.log('[WA Context] Device connected ✓');

  // Try to pull database (first try regular WhatsApp, then Business)
  let success = false;

  for (const dbPath of [DB_PATH_ANDROID, DB_PATH_BUSINESS]) {
    console.log(`[WA Context] Trying to extract from ${dbPath}...`);

    const pullProc = Bun.spawn(['adb', 'pull', dbPath, LOCAL_DB_PATH], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await pullProc.exited;

    if (exitCode === 0) {
      console.log(`[WA Context] Successfully extracted database ✓`);
      success = true;
      break;
    }
  }

  if (!success) {
    console.error('[WA Context] Error: Could not extract database');
    console.error('[WA Context] Device might need root access or WhatsApp backup enabled');
    console.error('[WA Context] Alternative: Use WhatsApp > Chat > Export Chat feature');
    return false;
  }

  return true;
}

// ============================================
// DATABASE PARSING
// ============================================

function parseDatabase(): WhatsAppContext | null {
  if (!existsSync(LOCAL_DB_PATH)) {
    console.error(`[WA Context] Database not found at ${LOCAL_DB_PATH}`);
    return null;
  }

  console.log('[WA Context] Parsing database...');

  try {
    const db = new Database(LOCAL_DB_PATH, { readonly: true });

    // Get all chats
    const chatsQuery = db.query(`
      SELECT
        jid_row_id as id,
        display_name as name,
        subject,
        created_timestamp
      FROM chat
      WHERE hidden = 0
      ORDER BY sort_timestamp DESC
    `);

    const chats: WhatsAppChat[] = [];
    const chatRows = chatsQuery.all() as any[];

    console.log(`[WA Context] Found ${chatRows.length} chats`);

    for (const chatRow of chatRows) {
      const chatId = chatRow.id.toString();
      const isGroup = chatRow.subject != null;

      // Get messages for this chat
      const messagesQuery = db.query(`
        SELECT
          m._id as id,
          m.key_from_me as isFromMe,
          m.timestamp,
          m.text_data as text,
          m.sender_jid_row_id as senderId
        FROM message m
        WHERE m.chat_row_id = ?
          AND m.text_data IS NOT NULL
          AND m.text_data != ''
        ORDER BY m.timestamp DESC
        LIMIT 500
      `);

      const messageRows = messagesQuery.all(chatRow.id) as any[];

      const messages: WhatsAppMessage[] = messageRows.map((msg: any) => ({
        id: msg.id.toString(),
        from: msg.isFromMe ? 'me' : chatRow.name,
        text: msg.text || '',
        timestamp: new Date(msg.timestamp).toISOString(),
        isFromMe: msg.isFromMe === 1,
        chatId: chatId
      }));

      chats.push({
        id: chatId,
        name: chatRow.name || chatRow.subject || 'Unknown',
        isGroup,
        lastMessageTime: messages[0]?.timestamp || new Date(chatRow.created_timestamp).toISOString(),
        messageCount: messages.length,
        messages: messages.reverse() // Oldest first
      });
    }

    db.close();

    const totalMessages = chats.reduce((sum, chat) => sum + chat.messageCount, 0);

    return {
      exportDate: new Date().toISOString(),
      totalChats: chats.length,
      totalMessages,
      chats
    };

  } catch (error: any) {
    console.error('[WA Context] Error parsing database:', error.message);
    return null;
  }
}

// ============================================
// EXPORT & COMMANDS
// ============================================

async function exportContext(): Promise<void> {
  console.log('\n[WA Context] ========== EXPORT ==========\n');

  // Extract database from device
  const extracted = await extractDatabase();
  if (!extracted) {
    console.log('\n[WA Context] Trying alternative: Export from existing backup...');

    if (!existsSync(LOCAL_DB_PATH)) {
      console.error('[WA Context] No database available. Options:');
      console.error('  1. Connect Android device with USB debugging');
      console.error('  2. Place msgstore.db in /tmp/msgstore.db manually');
      console.error('  3. Use WhatsApp > Chat > Export Chat (then parse .txt)');
      return;
    }
  }

  // Parse database
  const context = parseDatabase();
  if (!context) {
    console.error('[WA Context] Failed to parse database');
    return;
  }

  // Save to JSON
  await Bun.write(EXPORT_PATH, JSON.stringify(context, null, 2));

  console.log('\n[WA Context] ========== COMPLETE ==========');
  console.log(`[WA Context] Total chats: ${context.totalChats}`);
  console.log(`[WA Context] Total messages: ${context.totalMessages}`);
  console.log(`[WA Context] Exported to: ${EXPORT_PATH}`);
  console.log(`[WA Context] File size: ${(await Bun.file(EXPORT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
}

async function showStats(): Promise<void> {
  if (!existsSync(EXPORT_PATH)) {
    console.error('[WA Context] No export found. Run: bun extract-wa-context.ts export');
    return;
  }

  const context: WhatsAppContext = await Bun.file(EXPORT_PATH).json();

  console.log('\n[WA Context] Statistics\n');
  console.log(`Export date: ${new Date(context.exportDate).toLocaleString()}`);
  console.log(`Total chats: ${context.totalChats}`);
  console.log(`Total messages: ${context.totalMessages}`);
  console.log(`Avg messages per chat: ${Math.round(context.totalMessages / context.totalChats)}`);

  console.log('\nTop 10 chats by message count:');
  context.chats
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 10)
    .forEach((chat, i) => {
      console.log(`  ${i + 1}. ${chat.name} (${chat.messageCount} messages)`);
    });

  console.log('\nGroup chats:');
  const groups = context.chats.filter(c => c.isGroup);
  console.log(`  Total: ${groups.length}`);

  console.log('\nDirect chats:');
  const direct = context.chats.filter(c => !c.isGroup);
  console.log(`  Total: ${direct.length}`);
}

async function searchChats(query: string): Promise<void> {
  if (!existsSync(EXPORT_PATH)) {
    console.error('[WA Context] No export found. Run: bun extract-wa-context.ts export');
    return;
  }

  const context: WhatsAppContext = await Bun.file(EXPORT_PATH).json();
  const lowerQuery = query.toLowerCase();

  console.log(`\n[WA Context] Searching for: "${query}"\n`);

  let found = 0;

  for (const chat of context.chats) {
    const matchingMessages = chat.messages.filter(m =>
      m.text.toLowerCase().includes(lowerQuery)
    );

    if (matchingMessages.length > 0) {
      console.log(`\n${chat.name} (${matchingMessages.length} matches):`);

      matchingMessages.slice(0, 3).forEach(msg => {
        const preview = msg.text.substring(0, 100);
        console.log(`  [${new Date(msg.timestamp).toLocaleDateString()}] ${msg.from}: ${preview}...`);
      });

      found += matchingMessages.length;
    }
  }

  console.log(`\nTotal matches: ${found}`);
}

async function readChat(chatName: string): Promise<void> {
  if (!existsSync(EXPORT_PATH)) {
    console.error('[WA Context] No export found. Run: bun extract-wa-context.ts export');
    return;
  }

  const context: WhatsAppContext = await Bun.file(EXPORT_PATH).json();
  const lowerName = chatName.toLowerCase();

  const chat = context.chats.find(c =>
    c.name.toLowerCase().includes(lowerName)
  );

  if (!chat) {
    console.error(`[WA Context] Chat not found: "${chatName}"`);
    console.log('\nAvailable chats:');
    context.chats.slice(0, 20).forEach(c => {
      console.log(`  - ${c.name}`);
    });
    return;
  }

  console.log(`\n[WA Context] Chat: ${chat.name}`);
  console.log(`Type: ${chat.isGroup ? 'Group' : 'Direct'}`);
  console.log(`Messages: ${chat.messageCount}`);
  console.log(`Last message: ${new Date(chat.lastMessageTime).toLocaleString()}`);
  console.log('\nRecent messages:\n');

  chat.messages.slice(-20).forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleString();
    const sender = msg.isFromMe ? 'Me' : msg.from;
    console.log(`[${date}] ${sender}:`);
    console.log(`  ${msg.text}\n`);
  });
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
WhatsApp Context Extractor - READ ONLY
======================================

Usage:
  bun extract-wa-context.ts export              # Export all chats from device
  bun extract-wa-context.ts stats               # Show statistics
  bun extract-wa-context.ts search "keyword"    # Search in messages
  bun extract-wa-context.ts read "Chat Name"    # Read specific chat

Requirements:
  - Android device with USB debugging enabled
  - ADB installed
  - WhatsApp database accessible (may require root)

Alternative:
  - Manually place msgstore.db in ${LOCAL_DB_PATH}
  - Use WhatsApp > Chat > Export Chat feature

Output:
  - Export file: ${EXPORT_PATH}
  - Contains all chats and messages in JSON format
  - Used by AI for context understanding
`);
} else if (command === 'export') {
  await exportContext();
} else if (command === 'stats') {
  await showStats();
} else if (command === 'search') {
  const query = args[1];
  if (!query) {
    console.error('[WA Context] Error: Search query required');
    console.error('Usage: bun extract-wa-context.ts search "keyword"');
  } else {
    await searchChats(query);
  }
} else if (command === 'read') {
  const chatName = args[1];
  if (!chatName) {
    console.error('[WA Context] Error: Chat name required');
    console.error('Usage: bun extract-wa-context.ts read "Chat Name"');
  } else {
    await readChat(chatName);
  }
} else {
  console.error(`[WA Context] Unknown command: ${command}`);
  console.error('Run: bun extract-wa-context.ts --help');
}
