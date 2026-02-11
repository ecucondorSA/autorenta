import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!;
const GITHUB_REPO = 'ecucondorSA/autorenta'; // Tu repo
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WebhookPayload {
    post_url: string;
    post_content: string;
    platform: string;
    keywords: string[];
    metadata?: Record<string, any>;
}

serve(async (req) => {
    try {
        // CORS
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            });
        }

        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        const payload: WebhookPayload = await req.json();
        const { post_url, post_content, platform, keywords, metadata = {} } = payload;

        console.log(`[Marketing Webhook] Received request for post: ${post_url}`);

        // 1. Validar que el post sea relevante
        if (!post_content || post_content.length < 20) {
            return new Response(
                JSON.stringify({ error: 'Post content too short' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 2. Seleccionar persona disponible
        const { data: availablePersonas, error: personaError } = await supabase
            .rpc('public.can_persona_post', { p_persona_id: null })
            .select('*')
            .eq('is_active', true)
            .eq('is_shadowbanned', false)
            .limit(10);

        if (personaError || !availablePersonas || availablePersonas.length === 0) {
            console.error('[Marketing Webhook] No available personas:', personaError);

            // Log alert
            await supabase.from('marketing_alerts').insert({
                alert_type: 'rate_limit',
                severity: 'medium',
                message: 'No personas available for posting',
                metadata: { post_url },
            });

            return new Response(
                JSON.stringify({ error: 'No personas available' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Seleccionar persona aleatoria del pool disponible
        const persona = availablePersonas[Math.floor(Math.random() * availablePersonas.length)];
        console.log(`[Marketing Webhook] Selected persona: ${persona.name} (${persona.id})`);

        // 3. Generar contenido con IA (esto lo hace el GitHub Action, aquí solo creamos el registro)
        const { data: contentRecord, error: contentError } = await supabase
            .from('marketing_content')
            .insert({
                persona_id: persona.id,
                platform,
                content_type: 'comment',
                generated_content: '', // Will be filled by GitHub Action
                context: {
                    post_url,
                    post_content: post_content.substring(0, 500), // Truncar para storage
                    keywords,
                    ...metadata,
                },
                status: 'pending',
            })
            .select()
            .single();

        if (contentError) {
            console.error('[Marketing Webhook] Error creating content record:', contentError);
            return new Response(
                JSON.stringify({ error: 'Failed to create content record' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[Marketing Webhook] Content record created: ${contentRecord.id}`);

        // 4. Disparar GitHub Action
        const githubResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: 'marketing_post_comment',
                    client_payload: {
                        content_id: contentRecord.id,
                        persona_id: persona.id,
                        post_url,
                        post_content,
                        platform,
                    },
                }),
            }
        );

        if (!githubResponse.ok) {
            const errorText = await githubResponse.text();
            console.error('[Marketing Webhook] GitHub API error:', errorText);

            // Update content status
            await supabase
                .from('marketing_content')
                .update({ status: 'failed', error_message: errorText })
                .eq('id', contentRecord.id);

            return new Response(
                JSON.stringify({ error: 'Failed to trigger GitHub Action' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Marketing Webhook] GitHub Action dispatched successfully');

        // 5. Retornar éxito
        return new Response(
            JSON.stringify({
                success: true,
                content_id: contentRecord.id,
                persona_id: persona.id,
                persona_name: persona.name,
                message: 'Comment scheduled for posting',
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('[Marketing Webhook] Fatal error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
