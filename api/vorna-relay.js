/**
 * VornaBroker Server-Side Relay
 *
 * Resolve o problema de IP binding: o login HTTP e a conexão WebSocket
 * saem do MESMO servidor (Vercel), então o SSID é criado e usado pelo mesmo IP.
 *
 * Fluxo:
 *   1. HTTP POST → https://api.trade.vornabroker.com/v2/login  (IP do servidor)
 *   2. WebSocket → wss://ws.trade.vornabroker.com              (mesmo IP do servidor)
 *   3. Autenticação com SSID → sucesso garantido (IPs iguais)
 *   4. Retorna dados ao browser
 */

const path = require('path');

// ── SDK da Vorna (ESM — importado via dynamic import) ─────────────────────────
let _sdkClasses = null;
async function getSdkClasses() {
  if (_sdkClasses) return _sdkClasses;
  try {
    const sdkPath = 'file://' + path.resolve(__dirname, '../trademaster/node_modules/@tradecodehub/client-sdk-js/dist/index.js');
    const mod = await import(sdkPath);
    _sdkClasses = {
      ClientSdk: mod.ClientSdk,
      SsidAuthMethod: mod.SsidAuthMethod,
      BlitzOptionsDirection: mod.BlitzOptionsDirection,
      BinaryOptionsDirection: mod.BinaryOptionsDirection,
      DigitalOptionsDirection: mod.DigitalOptionsDirection,
    };
    return _sdkClasses;
  } catch (e) {
    console.error('[vorna-relay] Falha ao importar SDK:', e.message);
    return null;
  }
}

// ── Cache de conexão SDK + facades (evita reconectar e resubscrever a cada buy) ──
let _cachedSdk = null;
let _cachedSsid = null;
let _cachedBlitz = null;
let _cachedBinary = null;
let _cachedBalances = null;

async function getOrCreateSdk(ssidParam) {
  const classes = await getSdkClasses();
  if (!classes) return null;
  if (_cachedSdk && _cachedSsid === ssidParam) {
    console.log('[vorna-relay] reutilizando SDK cacheado');
    return _cachedSdk;
  }
  if (_cachedSdk) {
    _cachedSdk.shutdown().catch(() => {});
    _cachedSdk = null;
    _cachedSsid = null;
    _cachedBlitz = null;
    _cachedBinary = null;
    _cachedBalances = null;
  }
  console.log('[vorna-relay] criando nova conexão SDK...');
  const sdk = await classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssidParam));
  _cachedSdk = sdk;
  _cachedSsid = ssidParam;
  // Pré-aquecer facades em paralelo para eliminar latência nas próximas chamadas
  try {
    const [b, bin, bal] = await Promise.all([
      sdk.blitzOptions().catch(() => null),
      sdk.binaryOptions().catch(() => null),
      sdk.balances().catch(() => null),
    ]);
    _cachedBlitz = b;
    _cachedBinary = bin;
    _cachedBalances = bal;
    console.log('[vorna-relay] SDK + facades pré-aquecidas');
  } catch (e) {
    console.warn('[vorna-relay] Erro ao pré-aquecer facades:', e.message);
  }
  return sdk;
}

const VORNA_HTTP_URL = 'https://api.trade.vornabroker.com/v2/login';
const VORNA_WS_URL   = 'wss://ws.trade.vornabroker.com/echo/websocket';
const PLATFORM_ID    = 9;
// ── HTTP Login ──────────────────────────────────────────────────────────────

async function httpLogin(identifier, password) {
  const resp = await fetch(VORNA_HTTP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin':  'https://trade.vornabroker.com',
      'Referer': 'https://trade.vornabroker.com/',
      'User-Agent': 'tradecodehub-client-sdk-js/1.3.0',
      'Cookie': `platform=${PLATFORM_ID}`,
    },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.message || `Erro HTTP ${resp.status}`;
    throw new Error(`VornaBroker: ${msg}`);
  }

  if (data.code !== 'success') {
    throw new Error(data.message || 'Credenciais inválidas');
  }

  return { ssid: data.ssid, userId: String(data.user_id), companyId: data.company_id };
}

