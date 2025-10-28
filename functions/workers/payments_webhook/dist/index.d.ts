interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    AUTORENT_WEBHOOK_KV: KVNamespace;
    MERCADOPAGO_ACCESS_TOKEN?: string;
}
/**
 * Worker principal
 */
declare const worker: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default worker;
//# sourceMappingURL=index.d.ts.map