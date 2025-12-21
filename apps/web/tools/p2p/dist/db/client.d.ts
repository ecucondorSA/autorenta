import type { P2POrder, P2PEvent, OrderStatus, PaymentDetails } from '../types/index.js';
declare class SupabaseDB {
    private client;
    constructor();
    getOrderByNumber(orderNumber: string): Promise<P2POrder | null>;
    insertOrder(order: Partial<P2POrder>): Promise<P2POrder>;
    getNextPendingOrder(serviceName: string): Promise<P2POrder | null>;
    transitionStatus(orderNumber: string, newStatus: OrderStatus, serviceName: string, payload?: Record<string, unknown>, errorMessage?: string): Promise<boolean>;
    updatePaymentDetails(orderNumber: string, details: PaymentDetails): Promise<boolean>;
    updateTransferResult(orderNumber: string, result: {
        mp_transfer_id?: string;
        mp_transfer_status?: string;
        mp_transferred_at?: Date;
    }): Promise<boolean>;
    incrementRetry(orderNumber: string, errorMessage: string): Promise<boolean>;
    releaseLock(orderNumber: string, serviceName: string): Promise<boolean>;
    logEvent(event: Omit<P2PEvent, 'id' | 'created_at'>): Promise<void>;
    healthCheck(): Promise<boolean>;
}
export declare const db: SupabaseDB;
export default db;
//# sourceMappingURL=client.d.ts.map