// ── Handler Principal ────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });

  const { action = 'login', identifier, password, ssid: ssidParam } = req.body || {};

  // ── Ações SDK via servidor (não precisam de credenciais, só do SSID) ─────────
  if (action === 'getActives') {
    if (!ssidParam) return res.status(400).json({ error: 'ssid obrigatório' });
    const classes = await getSdkClasses();
    if (!classes) return res.status(503).json({ error: 'SDK indisponível no servidor' });
    let sdk = null;
    try {
      sdk = await classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssidParam));

      const result = [];
      const seen = new Set();

      const addActives = (actives, instrumentType) => {
        for (const a of actives) {
          const key = `${a.id}_${instrumentType}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const isOtc = /\-OTC$/i.test(a.ticker);
          const base = isOtc ? a.ticker.slice(0, -4) : a.ticker;
          let displayName = base;
          if (/^[A-Za-z]{6}$/.test(base)) {
            displayName = base.slice(0, 3).toUpperCase() + '/' + base.slice(3).toUpperCase();
          }
          if (isOtc) displayName += ' (OTC)';
          const payout = a.profitCommissionPercent != null ? Math.round(100 - a.profitCommissionPercent) : 0;
          result.push({ id: a.id, ticker: a.ticker, isSuspended: a.isSuspended ?? false, isOtc, instrumentType, displayName, payout });
        }
      };

      try { const blitz = await sdk.blitzOptions();  addActives(blitz.getActives(),  'blitz');  } catch {}
      try { const bin   = await sdk.binaryOptions(); addActives(bin.getActives(),    'binary'); } catch {}
      try { const turbo = await sdk.turboOptions();  addActives(turbo.getActives(),  'turbo');  } catch {}

      console.log(`[vorna-relay] getActives: ${result.length} ativos (blitz+binary+turbo)`);
      return res.json({ actives: result });
    } catch (err) {
      console.error('[vorna-relay] getActives erro:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      if (sdk) sdk.shutdown().catch(() => {});
    }
  }

  if (action === 'getCandles') {
    if (!ssidParam) return res.status(400).json({ error: 'ssid obrigatório' });
    const { activeId, size = 60, to, count = 1000 } = req.body || {};
    if (!activeId) return res.status(400).json({ error: 'activeId obrigatório' });
    const classes = await getSdkClasses();
    if (!classes) return res.status(503).json({ error: 'SDK indisponível no servidor' });
    let sdk = null;
    try {
      sdk = await classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssidParam));
      const candlesFacade = await sdk.candles();
      const opts = { count: Number(count) };
      if (to) opts.to = Number(to);
      const raw = await candlesFacade.getCandles(Number(activeId), Number(size), opts);
      const candles = (raw || []).map(c => ({
        from: c.from,
        open: c.open,
        close: c.close,
        min: c.min,
        max: c.max,
        volume: c.volume || 0,
      }));
      return res.json({ candles });
    } catch (err) {
      console.error('[vorna-relay] getCandles erro:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      if (sdk) sdk.shutdown().catch(() => {});
    }
  }

  if (action === 'getPositions') {
    if (!ssidParam) return res.status(400).json({ error: 'ssid obrigatório' });
    try {
      // Usar SDK cacheado para eliminar latência de reconexão (~7s → <1s)
      const sdk = await getOrCreateSdk(ssidParam);
      if (!sdk) return res.status(503).json({ error: 'SDK indisponível no servidor' });
      const positionsFacade = await sdk.positions();
      const positions = positionsFacade.getAllPositions();
      const abertas = positions.filter(p => {
        const status = (p.status || '').toLowerCase();
        return status === 'open' || status === '' || status === 'pending';
      });
      return res.json({
        abertas: abertas.length,
        operacoes: abertas.map(p => ({
          id: String(p.externalId ?? p.internalId ?? ''),
          status: p.status || 'open',
        })),
      });
    } catch (err) {
      console.error('[vorna-relay] getPositions erro:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (action === 'buy') {
    if (!ssidParam) return res.status(400).json({ error: 'ssid obrigatório' });
    const { ticker, direcao, valor, duracao = 60, instrumento_tipo = 'blitz' } = req.body || {};
    if (!ticker) return res.status(400).json({ error: 'ticker obrigatório' });
    if (!direcao) return res.status(400).json({ error: 'direcao obrigatória (compra/venda)' });
    if (!valor || Number(valor) <= 0) return res.status(400).json({ error: 'valor inválido' });
    const classes = await getSdkClasses();
    if (!classes) return res.status(503).json({ error: 'SDK indisponível no servidor' });
    let sdk = null;
    try {
      sdk = await getOrCreateSdk(ssidParam);
      if (!sdk) return res.status(503).json({ error: 'SDK indisponível no servidor' });

      // Normalizar ticker recebido: "EUR/USD (OTC)" → base "EURUSD" + isOtc=true
      const isOtc = /\(OTC\)$/i.test(ticker) || /-OTC$/i.test(ticker);
      const tickerBase = ticker.replace('/', '').replace(/\s*\(OTC\)$/i, '').replace(/-OTC$/i, '').toUpperCase();

      // Saldo REAL (cacheado para eliminar await a cada buy)
      const balancesFacade = _cachedBalances || await sdk.balances();
      if (!_cachedBalances) _cachedBalances = balancesFacade;
      const realBalance = balancesFacade.getBalances().find(b => b.type === 'real');
      if (!realBalance) return res.status(400).json({ error: 'Saldo REAL não encontrado na conta' });

      // ── BINARY: API usa active.instruments() → getAvailableForBuyAt → facade.buy(instrument) ──
      if (instrumento_tipo === 'binary') {
        const facade = _cachedBinary || await sdk.binaryOptions();
        if (!_cachedBinary) _cachedBinary = facade;
        const actives = facade.getActives();
        const active = actives.find(a => {
          const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
          const aIsOtc = /-OTC$/i.test(a.ticker);
          return aBase === tickerBase && aIsOtc === isOtc;
        });
        if (!active) {
          return res.status(404).json({
            error: `Ativo "${ticker}" não encontrado em binary options`,
            ativos_disponiveis: actives.slice(0, 10).map(a => a.ticker),
          });
        }
        if (active.isSuspended) return res.status(400).json({ error: `Ativo "${ticker}" está suspenso` });

        const instruments = await active.instruments();
        const nowMs = Date.now();
        // Usar data no passado (epoch) para contornar deadtime conservador do SDK
        // O broker real aceita ~1 min até expiração; o SDK filtra por ~10 min (deadtime interno)
        const all = instruments.getAvailableForBuyAt(new Date(0));
        // Filtrar apenas futuros com pelo menos 30s de margem para processamento
        const futures = all.filter(i => i.expiredAt && i.expiredAt.getTime() > nowMs + 30000);
        const available = futures.length > 0 ? futures : instruments.getAvailableForBuyAt(new Date());
        if (available.length === 0) {
          return res.status(400).json({ error: `Sem instrumentos disponíveis para "${ticker}" agora. Janela de compra fechada.` });
        }
        // Seleciona instrumento cuja expiração restante é mais próxima do duracao configurado
        const targetMs = nowMs + Number(duracao) * 1000;
        available.sort((a, b) =>
          Math.abs(a.expiredAt.getTime() - targetMs) - Math.abs(b.expiredAt.getTime() - targetMs)
        );
        console.log(`[vorna-relay] binary instrumentos (${available.length}):`,
          available.slice(0, 5).map(i => ({ expiredAt: i.expiredAt?.toISOString?.() ?? '?', segsAte: Math.round((i.expiredAt?.getTime?.() - nowMs) / 1000) }))
        );
        const instrument = available[0];
        const dir = (direcao === 'compra' || direcao === 'call')
          ? (classes.BinaryOptionsDirection?.Call ?? 'call')
          : (classes.BinaryOptionsDirection?.Put  ?? 'put');

        console.log(`[vorna-relay] binary buy: ${ticker} ${direcao} R$${valor} expiredAt=${instrument.expiredAt?.toISOString?.() ?? '?'} (${Math.round((instrument.expiredAt?.getTime?.() - nowMs) / 1000)}s)`);
        const option = await facade.buy(instrument, dir, Number(valor), realBalance);
        console.log(`[vorna-relay] binary buy OK: id=${option.id}`);
        return res.json({ id: String(option.id), ticker: active.ticker, direcao, valor: Number(valor) });
      }

      // ── DIGITAL: API usa getUnderlyingsAvailableForTradingAt → underlying.instruments() → buySpotStrike ──
      if (instrumento_tipo === 'digital') {
        const facade = await sdk.digitalOptions();
        const underlyings = facade.getUnderlyingsAvailableForTradingAt(new Date());
        const underlying = underlyings.find(u => {
          const uIsOtc = /(OTC|-OTC)$/i.test(u.name);
          const uBase = u.name.replace(/[\/\-\s]/g, '').replace(/OTC$/i, '').toUpperCase();
          return uBase === tickerBase && uIsOtc === isOtc;
        });
        if (!underlying) {
          return res.status(404).json({
            error: `Ativo "${ticker}" não encontrado em digital options`,
            ativos_disponiveis: underlyings.slice(0, 10).map(u => u.name),
          });
        }
        if (underlying.isSuspended) return res.status(400).json({ error: `Ativo "${ticker}" está suspenso` });

        const instruments = await underlying.instruments();
        const nowMsD = Date.now();
        const allD = instruments.getAvailableForBuyAt(new Date(0));
        const futuresD = allD.filter(i => i.expiredAt && i.expiredAt.getTime() > nowMsD + 30000);
        const available = futuresD.length > 0 ? futuresD : instruments.getAvailableForBuyAt(new Date());
        if (available.length === 0) {
          return res.status(400).json({ error: `Sem instrumentos disponíveis para "${ticker}" agora. Janela de compra fechada.` });
        }
        // Seleciona instrumento cuja expiração restante é mais próxima do duracao configurado
        const targetMsD = nowMsD + Number(duracao) * 1000;
        available.sort((a, b) =>
          Math.abs(a.expiredAt.getTime() - targetMsD) - Math.abs(b.expiredAt.getTime() - targetMsD)
        );
        console.log(`[vorna-relay] digital instrumentos (${available.length}):`,
          available.slice(0, 5).map(i => ({ expiredAt: i.expiredAt?.toISOString?.() ?? '?', segsAte: Math.round((i.expiredAt?.getTime?.() - nowMsD) / 1000) }))
        );
        const instrument = available[0];
        const dir = (direcao === 'compra' || direcao === 'call')
          ? (classes.DigitalOptionsDirection?.Call ?? 'call')
          : (classes.DigitalOptionsDirection?.Put  ?? 'put');

        console.log(`[vorna-relay] digital buy: ${ticker} ${direcao} R$${valor}`);
        const option = await facade.buySpotStrike(instrument, dir, Number(valor), realBalance);
        console.log(`[vorna-relay] digital buy OK: id=${option.id}`);
        return res.json({ id: String(option.id), ticker: underlying.name, direcao, valor: Number(valor) });
      }

      // ── BLITZ (padrão): API original — buy(active, direction, duration, amount, balance) ──
      {
        const facade = _cachedBlitz || await sdk.blitzOptions();
        if (!_cachedBlitz) _cachedBlitz = facade;
        const actives = facade.getActives();
        const active = actives.find(a => {
          const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
          const aIsOtc = /-OTC$/i.test(a.ticker);
          return aBase === tickerBase && aIsOtc === isOtc;
        });
        if (!active) {
          return res.status(404).json({
            error: `Ativo "${ticker}" não encontrado em blitz options`,
            ativos_disponiveis: actives.slice(0, 10).map(a => a.ticker),
          });
        }
        if (active.isSuspended) return res.status(400).json({ error: `Ativo "${ticker}" está suspenso` });
        if (typeof active.canBeBoughtAt === 'function' && !active.canBeBoughtAt(new Date())) {
          return res.status(400).json({ error: `Ativo "${ticker}" não disponível para compra agora` });
        }

        const duracaoNum = Number(duracao);
        const expiracoes = active.expirationTimes || [];
        const expiracao = expiracoes.length > 0
          ? expiracoes.reduce((p, c) => Math.abs(c - duracaoNum) < Math.abs(p - duracaoNum) ? c : p, expiracoes[0])
          : duracaoNum;

        const dir = (direcao === 'compra' || direcao === 'call')
          ? (classes.BlitzOptionsDirection?.Call ?? 'call')
          : (classes.BlitzOptionsDirection?.Put  ?? 'put');

        console.log(`[vorna-relay] blitz buy: ${ticker} ${direcao} R$${valor} exp=${expiracao}s OTC=${isOtc}`);
        const option = await facade.buy(active, dir, expiracao, Number(valor), realBalance);
        console.log(`[vorna-relay] blitz buy OK: id=${option.id}`);
        return res.json({ id: String(option.id), ticker: active.ticker, direcao, valor: Number(valor) });
      }
    } catch (err) {
      // Limpar todo o cache para que próxima requisição reconecte com conexão fresca
      if (_cachedSdk && _cachedSsid === ssidParam) {
        _cachedSdk.shutdown().catch(() => {});
        _cachedSdk = null;
        _cachedSsid = null;
        _cachedBlitz = null;
        _cachedBinary = null;
        _cachedBalances = null;
      }
      console.error('[vorna-relay] buy erro:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      // SDK mantido vivo (cacheado) — não fechar aqui
    }
  }

  // ── getSaldo: retorna saldo real usando SDK cacheado (sem login HTTP) ─────────
  if (action === 'getSaldo') {
    if (!ssidParam) return res.status(400).json({ error: 'ssid obrigatório' });
    try {
      const sdk = await getOrCreateSdk(ssidParam);
      if (!sdk) return res.status(503).json({ error: 'SDK indisponível' });
      const balFacade = _cachedBalances || await sdk.balances();
      if (!_cachedBalances) _cachedBalances = balFacade;
      const real = balFacade.getBalances().find(b => b.type === 'real');
      return res.json({ saldoReal: real?.amount ?? 0 });
    } catch (err) {
      console.error('[vorna-relay] getSaldo erro:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── login / getBalance: usa SDK (não raw WebSocket) para buscar saldos ───────
  // O SDK do servidor (mesmo IP que fez o HTTP login) funciona sem IP mismatch.
  if (action === 'login' || action === 'getBalance') {
    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier e password são obrigatórios' });
    }

    const classes = await getSdkClasses();
    if (!classes) return res.status(503).json({ error: 'SDK indisponível no servidor' });

    let sdk = null;
    try {
      // Passo 1: Login HTTP do servidor → SSID válido para o IP do servidor
      const { ssid, userId } = await httpLogin(identifier, password);
      console.log(`[vorna-relay] HTTP login ok. UserId: ${userId}`);

      // Passo 2: SDK com SSID (mesmo IP do servidor) → busca saldos
      sdk = await classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssid));
      const balancesFacade = await sdk.balances();
      const bals = balancesFacade.getBalances();

      const real = bals.find(b => b.type === 'real');
      const demo = bals.find(b => b.type === 'demo');

      console.log(`[vorna-relay] Saldos: Real=${real?.amount ?? 0}, Demo=${demo?.amount ?? 0}`);

      // Verificar se userId está na lista de afiliados aprovados
      let afiliadoAprovado = false;
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
        if (supabaseUrl && supabaseKey) {
          const checkResp = await fetch(
            `${supabaseUrl}/rest/v1/afiliados_aprovados?vorna_user_id=eq.${encodeURIComponent(String(userId))}&select=vorna_user_id&limit=1`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
            }
          );
          const rows = await checkResp.json().catch(() => []);
          afiliadoAprovado = Array.isArray(rows) && rows.length > 0;
          console.log(`[vorna-relay] Afiliado userId=${userId}: ${afiliadoAprovado ? 'aprovado' : 'não cadastrado'}`);
        } else {
          // Env vars não configuradas — fail-open para não bloquear em dev
          afiliadoAprovado = true;
        }
      } catch (e) {
        console.warn('[vorna-relay] Check afiliado falhou (fail-open):', e.message);
        afiliadoAprovado = true;
      }

      return res.json({
        ssid,
        userId,
        saldoReal: real?.amount ?? 0,
        saldoDemo: demo?.amount ?? 0,
        saldoRealId: real?.id,
        saldoDemoId: demo?.id,
        afiliadoAprovado,
      });
    } catch (err) {
      console.error('[vorna-relay] login/getBalance erro:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      if (sdk) sdk.shutdown().catch(() => {});
    }
  }

  return res.status(400).json({ error: `Ação desconhecida: ${action}` });
};
