import { createClient } from '@supabase/supabase-js';
import { criarSdk, obterCandles, obterSaldo, comprar, subscribeQuotes, httpLogin, obterAtivos } from './vorna-client';

// Importa os motores de estratégia diretamente do projeto trademaster
import { analisarFluxoVelas } from '../../trademaster/src/lib/motor-fluxo-velas';
import { analisarLogicaPreco } from '../../trademaster/src/lib/motor-logica-preco';
import { analisarImpulsoCorrecaoEngolfo } from '../../trademaster/src/lib/motor-impulso-correcao-engolfo';
import {
  calcularValorOperacao,
  analisarQuadrante,
  obterQuadranteAtual,
  obterInicioMinutoQuadrante,
  obterFimMinutoQuadrante,
} from '../../trademaster/src/lib/motor-quadrantes';
import {
  obterQuadranteAtual5min,
  analisarQuadrante5min,
  obterInicioMinuto5min,
  obterFimMinuto5min,
} from '../../trademaster/src/lib/motor-quadrantes-5min';
import {
  analisarCavaloTroia,
  ehMomentoDeExecutarCavaloTroia,
} from '../../trademaster/src/lib/motor-cavalo-troia';
import type { ConfigAutomacao, EstadoAutomacao, Vela } from '../../trademaster/src/types';

export interface EstadoBotVPS {
  userId: string;
  status: 'aguardando' | 'em_operacao' | 'pausado' | 'finalizado' | 'erro';
  automacao: EstadoAutomacao;
  erroMensagem?: string;
  iniciadoEm: string;
  ultimaAtualizacao: string;
}

interface BotState {
  userId: string;
  ssid: string;
  config: ConfigAutomacao;
  sdk: any;
  velas: Vela[];
  activeId: number | null;
  tickLock: boolean;
  // Tracking
  status: 'em_operacao' | 'pausado' | 'finalizado' | 'erro';
  lucroAcumulado: number;
  perdaAcumulada: number;
  operacoesExecutadas: number;
  saldoReferencia: number;
  saldoAnterior: number;
  resultadoAnterior: 'vitoria' | 'derrota' | null;
  valorAnterior: number;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  // Controle de duplicação
  ultimoSinalId: string;
  operacaoEmAndamento: boolean;
  ultimoExecutado5min: string;
  ultimoExecutadoCavaloTroia: string;
  ultimaExecucaoLP: number;
  gale5min: { ativo: boolean; nivel: number; direcao: 'compra' | 'venda' | null; minutoAlvo: number; disparado: boolean };
  direcaoUltima: 'compra' | 'venda' | null;
  operacaoAbertaId: string | null;
  operacaoAbertaHora: number;
  operacaoAbertaDuracao: number;
  // Credenciais para login autônomo e reconexão
  vornaIdentifier: string;
  vornaSenha: string;
  reconectando: boolean;
  // Streaming em tempo real
  velaAtual: Vela | null;
  ultimaQuoteRecebida: number;
  quoteUnsubscribe: (() => void) | null;
  // Timer
  tickInterval: ReturnType<typeof setInterval> | null;
  iniciadoEm: string;
  ultimaAtualizacao: string;
  ultimoMotivo: string;
}

const TIMEFRAME_MAP: Record<string, number> = { M1: 60, M2: 120, M5: 300, M15: 900, M30: 1800, M60: 3600 };

function getCandleIntervalSeg(config: ConfigAutomacao): number {
  if (config.estrategia === 'CavaloTroia') return 60; // motor espera M1
  return TIMEFRAME_MAP[config.timeframe] || 60;
}

// Minutos finais de cada quadrante de 5 minutos: 4, 9, 14, ..., 59
const MINUTOS_FIM_5MIN_BOT = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59];

// VPS tem ~2ms de latência → dispara no segundo 59 para entrar no nascimento da vela (segundo 0)
function ehUltimoSegundoCandle(intervalSeg: number): boolean {
  return Math.floor(Date.now() / 1000) % intervalSeg >= intervalSeg - 1;
}

function ehMomentoDeEntrar5minVPS(): boolean {
  const agora = new Date();
  return MINUTOS_FIM_5MIN_BOT.includes(agora.getMinutes()) && agora.getSeconds() >= 57;
}

function ehMomentoDeGale5minVPS(minutoAlvo: number): boolean {
  const agora = new Date();
  return agora.getMinutes() === minutoAlvo && agora.getSeconds() >= 59;
}

// Quadrantes 10min: executa no segundo 57-58 dos minutos 9, 19, 29, 39, 49, 59
const MINUTOS_FIM_10MIN_BOT = [9, 19, 29, 39, 49, 59];

