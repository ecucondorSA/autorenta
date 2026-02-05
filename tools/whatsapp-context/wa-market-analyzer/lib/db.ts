/**
 * Database connection and query utilities for WhatsApp message analysis
 */
import { Database } from "bun:sqlite";

const DB_PATH = "/tmp/msgstore_decrypted.db";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.exec("PRAGMA query_only = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface Message {
  _id: number;
  chat_row_id: number;
  from_me: number;
  sender_jid_row_id: number;
  timestamp: number;
  text_data: string | null;
}

export interface Chat {
  _id: number;
  jid_row_id: number;
  subject: string | null;
  raw_string: string | null;
}

export interface JidInfo {
  _id: number;
  raw_string: string;
  user: string;
}

/**
 * Get chat info by ID
 */
export function getChatById(chatId: number): Chat | null {
  const db = getDb();
  return db.query<Chat, [number]>(`
    SELECT c._id, j.raw_string as raw_string_jid, c.subject 
    FROM chat c
    JOIN jid j ON c.jid_row_id = j._id
    WHERE c._id = ?
  `).get(chatId);
}

/**
 * Get all chats with message counts
 */
export function getAllChats(): Array<Chat & { messageCount: number }> {
  const db = getDb();
  return db.query<Chat & { messageCount: number }, []>(`
    SELECT c._id, j.raw_string as raw_string_jid, c.subject,
           (SELECT COUNT(*) FROM message WHERE chat_row_id = c._id) as messageCount
    FROM chat c
    JOIN jid j ON c.jid_row_id = j._id
    WHERE c.subject IS NOT NULL
    ORDER BY messageCount DESC
  `).all();
}

/**
 * Get JID info (contact/sender info)
 */
export function getJidInfo(jidId: number): JidInfo | null {
  const db = getDb();
  return db.query<JidInfo, [number]>(
    "SELECT _id, raw_string, user FROM jid WHERE _id = ?"
  ).get(jidId);
}

/**
 * Execute raw SQL query
 */
export function rawQuery<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  return db.query(sql).all(...params) as T[];
}

/**
 * Get total message count
 */
export function getTotalMessageCount(): number {
  const db = getDb();
  const result = db.query<{ count: number }, []>(
    "SELECT COUNT(*) as count FROM message WHERE text_data IS NOT NULL"
  ).get();
  return result?.count ?? 0;
}
