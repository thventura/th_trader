import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// By default we use the Anon Key if Service Role isn't provided. 
// Note: If using Anon Key, the push_subscriptions table must be readable by anonymous/authenticated users.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:contato@guiasacademy.com', // Replace with a real admin email if necessary
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { titulo, mensagem } = req.body;

    if (!titulo || !mensagem) {
        return res.status(400).json({ message: 'Missing title or message' });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(500).json({ message: 'Server is missing VAPID keys.' });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch all push subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys');

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return res.status(500).json({ message: 'Database error', error: error.message });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(200).json({ message: 'No subscriptions found, but notification was processed.' });
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
                console.error('Error sending push to endpoint:', sub.endpoint, err);
                // If the subscription is gone/expired (410), we can delete it from the database to keep it clean.
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            })
        );

        await Promise.all(sendPromises);

        res.status(200).json({ message: `Push sent successfully to ${subscriptions.length} device(s).` });

    } catch (err: any) {
        console.error('Unhandled error sending push:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}
