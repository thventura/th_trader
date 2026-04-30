import type {
  BingXCredenciais,
  BingXSaldo,
  BingXPosicao,
  BingXOrdem,
  BingXAbrirOrdemParams,
} from '../types';

const BASE_URL = 'https://open-api.bingx.com';
const BINGX_API_KEY_LS = 'bingx_api_key';
const BINGX_SECRET_KEY_LS = 'bingx_secret_key';

// ── LocalStorage helpers ──

export function salvarCredenciais(creds: BingXCredenciais): void {
  localStorage.setItem(BINGX_API_KEY_LS, creds.apiKey);
  localStorage.setItem(BINGX_SECRET_KEY_LS, creds.secretKey);
}

export function carregarCredenciais(): BingXCredenciais | null {
  const apiKey = localStorage.getItem(BINGX_API_KEY_LS);
  const secretKey = localStorage.getItem(BINGX_SECRET_KEY_LS);
  if (!apiKey || !secretKey) return null;
  return { apiKey, secretKey };
}

export function removerCredenciais(): void {
  localStorage.removeItem(BINGX_API_KEY_LS);
  localStorage.removeItem(BINGX_SECRET_KEY_LS);
}

// ── HMAC-SHA256 via Web Crypto API ──

async function gerarAssinatura(queryString: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(queryString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Requisição autenticada ──

async function requisicao<T>(
  creds: BingXCredenciais,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const signature = await gerarAssinatura(queryString, creds.secretKey);
  const fullQuery = `${queryString}&signature=${signature}`;

  const url =
    method === 'GET' || method === 'DELETE'
      ? `${BASE_URL}${path}?${fullQuery}`
      : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-BX-APIKEY': creds.apiKey,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(method === 'POST' ? { body: fullQuery } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BingX API ${res.status}: ${text}`);
  }

  const json = await res.json();

  if (json.code !== undefined && json.code !== 0) {
    throw new Error(`BingX erro ${json.code}: ${json.msg}`);
  }

  return json.data as T;
}

// ── Funções públicas ──

export async function testarConexao(creds: BingXCredenciais): Promise<boolean> {
  try {
    await requisicao(creds, 'GET', '/openApi/swap/v2/user/balance');
    return true;
  } catch {
    return false;
  }
}

export async function getSaldo(creds: BingXCredenciais): Promise<BingXSaldo[]> {
  const data = await requisicao<{ balance: { asset: string; balance: string; availableMargin: string; usedMargin: string; unrealizedProfit: string }[] }>(
    creds,
    'GET',
    '/openApi/swap/v2/user/balance',
  );

  return (data.balance ?? []).map((b) => ({
    ativo: b.asset,
    saldoTotal: parseFloat(b.balance),
    saldoDisponivel: parseFloat(b.availableMargin),
    margem: parseFloat(b.usedMargin),
    pnlNaoRealizado: parseFloat(b.unrealizedProfit),
  }));
}

export async function getPosicoes(creds: BingXCredenciais): Promise<BingXPosicao[]> {
  const data = await requisicao<{ positions: {
    symbol: string;
    positionSide: string;
    positionAmt: string;
    avgPrice: string;
    markPrice: string;
    unrealizedProfit: string;
    leverage: string;
    initialMargin: string;
  }[] }>(
    creds,
    'GET',
    '/openApi/swap/v2/user/positions',
  );

  return (data.positions ?? [])
    .filter((p) => parseFloat(p.positionAmt) !== 0)
    .map((p) => ({
      symbol: p.symbol,
      positionSide: p.positionSide as 'LONG' | 'SHORT',
      quantidade: Math.abs(parseFloat(p.positionAmt)),
      precoEntrada: parseFloat(p.avgPrice),
      precoAtual: parseFloat(p.markPrice),
      pnl: parseFloat(p.unrealizedProfit),
      alavancagem: parseFloat(p.leverage),
      margem: parseFloat(p.initialMargin),
    }));
}

export async function abrirOrdem(
  creds: BingXCredenciais,
  params: BingXAbrirOrdemParams,
): Promise<BingXOrdem> {
  if (params.leverage) {
    await setAlavancagem(creds, params.symbol, params.leverage);
  }

  const reqParams: Record<string, string | number> = {
    symbol: params.symbol,
    side: params.side,
    positionSide: params.positionSide,
    type: params.type,
    quantity: params.quantity,
  };

  if (params.type === 'LIMIT' && params.price) {
    reqParams.price = params.price;
  }

  if (params.stopLoss) {
    reqParams['stopLoss.type'] = 'STOP_MARKET';
    reqParams['stopLoss.stopPrice'] = params.stopLoss;
  }

  if (params.takeProfit) {
    reqParams['takeProfit.type'] = 'TAKE_PROFIT_MARKET';
    reqParams['takeProfit.stopPrice'] = params.takeProfit;
  }

  const data = await requisicao<{ order: {
    orderId: string;
    symbol: string;
    side: string;
    positionSide: string;
    type: string;
    origQty: string;
    price: string;
    status: string;
    time: number;
  } }>(
    creds,
    'POST',
    '/openApi/swap/v2/trade/order',
    reqParams,
  );

  const o = data.order;
  return {
    orderId: o.orderId,
    symbol: o.symbol,
    side: o.side as 'BUY' | 'SELL',
    positionSide: o.positionSide as 'LONG' | 'SHORT',
    type: o.type as BingXOrdem['type'],
    quantidade: parseFloat(o.origQty),
    preco: parseFloat(o.price),
    status: o.status as BingXOrdem['status'],
    criadoEm: o.time,
  };
}

export async function fecharPosicao(
  creds: BingXCredenciais,
  symbol: string,
  positionSide: 'LONG' | 'SHORT',
  quantidade: number,
): Promise<void> {
  const side = positionSide === 'LONG' ? 'SELL' : 'BUY';
  await requisicao(creds, 'POST', '/openApi/swap/v2/trade/order', {
    symbol,
    side,
    positionSide,
    type: 'MARKET',
    quantity: quantidade,
  });
}

export async function fecharTodasPosicoes(
  creds: BingXCredenciais,
  posicoes: BingXPosicao[],
): Promise<void> {
  await Promise.all(
    posicoes.map((p) => fecharPosicao(creds, p.symbol, p.positionSide, p.quantidade)),
  );
}

export async function cancelarOrdem(
  creds: BingXCredenciais,
  symbol: string,
  orderId: string,
): Promise<void> {
  await requisicao(creds, 'DELETE', '/openApi/swap/v2/trade/order', { symbol, orderId });
}

export async function setAlavancagem(
  creds: BingXCredenciais,
  symbol: string,
  leverage: number,
): Promise<void> {
  await requisicao(creds, 'POST', '/openApi/swap/v2/trade/leverage', {
    symbol,
    side: 'LONG',
    leverage,
  });
  await requisicao(creds, 'POST', '/openApi/swap/v2/trade/leverage', {
    symbol,
    side: 'SHORT',
    leverage,
  });
}

export async function getHistoricoOrdens(
  creds: BingXCredenciais,
  symbol?: string,
  limit = 50,
): Promise<BingXOrdem[]> {
  const params: Record<string, string | number> = { limit };
  if (symbol) params.symbol = symbol;

  const data = await requisicao<{ orders: {
    orderId: string;
    symbol: string;
    side: string;
    positionSide: string;
    type: string;
    origQty: string;
    avgPrice: string;
    status: string;
    time: number;
    profit: string;
  }[] }>(
    creds,
    'GET',
    '/openApi/swap/v2/trade/allOrders',
    params,
  );

  return (data.orders ?? []).map((o) => ({
    orderId: o.orderId,
    symbol: o.symbol,
    side: o.side as 'BUY' | 'SELL',
    positionSide: o.positionSide as 'LONG' | 'SHORT',
    type: o.type as BingXOrdem['type'],
    quantidade: parseFloat(o.origQty),
    preco: parseFloat(o.avgPrice),
    status: o.status as BingXOrdem['status'],
    criadoEm: o.time,
    pnl: parseFloat(o.profit || '0'),
  }));
}

export const PARES_POPULARES = [
  'BTC-USDT',
  'ETH-USDT',
  'SOL-USDT',
  'BNB-USDT',
  'XRP-USDT',
  'DOGE-USDT',
  'ADA-USDT',
  'AVAX-USDT',
  'DOT-USDT',
  'LINK-USDT',
];
