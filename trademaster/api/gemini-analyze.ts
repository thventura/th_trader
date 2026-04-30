import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

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

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
    return;
  }

  let mindsetData: any, lastOperations: any[];
  try {
    const raw = await readBody(req);
    ({ mindsetData, lastOperations } = JSON.parse(raw));
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Body inválido' }));
    return;
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const prompt = `
    Analise o estado psicológico deste trader para o dia de hoje.

    Dados do Check-in:
    - Horas de sono: ${mindsetData.horas_sono}
    - Nível de estresse: ${mindsetData.nivel_estresse}/5
    - Nível de energia: ${mindsetData.nivel_energia}/5
    - Estado emocional: ${mindsetData.estado_emocional}

    Últimas 10 operações:
    ${JSON.stringify(lastOperations)}

    Retorne um JSON no seguinte formato:
    {
      "pronto": boolean,
      "recomendacao_ia": string (uma justificativa curta e direta em português)
    }
  `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const result = JSON.parse(response.text || '{"pronto": false, "recomendacao_ia": "Erro ao analisar."}');
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch {
    res.writeHead(500);
    res.end(JSON.stringify({ pronto: false, recomendacao_ia: 'Erro ao conectar com IA.' }));
  }
}
