import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const ALLOWED_ORIGINS = (process.env.APP_URL || '').split(',').map((o: string) => o.trim()).filter(Boolean);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = (req.headers['origin'] as string) || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'null';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let user_id: string, titulo: string, mensagem: string;
  try {
    const raw = await readBody(req);
    ({ user_id, titulo, mensagem } = JSON.parse(raw));
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Body inválido' }));
    return;
  }

  if (!user_id || !titulo || !mensagem) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'user_id, titulo e mensagem são obrigatórios' }));
    return;
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys')
    .eq('user_id', user_id);

  if (error || !subs?.length) {
    res.writeHead(200);
    res.end(JSON.stringify({ sent: 0 }));
    return;
  }

  const payload = JSON.stringify({ titulo, mensagem });
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  res.writeHead(200);
  res.end(JSON.stringify({ sent }));
}
