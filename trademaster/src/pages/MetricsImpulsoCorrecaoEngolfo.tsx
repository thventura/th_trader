import React from 'react';
import { cn } from '../lib/utils';
import { analisarImpulsoCorrecaoEngolfo } from '../lib/motor-impulso-correcao-engolfo';
import { servicoVelas as servicoVelasType } from '../lib/websocket-velas';
import { Loader2, TrendingUp, TrendingDown, BarChart3, List, DollarSign, AlertTriangle, Globe, Activity } from 'lucide-react';
import GaleTab from '../components/GaleTab';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Cell,
} from 'recharts';

type Stat = { total: number; wins: number };

interface Props {
  backtestAtivo: string;
  setBacktestAtivo: (v: string) => void;
  backtestAtivosSelecionados: string[];
  setBacktestAtivosSelecionados: (v: string[]) => void;
  backtestDataInicio: string;
  setBacktestDataInicio: (v: string) => void;
  backtestDataFim: string;
  setBacktestDataFim: (v: string) => void;
  backtestVelas: any[];
  backtestLoading: boolean;
  servicoVelas: typeof servicoVelasType;
  ativosPadrao: string[];
}

interface ResultadoBacktest {
  hora: string;
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  confianca: number;
  velasImpulso: number;
  velasCorrecao: number;
  direcaoImpulso: 'alta' | 'baixa';
  timestamp: number;
}

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getFaixa(hora: number): string {
  if (hora < 6) return 'Madrugada (00-06)';
  if (hora < 12) return 'Manhã (06-12)';
  if (hora < 18) return 'Tarde (12-18)';
  return 'Noite (18-00)';
}

const JANELA_MAXIMA = 200;
const CHUNK_SIZE = 500;

