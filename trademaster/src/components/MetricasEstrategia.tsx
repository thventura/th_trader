import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Plus, X, Clock, Layers, Activity, Loader2, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import InteractiveChart from './ui/interactive-chart';
import AtivoIcon from './ui/ativo-icon';
import { cn } from '../lib/utils';
import { BRANDING } from '../config/branding';
import type { Vela } from '../types';
import type { ActiveInfo } from '../lib/vorna';
import { obterVelasViaRelay } from '../lib/vorna';
import { analisarQuadrante } from '../lib/motor-quadrantes';
import { analisarQuadrante5min } from '../lib/motor-quadrantes-5min';
import { analisarFluxoVelas } from '../lib/motor-fluxo-velas';
import { analisarImpulsoCorrecaoEngolfo } from '../lib/motor-impulso-correcao-engolfo';
import { analisarLogicaPreco } from '../lib/motor-logica-preco';

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'trademaster_metricas_cards';
const MAX_CARDS = 6;
const ESTRATEGIAS = BRANDING.strategies as unknown as string[];
const ATIVOS_FOREX = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP',
  'GBP/JPY', 'GBP/CHF', 'EUR/JPY', 'USD/CHF', 'NZD/USD', 'AUD/CAD',
  'EUR/CHF', 'EUR/CAD', 'CHF/JPY', 'GBP/AUD', 'CAD/JPY', 'CAD/CHF',
  'GBP/CAD', 'AUD/JPY', 'EUR/NZD', 'NZD/CAD', 'NZD/CHF', 'AUD/NZD', 'EUR/AUD',
];
const ATIVOS_CRIPTO = ['BTC/USD', 'SOL/USD', 'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
const ATIVOS_FOREX_OTC = [
  'EUR/USD (OTC)', 'GBP/USD (OTC)', 'AUD/USD (OTC)', 'USD/CAD (OTC)',
  'EUR/GBP (OTC)', 'GBP/JPY (OTC)', 'EUR/JPY (OTC)', 'USD/JPY (OTC)',
  'NZD/USD (OTC)', 'USD/CHF (OTC)', 'AUD/CAD (OTC)', 'EUR/CAD (OTC)',
];
const TODOS_ATIVOS = [...ATIVOS_FOREX, ...ATIVOS_CRIPTO, ...ATIVOS_FOREX_OTC];

type JanelaTempo = 2 | 3 | 5 | 'hoje';
type AbaGerenciamento = 'fixo' | 'gale' | 'protecao' | 'soros';

// ── Core Types ─────────────────────────────────────────────────────────────────

interface CardConfig {
  id: number;
  ativo: string;
  estrategia: string;
}

interface CicloResultado {
  timestamp: number;
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  confianca: number;
}

interface EstadoCard {
  carregando: boolean;
  erro: string | null;
  ciclos: CicloResultado[];
  atualizadoEm: number | null;
}

interface CicloEnriquecido {
  ciclo: CicloResultado;
  nivel: number;
  tipo: 'win' | 'gale_win' | 'soros_win' | 'protecao_win' | 'loss';
  investido: number;
  lucro: number;
}

interface SimStats {
  totalCiclos: number;
  wins: number;
  losses: number;
  winRate: number;
  lucroTotal: number;
}

// ── Candle conversion ──────────────────────────────────────────────────────────

function rawToVela(raw: { from: number; open: number; close: number; min: number; max: number; volume: number }): Vela {
  return {
    timestamp: raw.from,
    abertura: raw.open,
    fechamento: raw.close,
    maxima: raw.max,
    minima: raw.min,
    volume: raw.volume,
    cor: raw.close >= raw.open ? 'alta' : 'baixa',
  };
}

function filtrarVelasPorJanela(velas: Vela[], janela: JanelaTempo): Vela[] {
  const agora = Date.now() / 1000;
  if (janela === 'hoje') {
    const hoje = new Date().toISOString().slice(0, 10);
    return velas.filter(v => {
      const d = new Date(v.timestamp * 1000).toISOString().slice(0, 10);
      return d === hoje;
    });
  }
  return velas.filter(v => v.timestamp >= agora - (janela as number) * 3600);
}

// ── Backtest Functions ─────────────────────────────────────────────────────────

function backtestQuadrantes(velas: Vela[]): CicloResultado[] {
  const ciclos: CicloResultado[] = [];
  // Process in 10-candle windows aligned to full quadrant groups
  for (let i = 9; i < velas.length - 1; i += 10) {
    const window = velas.slice(Math.max(0, i - 9), i + 1);
    const historico = velas.slice(0, Math.max(0, i - 9));
    const analise = analisarQuadrante(window, historico);
    if (!analise.operar) continue;
    const proxima = velas[i + 1];
    const win = analise.direcao_operacao === 'compra'
      ? proxima.cor === 'alta'
      : proxima.cor === 'baixa';
    ciclos.push({
      timestamp: proxima.timestamp,
      direcao: analise.direcao_operacao,
      resultado: win ? 'vitoria' : 'derrota',
      confianca: analise.confianca,
    });
  }
  return ciclos;
}

function backtestQuadrantes5min(velas: Vela[]): CicloResultado[] {
  const ciclos: CicloResultado[] = [];
  for (let i = 4; i < velas.length - 1; i += 5) {
    const window = velas.slice(Math.max(0, i - 4), i + 1);
    const analise = analisarQuadrante5min(window);
    if (!analise.operar) continue;
    const proxima = velas[i + 1];
    const win = analise.direcao_operacao === 'compra'
      ? proxima.cor === 'alta'
      : proxima.cor === 'baixa';
    ciclos.push({
      timestamp: proxima.timestamp,
      direcao: analise.direcao_operacao,
      resultado: win ? 'vitoria' : 'derrota',
      confianca: analise.confianca,
    });
  }
  return ciclos;
}

function backtestFluxoVelas(velas: Vela[], janelaHoras: number): CicloResultado[] {
  const ciclos: CicloResultado[] = [];
  const vistos = new Set<string>();
  for (let i = 30; i < velas.length - 1; i++) {
    const analise = analisarFluxoVelas(velas.slice(0, i + 1), janelaHoras, false);
    if (!analise.operar || !analise.sinal_id || !analise.direcao_operacao) continue;
    if (vistos.has(analise.sinal_id)) continue;
    vistos.add(analise.sinal_id);
    const proxima = velas[i + 1];
    const win = analise.direcao_operacao === 'compra'
      ? proxima.cor === 'alta'
      : proxima.cor === 'baixa';
    ciclos.push({
      timestamp: proxima.timestamp,
      direcao: analise.direcao_operacao,
      resultado: win ? 'vitoria' : 'derrota',
      confianca: analise.confianca,
    });
  }
  return ciclos;
}

function backtestICE(velas: Vela[]): CicloResultado[] {
  const ciclos: CicloResultado[] = [];
  const vistos = new Set<string>();
  for (let i = 15; i < velas.length - 1; i++) {
    const analise = analisarImpulsoCorrecaoEngolfo(velas.slice(0, i + 1));
    if (!analise.operar || !analise.sinal_id || !analise.direcao_operacao) continue;
    if (vistos.has(analise.sinal_id)) continue;
    vistos.add(analise.sinal_id);
    const proxima = velas[i + 1];
    const win = analise.direcao_operacao === 'compra'
      ? proxima.cor === 'alta'
      : proxima.cor === 'baixa';
    ciclos.push({
      timestamp: proxima.timestamp,
      direcao: analise.direcao_operacao,
      resultado: win ? 'vitoria' : 'derrota',
      confianca: analise.confianca,
    });
  }
  return ciclos;
}

function backtestLogicaPreco(velas: Vela[]): CicloResultado[] {
  const ciclos: CicloResultado[] = [];
  const vistos = new Set<string>();
  for (let i = 10; i < velas.length - 1; i++) {
    const analise = analisarLogicaPreco(velas.slice(0, i + 1));
    if (!analise.operar || !analise.sinal_id || !analise.direcao_operacao) continue;
    if (vistos.has(analise.sinal_id)) continue;
    vistos.add(analise.sinal_id);
    const proxima = velas[i + 1];
    const win = analise.direcao_operacao === 'compra'
      ? proxima.cor === 'alta'
      : proxima.cor === 'baixa';
    ciclos.push({
      timestamp: proxima.timestamp,
      direcao: analise.direcao_operacao,
      resultado: win ? 'vitoria' : 'derrota',
      confianca: analise.confianca,
    });
  }
  return ciclos;
}

function backtestCavaloTroia(velas: Vela[]): CicloResultado[] {
  // Deterministic historical backtest — does NOT call analisarCavaloTroia (which uses new Date()).
  // CavaloTroia enters at the start of minutes :02, :22, :42.
  // The signal comes from M2 candle #11, built from the two M1 candles that just closed:
  //   minutes :20+:21 → entry :22 | :40+:41 → entry :42 | :00+:01 → entry :02
  const MINUTOS_ULTIMA_M1_DA_M2_11 = [1, 21, 41];
  const ciclos: CicloResultado[] = [];

  for (let i = 1; i < velas.length - 1; i++) {
    const minuto = new Date(velas[i].timestamp * 1000).getMinutes();
    if (!MINUTOS_ULTIMA_M1_DA_M2_11.includes(minuto)) continue;

    const v11a = velas[i - 1];
    const v11b = velas[i];
    const ab11 = v11a.abertura;
    const fc11 = v11b.fechamento;
    const mx11 = Math.max(v11a.maxima, v11b.maxima);
    const mn11 = Math.min(v11a.minima, v11b.minima);
    const range11 = mx11 - mn11;
    const doji11 = range11 > 0 && Math.abs(fc11 - ab11) / range11 < 0.1;

    let direcao: 'compra' | 'venda';
    let confianca = 80;

    if (!doji11) {
      direcao = fc11 > ab11 ? 'compra' : 'venda';
    } else {
      if (i < 3) continue;
      const v10a = velas[i - 3];
      const v10b = velas[i - 2];
      const ab10 = v10a.abertura;
      const fc10 = v10b.fechamento;
      const mx10 = Math.max(v10a.maxima, v10b.maxima);
      const mn10 = Math.min(v10a.minima, v10b.minima);
      const range10 = mx10 - mn10;
      const doji10 = range10 > 0 && Math.abs(fc10 - ab10) / range10 < 0.1;
      if (doji10) continue;
      direcao = fc10 > ab10 ? 'compra' : 'venda';
      confianca = 70;
    }

    const proxima = velas[i + 1];
    const win = direcao === 'compra' ? proxima.cor === 'alta' : proxima.cor === 'baixa';
    ciclos.push({ timestamp: proxima.timestamp, direcao, resultado: win ? 'vitoria' : 'derrota', confianca });
  }
  return ciclos;
}

// ── Main analysis orchestrator ─────────────────────────────────────────────────

async function analisarEstrategia(
  ativoId: number,
  estrategia: string,
  janela: JanelaTempo,
): Promise<CicloResultado[]> {
  const janelaHoras = janela === 'hoje' ? 24 : (janela as number);
  const count = janelaHoras * 60 + 80; // +80 candles de warmup p/ EMA

  const raw = await obterVelasViaRelay(ativoId, 60, undefined, count);
  if (!raw.length) throw new Error('Sem dados de velas disponíveis');

  const todas = raw.map(rawToVela);
  const velas = filtrarVelasPorJanela(todas, janela);
  if (velas.length < 5) throw new Error('Poucos dados no período selecionado');

  // todas inclui o buffer de warmup antes da janela selecionada
  const velasComBuffer = todas;

  switch (estrategia) {
    case 'Quadrantes':    return backtestQuadrantes(velas);
    case 'Quadrantes5min': return backtestQuadrantes5min(velas);
    case 'FluxoVelas':    return backtestFluxoVelas(velasComBuffer, janelaHoras).filter(c => {
      const inicio = velas[0]?.timestamp ?? 0;
      return c.timestamp >= inicio;
    });
    case 'LogicaDoPreco': return backtestLogicaPreco(velasComBuffer).filter(c => {
      const inicio = velas[0]?.timestamp ?? 0;
      return c.timestamp >= inicio;
    });
    case 'ImpulsoCorrecaoEngolfo': return backtestICE(velasComBuffer).filter(c => {
      const inicio = velas[0]?.timestamp ?? 0;
      return c.timestamp >= inicio;
    });
    case 'CavaloTroia':   return backtestCavaloTroia(velasComBuffer).filter(c => {
      const inicio = velas[0]?.timestamp ?? 0;
      return c.timestamp >= inicio;
    });
    default: throw new Error(`Estratégia "${estrategia}" não suportada`);
  }
}

// ── Simulation Functions ───────────────────────────────────────────────────────

function simularFixo(ciclos: CicloResultado[], valor: number, payout: number): CicloEnriquecido[] {
  return ciclos.map(c => ({
    ciclo: c,
    nivel: 0,
    tipo: c.resultado === 'vitoria' ? 'win' : 'loss',
    investido: valor,
    lucro: c.resultado === 'vitoria' ? valor * payout / 100 : -valor,
  }));
}

function simularGale(
  ciclos: CicloResultado[], maxGale: number, mult: number, valor: number, payout: number, isProtecao = false,
): CicloEnriquecido[] {
  const result: CicloEnriquecido[] = [];
  let pendingGale = 0;
  for (const c of ciclos) {
    let nivel = 0;
    let investido = valor;
    let lucro = 0;
    if (pendingGale > 0 && pendingGale <= maxGale) {
      nivel = pendingGale;
      investido = valor * Math.pow(mult, pendingGale);
      if (c.resultado === 'vitoria') { lucro = investido * payout / 100; pendingGale = 0; }
      else { lucro = -investido; pendingGale = pendingGale + 1 > maxGale ? 0 : pendingGale + 1; }
    } else {
      if (c.resultado === 'vitoria') { lucro = valor * payout / 100; pendingGale = 0; }
      else { lucro = -valor; pendingGale = 1; }
    }
    const tipo: CicloEnriquecido['tipo'] = c.resultado === 'vitoria'
      ? nivel === 0 ? 'win' : (isProtecao ? 'protecao_win' : 'gale_win')
      : 'loss';
    result.push({ ciclo: c, nivel, tipo, investido, lucro });
  }
  return result;
}

function simularSoros(ciclos: CicloResultado[], maxNivel: number, valor: number, payout: number): CicloEnriquecido[] {
  const result: CicloEnriquecido[] = [];
  let valorAtual = valor;
  let nivel = 0;
  for (const c of ciclos) {
    const investido = valorAtual;
    const nivelAntes = nivel;
    let lucro: number;
    let tipo: CicloEnriquecido['tipo'];
    if (c.resultado === 'vitoria') {
      lucro = investido * payout / 100;
      tipo = nivelAntes > 0 ? 'soros_win' : 'win';
      if (nivel + 1 >= maxNivel) { valorAtual = valor; nivel = 0; }
      else { valorAtual = investido + lucro; nivel++; }
    } else {
      lucro = -investido; tipo = 'loss'; valorAtual = valor; nivel = 0;
    }
    result.push({ ciclo: c, nivel: nivelAntes, tipo, investido, lucro });
  }
  return result;
}

function calcStats(enriquecidos: CicloEnriquecido[]): SimStats {
  const wins = enriquecidos.filter(o => o.tipo !== 'loss').length;
  const losses = enriquecidos.filter(o => o.tipo === 'loss').length;
  return {
    totalCiclos: enriquecidos.length,
    wins, losses,
    winRate: enriquecidos.length > 0 ? (wins / enriquecidos.length) * 100 : 0,
    lucroTotal: enriquecidos.reduce((s, o) => s + o.lucro, 0),
  };
}

// ── Block helpers ──────────────────────────────────────────────────────────────

function getBlockConfig(o: CicloEnriquecido, aba: AbaGerenciamento): { label: string; bg: string; text: string } {
  if (o.tipo === 'loss') return { label: 'L', bg: 'bg-red-500', text: 'text-white' };
  if (aba === 'fixo') return { label: 'W', bg: 'bg-emerald-500', text: 'text-white' };
  if (aba === 'gale') {
    if (o.nivel === 0) return { label: 'A', bg: 'bg-emerald-500', text: 'text-white' };
    if (o.nivel === 1) return { label: 'G1', bg: 'bg-amber-500', text: 'text-black' };
    if (o.nivel === 2) return { label: 'G2', bg: 'bg-orange-500', text: 'text-white' };
    return { label: 'G3', bg: 'bg-rose-600', text: 'text-white' };
  }
  if (aba === 'protecao') {
    if (o.nivel === 0) return { label: 'A', bg: 'bg-emerald-500', text: 'text-white' };
    if (o.nivel === 1) return { label: 'P', bg: 'bg-yellow-400', text: 'text-black' };
    return { label: `P${o.nivel}`, bg: 'bg-amber-500', text: 'text-black' };
  }
  if (aba === 'soros') {
    if (o.nivel === 0) return { label: 'A', bg: 'bg-emerald-500', text: 'text-white' };
    if (o.nivel === 1) return { label: 'S1', bg: 'bg-cyan-500', text: 'text-black' };
    if (o.nivel === 2) return { label: 'S2', bg: 'bg-teal-500', text: 'text-white' };
    return { label: `S${o.nivel}`, bg: 'bg-blue-500', text: 'text-white' };
  }
  return { label: 'W', bg: 'bg-emerald-500', text: 'text-white' };
}

// ── GridCiclos ─────────────────────────────────────────────────────────────────

function GridCiclos({ enriquecidos, aba }: { enriquecidos: CicloEnriquecido[]; aba: AbaGerenciamento }) {
  if (enriquecidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Activity size={32} className="mb-2 opacity-40" />
        <p className="text-sm">Nenhum sinal detectado neste período</p>
      </div>
    );
  }
  const reversed = [...enriquecidos].reverse();

  const fmtDia = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  type GridItem =
    | { type: 'sinal'; o: CicloEnriquecido; key: number }
    | { type: 'sep'; diaAntigo: string; diaRecente: string; key: number };

  const items: GridItem[] = [];
  reversed.forEach((o, idx) => {
    if (idx > 0) {
      const diaAnterior = fmtDia(reversed[idx - 1].ciclo.timestamp);
      const diaAtual = fmtDia(o.ciclo.timestamp);
      if (diaAnterior !== diaAtual) {
        items.push({ type: 'sep', diaAntigo: diaAtual, diaRecente: diaAnterior, key: -(idx) });
      }
    }
    items.push({ type: 'sinal', o, key: idx });
  });

  return (
    <div className="grid grid-cols-6 gap-1.5">
      {items.map(item => {
        if (item.type === 'sep') {
          return (
            <div key={item.key} className="col-span-6 flex items-center gap-2 my-0.5">
              <div className="flex-1 border-t border-slate-700/60" />
              <span className="text-[9px] text-slate-500 font-semibold tracking-wide px-1">
                {item.diaAntigo} &rarr; {item.diaRecente}
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
            </div>
          );
        }
        const { o } = item;
        const { label, bg, text } = getBlockConfig(o, aba);
        const d = new Date(o.ciclo.timestamp * 1000);
        const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const dia = fmtDia(o.ciclo.timestamp);
        return (
          <div key={item.key} className={cn('rounded-lg flex flex-col items-center justify-center py-2.5 px-1', bg)}>
            <span className={cn('text-[11px] font-black leading-none', text)}>{label}</span>
            <span className={cn('text-[10px] font-semibold mt-1 leading-none opacity-90', text)}>{hora}</span>
            <span className={cn('text-[10px] mt-0.5 leading-none opacity-90', text)}>dia {dia}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── ModalCiclos ────────────────────────────────────────────────────────────────

function ModalCiclos({ ciclos, config, janelaTempo, onFechar }: {
  ciclos: CicloResultado[];
  config: CardConfig;
  janelaTempo: JanelaTempo;
  onFechar: () => void;
}) {
  const [aba, setAba] = useState<AbaGerenciamento>('fixo');
  const [valorEntrada, setValorEntrada] = useState(10);
  const [payout, setPayout] = useState(80);
  const [maxGale, setMaxGale] = useState<1 | 2 | 3>(2);
  const [mult, setMult] = useState(2.0);
  const [maxSoros, setMaxSoros] = useState(3);

  const sorted = [...ciclos].sort((a, b) => a.timestamp - b.timestamp);

  const enriquecidos = (() => {
    switch (aba) {
      case 'fixo':     return simularFixo(sorted, valorEntrada, payout);
      case 'gale':     return simularGale(sorted, maxGale, mult, valorEntrada, payout, false);
      case 'protecao': return simularGale(sorted, maxGale, mult, valorEntrada, payout, true);
      case 'soros':    return simularSoros(sorted, maxSoros, valorEntrada, payout);
    }
  })();

  const stats = calcStats(enriquecidos);
  const lucroPos = stats.lucroTotal >= 0;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const ABAS: { key: AbaGerenciamento; label: string }[] = [
    { key: 'fixo', label: 'Fixo' }, { key: 'gale', label: 'Gale' },
    { key: 'protecao', label: 'Proteção' }, { key: 'soros', label: 'Soros' },
  ];

  const janelaLabel = janelaTempo === 'hoje' ? 'hoje' : `${janelaTempo}h`;

  const fmtDateTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${dia} ${hora}`;
  };

  const rangeLabel = sorted.length > 0
    ? `${fmtDateTime(sorted[0].timestamp)} → ${fmtDateTime(sorted[sorted.length - 1].timestamp)}`
    : null;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onFechar} />
      <motion.div
        className="relative w-full max-w-3xl bg-slate-950 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-apex-trader-primary" />
              <h3 className="text-lg font-bold text-white">{config.ativo}</h3>
            </div>
            <p className="text-sm text-slate-400">{config.estrategia} · {janelaLabel} · {ciclos.length} sinais</p>
            {rangeLabel && (
              <p className="text-xs text-slate-600 mt-0.5">{rangeLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-black text-white">{stats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400">{stats.wins}W / {stats.losses}L</p>
            </div>
            <button onClick={onFechar} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Abas */}
          <div className="flex gap-1 p-4 border-b border-slate-800">
            {ABAS.map(a => (
              <button key={a.key} onClick={() => setAba(a.key)}
                className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  aba === a.key ? 'bg-apex-trader-primary text-black' : 'bg-slate-800/60 text-slate-400 hover:text-white')}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Config simulação */}
          <div className="p-4 bg-slate-900/40 border-b border-slate-800">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Valor entrada (R$)</label>
                <input type="number" value={valorEntrada}
                  onChange={e => setValorEntrada(Math.max(0.01, parseFloat(e.target.value) || 10))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center" step="1" min="0.01" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Payout (%)</label>
                <input type="number" value={payout}
                  onChange={e => setPayout(Math.max(1, parseFloat(e.target.value) || 80))}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center" step="1" min="1" max="200" />
              </div>
              {(aba === 'gale' || aba === 'protecao') && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Máx. níveis</label>
                    <div className="flex gap-1">
                      {([1, 2, 3] as const).map(n => (
                        <button key={n} onClick={() => setMaxGale(n)}
                          className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
                            maxGale === n ? 'bg-apex-trader-primary text-black' : 'bg-slate-800 text-slate-400 hover:text-white')}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Multiplicador</label>
                    <input type="number" value={mult}
                      onChange={e => setMult(Math.max(1.1, parseFloat(e.target.value) || 2))}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center" step="0.1" min="1.1" />
                  </div>
                </>
              )}
              {aba === 'soros' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Ciclos Soros</label>
                  <div className="flex gap-1">
                    {([2, 3, 4] as const).map(n => (
                      <button key={n} onClick={() => setMaxSoros(n)}
                        className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
                          maxSoros === n ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white')}>
                        S{n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats resumo */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Win Rate</p>
                <p className="text-lg font-black text-white">{stats.winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Sinais</p>
                <p className="text-lg font-black text-white">{stats.totalCiclos}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-400/70 mb-1 uppercase tracking-wide">Wins</p>
                <p className="text-lg font-black text-emerald-400">{stats.wins}</p>
              </div>
              <div className={cn('rounded-xl p-3 text-center border',
                lucroPos ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20')}>
                <p className={cn('text-[10px] mb-1 uppercase tracking-wide', lucroPos ? 'text-emerald-400/70' : 'text-red-400/70')}>
                  Lucro Sim.
                </p>
                <p className={cn('text-base font-black', lucroPos ? 'text-emerald-400' : 'text-red-400')}>
                  {lucroPos ? '+' : ''}R${stats.lucroTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Grade */}
          <div className="p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              {stats.totalCiclos} sinais · {stats.wins} wins / {stats.losses} losses
            </p>
            <GridCiclos enriquecidos={enriquecidos} aba={aba} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── CardMetrica ────────────────────────────────────────────────────────────────

function CardMetrica({ config, janelaTempo, ativosSDK, onVerCiclos, onRemover }: {
  config: CardConfig;
  janelaTempo: JanelaTempo;
  ativosSDK: ActiveInfo[];
  onVerCiclos: (ciclos: CicloResultado[]) => void;
  onRemover: () => void;
}) {
  const [estado, setEstado] = useState<EstadoCard>({ carregando: true, erro: null, ciclos: [], atualizadoEm: null });

  // Extract stable primitive ID so the analysis only re-runs when the actual ativo changes,
  // not on every useVorna state update that creates a new ativosSDK array reference.
  const ativoId = useMemo(
    () => ativosSDK.find(a => a.displayName === config.ativo)?.id ?? null,
    [ativosSDK, config.ativo],
  );
  const ativosPopulados = ativosSDK.length > 0;

  const carregar = useCallback(() => {
    if (ativoId === null) {
      setEstado({ carregando: false, erro: ativosPopulados
        ? `Ativo "${config.ativo}" não encontrado na corretora`
        : 'Aguardando ativos da corretora. Verifique a conexão.',
        ciclos: [], atualizadoEm: null });
      return;
    }
    setEstado(s => ({ ...s, carregando: true, erro: null }));
    analisarEstrategia(ativoId, config.estrategia, janelaTempo)
      .then(ciclos => setEstado({ carregando: false, erro: null, ciclos, atualizadoEm: Date.now() }))
      .catch(err => setEstado({ carregando: false, erro: String(err?.message ?? err), ciclos: [], atualizadoEm: null }));
  }, [ativoId, config.ativo, config.estrategia, janelaTempo, ativosPopulados]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const id = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [carregar]);

  const wins = estado.ciclos.filter(c => c.resultado === 'vitoria').length;
  const losses = estado.ciclos.filter(c => c.resultado === 'derrota').length;
  const total = estado.ciclos.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const isPositive = winRate >= 50;

  const ultimoCiclo = total > 0 ? estado.ciclos.reduce((a, b) => a.timestamp > b.timestamp ? a : b) : null;

  // Gera curva de performance acumulada (win=+1, loss=-1) ordenada por timestamp
  const sparklineData = useMemo(() => {
    if (estado.ciclos.length === 0) return [];
    const sorted = [...estado.ciclos].sort((a, b) => a.timestamp - b.timestamp);
    let acc = 0;
    return sorted.map(c => {
      acc += c.resultado === 'vitoria' ? 1 : -1;
      return acc;
    });
  }, [estado.ciclos]);

  const StatusDot = () => (
    <div className={cn('w-2 h-2 rounded-full shrink-0',
      estado.carregando ? 'bg-amber-400 animate-pulse' :
      estado.erro ? 'bg-red-500' :
      'bg-apex-trader-primary animate-pulse'
    )} />
  );

  return (
    <motion.div
      className="relative group h-full"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-700/40 backdrop-blur-sm overflow-hidden h-full flex flex-col">
        {/* Borda superior colorida */}
        <div className={cn('absolute top-0 left-0 right-0 h-px',
          isPositive ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' :
          'bg-gradient-to-r from-transparent via-red-500/40 to-transparent'
        )} />

        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Remover */}
          <button onClick={onRemover}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all z-10"
            title="Remover">
            <X size={13} />
          </button>

          {/* Header: ativo + estratégia */}
          <div className="flex items-start justify-between pr-6">
            <div className="flex items-center gap-3 min-w-0">
              <AtivoIcon displayName={config.ativo} size={38} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <StatusDot />
                  <span className="text-sm font-bold text-white truncate">{config.ativo}</span>
                </div>
                <span className="inline-block text-[10px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-md tracking-wide">
                  {config.estrategia}
                </span>
              </div>
            </div>

            {!estado.carregando && !estado.erro && total > 0 && (
              <div className="text-right">
                <motion.div
                  className={cn('text-xl font-black leading-none tabular-nums',
                    isPositive ? 'text-emerald-400' : 'text-red-400')}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                >
                  {winRate.toFixed(1)}%
                </motion.div>
                <div className={cn('flex items-center justify-end gap-0.5 text-[10px] font-semibold mt-0.5',
                  isPositive ? 'text-emerald-500' : 'text-red-500')}>
                  {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isPositive ? '↗' : '↘'}
                </div>
              </div>
            )}
          </div>

          {/* Corpo */}
          {estado.carregando ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
              <Loader2 size={22} className="animate-spin text-apex-trader-primary" />
              <p className="text-[11px]">Analisando velas...</p>
            </div>
          ) : estado.erro ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-[11px] text-red-400 text-center px-2 leading-relaxed">{estado.erro}</p>
              <button onClick={carregar} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 mt-1 transition-colors">
                <RefreshCw size={10} /> Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Gráfico sparkline */}
              <div className="rounded-xl border border-slate-700/30 bg-slate-950/40 overflow-hidden">
                {sparklineData.length > 1 ? (
                  <InteractiveChart
                    data={sparklineData}
                    positive={isPositive}
                    height={130}
                    tooltipLabel="Líquido"
                  />
                ) : (
                  <div className="h-[130px] flex items-center justify-center">
                    <p className="text-[11px] text-slate-600">Nenhum sinal no período</p>
                  </div>
                )}
              </div>

              {/* Stats grid 2x2 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Sinais</p>
                  <p className="text-base font-black text-white tabular-nums">{total}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Win Rate</p>
                  <p className={cn('text-base font-black tabular-nums', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                    {total > 0 ? `${winRate.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] text-emerald-500/60 uppercase tracking-wider mb-1">Wins</p>
                  <p className="text-base font-black text-emerald-400 tabular-nums">{wins}</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] text-red-500/60 uppercase tracking-wider mb-1">Losses</p>
                  <p className="text-base font-black text-red-400 tabular-nums">{losses}</p>
                </div>
              </div>

              {/* Último sinal */}
              {ultimoCiclo ? (
                <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <Clock size={10} />
                  {(() => {
                    const d = new Date(ultimoCiclo.timestamp * 1000);
                    return `Último: ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                  })()}
                  <span className={cn('ml-auto font-bold', ultimoCiclo.resultado === 'vitoria' ? 'text-emerald-400' : 'text-red-400')}>
                    {ultimoCiclo.resultado === 'vitoria' ? '● W' : '○ L'}
                  </span>
                </p>
              ) : null}
            </>
          )}

          {/* Ações */}
          <div className="flex gap-2 mt-auto pt-1 items-center">
            <button onClick={carregar} disabled={estado.carregando}
              className="p-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-40"
              title="Atualizar dados">
              <RefreshCw size={13} className={estado.carregando ? 'animate-spin' : ''} />
            </button>
            {estado.atualizadoEm && !estado.carregando && (
              <span className="text-[9px] text-slate-500 tabular-nums shrink-0" title="Última atualização">
                {new Date(estado.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => !estado.carregando && !estado.erro && onVerCiclos(estado.ciclos)}
              disabled={estado.carregando || !!estado.erro || total === 0}
              className="flex-1 py-2 rounded-xl border border-slate-700/50 text-slate-300 text-xs font-semibold hover:border-apex-trader-primary/50 hover:text-apex-trader-primary hover:bg-apex-trader-primary/5 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Layers size={12} />
              Ver Ciclos
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── FormAdicionarCard ──────────────────────────────────────────────────────────

function FormAdicionarCard({ onAdicionar, onCancelar, ativosSDK }: {
  onAdicionar: (config: Omit<CardConfig, 'id'>) => void;
  onCancelar: () => void;
  ativosSDK: ActiveInfo[];
}) {
  const ativos = ativosSDK.length > 0
    ? ativosSDK.filter(a => !a.isSuspended || a.isOtc).map(a => a.displayName)
    : TODOS_ATIVOS;
  const uniqueAtivos = Array.from(new Set(ativos)).sort();
  const [ativo, setAtivo] = useState(uniqueAtivos[0] || 'EUR/USD');
  const [estrategia, setEstrategia] = useState(ESTRATEGIAS[0]);

  return (
    <div className="glass-card p-5 border border-apex-trader-primary/20 h-full flex flex-col gap-3">
      <p className="text-sm font-bold text-white">Nova estratégia para monitorar</p>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Ativo</label>
        <select value={ativo} onChange={e => setAtivo(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-apex-trader-primary/50">
          {uniqueAtivos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Estratégia</label>
        <select value={estrategia} onChange={e => setEstrategia(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-apex-trader-primary/50">
          {ESTRATEGIAS.map(s => <option key={s} value={s}>{BRANDING.strategyLabels[s] || s}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-auto">
        <button onClick={() => onAdicionar({ ativo, estrategia })}
          className="flex-1 py-2.5 rounded-xl bg-apex-trader-primary text-black text-sm font-bold hover:brightness-110 transition-all">
          Adicionar
        </button>
        <button onClick={onCancelar}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── SecaoMetricasEstrategia ────────────────────────────────────────────────────

export default function SecaoMetricasEstrategia({ ativosSDK }: { ativosSDK: ActiveInfo[] }) {
  const [janelaTempo, setJanelaTempo] = useState<JanelaTempo>('hoje');
  const [cartoesConfig, setCartoesConfig] = useState<CardConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [modalState, setModalState] = useState<{ config: CardConfig; ciclos: CicloResultado[] } | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cartoesConfig)); } catch {/* ignore */}
  }, [cartoesConfig]);

  const adicionarCard = (config: Omit<CardConfig, 'id'>) => {
    setCartoesConfig(prev => [...prev, { ...config, id: Date.now() }]);
    setMostrandoForm(false);
  };

  const removerCard = (id: number) => {
    setCartoesConfig(prev => prev.filter(c => c.id !== id));
    if (modalState?.config.id === id) setModalState(null);
  };

  const totalCards = cartoesConfig.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 size={18} className="text-apex-trader-primary shrink-0" />
          <h2 className="text-base font-bold text-white">Análise de Estratégias</h2>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
            Backtest de velas · {totalCards}/{MAX_CARDS}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Clock size={13} className="text-slate-500" />
          <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
            {(['hoje', 2, 3, 5] as const).map(h => (
              <button key={h} onClick={() => setJanelaTempo(h)}
                className={cn('px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  janelaTempo === h ? 'bg-apex-trader-primary text-black' : 'text-slate-400 hover:text-white')}>
                {h === 'hoje' ? 'Hoje' : `${h}h`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {cartoesConfig.map(config => (
            <motion.div key={config.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <CardMetrica
                config={config}
                janelaTempo={janelaTempo}
                ativosSDK={ativosSDK}
                onVerCiclos={ciclos => setModalState({ config, ciclos })}
                onRemover={() => removerCard(config.id)}
              />
            </motion.div>
          ))}

          {mostrandoForm ? (
            <motion.div key="form" layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
              <FormAdicionarCard
                ativosSDK={ativosSDK}
                onAdicionar={adicionarCard}
                onCancelar={() => setMostrandoForm(false)}
              />
            </motion.div>
          ) : cartoesConfig.length < MAX_CARDS ? (
            <motion.button key="add-btn" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMostrandoForm(true)}
              className="glass-card p-5 flex flex-col items-center justify-center gap-3 border-dashed hover:border-apex-trader-primary/40 text-slate-500 hover:text-apex-trader-primary transition-all min-h-[180px]">
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
                <Plus size={18} />
              </div>
              <span className="text-sm font-semibold">Adicionar Estratégia</span>
              <span className="text-xs opacity-60">{cartoesConfig.length}/{MAX_CARDS}</span>
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalState && (
          <ModalCiclos
            ciclos={modalState.ciclos}
            config={modalState.config}
            janelaTempo={janelaTempo}
            onFechar={() => setModalState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
