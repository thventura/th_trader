import type { IncomingMessage, ServerResponse } from 'node:http';

const VPS = `http://${process.env.VPS_HOST || '178.62.241.160'}:${process.env.VPS_PORT || '3001'}`;
const TOKEN = process.env.VPS_API_TOKEN || '';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  try {
    const body = await readBody(req);
    const r = await fetch(`${VPS}/bot/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body,
    });
    res.writeHead(r.status);
    res.end(await r.text());
  } catch (e: any) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  }
}