const StatCard: React.FC<{ label: string; total: number; wins: number }> = ({ label, total, wins }) => {
  const rate = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1 truncate">{label}</p>
      <p className={cn('text-lg font-black', rate >= 60 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400')}>
        {total > 0 ? `${rate.toFixed(1)}%` : '—'}
      </p>
      <p className="text-xs text-slate-600">{wins}W / {total - wins}L</p>
    </div>
  );
};

export default function MetricsImpulsoCorrecaoEngolfoContent({
  backtestAtivo, setBacktestAtivo,
  backtestAtivosSelecionados, setBacktestAtivosSelecionados,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas, backtestLoading, servicoVelas, ativosPadrao,
}: Props) {
  const [subTab, setSubTab] = React.useState<'lista' | 'estatisticas' | 'impulso' | 'correcao' | 'drawdown' | 'lucro' | 'gale'>('lista');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [valorEntrada, setValorEntrada] = React.useState(20);
  const [payout, setPayout] = React.useState(87);
  const [bancaInicial, setBancaInicial] = React.useState(1000);
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [confiancaMinima, setConfiancaMinima] = React.useState(0);
  const [filtroVelasImpulso, setFiltroVelasImpulso] = React.useState(3);
  const [filtroVelasCorrecao, setFiltroVelasCorrecao] = React.useState(2);

  const [backtestResultados, setBacktestResultados] = React.useState<ResultadoBacktest[]>([]);
  const [processando, setProcessando] = React.useState(false);
  const [progresso, setProgresso] = React.useState(0);

  const [comparativoData, setComparativoData] = React.useState<{ ativo: string; total: number; wins: number; rate: number; bestHour: string; profit: number }[]>([]);
  const [comparativoLoading, setComparativoLoading] = React.useState(false);

  // Backtesting assíncrono em chunks
  React.useEffect(() => {
    if (!backtestVelas || backtestVelas.length < 20 || !backtestDataInicio || !backtestDataFim || backtestLoading) {
      setBacktestResultados([]);
      setProcessando(false);
      return;
    }

    setProcessando(true);
    setProgresso(0);
    let cancelado = false;

    const resultados: ResultadoBacktest[] = [];
    const sinaisProcessados = new Set<string>();

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + mI;
    const totalMinF = hF * 60 + mF;
    const cruzaMeiaNoite = totalMinI > totalMinF;

    const tsMap = new Map<number, any>();
    backtestVelas.forEach((v: any) => { if (v) tsMap.set(v.timestamp, v); });

    const startIdx = 20;
    const endIdx = backtestVelas.length - 1;
    let idx = startIdx;

    function processarChunk() {
      if (cancelado) return;
      const chunkEnd = Math.min(idx + CHUNK_SIZE, endIdx);

      for (; idx < chunkEnd; idx++) {
        const velaAtual = backtestVelas[idx];
        if (!velaAtual) continue;

        const d = new Date(velaAtual.timestamp * 1000);
        if (!diasSelecionados.includes(d.getDay())) continue;

        const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        if (localStr < backtestDataInicio || localStr > backtestDataFim) continue;

        const totalMin = d.getHours() * 60 + d.getMinutes();
        if (cruzaMeiaNoite) {
          if (totalMin < totalMinI && totalMin > totalMinF) continue;
        } else {
          if (totalMin < totalMinI || totalMin > totalMinF) continue;
        }

        const windowStart = Math.max(0, idx - JANELA_MAXIMA);
        const velasJanela = backtestVelas.slice(windowStart, idx + 1);
        const analise = analisarImpulsoCorrecaoEngolfo(velasJanela);

        if (!analise.operar || !analise.sinal_id || !analise.direcao_operacao) continue;
        if (sinaisProcessados.has(analise.sinal_id)) continue;
        sinaisProcessados.add(analise.sinal_id);

        if (analise.confianca < confiancaMinima) continue;
        if (analise.velasImpulso < filtroVelasImpulso) continue;
        if (analise.velasCorrecao < filtroVelasCorrecao) continue;

        const nextV = tsMap.get(velaAtual.timestamp + 60);
        if (!nextV || !nextV.cor) continue;

        const win = (analise.direcao_operacao === 'compra' && nextV.cor === 'alta') ||
                    (analise.direcao_operacao === 'venda' && nextV.cor === 'baixa');

        resultados.push({
          hora: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          direcao: analise.direcao_operacao,
          resultado: win ? 'vitoria' : 'derrota',
          confianca: analise.confianca,
          velasImpulso: analise.velasImpulso,
          velasCorrecao: analise.velasCorrecao,
          direcaoImpulso: analise.direcaoImpulso!,
          timestamp: velaAtual.timestamp,
        });
      }

      if (cancelado) return;
      setProgresso(Math.round(((idx - startIdx) / (endIdx - startIdx)) * 100));

      if (idx < endIdx) {
        setTimeout(processarChunk, 0);
      } else {
        setBacktestResultados([...resultados]);
        setProcessando(false);
      }
    }

    processarChunk();
    return () => { cancelado = true; };
  }, [backtestVelas, backtestDataInicio, backtestDataFim, horaInicio, horaFim, diasSelecionados, confiancaMinima, backtestLoading, filtroVelasImpulso, filtroVelasCorrecao]);

  // Estatísticas
  const stats = React.useMemo(() => {
    const total = backtestResultados.length;
    const wins = backtestResultados.filter(r => r.resultado === 'vitoria').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    const porDirecao: Record<string, Stat> = { compra: { total: 0, wins: 0 }, venda: { total: 0, wins: 0 } };
    const porConfianca: Record<string, Stat> = {
      '0-40%': { total: 0, wins: 0 }, '40-60%': { total: 0, wins: 0 },
      '60-80%': { total: 0, wins: 0 }, '80-100%': { total: 0, wins: 0 },
    };
    const porHora: Record<number, Stat> = {};
    for (let i = 0; i < 24; i++) porHora[i] = { total: 0, wins: 0 };
    const porFaixa: Record<string, Stat> = {
      'Madrugada (00-06)': { total: 0, wins: 0 }, 'Manhã (06-12)': { total: 0, wins: 0 },
      'Tarde (12-18)': { total: 0, wins: 0 }, 'Noite (18-00)': { total: 0, wins: 0 },
    };
    const porDia: Record<number, Stat> = {};
    for (let i = 0; i < 7; i++) porDia[i] = { total: 0, wins: 0 };

    // ICE-specific breakdowns
    const porVelasImpulso: Record<string, Stat> = {};
    for (let i = 3; i <= 10; i++) porVelasImpulso[String(i)] = { total: 0, wins: 0 };
    const porVelasCorrecao: Record<string, Stat> = {};
    for (let i = 2; i <= 5; i++) porVelasCorrecao[String(i)] = { total: 0, wins: 0 };

    backtestResultados.forEach(r => {
      const isWin = r.resultado === 'vitoria';
      const d = new Date(r.timestamp * 1000);
      const hora = d.getHours();
      const dia = d.getDay();

      porDirecao[r.direcao].total++; if (isWin) porDirecao[r.direcao].wins++;
      const fc = r.confianca < 40 ? '0-40%' : r.confianca < 60 ? '40-60%' : r.confianca < 80 ? '60-80%' : '80-100%';
      porConfianca[fc].total++; if (isWin) porConfianca[fc].wins++;
      porHora[hora].total++; if (isWin) porHora[hora].wins++;
      const faixa = getFaixa(hora);
      porFaixa[faixa].total++; if (isWin) porFaixa[faixa].wins++;
      porDia[dia].total++; if (isWin) porDia[dia].wins++;

      const vi = String(Math.min(Math.max(r.velasImpulso, 3), 10));
      porVelasImpulso[vi].total++; if (isWin) porVelasImpulso[vi].wins++;
      const vc = String(Math.min(Math.max(r.velasCorrecao, 2), 5));
      porVelasCorrecao[vc].total++; if (isWin) porVelasCorrecao[vc].wins++;
    });

    // Golden hours
    const goldenHours = (Object.entries(porHora) as [string, Stat][])
      .filter(([_, s]) => s.total >= 2 && (s.wins / s.total) * 100 >= 60)
      .map(([h, s]) => ({ hora: Number(h), rate: Number(((s.wins / s.total) * 100).toFixed(1)), total: s.total }))
      .sort((a, b) => b.rate - a.rate);

    let horaOuro = { hora: -1, rate: 0, total: 0 };
    (Object.entries(porHora) as [string, Stat][]).forEach(([h, s]) => {
      if (s.total >= 3) {
        const rate = (s.wins / s.total) * 100;
        if (rate > horaOuro.rate) horaOuro = { hora: Number(h), rate: Number(rate.toFixed(1)), total: s.total };
      }
    });

    const top5Horas = (Object.entries(porHora) as [string, Stat][])
      .filter(([_, s]) => s.total >= 3)
      .map(([h, s]) => ({ hora: Number(h), rate: Number(((s.wins / s.total) * 100).toFixed(1)), total: s.total, wins: s.wins }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    const horas24 = Array.from({ length: 24 }, (_, i) => {
      const s = porHora[i];
      const rate = s && s.total >= 2 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0;
      return { hora: `${i}h`, rate, total: s?.total || 0, wins: s?.wins || 0, isGolden: rate >= 60 && (s?.total || 0) >= 2 };
    });

    return { total, wins, winRate, porDirecao, porConfianca, porHora, porFaixa, porDia, goldenHours, horaOuro, top5Horas, horas24, porVelasImpulso, porVelasCorrecao };
  }, [backtestResultados]);

  // Simulação financeira
  const simulacao = React.useMemo(() => {
    if (backtestResultados.length === 0) return {
      pontos: [] as { idx: number; saldo: number; resultado: string; hora: string; drawdown: number }[],
      bancaFinal: bancaInicial, roi: 0, maiorRebaixamento: 0, maiorSeqLoss: 0,
      riscoRuina: false, timestampMaiorDD: 0, fatorSeguranca: 0,
    };

    const opsOrdenadas = [...backtestResultados].sort((a, b) => a.timestamp - b.timestamp);
    let saldo = bancaInicial;
    let saldoPico = bancaInicial;
    let maiorRebaixamento = 0;
    let timestampMaiorDD = 0;
    let seqLoss = 0;
    let maiorSeqLoss = 0;
    let riscoRuina = false;
    const ganhoOp = valorEntrada * (payout / 100);
    const perdaOp = valorEntrada;

    const pontos: { idx: number; saldo: number; resultado: string; hora: string; drawdown: number }[] = [
      { idx: 0, saldo: bancaInicial, resultado: 'inicio', hora: '', drawdown: 0 }
    ];

    opsOrdenadas.forEach((op, i) => {
      if (op.resultado === 'vitoria') { saldo += ganhoOp; seqLoss = 0; }
      else { saldo -= perdaOp; seqLoss++; if (seqLoss > maiorSeqLoss) maiorSeqLoss = seqLoss; }
      if (saldo <= 0) { saldo = 0; riscoRuina = true; }
      if (saldo > saldoPico) saldoPico = saldo;
      const dd = saldoPico - saldo;
      if (dd > maiorRebaixamento) { maiorRebaixamento = dd; timestampMaiorDD = op.timestamp; }
      pontos.push({ idx: i + 1, saldo, resultado: op.resultado, hora: op.hora, drawdown: dd });
    });

    const roi = bancaInicial > 0 ? ((saldo - bancaInicial) / bancaInicial) * 100 : 0;
    const fatorSeguranca = maiorRebaixamento > 0 ? bancaInicial / maiorRebaixamento : 99;

    return { pontos, bancaFinal: saldo, roi, maiorRebaixamento, maiorSeqLoss, riscoRuina, timestampMaiorDD, fatorSeguranca };
  }, [backtestResultados, bancaInicial, valorEntrada, payout]);

  const toggleDia = (d: number) => setDiasSelecionados(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const TABS = [
    { key: 'lista', label: 'Lista', icon: <List size={13} /> },
    { key: 'estatisticas', label: 'Estatísticas', icon: <BarChart3 size={13} /> },
    { key: 'impulso', label: 'Impulso', icon: <TrendingUp size={13} /> },
    { key: 'correcao', label: 'Correção', icon: <TrendingDown size={13} /> },
    { key: 'drawdown', label: 'Drawdown', icon: <Activity size={13} /> },
    { key: 'lucro', label: 'Lucro', icon: <DollarSign size={13} /> },
    { key: 'gale', label: 'Proteção', icon: <AlertTriangle size={13} /> },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Filtros — Impulso-Correção-Engolfo</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ativo</label>
            <select
              value={backtestAtivo}
              onChange={e => setBacktestAtivo(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs"
            >
              {ativosPadrao.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Data Início</label>
            <input type="date" value={backtestDataInicio} onChange={e => setBacktestDataInicio(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Data Fim</label>
            <input type="date" value={backtestDataFim} onChange={e => setBacktestDataFim(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Confiança Mín. (%)</label>
            <input type="number" min={0} max={100} value={confiancaMinima} onChange={e => setConfiancaMinima(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Hora Início</label>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Hora Fim</label>
            <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Mín. Velas Impulso</label>
            <input type="number" min={3} max={10} value={filtroVelasImpulso} onChange={e => setFiltroVelasImpulso(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Mín. Velas Correção</label>
            <input type="number" min={2} max={5} value={filtroVelasCorrecao} onChange={e => setFiltroVelasCorrecao(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Dias da Semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {NOMES_DIA.map((nome, i) => (
              <button key={i} onClick={() => toggleDia(i)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all', diasSelecionados.includes(i) ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-slate-800/40 border-white/5 text-slate-500')}>
                {nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progresso */}
      {(processando || backtestLoading) && (
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin text-cyan-400" />
          {backtestLoading ? 'Carregando velas...' : `Processando backtest... ${progresso}%`}
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      {/* Resumo */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total</p>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Win Rate</p>
            <p className={cn('text-2xl font-black', stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-amber-400' : 'text-red-400')}>
              {stats.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Vitórias</p>
            <p className="text-2xl font-black text-emerald-400">{stats.wins}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Derrotas</p>
            <p className="text-2xl font-black text-red-400">{stats.total - stats.wins}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {stats.total > 0 && (
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key as typeof subTab)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', subTab === t.key ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white')}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab: Lista */}
          {subTab === 'lista' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/5">
                    <th className="text-left py-2 pr-4">Data/Hora</th>
                    <th className="text-left py-2 pr-4">Direção</th>
                    <th className="text-left py-2 pr-4">Resultado</th>
                    <th className="text-left py-2 pr-4">Impulso</th>
                    <th className="text-left py-2 pr-4">Correção</th>
                    <th className="text-left py-2 pr-4">Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {backtestResultados.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-b border-white/3 hover:bg-white/2">
                      <td className="py-1.5 pr-4 text-slate-400">{r.hora}</td>
                      <td className="py-1.5 pr-4">
                        <span className={cn('font-bold', r.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                          {r.direcao === 'compra' ? 'CALL' : 'PUT'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', r.resultado === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                          {r.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4 text-cyan-400">{r.velasImpulso}v {r.direcaoImpulso}</td>
                      <td className="py-1.5 pr-4 text-amber-400">{r.velasCorrecao}v</td>
                      <td className="py-1.5 pr-4 text-slate-300">{r.confianca}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {backtestResultados.length > 200 && (
                <p className="text-xs text-slate-600 text-center mt-2">Mostrando 200 de {backtestResultados.length} resultados</p>
              )}
            </div>
          )}

          {/* Tab: Estatísticas */}
          {subTab === 'estatisticas' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-slate-500 mb-2">Por Direção</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(stats.porDirecao) as [string, Stat][]).map(([k, s]) => <StatCard key={k} label={k === 'compra' ? 'CALL' : 'PUT'} total={s.total} wins={s.wins} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Por Faixa de Confiança</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(stats.porConfianca) as [string, Stat][]).map(([k, s]) => <StatCard key={k} label={k} total={s.total} wins={s.wins} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Por Faixa Horária</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(stats.porFaixa) as [string, Stat][]).map(([k, s]) => <StatCard key={k} label={k} total={s.total} wins={s.wins} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Por Dia da Semana</p>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {(Object.entries(stats.porDia) as [string, Stat][]).map(([k, s]) => <StatCard key={k} label={NOMES_DIA[Number(k)]} total={s.total} wins={s.wins} />)}
                </div>
              </div>
              {stats.goldenHours.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Horas de Ouro (≥60%)</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.goldenHours.map(g => (
                      <div key={g.hora} className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs">
                        <span className="text-amber-400 font-bold">{g.hora}h</span>
                        <span className="text-slate-400 ml-2">{g.rate}% ({g.total} ops)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-2">Win Rate por Hora (24h)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <ReBarChart data={stats.horas24} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                    <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                    <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
                      {stats.horas24.map((entry, i) => (
                        <Cell key={i} fill={entry.isGolden ? '#f59e0b' : entry.rate >= 50 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab: Impulso */}
          {subTab === 'impulso' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Win rate por número de velas do impulso (3-10)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(stats.porVelasImpulso) as [string, Stat][]).map(([k, s]) => (
                  <StatCard key={k} label={`${k} velas`} total={s.total} wins={s.wins} />
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ReBarChart data={(Object.entries(stats.porVelasImpulso) as [string, Stat][]).map(([k, s]) => ({
                  velas: `${k}v`,
                  rate: s.total > 0 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0,
                  total: s.total,
                }))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="velas" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                  <Bar dataKey="rate" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tab: Correção */}
          {subTab === 'correcao' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Win rate por número de velas da correção (2-5)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(stats.porVelasCorrecao) as [string, Stat][]).map(([k, s]) => (
                  <StatCard key={k} label={`${k} velas`} total={s.total} wins={s.wins} />
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ReBarChart data={(Object.entries(stats.porVelasCorrecao) as [string, Stat][]).map(([k, s]) => ({
                  velas: `${k}v`,
                  rate: s.total > 0 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0,
                  total: s.total,
                }))} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="velas" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tab: Drawdown */}
          {subTab === 'drawdown' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Banca Inicial</p>
                  <p className="text-xl font-black text-white">R$ {bancaInicial.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Maior Drawdown</p>
                  <p className="text-xl font-black text-red-400">R$ {simulacao.maiorRebaixamento.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Seq. Loss Máx.</p>
                  <p className="text-xl font-black text-amber-400">{simulacao.maiorSeqLoss}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Valor por Entrada (R$)</label>
                  <input type="number" min={1} value={valorEntrada} onChange={e => setValorEntrada(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Payout (%)</label>
                  <input type="number" min={1} max={200} value={payout} onChange={e => setPayout(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
                </div>
              </div>
              {simulacao.pontos.length > 1 && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={simulacao.pontos}>
                    <defs>
                      <linearGradient id="gradSaldoICE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDDICE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                    <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                    <ReferenceLine y={bancaInicial} stroke="#475569" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="saldo" stroke="#06b6d4" strokeWidth={2} fill="url(#gradSaldoICE)" name="Saldo" />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradDDICE)" name="Drawdown" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Tab: Lucro */}
          {subTab === 'lucro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Banca Inicial (R$)</label>
                  <input type="number" min={1} value={bancaInicial} onChange={e => setBancaInicial(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Valor por Entrada (R$)</label>
                  <input type="number" min={1} value={valorEntrada} onChange={e => setValorEntrada(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Payout (%)</label>
                  <input type="number" min={1} max={200} value={payout} onChange={e => setPayout(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Banca Final</p>
                  <p className={cn('text-xl font-black', simulacao.bancaFinal >= bancaInicial ? 'text-emerald-400' : 'text-red-400')}>
                    R$ {simulacao.bancaFinal.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">ROI</p>
                  <p className={cn('text-xl font-black', simulacao.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {simulacao.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Maior Drawdown</p>
                  <p className="text-xl font-black text-red-400">R$ {simulacao.maiorRebaixamento.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Risco de Ruína</p>
                  <p className={cn('text-xl font-black', simulacao.riscoRuina ? 'text-red-400' : 'text-emerald-400')}>
                    {simulacao.riscoRuina ? 'SIM' : 'NÃO'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Gale */}
          {subTab === 'gale' && (
            <GaleTab
              resultados={backtestResultados.map(r => ({ resultado: r.resultado, timestamp: r.timestamp, direcao: r.direcao }))}
              valorEntradaInicial={valorEntrada}
              payoutInicial={payout}
            />
          )}
        </div>
      )}

      {!processando && !backtestLoading && stats.total === 0 && backtestVelas.length > 0 && (
        <div className="text-center py-12 text-slate-500">
          <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum padrão ICE encontrado no período selecionado.</p>
          <p className="text-xs mt-1">Tente ampliar o período ou reduzir os filtros.</p>
        </div>
      )}
    </div>
  );
}
