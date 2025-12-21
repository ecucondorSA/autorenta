import type { BrowserContext, Page } from 'playwright';
export declare class BrowserManager {
    private context;
    private page;
    private config;
    private lockAcquired;
    private heartbeatInterval;
    constructor(profileName: 'binance' | 'mercadopago');
    acquireLock(): Promise<boolean>;
    releaseLock(): Promise<void>;
    private startHeartbeat;
    private stopHeartbeat;
    launch(): Promise<Page>;
    close(): Promise<void>;
    getPage(): Page | null;
    getContext(): BrowserContext | null;
    isLocked(): boolean;
}
export default BrowserManager;
//# sourceMappingURL=manager.d.ts.map