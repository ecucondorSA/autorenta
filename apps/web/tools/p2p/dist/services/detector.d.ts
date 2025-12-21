export declare class DetectorService {
    private browser;
    private binancePage;
    private isRunning;
    constructor();
    start(): Promise<void>;
    private pollOnce;
    private processOrder;
    private extractPaymentDetails;
    stop(): Promise<void>;
}
export default DetectorService;
//# sourceMappingURL=detector.d.ts.map