function ehMomentoDeEntrarQuadrantesVPS(): boolean {
  const agora = new Date();
  const seg = agora.getSeconds();
  return MINUTOS_FIM_10MIN_BOT.includes(agora.getMinutes()) && seg >= 57;
}


function onQuoteUpdate(state: BotState, value: number, timestampMs: number) {
  state.ultimaQuoteRecebida = Date.now();
  const intervalSeg = getCandleIntervalSeg(state.config);
  const timeSeg = timestampMs / 1000;
  const candleStart = Math.floor(timeSeg / intervalSeg) * intervalSeg;

  if (!state.velaAtual || state.velaAtual.timestamp !== candleStart * 1000) {
    if (state.velaAtual) {
      state.velas = [...state.velas.slice(-299), state.velaAtual];
    }
    state.velaAtual = {
      timestamp: candleStart * 1000,
      abertura: value, fechamento: value,
      maxima: value, minima: value,
      volume: 0,
      cor: 'alta',
    };
  } else {
    state.velaAtual.fechamento = value;
    state.velaAtual.maxima = Math.max(state.velaAtual.maxima, value);
    state.velaAtual.minima = Math.min(state.velaAtual.minima, value);
    state.velaAtual.cor = value >= state.velaAtual.abertura ? 'alta' : 'baixa';
  }
}

function velasComAtual(state: BotState): Vela[] {
  return state.velaAtual ? [...state.velas, state.velaAtual] : state.velas;
}

function calcularDuracaoCandle(config: ConfigAutomacao): number {
  const agora = new Date();
  const candleDuracao = TIMEFRAME_MAP[config.timeframe] || 60;
  const totalSeg = agora.getMinutes() * 60 + agora.getSeconds();
  const segundosDesdeInicio = totalSeg % candleDuracao;
  return Math.max(5, candleDuracao - segundosDesdeInicio);
}

function verificarLimites(state: BotState): boolean {
  const { config, lucroAcumulado, perdaAcumulada, operacoesExecutadas, automacao: _ } = state as any;
  const cfg = config as ConfigAutomacao;
  const atingiuMeta = cfg.meta != null && lucroAcumulado >= cfg.meta;
  const atingiuStop = perdaAcumulada >= (cfg.valor_stop || Infinity);
  const atingiuLimite = !cfg.modo_continuo && operacoesExecutadas >= (cfg.quantidade_operacoes || Infinity);
  return atingiuMeta || atingiuStop || atingiuLimite;
}

