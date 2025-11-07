interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    AUTORENT_WEBHOOK_KV: KVNamespace;
    MERCADOPAGO_ACCESS_TOKEN?: string;
    SENTRY_DSN?: string;
    ENVIRONMENT?: string;
}
/**
 * Worker principal
 */
declare const worker: {
    fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response>;
};
export default worker;
//# sourceMappingURL=index.d.ts.map