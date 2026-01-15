import { z } from 'zod';
export function registerFinanceTools(server, supabase) {
    // Herramienta: Auditoría de Integridad de Billetera
    server.registerTool('audit_wallet_integrity', async (args) => {
        const schema = z.object({
            userId: z.string().uuid(),
        });
        const { userId } = schema.parse(args);
        const client = supabase.getClient();
        // 1. Obtener balance actual
        const { data: wallet, error: walletError } = await client
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (walletError)
            throw walletError;
        // 2. Obtener suma de movimientos en ledger (sistema nuevo)
        const { data: ledgerSum, error: ledgerError } = await client
            .rpc('get_wallet_ledger_balance', { p_user_id: userId });
        // 3. Obtener suma de movimientos en history (vista consolidada)
        const { data: history, error: historyError } = await client
            .from('v_wallet_history')
            .select('amount_cents, transaction_type')
            .eq('user_id', userId)
            .eq('status', 'completed');
        if (historyError)
            throw historyError;
        const calculatedBalance = (history || []).reduce((acc, curr) => {
            // En un sistema de ledger real, los tipos determinan si suma o resta
            // Aquí simplificamos para la auditoría inicial
            return acc + curr.amount_cents;
        }, 0);
        const discrepancy = Math.abs(wallet.total_balance - calculatedBalance);
        return {
            success: true,
            user_id: userId,
            db_balance: wallet.total_balance,
            calculated_balance: calculatedBalance,
            discrepancy_cents: discrepancy,
            status: discrepancy === 0 ? 'MATCH' : 'DISCREPANCY_DETECTED',
            recommendation: discrepancy > 0 ? 'Run full reconciliation and check for missing ledger entries.' : 'Balance is healthy.'
        };
    }, {
        description: 'Audit wallet balance against transaction history to detect discrepancies',
        inputSchema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'User ID to audit'
                }
            },
            required: ['userId']
        }
    });
    // Herramienta: Reconciliación con MercadoPago
    server.registerTool('reconcile_mp_payment', async (args) => {
        const schema = z.object({
            paymentId: z.string().min(1),
        });
        const { paymentId } = schema.parse(args);
        const client = supabase.getClient();
        // 1. Obtener registro local
        const { data: payment, error: payError } = await client
            .from('payments')
            .select('*')
            .eq('provider_payment_id', paymentId)
            .single();
        if (payError && payError.code !== 'PGRST116')
            throw payError;
        // 2. Consultar MercadoPago API (Simulado o via Fetch)
        // En una implementación real, aquí usaríamos el token de MP
        const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        let mpData = null;
        if (mpAccessToken) {
            try {
                const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${mpAccessToken}` }
                });
                mpData = await response.json();
            }
            catch (e) {
                console.error('Error fetching from MP:', e);
            }
        }
        const mpStatus = mpData?.status || 'UNKNOWN';
        return {
            success: true,
            payment_id: paymentId,
            local_status: payment?.status || 'NOT_FOUND',
            mp_status: mpStatus,
            match: payment?.status === mpStatus,
            mp_details: mpData && mpData.id ? {
                amount: mpData.transaction_amount,
                date_approved: mpData.date_approved,
                payment_method: mpData.payment_method_id
            } : 'MP API unreachable or token missing',
            action_required: (payment?.status !== mpStatus && mpData && mpData.id) ? 'Update local payment status to match MP.' : 'No action needed.'
        };
    }, {
        description: 'Check payment status on MercadoPago and compare with local database',
        inputSchema: {
            type: 'object',
            properties: {
                paymentId: {
                    type: 'string',
                    description: 'MercadoPago Payment ID'
                }
            },
            required: ['paymentId']
        }
    });
    // Herramienta: Reporte de Ingresos por Periodo
    server.registerTool('generate_revenue_report', async (args) => {
        const schema = z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            ownerId: z.string().uuid().optional(),
        });
        const { startDate, endDate, ownerId } = schema.parse(args);
        const client = supabase.getClient();
        let query = client
            .from('payments')
            .select('amount, created_at, status')
            .eq('status', 'approved');
        if (startDate)
            query = query.gte('created_at', startDate);
        if (endDate)
            query = query.lte('created_at', endDate);
        if (ownerId)
            query = query.eq('owner_id', ownerId);
        const { data, error } = await query;
        if (error)
            throw error;
        const totalRevenue = (data || []).reduce((sum, p) => sum + p.amount, 0);
        return {
            success: true,
            period: {
                start: startDate || 'Beginning of time',
                end: endDate || 'Now'
            },
            total_revenue: totalRevenue,
            transaction_count: data?.length || 0,
            average_transaction: data?.length ? totalRevenue / data.length : 0
        };
    }, {
        description: 'Generate revenue report for a specific period',
        inputSchema: {
            type: 'object',
            properties: {
                startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                ownerId: { type: 'string', description: 'Optional owner ID filter' }
            }
        }
    });
}
