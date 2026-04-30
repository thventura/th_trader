/**
 * vorna-client.js
 * Wrapper do SDK Vorna para uso server-side no VPS.
 * Baseado no vorna-relay.js mas como módulo interno (sem HTTP round-trip).
 */

const path = require('path');

const VORNA_HTTP_URL = 'https://api.trade.vornabroker.com/v2/login';
const VORNA_WS_URL = 'wss://ws.trade.vornabroker.com/echo/websocket';
const PLATFORM_ID = 9;

let _sdkClasses = null;

async function getSdkClasses() {
  if (_sdkClasses) return _sdkClasses;
  const sdkPath = 'file://' + path.resolve(__dirname, 'node_modules/@tradecodehub/client-sdk-js/dist/index.js');
  const mod = await import(sdkPath);
  _sdkClasses = {
    ClientSdk: mod.ClientSdk,
    SsidAuthMethod: mod.SsidAuthMethod,
    BlitzOptionsDirection: mod.BlitzOptionsDirection,
    BinaryOptionsDirection: mod.BinaryOptionsDirection,
    DigitalOptionsDirection: mod.DigitalOptionsDirection,
  };
  return _sdkClasses;
}

async function criarSdk(ssid) {
  const classes = await getSdkClasses();
  return classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssid));
}

async function httpLogin(identifier, password) {
  const fetch = require('node-fetch');
  const resp = await fetch(VORNA_HTTP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://trade.vornabroker.com',
      'Referer': 'https://trade.vornabroker.com/',
      'User-Agent': 'tradecodehub-client-sdk-js/1.3.0',
      'Cookie': `platform=${PLATFORM_ID}`,
    },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.code !== 'success') {
    throw new Error(data.message || `Erro HTTP ${resp.status}`);
  }
  return { ssid: data.ssid, userId: String(data.user_id) };
}

async function obterCandles(sdk, activeId, size = 60, count = 100) {
  const candlesFacade = await sdk.candles();
  const raw = await candlesFacade.getCandles(Number(activeId), Number(size), { count });
  return (raw || []).map(c => ({
    from: c.from,
    open: c.open,
    close: c.close,
    min: c.min,
    max: c.max,
    volume: c.volume || 0,
  }));
}

async function obterSaldo(sdk) {
  const balFacade = await sdk.balances();
  const real = balFacade.getBalances().find(b => b.type === 'real');
  return real?.amount ?? 0;
}

async function obterAtivos(sdk) {
  const classes = await getSdkClasses();
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

  try { const blitz = await sdk.blitzOptions(); addActives(blitz.getActives(), 'blitz'); } catch {}
  try { const bin = await sdk.binaryOptions(); addActives(bin.getActives(), 'binary'); } catch {}
  try { const turbo = await sdk.turboOptions(); addActives(turbo.getActives(), 'turbo'); } catch {}

  return result;
}

async function comprar(sdk, { ticker, direcao, valor, duracao = 60, instrumento_tipo = 'blitz' }) {
  const classes = await getSdkClasses();
  const isOtc = /\(OTC\)$/i.test(ticker) || /-OTC$/i.test(ticker);
  const tickerBase = ticker.replace('/', '').replace(/\s*\(OTC\)$/i, '').replace(/-OTC$/i, '').toUpperCase();

  const balFacade = await sdk.balances();
  const realBalance = balFacade.getBalances().find(b => b.type === 'real');
  if (!realBalance) throw new Error('Saldo REAL não encontrado');

  if (instrumento_tipo === 'binary') {
    const facade = await sdk.binaryOptions();
    const actives = facade.getActives();
    const active = actives.find(a => {
      const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
      return aBase === tickerBase && /-OTC$/i.test(a.ticker) === isOtc;
    });
    if (!active) throw new Error(`Ativo "${ticker}" não encontrado em binary`);
    if (active.isSuspended) throw new Error(`Ativo "${ticker}" suspenso`);

    const instruments = await active.instruments();
    const nowMs = Date.now();
    const all = instruments.getAvailableForBuyAt(new Date(0));
    const futures = all.filter(i => i.expiredAt && i.expiredAt.getTime() > nowMs + 30000);
    const available = futures.length > 0 ? futures : instruments.getAvailableForBuyAt(new Date());
    if (available.length === 0) throw new Error('Janela de compra fechada');
    available.sort((a, b) => a.expiredAt.getTime() - b.expiredAt.getTime());

    const dir = (direcao === 'compra' || direcao === 'call')
      ? (classes.BinaryOptionsDirection?.Call ?? 'call')
      : (classes.BinaryOptionsDirection?.Put ?? 'put');

    const option = await facade.buy(available[0], dir, Number(valor), realBalance);
    return { id: String(option.id), ticker: active.ticker, direcao, valor: Number(valor) };
  }

  // Blitz (padrão)
  const facade = await sdk.blitzOptions();
  const actives = facade.getActives();
  const active = actives.find(a => {
    const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
    return aBase === tickerBase && /-OTC$/i.test(a.ticker) === isOtc;
  });
  if (!active) throw new Error(`Ativo "${ticker}" não encontrado em blitz`);
  if (active.isSuspended) throw new Error(`Ativo "${ticker}" suspenso`);

  const duracaoNum = Number(duracao);
  const expiracoes = active.expirationTimes || [];
  const expiracao = expiracoes.length > 0
    ? expiracoes.reduce((p, c) => Math.abs(c - duracaoNum) < Math.abs(p - duracaoNum) ? c : p, expiracoes[0])
    : duracaoNum;

  const dir = (direcao === 'compra' || direcao === 'call')
    ? (classes.BlitzOptionsDirection?.Call ?? 'call')
    : (classes.BlitzOptionsDirection?.Put ?? 'put');

  const option = await facade.buy(active, dir, expiracao, Number(valor), realBalance);
  return { id: String(option.id), ticker: active.ticker, direcao, valor: Number(valor) };
}

async function obterPosicoes(sdk) {
  const positionsFacade = await sdk.positions();
  const positions = positionsFacade.getAllPositions();
  return positions.filter(p => {
    const status = (p.status || '').toLowerCase();
    return status === 'open' || status === '' || status === 'pending';
  });
}

module.exports = {
  getSdkClasses,
  criarSdk,
  httpLogin,
  obterCandles,
  obterSaldo,
  obterAtivos,
  comprar,
  obterPosicoes,
  VORNA_WS_URL,
  PLATFORM_ID,
};
