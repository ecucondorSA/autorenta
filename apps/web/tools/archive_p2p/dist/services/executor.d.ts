export declare class ExecutorService {
    private browser;
    private mpPage;
    private isRunning;
    constructor();
    start(): Promise<void>;
    private processNextOrder;
    private executeOrder;
    private handleQrVerification;
    stop(): Promise<void>;
}
export default ExecutorService;
//# sourceMappingURL=executor.d.ts.map