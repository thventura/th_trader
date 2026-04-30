import { ClientSdk, SsidAuthMethod, BlitzOptionsDirection, BalanceType } from '@tradecodehub/client-sdk-js';
import type {
  VornaCarteira,
  VornaUsuario,
  VornaPerfilCompleto,
  VornaSessao,
  ConfigAutomacao,
  EstadoAutomacao,
  AnaliseQuadrante,
  AnaliseQuadrante5min,
  AnaliseImpulsoCorrecaoEngolfo,
  Op,
} from '../types';

const VORNA_WS_URL = 'wss://ws.trade.vornabroker.com/echo/websocket';

const VORNA_PLATFORM_ID = 9;
const STORAGE_KEY = 'trademaster_vorna_sessao';
const CREDENCIAIS_KEY = 'trademaster_vorna_cred';
const AUTOMACAO_KEY = 'trademaster_vorna_automacao';

// Migrar chave de storage legada (Puma → Vorna)
{
  const legado = localStorage.getItem('trademaster_puma_automacao');
  if (legado && !localStorage.getItem('trademaster_vorna_automacao')) {
    localStorage.setItem('trademaster_vorna_automacao', legado);
  }
}
const ESTADO_AUTOMACAO_KEY = 'trademaster_automacao_estado';
const OPS_KEY = 'trademaster_ops';

// ── SDK instance (módulo-level) ──

let _sdk: ClientSdk | null = null;

export function getSdk(): ClientSdk | null {
  return _sdk;
}

// ── Erro tipado da VornaBroker ──

export class VornaErro extends Error {
  constructor(
    public mensagem: string,
    public codigo?: number,
    public requer2fa?: boolean
  ) {
    super(mensagem);
    this.name = 'VornaErro';
  }
}

// ── Utilitários UUID ──

export async function hashIdToUUID(rawId: string): Promise<string> {
  if (!rawId) return generateRandomUUID();
  const encoder = new TextEncoder();
  const dataEnc = encoder.encode(rawId);
  let hex = '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataEnc);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback abaixo
    }
  }

  if (!hex) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < rawId.length; i++) {
      ch = rawId.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    hex = hex.padEnd(64, '0');
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
}

export function generateRandomUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (crypto.randomUUID) return crypto.randomUUID();
    if (crypto.getRandomValues) {
      return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -11e11).replace(/[018]/g, (c: any) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Gerenciamento de Sessão ──

export function obterSessaoVorna(): VornaSessao | null {
  try {
    const dados = localStorage.getItem(STORAGE_KEY);
    if (!dados) return null;
    return JSON.parse(dados) as VornaSessao;
  } catch {
    return null;
  }
}

export function salvarSessaoVorna(sessao: VornaSessao): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
  window.dispatchEvent(new CustomEvent('trademaster:vorna-atualizado'));
}

// ── Credenciais para Auto-Reconexão ──

export function salvarCredenciaisVorna(identifier: string, senha: string): void {
  const encoded = btoa(JSON.stringify({ identifier, senha }));
  sessionStorage.setItem(CREDENCIAIS_KEY, encoded);
}

export function obterCredenciaisVorna(): { identifier: string; senha: string } | null {
  try {
    const raw = sessionStorage.getItem(CREDENCIAIS_KEY);
    if (!raw) return null;
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

export function limparCredenciaisVorna(): void {
  sessionStorage.removeItem(CREDENCIAIS_KEY);
}

// ── Verificação de Sessão ──

export async function verificarSessaoValida(): Promise<boolean> {
  if (!_sdk) return false;
  try {
    const balancesFacade = await _sdk.balances();
    balancesFacade.getBalances();
    return true;
  } catch {
    return false;
  }
}

// ── Auto-Reconexão ──

let _reconexaoEmAndamento: Promise<boolean> | null = null;

export async function reconectarVorna(): Promise<boolean> {
  if (_reconexaoEmAndamento) return _reconexaoEmAndamento;

  _reconexaoEmAndamento = (async () => {
    const cred = obterCredenciaisVorna();
    if (!cred) return false;

    try {
      await loginVorna(cred.identifier, cred.senha);
      console.log('[Vorna] Reconexão automática bem-sucedida.');
      return true;
    } catch (err) {
      console.error('[Vorna] Falha na reconexão automática:', err);
      return false;
    }
  })();

  try {
    return await _reconexaoEmAndamento;
  } finally {
    _reconexaoEmAndamento = null;
  }
}

export async function comReconexao<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof VornaErro && (err.codigo === 401 || err.codigo === 403)) {
      console.warn('[Vorna] Sessão expirada, tentando reconexão...');
      const reconectou = await reconectarVorna();
      if (reconectou) {
        return await fn();
      }
    }
    throw err;
  }
}

