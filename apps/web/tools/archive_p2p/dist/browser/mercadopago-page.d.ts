import type { Page } from 'playwright';
import type { TransferResult } from '../types/index.js';
export declare class MercadoPagoPage {
    private page;
    constructor(page: Page);
    /**
     * Verify MercadoPago session is active
     */
    verifySession(): Promise<boolean>;
    /**
     * Set amount using keyboard simulation - the CORRECT way for React controlled inputs.
     *
     * MercadoPago uses React controlled components with internal _valueTracker.
     * Direct DOM manipulation or calling onChange doesn't work because React
     * compares with _valueTracker and ignores changes if they match.
     *
     * SOLUTION: Use real keyboard simulation which triggers proper React events.
     *
     * Reference: https://stackoverflow.com/questions/47136896/
     */
    setAmount(amount: number): Promise<boolean>;
    /**
     * Fallback method using native value setter + _valueTracker reset
     * This bypasses React's controlled component override
     */
    private setAmountNativeSetter;
    /**
     * Verify that the amount input displays the expected value
     * Returns the displayed value for debugging
     */
    private verifyAmountInput;
    /**
     * Extract recipient information from the confirmation page
     * This is shown BEFORE clicking "Confirmar cuenta"
     *
     * MercadoPago page structure:
     * - "Nombre y apellido" label followed by the actual name
     * - "Entidad" label followed by bank name
     */
    private extractRecipientInfo;
    /**
     * Validate recipient name using fuzzy matching
     * Binance names might be slightly different from MercadoPago
     * (e.g., "JUAN PEREZ" vs "Juan Pérez" vs "PEREZ JUAN")
     */
    private validateRecipientName;
    /**
     * Execute a transfer to the given destination
     * @param destination CVU/CBU/Alias
     * @param amount Amount in ARS
     * @param expectedName Expected recipient name (from Binance counterparty)
     */
    executeTransfer(destination: string, amount: number, expectedName?: string): Promise<TransferResult>;
    /**
     * Check transfer result after clicking final button
     */
    checkTransferResult(): Promise<TransferResult>;
    /**
     * Wait for QR to be scanned (with timeout)
     */
    waitForQrScan(timeoutMs: number): Promise<boolean>;
    /**
     * Play desktop notification sound
     */
    private playNotificationSound;
}
export default MercadoPagoPage;
//# sourceMappingURL=mercadopago-page.d.ts.map