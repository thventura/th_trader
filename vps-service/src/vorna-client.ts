import path from 'path';
import nodeFetch from 'node-fetch';

const VORNA_HTTP_URL = 'https://api.trade.vornabroker.com/v2/login';
const VORNA_WS_URL = 'wss://ws.trade.vornabroker.com/echo/websocket';
const PLATFORM_ID = 9;

// SDK path: procura no node_modules local primeiro, depois no trademaster
const SDK_LOCAL = path.resolve(__dirname, '../node_modules/@tradecodehub/client-sdk-js/dist/index.js');
const SDK_PARENT = path.resolve(__dirname, '../../trademaster/node_modules/@tradecodehub/client-sdk-js/dist/index.js');
const SDK_PATH = require('fs').existsSync(SDK_LOCAL) ? SDK_LOCAL : SDK_PARENT;

let _sdkClasses: any = null;

export async function getSdkClasses() {
  if (_sdkClasses) return _sdkClasses;
  const mod = await import('file://' + SDK_PATH) as any;
  _sdkClasses = {
    ClientSdk: mod.ClientSdk,
    SsidAuthMethod: mod.SsidAuthMethod,
    BlitzOptionsDirection: mod.BlitzOptionsDirection,
    BinaryOptionsDirection: mod.BinaryOptionsDirection,
    DigitalOptionsDirection: mod.DigitalOptionsDirection,
  };
  return _sdkClasses;
}

export async function criarSdk(ssid: string) {
  const classes = await getSdkClasses();
  return classes.ClientSdk.create(VORNA_WS_URL, PLATFORM_ID, new classes.SsidAuthMethod(ssid));
}

export async function httpLogin(identifier: string, password: string): Promise<{ ssid: string; userId: string }> {
  const resp = await nodeFetch(VORNA_HTTP_URL, {
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
  const data = await resp.json() as any;
  if (!resp.ok || data.code !== 'success') {
    throw new Error(data.message || `Erro HTTP ${resp.status}`);
  }
  return { ssid: data.ssid, userId: String(data.user_id) };
}

export async function obterCandles(sdk: any, activeId: number, size = 60, count = 200) {
  const candlesFacade = await sdk.candles();
  const raw = await candlesFacade.getCandles(Number(activeId), Number(size), { count });
  return (raw || []).map((c: any) => ({
    timestamp: c.from * 1000,
    abertura: c.open,
    fechamento: c.close,
    minima: c.min,
    maxima: c.max,
    volume: c.volume || 0,
    cor: c.close >= c.open ? 'alta' : 'baixa',
  }));
}

export async function obterSaldo(sdk: any): Promise<number> {
  const balFacade = await sdk.balances();
  const real = balFacade.getBalances().find((b: any) => b.type === 'real');
  return real?.amount ?? 0;
}

export async function obterAtivos(sdk: any) {
  const result: any[] = [];
  const seen = new Set<string>();

  const addActives = (actives: any[], instrumentType: string) => {
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

  return result;
}

export async function comprar(sdk: any, { ticker, direcao, valor, duracao = 60, instrumento_tipo = 'blitz' }: {
  ticker: string;
  direcao: 'compra' | 'venda';
  valor: number;
  duracao?: number;
  instrumento_tipo?: string;
}): Promise<string> {
  const classes = await getSdkClasses();
  const isOtc = /\(OTC\)$/i.test(ticker) || /-OTC$/i.test(ticker);
  const tickerBase = ticker.replace('/', '').replace(/\s*\(OTC\)$/i, '').replace(/-OTC$/i, '').toUpperCase();

  const balFacade = await sdk.balances();
  const realBalance = balFacade.getBalances().find((b: any) => b.type === 'real');
  if (!realBalance) throw new Error('Saldo REAL não encontrado');

  if (instrumento_tipo === 'binary') {
    const facade = await sdk.binaryOptions();
    const actives = facade.getActives();
    const active = actives.find((a: any) => {
      const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
      return aBase === tickerBase && /-OTC$/i.test(a.ticker) === isOtc;
    });
    if (!active) throw new Error(`Ativo "${ticker}" não encontrado em binary`);
    if (active.isSuspended) throw new Error(`Ativo "${ticker}" suspenso`);

    const instruments = await active.instruments();
    const nowMs = Date.now();
    const all = instruments.getAvailableForBuyAt(new Date(0));
    const futures = all.filter((i: any) => i.expiredAt && i.expiredAt.getTime() > nowMs + 30000);
    const available = futures.length > 0 ? futures : instruments.getAvailableForBuyAt(new Date());
    if (available.length === 0) throw new Error('Janela de compra fechada');
    available.sort((a: any, b: any) => a.expiredAt.getTime() - b.expiredAt.getTime());

    const dir = (direcao === 'compra')
      ? (classes.BinaryOptionsDirection?.Call ?? 'call')
      : (classes.BinaryOptionsDirection?.Put ?? 'put');

    const option = await facade.buy(available[0], dir, Number(valor), realBalance);
    return String(option.id);
  }

  // Blitz (padrão)
  const facade = await sdk.blitzOptions();
  const actives = facade.getActives();
  const active = actives.find((a: any) => {
    const aBase = a.ticker.replace(/-OTC$/i, '').toUpperCase();
    return aBase === tickerBase && /-OTC$/i.test(a.ticker) === isOtc;
  });
  if (!active) throw new Error(`Ativo "${ticker}" não encontrado em blitz`);
  if (active.isSuspended) throw new Error(`Ativo "${ticker}" suspenso`);

  const duracaoNum = Number(duracao);
  const expiracoes: number[] = active.expirationTimes || [];
  const expiracao = expiracoes.length > 0
    ? expiracoes.reduce((p: number, c: number) => Math.abs(c - duracaoNum) < Math.abs(p - duracaoNum) ? c : p, expiracoes[0])
    : duracaoNum;

  const dir = (direcao === 'compra')
    ? (classes.BlitzOptionsDirection?.Call ?? 'call')
    : (classes.BlitzOptionsDirection?.Put ?? 'put');

  const option = await facade.buy(active, dir, expiracao, Number(valor), realBalance);
  return String(option.id);
}

export async function obterPosicoes(sdk: any) {
  const positionsFacade = await sdk.positions();
  const positions = positionsFacade.getAllPositions();
  return positions.filter((p: any) => {
    const status = (p.status || '').toLowerCase();
    return status === 'open' || status === '' || status === 'pending';
  });
}

export async function subscribeQuotes(
  sdk: any,
  activeId: number,
  callback: (value: number, timestampMs: number) => void
): Promise<() => void> {
  const quotesFacade = await sdk.quotes();
  const currentQuote = await quotesFacade.getCurrentQuoteForActive(activeId);
  currentQuote.subscribeOnUpdate((q: any) => {
    callback(q.value, q.time.getTime());
  });
  return () => {
    try { currentQuote.unsubscribeOnUpdate?.(); } catch {}
  };
}