async function executarCompra(state: BotState, direcao: 'compra' | 'venda', valor: number, duracao: number): Promise<string> {
  state.direcaoUltima = direcao;
  const id = await Promise.race([
    comprar(state.sdk, {
      ticker: state.config.ativo,
      direcao,
      valor,
      duracao,
      instrumento_tipo: state.config.instrumento_tipo || 'blitz',
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: comprar() > 15s')), 15000)
    ),
  ]);
  state.operacaoAbertaId = id;
  state.operacaoAbertaHora = Date.now();
  state.operacaoAbertaDuracao = duracao;
  state.operacaoEmAndamento = true;
  state.saldoAnterior -= valor; // referência pós-débito sem race condition de timing
  state.ultimaAtualizacao = new Date().toISOString();
  return id;
}

let _supabase: any = null;
function getVpsSupabase(): any {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

async function salvarOperacaoSupabase(state: BotState, resultado: 'vitoria' | 'derrota', delta: number): Promise<void> {
  const sb = getVpsSupabase();
  if (!sb) return;
  const agora = new Date();
  try {
    await sb.from('operacoes').insert({
      user_id: state.userId,
      data: agora.toISOString().split('T')[0],
      hora: agora.toTimeString().slice(0, 8),
      corretora: 'Vorna',
      ativo: state.config.ativo,
      mercado: state.config.mercado,
      estrategia: state.config.estrategia,
      direcao: state.direcaoUltima,
      resultado,
      investido: state.valorOperacaoAtual,
      payout: state.config.payout || 80,
      lucro: delta,
      timeframe: state.config.timeframe,
      confianca: 0,
    });
    console.log(`[BotEngine][${state.userId}] Operação salva no Supabase: ${resultado} R$${delta.toFixed(2)}`);
  } catch (e) {
    console.warn(`[BotEngine][${state.userId}] Falha ao salvar operação no Supabase:`, e);
  }
}

async function notificarResultado(userId: string, resultado: 'vitoria' | 'derrota', delta: number, saldo: number): Promise<void> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return;
  const titulo = resultado === 'vitoria' ? '✅ Vitória!' : '❌ Derrota';
  const mensagem = resultado === 'vitoria'
    ? `Ganhou R$${delta.toFixed(2)} | Saldo: R$${saldo.toFixed(2)}`
    : `Perdeu R$${Math.abs(delta).toFixed(2)} | Saldo: R$${saldo.toFixed(2)}`;
  try {
    await fetch(`${appUrl}/api/send-push-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, mensagem, user_id: userId }),
    });
  } catch (e) {
    console.warn(`[BotEngine][${userId}] Falha ao enviar push:`, e);
  }
}

async function verificarResultadoOperacao(state: BotState): Promise<void> {
  if (!state.operacaoAbertaId) return;
  const agora = Date.now();
  const tempoDecorrido = (agora - state.operacaoAbertaHora) / 1000;
  const tempoMinimo = state.operacaoAbertaDuracao + 2;
  if (tempoDecorrido < tempoMinimo) return;

  try {
    const saldoAtual = await obterSaldo(state.sdk);
    const delta = saldoAtual - state.saldoAnterior;
    const vitoria = delta > 0.01;
    const resultado: 'vitoria' | 'derrota' = vitoria ? 'vitoria' : 'derrota';

    console.log(`[BotEngine][${state.userId}] Resultado: ${resultado} | delta=${delta.toFixed(2)}`);

    if (vitoria) {
      state.lucroAcumulado += delta;
    } else {
      state.perdaAcumulada += Math.abs(delta);
    }

    state.operacoesExecutadas++;
    state.resultadoAnterior = resultado;
    state.valorAnterior = state.valorOperacaoAtual;
    state.saldoAnterior = saldoAtual;
    state.operacaoAbertaId = null;
    state.operacaoEmAndamento = false;
    state.ultimaAtualizacao = new Date().toISOString();

    notificarResultado(state.userId, resultado, delta, saldoAtual).catch(() => {});
    salvarOperacaoSupabase(state, resultado, delta).catch(() => {});

    if (verificarLimites(state)) {
      console.log(`[BotEngine][${state.userId}] Limites atingidos — finalizando.`);
      state.status = 'finalizado';
      pararBot(state);
    }
  } catch (e) {
    console.warn(`[BotEngine][${state.userId}] Erro ao verificar resultado:`, e);
    // Se travada por mais de 5 min após o tempo esperado, força limpeza
    const maxWaitMs = (state.operacaoAbertaDuracao + 300) * 1000;
    if (Date.now() - state.operacaoAbertaHora > maxWaitMs) {
      console.warn(`[BotEngine][${state.userId}] Operação ${state.operacaoAbertaId} travada — forçando reset`);
      state.operacaoAbertaId = null;
      state.operacaoEmAndamento = false;
    }
  }
}

// ── Tick de execução ──────────────────────────────────────────────────────────

async function tick5min(state: BotState) {
  if (state.status !== 'em_operacao') return;
  const todasVelas = velasComAtual(state);
  if (todasVelas.length === 0) return;

  const agora = new Date();
  const minutos = agora.getMinutes();

  // Verificar resultado de operação aberta sem bloquear o gale
  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
  }

  const gale = state.gale5min;
  const devEntrar = ehMomentoDeEntrar5minVPS();

  // Só reseta o gale se estamos em uma janela de entrada DIFERENTE da que gerou o gale
  if (devEntrar && gale.ativo) {
    const quadranteAtual = obterQuadranteAtual5min(minutos);
    const chaveAtual = `${agora.getHours()}_${quadranteAtual}_5m`;
    if (chaveAtual !== state.ultimoExecutado5min) {
      state.gale5min = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
    }
  }

  // 3. Disparar gale: segundo 59 do próximo minuto — não espera resultado da operação anterior
  if (!devEntrar && state.gale5min.ativo && !state.gale5min.disparado && state.gale5min.minutoAlvo >= 0) {
    // Aguarda resolução da operação anterior antes de decidir sobre o gale
    if (state.operacaoAbertaId) return;
    // Cancelar se a operação anterior ganhou
    if (state.resultadoAnterior === 'vitoria') {
      state.gale5min = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
      return;
    }

    const noJanela = ehMomentoDeGale5minVPS(state.gale5min.minutoAlvo);
    const minutosPassados = (minutos - state.gale5min.minutoAlvo + 60) % 60;
    const atrasado = minutosPassados >= 1 && minutosPassados < 5 && agora.getSeconds() >= 59;

    if (noJanela || atrasado) {
      if (verificarLimites(state)) return;

      const nivelAtual = state.gale5min.nivel;
      const direcaoAtual = state.gale5min.direcao!;
      const maxGale = state.config.max_martingale || 2;
      const mult = state.config.multiplicador_martingale || 2;
      const valor = Math.round(state.config.valor_por_operacao * Math.pow(mult, nivelAtual) * 100) / 100;

      // Avança estado ANTES do executarCompra para evitar duplo disparo
      if (nivelAtual < maxGale) {
        state.gale5min = { ativo: true, nivel: nivelAtual + 1, direcao: direcaoAtual, minutoAlvo: (minutos + 1) % 60, disparado: false };
      } else {
        state.gale5min = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
      }

      state.cicloMartingale = nivelAtual;
      state.valorOperacaoAtual = valor;
      console.log(`[BotEngine][${state.userId}] GALE G${nivelAtual} — ${direcaoAtual} — R$${valor}`);
      try {
        await executarCompra(state, direcaoAtual, valor, state.config.duracao_expiracao || 60);
      } catch (e: any) {
        state.gale5min = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
        console.error(`[BotEngine][${state.userId}] Erro GALE G${nivelAtual}:`, e);
        notificarErro(state.userId, `Gale Q5min: ${e?.message || e}`).catch(() => {});
        tentarReconectarSdk(state).catch(() => {});
      }
    }
    return;
  }

  // 4. Entrada normal: sem gale ativo e sem operação aberta
  if (devEntrar && !state.gale5min.ativo && !state.operacaoAbertaId) {
    const quadranteExec = obterQuadranteAtual5min(minutos);
    const chave = `${agora.getHours()}_${quadranteExec}_5m`;
    if (state.ultimoExecutado5min === chave) return;

    const inicioMin = obterInicioMinuto5min(quadranteExec);
    const fimMin = obterFimMinuto5min(quadranteExec);
    const horaExec5 = agora.getHours();
    const velas5 = todasVelas.filter(v => {
      const dt = new Date(v.timestamp);
      return dt.getHours() === horaExec5 && dt.getMinutes() >= inicioMin && dt.getMinutes() <= fimMin;
    });

    const analise5 = velas5.length > 0 ? analisarQuadrante5min(velas5) : null;
    if (!analise5 || !analise5.operar) return;

    state.ultimoExecutado5min = chave;
    if (verificarLimites(state)) return;

    const { valor, novo_ciclo } = calcularValorOperacao({
      estrategia: state.config.gerenciamento,
      valor_base: state.config.valor_por_operacao,
      resultado_anterior: state.resultadoAnterior,
      valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
      multiplicador_martingale: state.config.multiplicador_martingale,
      multiplicador_soros: state.config.multiplicador_soros,
      ciclo_martingale: state.cicloMartingale,
      max_martingale: state.config.max_martingale,
    });

    state.cicloMartingale = novo_ciclo;
    state.valorOperacaoAtual = valor;

    const direcao = analise5.direcao_operacao;
    const duracao = state.config.duracao_expiracao || 60;
    console.log(`[BotEngine][${state.userId}] Q5min ENTRADA — ${direcao} — R$${valor}`);

    try {
      await executarCompra(state, direcao, valor, duracao);
      state.resultadoAnterior = null; // reset para que o gale não seja cancelado por resultado de sequência anterior
      if ((state.config.max_martingale || 2) > 0) {
        // minutoAlvo = próxima vela (1 minuto após a entrada)
        state.gale5min = { ativo: true, nivel: 1, direcao, minutoAlvo: (minutos + 1) % 60, disparado: false };
      }
    } catch (e: any) {
      state.ultimoExecutado5min = '';
      console.error(`[BotEngine][${state.userId}] Erro na entrada Q5min:`, e);
      notificarErro(state.userId, `Q5min: ${e?.message || e}`).catch(() => {});
      tentarReconectarSdk(state).catch(() => {});
    }
  }
}

async function tickQuadrantes(state: BotState) {
  if (state.status !== 'em_operacao') return;
  const todasVelas = velasComAtual(state);
  if (todasVelas.length === 0) return;

  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
    return;
  }

  if (!ehMomentoDeEntrarQuadrantesVPS()) return;

  const agora = new Date();
  const minutos = agora.getMinutes();
  const quadranteExec = obterQuadranteAtual(minutos);
  const chave = `${agora.getHours()}_${quadranteExec}_10m`;
  if (state.ultimoSinalId === chave) return;

  const inicioMin = obterInicioMinutoQuadrante(quadranteExec);
  const fimMin = obterFimMinutoQuadrante(quadranteExec);
  const horaExec = agora.getHours();
  const velasQuadrante = todasVelas.filter(v => {
    const dt = new Date(v.timestamp);
    return dt.getHours() === horaExec && dt.getMinutes() >= inicioMin && dt.getMinutes() <= fimMin;
  });

  if (velasQuadrante.length === 0) return;

  const analise = analisarQuadrante(velasQuadrante, todasVelas);
  if (!analise.operar || !analise.direcao_operacao) return;

  state.ultimoSinalId = chave;
  if (verificarLimites(state)) return;

  const { valor, novo_ciclo } = calcularValorOperacao({
    estrategia: state.config.gerenciamento,
    valor_base: state.config.valor_por_operacao,
    resultado_anterior: state.resultadoAnterior,
    valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
    multiplicador_martingale: state.config.multiplicador_martingale,
    multiplicador_soros: state.config.multiplicador_soros,
    ciclo_martingale: state.cicloMartingale,
    max_martingale: state.config.max_martingale,
  });

  state.cicloMartingale = novo_ciclo;
  state.valorOperacaoAtual = valor;

  const duracao = state.config.duracao_expiracao || 60;
  console.log(`[BotEngine][${state.userId}] Quadrantes ENTRADA — ${analise.direcao_operacao} — R$${valor}`);

  try {
    await executarCompra(state, analise.direcao_operacao, valor, duracao);
  } catch (e: any) {
    state.ultimoSinalId = '';
    console.error(`[BotEngine][${state.userId}] Erro Quadrantes:`, e);
    notificarErro(state.userId, `Quadrantes: ${e?.message || e}`).catch(() => {});
    tentarReconectarSdk(state).catch(() => {});
  }
}

async function tickFluxoVelas(state: BotState) {
  if (state.status !== 'em_operacao') return;
  const todasVelas = velasComAtual(state);
  if (todasVelas.length === 0) return;

  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
    return;
  }

  const intervalSeg = TIMEFRAME_MAP[state.config.timeframe] || 60;
  if (!ehUltimoSegundoCandle(intervalSeg)) return;

  const analise = analisarFluxoVelas(todasVelas, state.config.janela_horas || 1, true);
  if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) return;
  if (state.ultimoSinalId === analise.sinal_id) return;
  state.ultimoSinalId = analise.sinal_id;

  if (verificarLimites(state)) return;

  const { valor, novo_ciclo } = calcularValorOperacao({
    estrategia: state.config.gerenciamento,
    valor_base: state.config.valor_por_operacao,
    resultado_anterior: state.resultadoAnterior,
    valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
    multiplicador_martingale: state.config.multiplicador_martingale,
    multiplicador_soros: state.config.multiplicador_soros,
    ciclo_martingale: state.cicloMartingale,
    max_martingale: state.config.max_martingale,
  });

  state.cicloMartingale = novo_ciclo;
  state.valorOperacaoAtual = valor;

  console.log(`[BotEngine][${state.userId}] FluxoVelas ENTRADA — ${analise.direcao_operacao} — R$${valor}`);

  try {
    await executarCompra(state, analise.direcao_operacao, valor, 60);
  } catch (e: any) {
    state.ultimoSinalId = '';
    console.error(`[BotEngine][${state.userId}] Erro FluxoVelas:`, e);
    notificarErro(state.userId, `FluxoVelas: ${e?.message || e}`).catch(() => {});
    tentarReconectarSdk(state).catch(() => {});
  }
}

async function tickLogicaDoPreco(state: BotState) {
  if (state.status !== 'em_operacao') return;
  if (state.velas.length === 0) return;

  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
    return;
  }

  if (state.operacaoEmAndamento) return;
  if (Date.now() - state.ultimaExecucaoLP < 300000) return;

  const analise = analisarLogicaPreco(state.velas, state.config.conceitos_ativos_lp);
  if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) return;
  if (state.ultimoSinalId === analise.sinal_id) return;
  state.ultimoSinalId = analise.sinal_id;
  if (verificarLimites(state)) return;
  state.ultimaExecucaoLP = Date.now();

  const { valor, novo_ciclo } = calcularValorOperacao({
    estrategia: state.config.gerenciamento,
    valor_base: state.config.valor_por_operacao,
    resultado_anterior: state.resultadoAnterior,
    valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
    multiplicador_martingale: state.config.multiplicador_martingale,
    multiplicador_soros: state.config.multiplicador_soros,
    ciclo_martingale: state.cicloMartingale,
    max_martingale: state.config.max_martingale,
  });

  state.cicloMartingale = novo_ciclo;
  state.valorOperacaoAtual = valor;
  state.operacaoEmAndamento = true;

  const duracao = calcularDuracaoCandle(state.config);
  console.log(`[BotEngine][${state.userId}] LogicaDoPreco ENTRADA — ${analise.direcao_operacao} — R$${valor}`);

  try {
    await executarCompra(state, analise.direcao_operacao, valor, duracao);
  } catch (e: any) {
    state.operacaoEmAndamento = false;
    state.ultimoSinalId = '';
    console.error(`[BotEngine][${state.userId}] Erro LogicaDoPreco:`, e);
    notificarErro(state.userId, `LogicaDoPreco: ${e?.message || e}`).catch(() => {});
    tentarReconectarSdk(state).catch(() => {});
  }
}

async function tickICE(state: BotState) {
  if (state.status !== 'em_operacao') return;
  if (state.velas.length === 0) return;

  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
    return;
  }

  if (state.operacaoEmAndamento) return;

  const analise = analisarImpulsoCorrecaoEngolfo(state.velas);
  if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) return;
  if (state.ultimoSinalId === analise.sinal_id) return;
  state.ultimoSinalId = analise.sinal_id;
  if (verificarLimites(state)) return;
  state.operacaoEmAndamento = true;

  const { valor, novo_ciclo } = calcularValorOperacao({
    estrategia: state.config.gerenciamento,
    valor_base: state.config.valor_por_operacao,
    resultado_anterior: state.resultadoAnterior,
    valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
    multiplicador_martingale: state.config.multiplicador_martingale,
    multiplicador_soros: state.config.multiplicador_soros,
    ciclo_martingale: state.cicloMartingale,
    max_martingale: state.config.max_martingale,
  });

  state.cicloMartingale = novo_ciclo;
  state.valorOperacaoAtual = valor;

  const duracao = calcularDuracaoCandle(state.config);
  console.log(`[BotEngine][${state.userId}] ICE ENTRADA — ${analise.direcao_operacao} — R$${valor}`);

  try {
    await executarCompra(state, analise.direcao_operacao, valor, duracao);
  } catch (e: any) {
    state.operacaoEmAndamento = false;
    state.ultimoSinalId = '';
    console.error(`[BotEngine][${state.userId}] Erro ICE:`, e);
    notificarErro(state.userId, `ICE: ${e?.message || e}`).catch(() => {});
    tentarReconectarSdk(state).catch(() => {});
  }
}

async function tickCavaloTroia(state: BotState) {
  state.ultimaAtualizacao = new Date().toISOString();
  if (state.status !== 'em_operacao') return;
  const todasVelas = velasComAtual(state);
  if (todasVelas.length === 0) {
    state.ultimoMotivo = 'Sem velas disponíveis';
    return;
  }

  if (state.operacaoAbertaId) {
    await verificarResultadoOperacao(state);
    return;
  }

  if (!ehMomentoDeExecutarCavaloTroia()) {
    state.ultimoMotivo = 'Fora da janela (:02/:22/:42)';
    return;
  }

  const analise = analisarCavaloTroia(todasVelas);
  if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) {
    state.ultimoMotivo = analise.resumo || 'Sem sinal — velas doji';
    return;
  }
  if (state.ultimoExecutadoCavaloTroia === analise.sinal_id) {
    state.ultimoMotivo = 'Sinal já executado nesta janela';
    return;
  }
  state.ultimoExecutadoCavaloTroia = analise.sinal_id;

  if (verificarLimites(state)) {
    state.ultimoMotivo = 'Limite de operações/stop atingido';
    return;
  }

  const { valor, novo_ciclo } = calcularValorOperacao({
    estrategia: state.config.gerenciamento,
    valor_base: state.config.valor_por_operacao,
    resultado_anterior: state.resultadoAnterior,
    valor_anterior: state.valorAnterior || state.config.valor_por_operacao,
    multiplicador_martingale: state.config.multiplicador_martingale,
    multiplicador_soros: state.config.multiplicador_soros,
    ciclo_martingale: state.cicloMartingale,
    max_martingale: state.config.max_martingale,
  });

  state.cicloMartingale = novo_ciclo;
  state.valorOperacaoAtual = valor;

  state.ultimoMotivo = `Executando ${analise.direcao_operacao} R$${valor} (janela ${analise.janela_atual})`;
  console.log(`[BotEngine][${state.userId}] CavaloTroia ENTRADA — ${analise.direcao_operacao} — R$${valor} — janela=${analise.janela_atual}`);

  try {
    await executarCompra(state, analise.direcao_operacao, valor, 120);
  } catch (e: any) {
    state.ultimoExecutadoCavaloTroia = '';
    console.error(`[BotEngine][${state.userId}] Erro CavaloTroia:`, e);
    notificarErro(state.userId, `CavaloTroia: ${e?.message || e}`).catch(() => {});
    tentarReconectarSdk(state).catch(() => {});
  }
}

// ── Reconexão e notificação de erro ──────────────────────────────────────────

const ultimaNotificacaoErro = new Map<string, number>();

async function notificarErro(userId: string, mensagem: string): Promise<void> {
  const agora = Date.now();
  if ((agora - (ultimaNotificacaoErro.get(userId) || 0)) < 60000) return;
  ultimaNotificacaoErro.set(userId, agora);
  const appUrl = process.env.APP_URL;
  if (!appUrl) return;
  try {
    await fetch(`${appUrl}/api/send-push-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: '⚠️ Erro no Bot VPS', mensagem, user_id: userId }),
    });
  } catch {}
}

