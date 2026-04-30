import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { iniciarBot, pararBot, pausarBot, retomarBot, statusBot, listarBots } from './bot-engine';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const VPS_API_TOKEN = process.env.VPS_API_TOKEN;

if (!VPS_API_TOKEN) {
  console.error('[VPS] ERRO: VPS_API_TOKEN não configurado no .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[VPS] ${new Date().toISOString()} ${req.method} ${req.path} origin=${req.headers.origin || '-'}`);
  next();
});

// ── Health check (sem autenticação) ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  const bots = listarBots();
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    bots_ativos: bots.length,
    bots: bots.map(b => ({ userId: b.userId, status: b.status })),
  });
});

// ── Middleware de autenticação ────────────────────────────────────────────────
function autenticar(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${VPS_API_TOKEN}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

app.use('/bot', autenticar);

// ── Iniciar bot ───────────────────────────────────────────────────────────────
app.post('/bot/start', async (req, res) => {
  const { userId, ssid, config } = req.body;
  if (!userId || !ssid || !config) {
    return res.status(400).json({ error: 'userId, ssid e config são obrigatórios' });
  }
  try {
    await iniciarBot(userId, ssid, config);
    res.json({ ok: true, message: `Bot iniciado para userId=${userId}` });
  } catch (e: any) {
    console.error('[VPS] Erro ao iniciar bot:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Parar bot ─────────────────────────────────────────────────────────────────
app.post('/bot/stop', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  try {
    pararBot(userId);
    res.json({ ok: true, message: `Bot parado para userId=${userId}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Pausar bot ────────────────────────────────────────────────────────────────
app.post('/bot/pause', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  try {
    pausarBot(userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Retomar bot ───────────────────────────────────────────────────────────────
app.post('/bot/resume', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  try {
    retomarBot(userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Status do bot ─────────────────────────────────────────────────────────────
app.get('/bot/status/:userId', (req, res) => {
  const { userId } = req.params;
  const status = statusBot(userId);
  if (!status) {
    return res.status(404).json({ error: 'Bot não encontrado para este usuário', status: 'inativo' });
  }
  res.json(status);
});

// ── Listar todos os bots ──────────────────────────────────────────────────────
app.get('/bot/list', (_req, res) => {
  res.json(listarBots());
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[VPS] Serviço de bot rodando na porta ${PORT}`);
  console.log(`[VPS] Health check: http://localhost:${PORT}/health`);
});
