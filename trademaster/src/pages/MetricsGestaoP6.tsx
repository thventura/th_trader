import React from 'react';
import { cn } from '../lib/utils';
import {
  Shield, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { calcularP6Entradas, ALVO_SESSAO_P6, MAX_NIVEIS_P6 } from '../lib/motor-p6';

type Estrategia = 'Q5min' | 'Q10min' | 'CavaloTroia';

interface Sinal {
  timestamp: number;
  hora: string;
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  quadrante: number;
  confianca: number;
}

interface SessaoP6 {
  timestampInicio: number;
  hora: string;
  faixa: string;
  dia: number;
  horaNum: number;
  quadranteInicio: number;
  nivelConcluido: number;
  resultado: 'nos' | 'miss';
  lucroLiquido: number;
  bancaAntes: number;
  bancaDepois: number;
  entradasUsadas: number[];
}

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FAIXAS = ['Madrugada (00-06)', 'Manhã (06-12)', 'Tarde (12-18)', 'Noite (18-00)'];
const CHUNK_SIZE = 800;

function getFaixa(hora: number): string {
  if (hora < 6) return 'Madrugada (00-06)';
  if (hora < 12) return 'Manhã (06-12)';
  if (hora < 18) return 'Tarde (12-18)';
  return 'Noite (18-00)';
}

function rateColor(r: number) {
  return r >= 70 ? 'text-emerald-400' : r >= 55 ? 'text-amber-400' : 'text-red-400';
}
function rateBg(r: number) {
  return r >= 70
    ? 'bg-emerald-500/10 border-emerald-500/25'
    : r >= 55
    ? 'bg-amber-500/10 border-amber-500/25'
    : 'bg-red-500/10 border-red-500/25';
}

const ESTRATEGIAS: {
  id: Estrategia;
  label: string;
  subtitulo: string;
  freq: string;
  exp: string;
  cor: string;
  bordaAtiva: string;
}[] = [
  {
    id: 'Q5min',
    label: 'Quadrantes 5min',
    subtitulo: 'M1 · Janelas de 5 minutos',
    freq: '12 sinais / hora',
    exp: 'Exp: 1 min',
    cor: 'cyan',
    bordaAtiva: 'border-cyan-500/60 bg-cyan-500/8',
  },
  {
    id: 'Q10min',
    label: 'Quadrantes 10min',
    subtitulo: 'M1 · Janelas de 10 minutos',
    freq: '6 sinais / hora',
    exp: 'Exp: 1 min',
    cor: 'violet',
    bordaAtiva: 'border-violet-500/60 bg-violet-500/8',
  },
  {
    id: 'CavaloTroia',
    label: 'Cavalo de Troia',
    subtitulo: 'M2 · Janelas de 20 minutos',
    freq: '3 sinais / hora',
    exp: 'Exp: 2 min',
    cor: 'amber',
    bordaAtiva: 'border-amber-500/60 bg-amber-500/8',
  },
];

interface Props {
  backtestAtivo: string;
  setBacktestAtivo: (v: string) => void;
  backtestDataInicio: string;
  setBacktestDataInicio: (v: string) => void;
  backtestDataFim: string;
  setBacktestDataFim: (v: string) => void;
  backtestVelas: any[];
  backtestLoading: boolean;
  ativosPadrao: string[];
}

export default function MetricsGestaoP6({
  backtestAtivo, setBacktestAtivo,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas, backtestLoading, ativosPadrao,
}: Props) {
  const [estrategia, setEstrategia] = React.useState<Estrategia>('Q5min');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [bancaInicial, setBancaInicial] = React.useState(1000);
  const [payout, setPayout] = React.useState(87);

  const [sinais, setSinais] = React.useState<Sinal[]>([]);
  const [processando, setProcessando] = React.useState(false);
  const [progresso, setProgresso] = React.useState(0);

  const toggleDia = (d: number) =>
    setDiasSelecionados(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );

  React.useEffect(() => {
    if (!backtestVelas || backtestVelas.length < 12 || !backtestDataInicio || !backtestDataFim || backtestLoading) {
      setSinais([]);
      setProcessando(false);
      return;
    }

    setProcessando(true);
    setProgresso(0);
    let cancelado = false;
    const resultados: Sinal[] = [];

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + mI;
    const totalMinF = hF * 60 + mF;
    const cruzaMeiaNoite = totalMinI > totalMinF;

    const tsMap = new Map<number, any>();
    backtestVelas.forEach((v: any) => { if (v) tsMap.set(v.timestamp, v); });

    const startIdx = estrategia === 'Q10min' ? 12 : estrategia === 'CavaloTroia' ? 24 : 6;
    const endIdx = backtestVelas.length - 4;
    let idx = startIdx;

    function processarChunk() {
      if (cancelado) return;
      const chunkEnd = Math.min(idx + CHUNK_SIZE, endIdx);

      for (; idx < chunkEnd; idx++) {
        const velaAtual = backtestVelas[idx];
        if (!velaAtual || !velaAtual.cor) continue;

        const d = new Date(velaAtual.timestamp * 1000);
        const minuto = d.getMinutes();
        const hora = d.getHours();

        if (!diasSelecionados.includes(d.getDay())) continue;

        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (localStr < backtestDataInicio || localStr > backtestDataFim) continue;

        const totalMin = hora * 60 + minuto;
        if (cruzaMeiaNoite) {
          if (totalMin < totalMinI && totalMin > totalMinF) continue;
        } else {
          if (totalMin < totalMinI || totalMin > totalMinF) continue;
        }

        if (estrategia === 'Q5min') {
          if (minuto % 5 !== 4) continue;
          const proximaVela = tsMap.get(velaAtual.timestamp + 60);
          if (!proximaVela?.cor) continue;
          const direcao: 'compra' | 'venda' = velaAtual.cor === 'alta' ? 'compra' : 'venda';
          const win =
            (direcao === 'compra' && proximaVela.cor === 'alta') ||
            (direcao === 'venda' && proximaVela.cor === 'baixa');
          let totalAlta = 0, totalBaixa = 0;
          for (let j = Math.max(0, idx - 4); j <= idx; j++) {
            const v = backtestVelas[j];
            if (!v?.cor) continue;
            const dv = new Date(v.timestamp * 1000);
            if (
              dv.getHours() === hora &&
              dv.getMinutes() >= minuto - 4 &&
              dv.getMinutes() <= minuto
            ) {
              if (v.cor === 'alta') totalAlta++;
              else totalBaixa++;
            }
          }
          const concordam = direcao === 'compra' ? totalAlta : totalBaixa;
          const total = totalAlta + totalBaixa;
          resultados.push({
            timestamp: velaAtual.timestamp,
            hora: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
            direcao,
            resultado: win ? 'vitoria' : 'derrota',
            quadrante: Math.floor(minuto / 5) + 1,
            confianca: total > 0 ? Math.round((concordam / total) * 100) : 50,
          });
        } else if (estrategia === 'Q10min') {
          if (minuto % 10 !== 9) continue;
          const proximaVela = tsMap.get(velaAtual.timestamp + 60);
          if (!proximaVela?.cor) continue;
          let totalAlta = 0, totalBaixa = 0;
          const inicioMin = minuto - 9;
          for (let j = Math.max(0, idx - 9); j <= idx; j++) {
            const v = backtestVelas[j];
            if (!v?.cor) continue;
            const dv = new Date(v.timestamp * 1000);
            if (
              dv.getHours() === hora &&
              dv.getMinutes() >= inicioMin &&
              dv.getMinutes() <= minuto
            ) {
              if (v.cor === 'alta') totalAlta++;
              else totalBaixa++;
            }
          }
          const ultimaCor = velaAtual.cor as 'alta' | 'baixa';
          let direcao: 'compra' | 'venda';
          if (totalAlta >= 7) direcao = 'compra';
          else if (totalBaixa >= 7) direcao = 'venda';
          else direcao = ultimaCor === 'baixa' ? 'compra' : 'venda';
          const win =
            (direcao === 'compra' && proximaVela.cor === 'alta') ||
            (direcao === 'venda' && proximaVela.cor === 'baixa');
          const maxCount = Math.max(totalAlta, totalBaixa);
          resultados.push({
            timestamp: velaAtual.timestamp,
            hora: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
            direcao,
            resultado: win ? 'vitoria' : 'derrota',
            quadrante: Math.floor(minuto / 10) + 1,
            confianca: Math.round((maxCount / 10) * 100),
          });
        } else if (estrategia === 'CavaloTroia') {
          if (minuto !== 21 && minuto !== 41 && minuto !== 1) continue;
          const velaSaida = tsMap.get(velaAtual.timestamp + 120);
          if (!velaSaida?.cor) continue;
          const direcao: 'compra' | 'venda' = velaAtual.cor === 'alta' ? 'compra' : 'venda';
          const win =
            (direcao === 'compra' && velaSaida.cor === 'alta') ||
            (direcao === 'venda' && velaSaida.cor === 'baixa');
          const janela = minuto === 21 ? 1 : minuto === 41 ? 2 : 3;
          resultados.push({
            timestamp: velaAtual.timestamp,
            hora: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
            direcao,
            resultado: win ? 'vitoria' : 'derrota',
            quadrante: janela,
            confianca: 50,
          });
        }
      }

      if (cancelado) return;
      setProgresso(Math.round(((idx - startIdx) / (endIdx - startIdx)) * 100));
      if (idx < endIdx) {
        setTimeout(processarChunk, 0);
      } else {
        setSinais([...resultados]);
        setProcessando(false);
      }
    }

    processarChunk();
    return () => { cancelado = true; };
  }, [backtestVelas, backtestDataInicio, backtestDataFim, horaInicio, horaFim, diasSelecionados, estrategia, backtestLoading]);

  const sessoesP6 = React.useMemo((): SessaoP6[] => {
    if (sinais.length === 0) return [];
    const ops = [...sinais].sort((a, b) => a.timestamp - b.timestamp);
    const sessoes: SessaoP6[] = [];
    let banca = bancaInicial;
    let i = 0;

    while (i < ops.length) {
      const entradas = calcularP6Entradas(banca, payout);
      const bancaAntes = banca;
      const opInicio = ops[i];
      let nivelConcluido = MAX_NIVEIS_P6;
      const entradasUsadas: number[] = [];
      let resultado: 'nos' | 'miss' = 'miss';
      let opsConsumed = 0;

      for (let nivel = 0; nivel < MAX_NIVEIS_P6; nivel++) {
        const opIdx = i + nivel;
        if (opIdx >= ops.length) break;
        const op = ops[opIdx];
        entradasUsadas.push(entradas[nivel]);
        opsConsumed++;
        if (op.resultado === 'vitoria') {
          nivelConcluido = nivel;
          resultado = 'nos';
          banca = bancaAntes + bancaAntes * ALVO_SESSAO_P6;
          break;
        }
      }

      if (resultado === 'miss') {
        banca = Math.max(0, bancaAntes - entradasUsadas.reduce((s, v) => s + v, 0));
      }

      const d = new Date(opInicio.timestamp * 1000);
      sessoes.push({
        timestampInicio: opInicio.timestamp,
        hora: opInicio.hora,
        faixa: getFaixa(d.getHours()),
        dia: d.getDay(),
        horaNum: d.getHours(),
        quadranteInicio: opInicio.quadrante,
        nivelConcluido,
        resultado,
        lucroLiquido: banca - bancaAntes,
        bancaAntes,
        bancaDepois: banca,
        entradasUsadas,
      });

      i += opsConsumed > 0 ? opsConsumed : 1;
      if (banca <= 0) break;
    }

    return sessoes;
  }, [sinais, bancaInicial, payout]);

  const stats = React.useMemo(() => {
    if (sessoesP6.length === 0) return null;

    const total = sessoesP6.length;
    const nosCount = sessoesP6.filter(s => s.resultado === 'nos').length;
    const missCount = total - nosCount;
    const taxaNOS = total > 0 ? (nosCount / total) * 100 : 0;

    const nivelDist: Record<string, number> = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, MISS: 0 };
    sessoesP6.forEach(s => {
      if (s.resultado === 'nos') nivelDist[`L${s.nivelConcluido}`]++;
      else nivelDist['MISS']++;
    });

    const porFaixa: Record<string, { nos: number; miss: number; total: number }> = {};
    FAIXAS.forEach(f => { porFaixa[f] = { nos: 0, miss: 0, total: 0 }; });
    sessoesP6.forEach(s => {
      const f = porFaixa[s.faixa];
      if (f) { f.total++; if (s.resultado === 'nos') f.nos++; else f.miss++; }
    });

    const porDia: Record<number, { nos: number; miss: number; total: number }> = {};
    for (let d = 0; d < 7; d++) porDia[d] = { nos: 0, miss: 0, total: 0 };
    sessoesP6.forEach(s => {
      porDia[s.dia].total++;
      if (s.resultado === 'nos') porDia[s.dia].nos++;
      else porDia[s.dia].miss++;
    });

    const porHora: Record<number, { nos: number; miss: number; total: number }> = {};
    for (let h = 0; h < 24; h++) porHora[h] = { nos: 0, miss: 0, total: 0 };
    sessoesP6.forEach(s => {
      porHora[s.horaNum].total++;
      if (s.resultado === 'nos') porHora[s.horaNum].nos++;
      else porHora[s.horaNum].miss++;
    });

    const evolucaoBanca = [{ idx: 0, banca: bancaInicial }];
    sessoesP6.forEach((s, i) => evolucaoBanca.push({ idx: i + 1, banca: s.bancaDepois }));

    let pico = bancaInicial;
    let maiorDD = 0;
    const evolucaoDD = [{ idx: 0, dd: 0 }];
    sessoesP6.forEach((s, i) => {
      if (s.bancaDepois > pico) pico = s.bancaDepois;
      const dd = pico - s.bancaDepois;
      if (dd > maiorDD) maiorDD = dd;
      evolucaoDD.push({ idx: i + 1, dd });
    });

    let seqMiss = 0, maiorSeqMiss = 0;
    sessoesP6.forEach(s => {
      if (s.resultado === 'miss') { seqMiss++; if (seqMiss > maiorSeqMiss) maiorSeqMiss = seqMiss; }
      else seqMiss = 0;
    });

    const bancaFinal = sessoesP6[sessoesP6.length - 1].bancaDepois;
    const lucro = bancaFinal - bancaInicial;
    const roi = bancaInicial > 0 ? (lucro / bancaInicial) * 100 : 0;
    const riscoRuina = sessoesP6.some(s => s.bancaDepois <= 0);

    const totalSinais = sinais.length;
    const winsSinais = sinais.filter(s => s.resultado === 'vitoria').length;
    const winRateSinais = totalSinais > 0 ? (winsSinais / totalSinais) * 100 : 0;

    return {
      total, nosCount, missCount, taxaNOS,
      nivelDist, porFaixa, porDia, porHora,
      evolucaoBanca, evolucaoDD, maiorDD, maiorSeqMiss,
      bancaFinal, lucro, roi, riscoRuina,
      totalSinais, winRateSinais,
    };
  }, [sessoesP6, bancaInicial, sinais]);

  const estMeta = ESTRATEGIAS.find(e => e.id === estrategia)!;

  const accentClasses: Record<string, { icon: string; badge: string; dot: string; border: string }> = {
    cyan:   { icon: 'text-cyan-400',   badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',     dot: 'bg-cyan-400',   border: 'border-cyan-500/60' },
    violet: { icon: 'text-violet-400', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400', border: 'border-violet-500/60' },
    amber:  { icon: 'text-amber-400',  badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   dot: 'bg-amber-400',  border: 'border-amber-500/60' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-violet-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Gestão P6</h2>
            <span className="text-[10px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
              Proteção 6
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Simulação de sessões com meta de 1% e até 6 níveis de proteção — selecione a estratégia base abaixo.
          </p>
        </div>
        {stats && (
          <div className="text-right">
            <p className={cn('text-2xl font-black tabular-nums', rateColor(stats.taxaNOS))}>
              {stats.taxaNOS.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Taxa NOS</p>
          </div>
        )}
      </div>

      {/* Seletor de estratégia */}
      <div className="grid grid-cols-3 gap-3">
        {ESTRATEGIAS.map(est => {
          const ativo = estrategia === est.id;
          const acc = accentClasses[est.cor];
          return (
            <button
              key={est.id}
              onClick={() => setEstrategia(est.id)}
              className={cn(
                'relative text-left p-4 rounded-2xl border transition-all',
                ativo
                  ? `${est.bordaAtiva} border-opacity-60`
                  : 'border-slate-700/40 bg-slate-900/60 hover:border-slate-600/60'
              )}
            >
              {ativo && (
                <div className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', acc.dot)} />
              )}
              <p className="text-xs font-black text-white mb-0.5">{est.label}</p>
              <p className="text-[10px] text-slate-500 mb-2">{est.subtitulo}</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md border', acc.badge)}>
                  {est.freq}
                </span>
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md border', acc.badge)}>
                  {est.exp}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuração */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuração do Backtest</p>

        {/* Ativo + Datas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Ativo</label>
            <select
              value={backtestAtivo}
              onChange={e => setBacktestAtivo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              {(ativosPadrao.length > 0 ? ativosPadrao : ['EUR/USD', 'GBP/USD', 'USD/JPY']).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Data Início</label>
            <input
              type="date"
              value={backtestDataInicio}
              onChange={e => setBacktestDataInicio(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Data Fim</label>
            <input
              type="date"
              value={backtestDataFim}
              onChange={e => setBacktestDataFim(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Horas + Banca + Payout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Hora Início</label>
            <input
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Hora Fim</label>
            <input
              type="time"
              value={horaFim}
              onChange={e => setHoraFim(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Banca (R$)</label>
            <input
              type="number"
              value={bancaInicial}
              min={10}
              step={100}
              onChange={e => setBancaInicial(Math.max(10, parseFloat(e.target.value) || 1000))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Payout (%)</label>
            <input
              type="number"
              value={payout}
              min={1}
              max={200}
              step={1}
              onChange={e => setPayout(Math.max(1, parseFloat(e.target.value) || 87))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Dias da semana */}
        <div>
          <label className="text-[10px] text-slate-500 mb-2 block uppercase tracking-wide">Dias da Semana</label>
          <div className="flex gap-2 flex-wrap">
            {NOMES_DIA.map((nome, d) => (
              <button
                key={d}
                onClick={() => toggleDia(d)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  diasSelecionados.includes(d)
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                )}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading / Progress */}
      {(backtestLoading || processando) && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-sm text-slate-400">
              {backtestLoading ? 'Carregando velas...' : `Processando sinais... ${progresso}%`}
            </p>
          </div>
          {!backtestLoading && (
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Sem dados */}
      {!backtestLoading && !processando && sinais.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-8 flex flex-col items-center gap-3 text-slate-500">
          <Shield size={32} className="opacity-30" />
          <p className="text-sm">Selecione um ativo e período para iniciar o backtest P6.</p>
        </div>
      )}

      {/* Resultados */}
      {stats && !processando && (
        <div className="space-y-4">
          {/* KPIs principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={cn('rounded-2xl border p-4 text-center', rateBg(stats.taxaNOS))}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Taxa NOS</p>
              <p className={cn('text-2xl font-black tabular-nums', rateColor(stats.taxaNOS))}>
                {stats.taxaNOS.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{stats.nosCount} NOS / {stats.missCount} MISS</p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">ROI</p>
              <p className={cn('text-2xl font-black tabular-nums', stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{stats.total} sessões</p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Banca Final</p>
              <p className={cn('text-lg font-black tabular-nums', stats.lucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                R$ {stats.bancaFinal.toFixed(2)}
              </p>
              <p className={cn('text-[10px] mt-0.5', stats.lucro >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {stats.lucro >= 0 ? '+' : ''}R$ {stats.lucro.toFixed(2)}
              </p>
            </div>
            <div className={cn('rounded-2xl border p-4 text-center', stats.riscoRuina ? 'bg-red-500/10 border-red-500/30' : 'border-slate-700/40 bg-slate-900/60')}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Max Drawdown</p>
              <p className="text-lg font-black tabular-nums text-red-400">
                R$ {stats.maiorDD.toFixed(2)}
              </p>
              {stats.riscoRuina && (
                <p className="text-[10px] text-red-400 mt-0.5 flex items-center justify-center gap-1">
                  <AlertTriangle size={10} /> Ruína detectada
                </p>
              )}
            </div>
          </div>

          {/* Win rate sinais + seq miss */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Win Rate dos Sinais</p>
              <p className={cn('text-xl font-black', rateColor(stats.winRateSinais))}>
                {stats.winRateSinais.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{stats.totalSinais} sinais totais</p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Maior Sequência MISS</p>
              <p className={cn('text-xl font-black', stats.maiorSeqMiss >= 4 ? 'text-red-400' : stats.maiorSeqMiss >= 2 ? 'text-amber-400' : 'text-emerald-400')}>
                {stats.maiorSeqMiss}x
              </p>
              <p className="text-[10px] text-slate-500 mt-1">consecutive misses</p>
            </div>
          </div>

          {/* Distribuição por nível */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Distribuição por Nível P6
            </p>
            <div className="grid grid-cols-7 gap-2">
              {(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'MISS'] as const).map(nivel => {
                const count = stats.nivelDist[nivel] ?? 0;
                const isMiss = nivel === 'MISS';
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={nivel} className="text-center">
                    <div className={cn(
                      'rounded-xl p-2 mb-1',
                      isMiss
                        ? 'bg-red-500/15 border border-red-500/25'
                        : nivel === 'L0'
                        ? 'bg-emerald-500/15 border border-emerald-500/25'
                        : 'bg-slate-800/80 border border-slate-700/40'
                    )}>
                      <p className={cn(
                        'text-lg font-black tabular-nums',
                        isMiss ? 'text-red-400' : nivel === 'L0' ? 'text-emerald-400' : 'text-amber-400'
                      )}>
                        {count}
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold">{nivel}</p>
                    <p className="text-[9px] text-slate-600">{pct.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evolução da banca */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Evolução da Banca
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.evolucaoBanca} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradBanca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={stats.lucro >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={stats.lucro >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Banca']}
                    labelFormatter={l => `Sessão ${l}`}
                  />
                  <ReferenceLine y={bancaInicial} stroke="#475569" strokeDasharray="4 2" />
                  <Area
                    type="monotone"
                    dataKey="banca"
                    stroke={stats.lucro >= 0 ? '#10b981' : '#ef4444'}
                    strokeWidth={2}
                    fill="url(#gradBanca)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawdown */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Drawdown por Sessão
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.evolucaoDD} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Drawdown']}
                    labelFormatter={l => `Sessão ${l}`}
                  />
                  <Bar dataKey="dd" radius={[2, 2, 0, 0]}>
                    {stats.evolucaoDD.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.dd > stats.maiorDD * 0.7 ? '#ef4444' : entry.dd > stats.maiorDD * 0.4 ? '#f59e0b' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance por faixa horária */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Performance por Faixa Horária
            </p>
            <div className="space-y-2">
              {FAIXAS.map(faixa => {
                const f = stats.porFaixa[faixa];
                if (!f || f.total === 0) return null;
                const rate = (f.nos / f.total) * 100;
                return (
                  <div key={faixa} className="flex items-center gap-3">
                    <p className="text-[10px] text-slate-400 w-36 shrink-0">{faixa}</p>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', rate >= 70 ? 'bg-emerald-500' : rate >= 55 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className={cn('text-[10px] font-bold w-10 text-right', rateColor(rate))}>
                      {rate.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-600 w-12 text-right">{f.nos}/{f.total}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance por dia da semana */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Performance por Dia da Semana
            </p>
            <div className="grid grid-cols-7 gap-2">
              {NOMES_DIA.map((nome, d) => {
                const dia = stats.porDia[d];
                if (!dia || dia.total === 0) {
                  return (
                    <div key={d} className="text-center">
                      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-2 mb-1">
                        <p className="text-sm font-black text-slate-600">—</p>
                      </div>
                      <p className="text-[9px] text-slate-600">{nome}</p>
                    </div>
                  );
                }
                const rate = (dia.nos / dia.total) * 100;
                return (
                  <div key={d} className="text-center">
                    <div className={cn(
                      'rounded-xl border p-2 mb-1',
                      rateBg(rate)
                    )}>
                      <p className={cn('text-sm font-black tabular-nums', rateColor(rate))}>
                        {rate.toFixed(0)}%
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold">{nome}</p>
                    <p className="text-[9px] text-slate-600">{dia.nos}/{dia.total}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimas 20 sessões */}
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Últimas Sessões
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...sessoesP6].reverse().slice(0, 50).map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs',
                    s.resultado === 'nos'
                      ? 'bg-emerald-500/8 border border-emerald-500/20'
                      : 'bg-red-500/8 border border-red-500/20'
                  )}
                >
                  <span className={cn(
                    'font-black w-8 shrink-0',
                    s.resultado === 'nos' ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {s.resultado === 'nos' ? 'NOS' : 'MISS'}
                  </span>
                  <span className="text-slate-400 flex-1">{s.hora}</span>
                  {s.resultado === 'nos' ? (
                    <span className="text-slate-500 text-[10px]">L{s.nivelConcluido}</span>
                  ) : (
                    <span className="text-slate-600 text-[10px]">{s.entradasUsadas.length} níveis</span>
                  )}
                  <span className={cn(
                    'font-bold tabular-nums text-[11px]',
                    s.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {s.lucroLiquido >= 0 ? '+' : ''}R${s.lucroLiquido.toFixed(2)}
                  </span>
                  <ChevronRight size={12} className="text-slate-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
