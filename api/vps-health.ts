import type { IncomingMessage, ServerResponse } from 'node:http';

const VPS = `http://${process.env.VPS_HOST || '178.62.241.160'}:${process.env.VPS_PORT || '3001'}`;
const TOKEN = process.env.VPS_API_TOKEN || '';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const r = await fetch(`${VPS}/health`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    res.writeHead(r.status);
    res.end(await r.text());
  } catch (e: any) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  }
}
