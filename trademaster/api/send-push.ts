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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

  // Validate caller is an authenticated admin via Supabase JWT
  const authHeader = (req.headers['authorization'] as string) || '';
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!callerToken) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Não autorizado' }));
    return;
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user: callerUser } } = await supabase.auth.getUser(callerToken);
  if (!callerUser) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Token inválido' }));
    return;
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    res.writeHead(403);
    res.end(JSON.stringify({ error: 'Acesso negado: somente admins podem enviar push' }));
    return;
  }

  let titulo: string, mensagem: string;
  try {
    const raw = await readBody(req);
    ({ titulo, mensagem } = JSON.parse(raw));
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Body inválido' }));
    return;
  }

  if (!titulo || !mensagem) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'titulo e mensagem são obrigatórios' }));
    return;
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys');

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
