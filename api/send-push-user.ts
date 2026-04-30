import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:contato@guiasacademy.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { titulo, mensagem, user_id } = req.body;
    console.log('[send-push-user] Recebido:', { user_id, titulo, mensagem: mensagem?.substring(0, 50) });

    if (!titulo || !mensagem) {
        return res.status(400).json({ message: 'Missing title or message' });
    }

    if (!user_id) {
        return res.status(400).json({ message: 'Missing user_id' });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(500).json({ message: 'Server is missing VAPID keys.' });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch push subscriptions only for this specific user
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys')
            .eq('user_id', user_id);

        if (error) {
            console.error('[send-push-user] Error fetching subscriptions for user:', user_id, error);
            return res.status(500).json({ message: 'Database error', error: error.message });
        }

        console.log('[send-push-user] Subscriptions encontradas:', subscriptions?.length || 0, 'para user:', user_id);
        if (subscriptions && subscriptions.length > 0) {
            subscriptions.forEach((sub, i) => {
                console.log(`[send-push-user] Sub #${i + 1} endpoint (últimos 40 chars): ...${sub.endpoint.slice(-40)}`);
            });
        } else {
            console.warn('[send-push-user] NENHUMA subscription encontrada para user_id:', user_id, '— o dispositivo nunca ativou notificações push ou a subscription expirou.');
        }

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(200).json({ message: 'No subscriptions found for this user.' });
        }

        const payload = JSON.stringify({
            titulo,
            mensagem,
        });

        const sendPromises = subscriptions.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys as any },
                payload
            ).catch(async (err) => {
                console.error('[send-push-user] Error sending push to endpoint:', sub.endpoint, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            })
        );

        await Promise.all(sendPromises);

        res.status(200).json({ message: `Push sent to ${subscriptions.length} device(s) for user ${user_id}.` });

    } catch (err: unknown) {
        console.error('[send-push-user] Unhandled error:', err);
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ message: 'Internal server error', error: message });
    }
}