async function tentarReconectarSdk(state: BotState): Promise<void> {
  try {
    if (state.quoteUnsubscribe) { try { state.quoteUnsubscribe(); } catch {} state.quoteUnsubscribe = null; }
    const { ssid: novoSsid } = await httpLogin(state.vornaIdentifier, state.vornaSenha);
    state.ssid = novoSsid;
    state.sdk = await criarSdk(novoSsid);
    if (state.activeId) {
      state.quoteUnsubscribe = await subscribeQuotes(
        state.sdk, state.activeId,
        (value, tsMs) => onQuoteUpdate(state, value, tsMs)
      );
    }
    state.ultimaQuoteRecebida = Date.now();
    console.log(`[BotEngine][${state.userId}] SDK reconectado com sucesso`);
  } catch (e) {
    console.error(`[BotEngine][${state.userId}] Falha na reconexão do SDK:`, e);
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

const bots = new Map<string, BotState>();

export async function iniciarBot(userId: string, ssid: string, config: ConfigAutomacao): Promise<void> {
  if (bots.has(userId)) {
    const existing = bots.get(userId)!;
    if (existing.status === 'em_operacao') {
      throw new Error('Bot já está em operação para este usuário');
    }
    pararBot(existing);
  }

  if (bots.size >= 5) {
    throw new Error('Limite de 5 bots simultâneos atingido nesta VPS');
  }

  console.log(`[BotEngine] Iniciando bot para userId=${userId} estrategia=${config.estrategia}`);

  // Tentar login autônomo via credenciais salvas no Supabase; fallback para SSID do browser
  let ssidToUse = ssid;
  let vornaIdentifier = '';
  let vornaSenha = '';

  try {
    const sb = getVpsSupabase();
    if (sb) {
      const { data: perfil } = await sb
        .from('profiles')
        .select('vorna_identifier, vorna_senha')
        .eq('id', userId)
        .single();
      if (perfil?.vorna_identifier && perfil?.vorna_senha) {
        const { ssid: ssidVPS } = await httpLogin(perfil.vorna_identifier, perfil.vorna_senha);
        ssidToUse = ssidVPS;
        vornaIdentifier = perfil.vorna_identifier;
        vornaSenha = perfil.vorna_senha;
        console.log(`[BotEngine] Login autônomo VPS: OK (${vornaIdentifier})`);
      } else {
        console.warn('[BotEngine] Credenciais VPS não encontradas — usando SSID do browser (sessão dependente)');
      }
    }
  } catch (e) {
    console.warn('[BotEngine] Falha ao buscar credenciais VPS — usando SSID do browser:', e);
  }

  const sdk = await criarSdk(ssidToUse);
  const saldoInicial = await obterSaldo(sdk);

  // Carregar lista de ativos — retry imediato se SDK ainda não recebeu dados do WebSocket
  let ativos: any[] = [];
  for (let i = 0; i < 10; i++) {
    ativos = await obterAtivos(sdk);
    if (ativos.length > 0) break;
    await new Promise(r => setTimeout(r, 500));
  }
  const matchAtivo = (a: any) => {
    const ticker = a.displayName || a.ticker;
    return ticker === config.ativo || a.ticker.replace('/', '').toUpperCase() === config.ativo.replace('/', '').replace(/\s*\(OTC\).*/, '').toUpperCase();
  };
  const ativoEncontrado = ativos.find(matchAtivo);
  if (!ativoEncontrado) {
    const disponiveis = ativos.map((a: any) => a.displayName || a.ticker).slice(0, 10).join(', ');
    throw new Error(`Ativo "${config.ativo}" não encontrado. Disponíveis: ${disponiveis || 'nenhum carregado'}`);
  }

  const state: BotState = {
    userId,
    ssid: ssidToUse,
    config,
    vornaIdentifier,
    vornaSenha,
    reconectando: false,
    sdk,
    velas: [],
    activeId: ativoEncontrado?.id ?? null,
    status: 'em_operacao',
    lucroAcumulado: 0,
    perdaAcumulada: 0,
    operacoesExecutadas: 0,
    saldoReferencia: saldoInicial,
    saldoAnterior: saldoInicial,
    resultadoAnterior: null,
    valorAnterior: 0,
    cicloMartingale: 0,
    valorOperacaoAtual: config.valor_por_operacao,
    ultimoSinalId: '',
    operacaoEmAndamento: false,
    ultimoExecutado5min: '',
    ultimoExecutadoCavaloTroia: '',
    ultimaExecucaoLP: 0,
    gale5min: { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false },
    direcaoUltima: null,
    operacaoAbertaId: null,
    operacaoAbertaHora: 0,
    operacaoAbertaDuracao: 60,
    tickLock: false,
    velaAtual: null,
    ultimaQuoteRecebida: Date.now(),
    quoteUnsubscribe: null,
    tickInterval: null,
    iniciadoEm: new Date().toISOString(),
    ultimaAtualizacao: new Date().toISOString(),
    ultimoMotivo: 'Aguardando janela de entrada...',
  };

  // Carga inicial de histórico (300 velas)
  const tfNum = getCandleIntervalSeg(config);
  state.velas = await obterCandles(state.sdk, state.activeId!, tfNum, 300);
  if (state.velas.length === 0) {
    console.warn(`[BotEngine] Histórico de velas vazio — nova tentativa...`);
    state.velas = await obterCandles(state.sdk, state.activeId!, tfNum, 300);
  }
  console.log(`[BotEngine] Carregadas ${state.velas.length} velas para ${config.ativo}`);

  // Subscrição em tempo real (substitui polling 5s)
  if (state.activeId) {
    state.quoteUnsubscribe = await subscribeQuotes(
      state.sdk, state.activeId,
      (value, tsMs) => onQuoteUpdate(state, value, tsMs)
    );
    console.log(`[BotEngine] Streaming de quotes ativo para activeId=${state.activeId}`);
  }

  // Tick principal a cada 250ms
  const tickFn = async () => {
    if (state.status === 'pausado') return;
    if (state.status !== 'em_operacao') return;
    if (state.tickLock) return;
    state.tickLock = true;
    try {
      // Reconectar SDK se sem quotes por > 3 minutos (WebSocket pode ter caído)
      if (Date.now() - state.ultimaQuoteRecebida > 180000) {
        console.warn(`[BotEngine][${state.userId}] Sem quotes por 3min — reconectando...`);
        state.ultimaQuoteRecebida = Date.now();
        tentarReconectarSdk(state).catch(() => {});
        return;
      }
      switch (config.estrategia) {
        case 'Quadrantes': await tickQuadrantes(state); break;
        case 'Quadrantes5min': await tick5min(state); break;
        case 'FluxoVelas': await tickFluxoVelas(state); break;
        case 'LogicaDoPreco': await tickLogicaDoPreco(state); break;
        case 'ImpulsoCorrecaoEngolfo': await tickICE(state); break;
        case 'CavaloTroia': await tickCavaloTroia(state); break;
      }
    } catch (e) {
      console.error(`[BotEngine][${userId}] Erro no tick:`, e);
    } finally {
      state.tickLock = false;
    }
  };

  state.tickInterval = setInterval(tickFn, 250);
  bots.set(userId, state);
  console.log(`[BotEngine] Bot iniciado para userId=${userId} | saldo inicial=R$${saldoInicial}`);
}

export function pararBot(state: BotState | string): void {
  const s = typeof state === 'string' ? bots.get(state) : state;
  if (!s) return;
  if (s.tickInterval) { clearInterval(s.tickInterval); s.tickInterval = null; }
  if (s.quoteUnsubscribe) { s.quoteUnsubscribe(); s.quoteUnsubscribe = null; }
  s.status = 'finalizado';
  try { s.sdk?.shutdown?.(); } catch {}
  bots.delete(s.userId);
  console.log(`[BotEngine] Bot parado para userId=${s.userId}`);
}

export function pausarBot(userId: string): void {
  const state = bots.get(userId);
  if (!state) throw new Error('Bot não encontrado');
  state.status = 'pausado';
  console.log(`[BotEngine] Bot pausado para userId=${userId}`);
}

export function retomarBot(userId: string): void {
  const state = bots.get(userId);
  if (!state) throw new Error('Bot não encontrado');
  state.status = 'em_operacao';
  console.log(`[BotEngine] Bot retomado para userId=${userId}`);
}

export function statusBot(userId: string): EstadoBotVPS | null {
  const state = bots.get(userId);
  if (!state) return null;
  return {
    userId,
    status: state.status,
    automacao: {
      status: state.status === 'em_operacao' ? 'em_operacao' : state.status === 'pausado' ? 'pausado' : 'finalizado',
      config: state.config,
      operacoes_executadas: state.operacoesExecutadas,
      operacoes_total: state.config.quantidade_operacoes || 0,
      lucro_acumulado: state.lucroAcumulado,
      perda_acumulada: state.perdaAcumulada,
      saldo_referencia: state.saldoReferencia,
      ultima_verificacao: state.ultimaAtualizacao,
      ultimo_motivo: state.ultimoMotivo,
      inicio: state.iniciadoEm,
    },
    iniciadoEm: state.iniciadoEm,
    ultimaAtualizacao: state.ultimaAtualizacao,
  };
}

export function listarBots(): EstadoBotVPS[] {
  return Array.from(bots.values()).map(s => statusBot(s.userId)!).filter(Boolean);
}
