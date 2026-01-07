import type { Page } from 'playwright';
import type { DetectedOrder, PaymentDetails } from '../types/index.js';
export declare class BinancePage {
    private page;
    constructor(page: Page);
    /**
     * Verify Binance session is active
     */
    verifySession(): Promise<boolean>;
    /**
     * Extract orders from Binance P2P orders page
     */
    extractOrders(): Promise<DetectedOrder[]>;
    /**
     * Extract payment details from order detail page
     */
    extractPaymentDetails(orderHref: string): Promise<PaymentDetails | null>;
    /**
     * Mark order as paid in Binance
     */
    markAsPaid(orderHref: string): Promise<boolean>;
}
export default BinancePage;
//# sourceMappingURL=binance-page.d.ts.map