export type ActiveInfo = {
  id: number;
  ticker: string;           // ticker original do SDK, ex: "EURUSD-OTC"
  isSuspended: boolean;
  isOtc: boolean;           // true quando ticker termina em -OTC
  instrumentType: 'blitz' | 'binary' | 'turbo';
  displayName: string;      // "EUR/USD" ou "EUR/USD (OTC)"
  payout: number;           // percentual de retorno, ex: 88 para 88%
};

// ── Formata ticker para exibição legível ──────────────────────────────────────

export function formatarDisplayName(ticker: string): string {
  const isOtc = /\-OTC$/i.test(ticker);
  const base = isOtc ? ticker.slice(0, -4) : ticker;
  let fmt = base;
  if (/^[A-Za-z]{6}$/.test(base)) {
    fmt = base.slice(0, 3).toUpperCase() + '/' + base.slice(3).toUpperCase();
  }
  return isOtc ? `${fmt} (OTC)` : fmt;
}

// ── Busca ativos de todos os facades do SDK (blitz + binary + turbo) ──────────

async function buscarTodosAtivosSDK(sdk: ClientSdk): Promise<ActiveInfo[]> {
  const result: ActiveInfo[] = [];
  const seen = new Set<string>();

  const addActives = (actives: any[], instrumentType: ActiveInfo['instrumentType']) => {
    for (const a of actives) {
      const key = `${a.id}_${instrumentType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isOtc = /\-OTC$/i.test(a.ticker);
      result.push({
        id: a.id,
        ticker: a.ticker,
        isSuspended: a.isSuspended ?? false,
        isOtc,
        instrumentType,
        displayName: formatarDisplayName(a.ticker),
        payout: a.profitCommissionPercent != null ? Math.round(100 - a.profitCommissionPercent) : 0,
      });
    }
  };

  try { const blitz = await sdk.blitzOptions();  addActives(blitz.getActives(),  'blitz');  } catch {}
  try { const bin   = await sdk.binaryOptions(); addActives(bin.getActives(),    'binary'); } catch {}
  try { const turbo = await sdk.turboOptions();  addActives(turbo.getActives(),  'turbo');  } catch {}

  return result;
}

// ── Relay fallback: busca ativos via servidor (quando SDK não conecta do browser) ──

export async function obterAtivosViaRelay(): Promise<ActiveInfo[]> {
  const sessao = obterSessaoVorna();
  if (!sessao?.ssid) return [];
  try {
    const resp = await fetch('/api/vorna-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getActives', ssid: sessao.ssid }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.actives || []).map((a: any): ActiveInfo => ({
      id: a.id,
      ticker: a.ticker,
      isSuspended: a.isSuspended ?? false,
      isOtc: a.isOtc ?? /\-OTC$/i.test(a.ticker),
      instrumentType: a.instrumentType || 'blitz',
      displayName: a.displayName || formatarDisplayName(a.ticker),
      payout: a.payout ?? 0,
    }));
  } catch {
    return [];
  }
}

// ── Relay fallback: busca velas via servidor ──────────────────────────────────

export async function obterVelasViaRelay(
  activeId: number,
  size: number,
  to?: number,
  count: number = 1000
): Promise<{ from: number; open: number; close: number; min: number; max: number; volume: number }[]> {
  const sessao = obterSessaoVorna();
  if (!sessao?.ssid) return [];
  try {
    const resp = await fetch('/api/vorna-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getCandles', ssid: sessao.ssid, activeId, size, to, count }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.candles || [];
  } catch {
    return [];
  }
}

export async function obterAtivosDisponiveis(): Promise<ActiveInfo[]> {
  if (!_sdk) {
    // SDK não conecta do browser (SSID bound ao IP do servidor) — usa relay
    return obterAtivosViaRelay();
  }
  try {
    return await buscarTodosAtivosSDK(_sdk);
  } catch (err) {
    console.warn('[Vorna] Erro ao buscar ativos do SDK:', err);
    return obterAtivosViaRelay();
  }
}

// ── Mapeamento de ativo para ticker do SDK ──

function normalizarTicker(ativo: string): string {
  return ativo.replace('/', '').replace(/\s+/g, '').toUpperCase();
}

// ── Login e Criação do SDK ──


export async function loginVorna(identifier: string, senha: string): Promise<VornaUsuario> {
  // Chama o relay server-side (api/vorna-relay.js) que faz HTTP login + WebSocket
  // do mesmo servidor → mesmo IP → sem IP mismatch no SSID.
  let relayData: {
    ssid: string;
    userId: string;
    saldoReal: number;
    saldoDemo: number;
    saldoRealId?: number;
    saldoDemoId?: number;
    afiliadoAprovado?: boolean;
  };

  try {
    const resp = await fetch('/api/vorna-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', identifier, password: senha }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new VornaErro(err.error || `Erro no relay: ${resp.status}`, resp.status);
    }

    relayData = await resp.json();
    console.log('[vorna] Relay login ok. SaldoReal:', relayData.saldoReal);
  } catch (err: any) {
    if (err instanceof VornaErro) throw err;
    throw new VornaErro('Erro de conexão com a VornaBroker. Verifique sua internet.');
  }

  const ssidObtido = relayData.ssid;

  const carteiras: VornaCarteira[] = [];
  if (relayData.saldoReal !== undefined) {
    carteiras.push({
      tipo: 'REAL',
      saldo: relayData.saldoReal,
      bonus: 0,
      rollover: 0,
      rollover_total: 0,
    });
  }
  if (relayData.saldoDemo !== undefined) {
    carteiras.push({
      tipo: 'DEMO',
      saldo: relayData.saldoDemo,
      bonus: 0,
      rollover: 0,
      rollover_total: 0,
    });
  }

  // Conectar SDK com o SSID retornado pelo relay (para operações futuras)
  // O relay garantiu que o SSID é válido do ponto de vista do servidor.
  // Salvamos o SSID na sessão; operações de trading também passarão pelo relay.
  if (_sdk) { await _sdk.shutdown().catch(() => {}); _sdk = null; }
  try {
    _sdk = await ClientSdk.create(VORNA_WS_URL, VORNA_PLATFORM_ID, new SsidAuthMethod(ssidObtido));
    console.log('[vorna] SDK conectado com SSID do relay.');
  } catch {
    // SDK opcional — operações de saldo são feitas via relay; SDK para trading
    console.warn('[vorna] SDK não conectou (SSID bound ao IP do servidor). Operações via relay.');
  }

  const usuario: VornaUsuario = {
    nome: identifier.split('@')[0],
    sobrenome: '',
    apelido: null,
    email: identifier,
    email_confirmado: true,
    verificado: true,
    idioma: 'pt',
    fuso_horario: 'America/Sao_Paulo',
    som: true,
    autenticacao_2fa: false,
    vip: false,
    carteiras,
  };

  const saldoReal = relayData.saldoReal ?? 0;
  const saldoDemo = relayData.saldoDemo ?? 0;

  const perfil: VornaPerfilCompleto = {
    nome: usuario.nome,
    email: identifier,
    foto: '',
    sexo: '',
    verificado: true,
    email_verificado: true,
    rollover: 0,
    rollover_inicial: 0,
    saldo: saldoReal,
    saldo_demo: saldoDemo,
    bonus: 0,
  };

  const sessao: VornaSessao = {
    conectado: true,
    usuario,
    perfil,
    ssid: ssidObtido,
    ultima_atualizacao: new Date().toISOString(),
    expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    afiliadoAprovado: relayData.afiliadoAprovado ?? true,
  };
  salvarSessaoVorna(sessao);
  salvarCredenciaisVorna(identifier, senha);

  return usuario;
}

export async function obterDadosUsuario(): Promise<VornaPerfilCompleto> {
  let saldoReal = 0;
  let saldoDemo = 0;

  if (_sdk) {
    // SDK disponível → usa direto
    const balancesFacade = await _sdk.balances();
    const balances = balancesFacade.getBalances();
    saldoReal = balances.find(b => b.type === BalanceType.Real)?.amount ?? 0;
    saldoDemo = balances.find(b => b.type === BalanceType.Demo)?.amount ?? 0;
  } else {
    // SDK indisponível → usa relay server-side com credenciais salvas
    const cred = obterCredenciaisVorna();
    if (!cred) throw new VornaErro('Não conectado à VornaBroker.');
    const resp = await fetch('/api/vorna-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getBalance', identifier: cred.identifier, password: cred.senha }),
    });
    if (!resp.ok) throw new VornaErro(`Erro ao atualizar saldo: ${resp.status}`);
    const data = await resp.json();
    saldoReal = data.saldoReal ?? 0;
    saldoDemo = data.saldoDemo ?? 0;
  }

  const sessaoAtual = obterSessaoVorna();

  const perfil: VornaPerfilCompleto = {
    nome: sessaoAtual?.usuario?.nome || '',
    email: sessaoAtual?.usuario?.email || '',
    foto: sessaoAtual?.perfil?.foto || '',
    sexo: '',
    verificado: true,
    email_verificado: true,
    rollover: 0,
    rollover_inicial: 0,
    saldo: saldoReal,
    saldo_demo: saldoDemo,
    bonus: 0,
  };

  if (sessaoAtual) {
    sessaoAtual.perfil = perfil;
    if (sessaoAtual.usuario) {
      // Sincroniza saldo REAL
      const carteiraRealLocal = sessaoAtual.usuario.carteiras.find(c => c.tipo === 'REAL');
      if (carteiraRealLocal && carteiraRealLocal.saldo !== saldoReal) {
        carteiraRealLocal.saldo = saldoReal;
      }
      // Sincroniza saldo DEMO
      const carteiraDemoLocal = sessaoAtual.usuario.carteiras.find(c => c.tipo === 'DEMO');
      if (carteiraDemoLocal && carteiraDemoLocal.saldo !== saldoDemo) {
        carteiraDemoLocal.saldo = saldoDemo;
      }
    }
    sessaoAtual.ultima_atualizacao = new Date().toISOString();
    salvarSessaoVorna(sessaoAtual);
  }

  return perfil;
}

export function desconectarVorna(): void {
  if (_sdk) {
    _sdk.shutdown().catch(() => {});
    _sdk = null;
  }
  localStorage.removeItem(STORAGE_KEY);
  limparCredenciaisVorna();
  window.dispatchEvent(new CustomEvent('trademaster:vorna-desconectado'));
}

// ── Automação: Persistência de Config ──

export function obterConfigAutomacao(): ConfigAutomacao | null {
  try {
    const dados = localStorage.getItem(AUTOMACAO_KEY);
    if (!dados) return null;
    return JSON.parse(dados) as ConfigAutomacao;
  } catch {
    return null;
  }
}

export function salvarConfigAutomacao(config: ConfigAutomacao): void {
  localStorage.setItem(AUTOMACAO_KEY, JSON.stringify(config));
}

export function limparConfigAutomacao(): void {
  localStorage.removeItem(AUTOMACAO_KEY);
}

// ── Automação: Persistência do Estado Completo ──

export interface EstadoPersistido {
  automacao: EstadoAutomacao;
  saldoAnterior: number;
  resultadoAnterior: 'vitoria' | 'derrota' | null;
  valorAnterior: number;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  operacoesAbertas?: OperacaoAberta[];
  timestamp: string;
}

export function salvarEstadoAutomacao(estado: EstadoPersistido): void {
  localStorage.setItem(ESTADO_AUTOMACAO_KEY, JSON.stringify(estado));
}

export function obterEstadoAutomacao(): EstadoPersistido | null {
  try {
    const dados = localStorage.getItem(ESTADO_AUTOMACAO_KEY);
    if (!dados) return null;
    return JSON.parse(dados) as EstadoPersistido;
  } catch {
    return null;
  }
}

export function limparEstadoAutomacao(): void {
  localStorage.removeItem(ESTADO_AUTOMACAO_KEY);
}

// ── Automação: Polling de Saldo ──

export async function verificarSaldoVorna(): Promise<number> {
  const perfil = await comReconexao(() => obterDadosUsuario());
  return perfil.saldo;
}

// ── Automação: Leitura/Escrita de Operações ──

function lerOperacoes(): Op[] {
  try {
    const raw = localStorage.getItem(OPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function adicionarOperacaoSync(op: Op): void {
  const ops = lerOperacoes();
  ops.unshift(op);
  localStorage.setItem(OPS_KEY, JSON.stringify(ops.slice(0, 50)));
  window.dispatchEvent(new CustomEvent('apex-trader:ops-updated'));
}

export function criarOperacaoAutomatica(params: {
  config: ConfigAutomacao;
  diferenca_saldo: number;
  numero_operacao: number;
  direcao: 'compra' | 'venda';
}): Op {
  const { config, diferenca_saldo, numero_operacao, direcao } = params;
  const agora = new Date();
  const resultado: 'vitoria' | 'derrota' = diferenca_saldo > 0 ? 'vitoria' : 'derrota';

  return {
    id: generateRandomUUID(),
    data: agora.toISOString().slice(0, 10),
    hora: agora.toTimeString().slice(0, 5),
    corretora: 'VornaBroker',
    ativo: config.ativo,
    mercado: config.mercado,
    estrategia: `Quadrantes (${config.gerenciamento})`,
    direcao,
    resultado,
    investido: config.valor_por_operacao,
    payout: config.payout,
    lucro: diferenca_saldo,
    timeframe: config.timeframe,
    confianca: 3,
  };
}

export function criarOperacaoQuadrante(params: {
  config: ConfigAutomacao;
  analise: AnaliseQuadrante;
  valor_operacao: number;
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  quadrante: number;
  vornaOpId?: string;
  vornaEmail?: string;
}): Op {
  const { config, analise, valor_operacao, resultado, lucro, quadrante, vornaOpId, vornaEmail } = params;
  const agora = new Date();
  const corretoraTag = vornaEmail ? `VornaBroker (${vornaEmail})` : 'VornaBroker';

  const corPred = analise.cor_predominante === 'alta' ? 'compra' : analise.cor_predominante === 'baixa' ? 'venda' : 'empate';
  const tipoOp = analise.direcao_operacao === corPred ? 'Tendência' : 'Reversão';
  const subEstrategia = (analise.total_alta >= 7 || analise.total_baixa >= 7) ? 'Sete Velas' : 'Clássico';
  const estrategiaMeta = `Q${quadrante} | ${subEstrategia} | ${tipoOp} | H:${analise.total_alta} B:${analise.total_baixa}`;

  return {
    id: vornaOpId || generateRandomUUID(),
    data: agora.toISOString().slice(0, 10),
    hora: agora.toTimeString().slice(0, 5),
    corretora: corretoraTag,
    ativo: config.ativo,
    mercado: config.mercado,
    estrategia: estrategiaMeta,
    direcao: analise.direcao_operacao,
    resultado,
    investido: valor_operacao,
    payout: config.payout,
    lucro,
    timeframe: config.timeframe,
    confianca: analise.confianca,
    explicacao: analise.explicacao,
  };
}

export function criarOperacaoQuadrante5min(params: {
  config: ConfigAutomacao;
  analise: AnaliseQuadrante5min;
  valor_operacao: number;
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  quadrante: number;
  gale_nivel: number;
  vornaOpId?: string;
  vornaEmail?: string;
}): Op {
  const { config, analise, valor_operacao, resultado, lucro, quadrante, gale_nivel, vornaOpId, vornaEmail } = params;
  const agora = new Date();
  const corretoraTag = vornaEmail ? `VornaBroker (${vornaEmail})` : 'VornaBroker';
  const galeLabel = gale_nivel === 0 ? 'Normal' : `P${gale_nivel}`;
  const estrategiaMeta = `Q5M${quadrante} | ${galeLabel} | ${analise.direcao_operacao === 'compra' ? 'COMPRA' : 'VENDA'} | A:${analise.total_alta} B:${analise.total_baixa}`;

  return {
    id: vornaOpId || generateRandomUUID(),
    data: agora.toISOString().slice(0, 10),
    hora: agora.toTimeString().slice(0, 5),
    corretora: corretoraTag,
    ativo: config.ativo,
    mercado: config.mercado,
    estrategia: estrategiaMeta,
    direcao: analise.direcao_operacao,
    resultado,
    investido: valor_operacao,
    payout: config.payout,
    lucro,
    timeframe: config.timeframe,
    confianca: analise.confianca,
    explicacao: analise.explicacao,
  };
}

export function criarOperacaoFluxoVelas(params: {
  config: ConfigAutomacao;
  direcao: 'compra' | 'venda';
  valor_operacao: number;
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  vornaOpId?: string;
  vornaEmail?: string;
}): Op {
  const { config, direcao, valor_operacao, resultado, lucro, vornaOpId, vornaEmail } = params;
  const agora = new Date();
  const corretoraTag = vornaEmail ? `VornaBroker (${vornaEmail})` : 'VornaBroker';

  return {
    id: vornaOpId || generateRandomUUID(),
    data: agora.toISOString().slice(0, 10),
    hora: agora.toTimeString().slice(0, 5),
    corretora: corretoraTag,
    ativo: config.ativo,
    mercado: config.mercado,
    estrategia: `FluxoVelas (${config.gerenciamento})`,
    direcao,
    resultado,
    investido: valor_operacao,
    payout: config.payout,
    lucro,
    timeframe: config.timeframe,
    confianca: 4,
  };
}

export function criarOperacaoImpulsoCorrecaoEngolfo(params: {
  config: ConfigAutomacao;
  analise: AnaliseImpulsoCorrecaoEngolfo;
  valor_operacao: number;
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  vornaOpId?: string;
  vornaEmail?: string;
}): Op {
  const { config, analise, valor_operacao, resultado, lucro, vornaOpId, vornaEmail } = params;
  const agora = new Date();
  const corretoraTag = vornaEmail ? `VornaBroker (${vornaEmail})` : 'VornaBroker';

  return {
    id: vornaOpId || generateRandomUUID(),
    data: agora.toISOString().slice(0, 10),
    hora: agora.toTimeString().slice(0, 5),
    corretora: corretoraTag,
    ativo: config.ativo,
    mercado: config.mercado,
    estrategia: `ImpulsoCorrecaoEngolfo (${config.gerenciamento}) | Impulso:${analise.velasImpulso}v | Correção:${analise.velasCorrecao}v`,
    direcao: analise.direcao_operacao!,
    resultado,
    investido: valor_operacao,
    payout: config.payout,
    lucro,
    timeframe: config.timeframe,
    confianca: analise.confianca,
    explicacao: analise.resumo,
  };
}

// ── Interface de Operação Aberta (compatível com usePuma) ──

export interface OperacaoAberta {
  id: string;
  ativo?: string;
  direcao?: 'compra' | 'venda';
  valor?: number;
  hora_envio?: string;
  duracao?: number;   // segundos de expiração da operação (ex: 60 para M1)
  status?: string;
  preco_entrada?: number;
  lot?: string;
  asset?: string;
  trend?: string;
  payout?: string;
  payout_percent?: string;
  demo?: string;
  interval?: string;
  start?: string;
  end?: string;
  price_start?: string;
  price_end?: string;
}

// ── Execução de Operação na VornaBroker via SDK ──

export async function executarOperacaoVorna(
  ativo: string,
  direcao: 'compra' | 'venda',
  valor: number,
  duracao: number,
  instrumento_tipo: 'blitz' | 'binary' | 'digital' = 'blitz'
): Promise<string> {
  // ── SDK local (disponível em dev sem proxy) ──────────────────────────────────
  if (_sdk) {
    const blitz = await _sdk.blitzOptions();
    const actives = blitz.getActives();

    if (actives.length === 0) {
      throw new VornaErro('Nenhum ativo disponível. Verifique o horário de mercado.');
    }

    const isOtcRequested = /\(OTC\)$/i.test(ativo) || /-OTC$/i.test(ativo);
    const tickerBase = normalizarTicker(ativo).replace(/-OTC$/i, '');
    const active = actives.find(a => {
      const aBase = normalizarTicker(a.ticker).replace(/-OTC$/i, '');
      const aIsOtc = /-OTC$/i.test(a.ticker);
      return aBase === tickerBase && aIsOtc === isOtcRequested;
    });

    if (!active) {
      throw new VornaErro(`Ativo "${ativo}" não encontrado. Disponíveis: ${actives.slice(0, 5).map(a => a.ticker).join(', ')}`);
    }
    if (active.isSuspended) {
      throw new VornaErro(`Ativo "${ativo}" está suspenso no momento.`);
    }
    if (!active.canBeBoughtAt(new Date())) {
      throw new VornaErro(`Ativo "${ativo}" não está disponível para compra agora.`);
    }

    const expiracaoDisponivel = active.expirationTimes.reduce((prev, curr) =>
      Math.abs(curr - duracao) < Math.abs(prev - duracao) ? curr : prev
    , active.expirationTimes[0] ?? duracao);

    const balancesFacade = await _sdk.balances();
    const realBalance = balancesFacade.getBalances().find(b => b.type === BalanceType.Real);
    if (!realBalance) throw new VornaErro('Saldo REAL não encontrado. Verifique sua conta.');

    const direction = direcao === 'compra' ? BlitzOptionsDirection.Call : BlitzOptionsDirection.Put;
    console.log(`[Vorna] Enviando operação: ${ativo} ${direcao.toUpperCase()} R$ ${valor} ${expiracaoDisponivel}s`);
    const option = await blitz.buy(active, direction, expiracaoDisponivel, valor, realBalance);
    console.log(`[Vorna] Operação criada: id=${option.id}`);

    try {
      const updatedReal = balancesFacade.getBalances().find(b => b.type === BalanceType.Real);
      if (updatedReal) {
        const sessaoAtual = obterSessaoVorna();
        if (sessaoAtual?.perfil) {
          sessaoAtual.perfil.saldo = updatedReal.amount;
          sessaoAtual.ultima_atualizacao = new Date().toISOString();
          salvarSessaoVorna(sessaoAtual);
        }
      }
    } catch { /* não crítico */ }

    return String(option.id);
  }

  // ── Relay fallback (produção: browser SDK sempre null por IP binding) ─────────
  const sessao = obterSessaoVorna();
  if (!sessao?.ssid) throw new VornaErro('Não conectado à VornaBroker. Faça login novamente.');

  console.log(`[Vorna] Enviando operação via relay: ${ativo} ${direcao.toUpperCase()} R$ ${valor} ${duracao}s`);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  let resp: Response;
  try {
    resp = await fetch('/api/vorna-relay', {
      signal: ctrl.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy', ssid: sessao.ssid, ticker: ativo, direcao, valor, duracao, instrumento_tipo }),
    });
  } catch (e) {
    clearTimeout(tid);
    if ((e as Error).name === 'AbortError') throw new VornaErro('Timeout ao enviar operação (8s). Verifique a conexão com o relay.');
    throw e;
  }
  clearTimeout(tid);

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new VornaErro(errData.error || `Erro ao executar operação: ${resp.status}`);
  }

  const data = await resp.json();
  console.log(`[Vorna] Operação via relay criada: id=${data.id}`);
  return data.id;
}

// ── Verificar Operações Abertas via SDK ──

export async function verificarOperacoesAbertas(): Promise<{ abertas: number; operacoes: OperacaoAberta[] }> {
  if (_sdk) {
    const positionsFacade = await _sdk.positions();
    const positions = positionsFacade.getAllPositions();
    const abertas = positions.filter(p => {
      const status = (p.status || '').toLowerCase();
      return status === 'open' || status === '' || status === 'pending';
    });
    const operacoes: OperacaoAberta[] = abertas.map(p => ({
      id: String(p.externalId ?? p.internalId ?? ''),
      status: p.status || 'open',
    }));
    return { abertas: operacoes.length, operacoes };
  }

  // Relay fallback quando SDK null
  const sessao = obterSessaoVorna();
  if (!sessao?.ssid) throw new VornaErro('Não conectado à VornaBroker.');
  const resp = await fetch('/api/vorna-relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPositions', ssid: sessao.ssid }),
  });
  if (!resp.ok) throw new VornaErro(`Erro ao verificar posições: ${resp.status}`);
  const data = await resp.json();
  return { abertas: data.abertas ?? 0, operacoes: data.operacoes || [] };
}

// ── Saldo Rápido via SDK ──

export async function obterSaldoRapido(): Promise<number> {
  let saldo = 0;

  if (_sdk) {
    const balancesFacade = await _sdk.balances();
    const balances = balancesFacade.getBalances();
    saldo = balances.find(b => b.type === BalanceType.Real)?.amount ?? 0;
  } else {
    // Relay fallback: usa getSaldo com ssid (SDK cacheado, sem HTTP login)
    const sessaoAtiva = obterSessaoVorna();
    if (!sessaoAtiva?.ssid) throw new VornaErro('Não conectado à VornaBroker.');
    const resp = await fetch('/api/vorna-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getSaldo', ssid: sessaoAtiva.ssid }),
    });
    if (!resp.ok) throw new VornaErro(`Erro ao obter saldo: ${resp.status}`);
    const data = await resp.json();
    saldo = data.saldoReal ?? 0;
  }

  const sessaoAtual = obterSessaoVorna();
  if (sessaoAtual?.perfil) {
    sessaoAtual.perfil.saldo = saldo;
    sessaoAtual.ultima_atualizacao = new Date().toISOString();
    salvarSessaoVorna(sessaoAtual);
  }

  return saldo;
}

// ── Histórico de Operações via SDK ──

export async function obterHistoricoOperacoes(): Promise<Op[]> {
  if (!_sdk) {
    console.warn('[Vorna] Sem conexão para buscar histórico.');
    return [];
  }

  try {
    const positionsFacade = await _sdk.positions();
    const history = positionsFacade.getPositionsHistory();
    await history.fetchPrevPage();
    const allPositions = history.getPositions();

    const operacoes: Op[] = await Promise.all(
      allPositions.map(async (p: any): Promise<Op> => {
        const rawId = String(p.id || '');
        const uuid = await hashIdToUUID(rawId);
        const dataObj = p.closeAt ? new Date(p.closeAt) : new Date(p.openAt || Date.now());
        const isWin = (p.pnlNet ?? p.pnl ?? 0) > 0;
        const lucro = p.pnlNet ?? p.pnl ?? 0;
        const investido = p.invest ?? p.price ?? 0;
        const ativo = String(p.instrumentId || p.activeId || '').toUpperCase();
        const direcaoRaw = String(p.direction || '').toLowerCase();
        const mercado: 'forex' | 'cripto' = /BTC|ETH|XRP|LTC|DOGE|SOL|BNB/i.test(ativo) ? 'cripto' : 'forex';

        return {
          id: uuid,
          data: dataObj.toISOString().slice(0, 10),
          hora: dataObj.toTimeString().slice(0, 5),
          corretora: 'VornaBroker',
          ativo,
          mercado,
          estrategia: 'Auto-Sync',
          direcao: direcaoRaw.includes('put') || direcaoRaw.includes('down') ? 'venda' : 'compra',
          resultado: isWin ? 'vitoria' : 'derrota',
          investido,
          payout: p.profitIncomePercent ?? 87,
          lucro: isWin ? lucro : -investido,
          timeframe: 'M1',
          confianca: 4,
        };
      })
    );

    return operacoes.sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));
  } catch (err) {
    console.error('[Vorna] Erro ao buscar histórico:', err);
    return [];
  }
}

// ── Payout do Ativo via SDK ──

export async function obterPayoutAtivo(ativo: string): Promise<number | null> {
  if (!_sdk) return null;
  try {
    const blitz = await _sdk.blitzOptions();
    const actives = blitz.getActives();
    const tickerBuscado = normalizarTicker(ativo);
    const active = actives.find(a => normalizarTicker(a.ticker) === tickerBuscado);
    if (!active) return null;
    return Math.round(100 - active.profitCommissionPercent);
  } catch {
    return null;
  }
}
