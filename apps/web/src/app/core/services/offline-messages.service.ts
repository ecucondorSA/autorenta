import { Injectable, signal } from '@angular/core';

export interface OfflineMessage {
  id: string;
  bookingId?: string;
  carId?: string;
  recipientId: string;
  body: string;
  timestamp: number;
  retries: number;
  lastAttempt?: number;
}

/**
 * Service for queueing messages when offline
 *
 * Uses IndexedDB for persistent storage across browser sessions
 *
 * Features:
 * - Persist messages when offline
 * - Automatic retry with exponential backoff
 * - Max 5 retries before giving up
 * - Signal for pending count (reactive UI)
 *
 * Related: MESSAGING_CRITICAL_ISSUES.md - Problema 2
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineMessagesService {
  private db?: IDBDatabase;
  private readonly dbName = 'autorenta-messages';
  private readonly dbVersion = 1;
  private readonly storeName = 'pending-messages';

  // Reactive signal for pending messages count
  readonly pendingCount = signal<number>(0);

  constructor() {
    this.init();
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Update pending count
        this.updatePendingCount();

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });

          // Create indexes
          store.createIndex('by-timestamp', 'timestamp', { unique: false });
          store.createIndex('by-retries', 'retries', { unique: false });
        }
      };
    });
  }

  /**
   * Queue a message for later sending
   */
  async queueMessage(message: Omit<OfflineMessage, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (!this.db) await this.init();

    const offlineMessage: OfflineMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const request = store.add(offlineMessage);

      request.onsuccess = () => {
        this.updatePendingCount();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending messages
   */
  async getPendingMessages(): Promise<OfflineMessage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result as OfflineMessage[];
        resolve(messages);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Remove a message from queue (after successful send)
   */
  async removeMessage(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(id);

      request.onsuccess = () => {
        this.updatePendingCount();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Increment retry count for a message
   */
  async incrementRetry(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Get current message
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const message = getRequest.result as OfflineMessage | undefined;

        if (!message) {
          resolve();
          return;
        }

        // Update retry count and last attempt timestamp
        message.retries++;
        message.lastAttempt = Date.now();

        // Put updated message
        const putRequest = store.put(message);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Clear all messages (useful for debugging or user logout)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const request = store.clear();

      request.onsuccess = () => {
        this.updatePendingCount();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get messages that need retry (haven't exceeded max retries)
   */
  async getMessagesForRetry(maxRetries = 5): Promise<OfflineMessage[]> {
    const all = await this.getPendingMessages();

    return all.filter((msg) => msg.retries < maxRetries);
  }

  /**
   * Get messages that have exceeded max retries (failed permanently)
   */
  async getFailedMessages(maxRetries = 5): Promise<OfflineMessage[]> {
    const all = await this.getPendingMessages();

    return all.filter((msg) => msg.retries >= maxRetries);
  }

  /**
   * Remove failed messages (clean up after max retries)
   */
  async removeFailedMessages(maxRetries = 5): Promise<number> {
    const failed = await this.getFailedMessages(maxRetries);

    for (const msg of failed) {
      await this.removeMessage(msg.id);
    }

    return failed.length;
  }

  /**
   * Update pending count signal
   */
  private async updatePendingCount(): Promise<void> {
    if (!this.db) return;

    try {
      const messages = await this.getPendingMessages();
      this.pendingCount.set(messages.length);
    } catch (__error) { /* Silenced */ }
  }

  /**
   * Generate unique ID for offline message
   */
  private generateId(): string {
    return `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if message should be retried based on last attempt time
   * Uses exponential backoff: 1s, 2s, 4s, 8s, 16s
   */
  shouldRetry(message: OfflineMessage): boolean {
    if (!message.lastAttempt) return true;

    const now = Date.now();
    const timeSinceLastAttempt = now - message.lastAttempt;

    // Exponential backoff: 1000ms * 2^retries
    const backoffDelay = 1000 * Math.pow(2, message.retries);

    return timeSinceLastAttempt >= backoffDelay;
  }
}
