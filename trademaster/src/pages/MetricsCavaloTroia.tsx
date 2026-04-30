import React from 'react';
import { cn } from '../lib/utils';
import { Loader2, TrendingUp, TrendingDown, BarChart3, List, DollarSign, AlertTriangle, Activity } from 'lucide-react';
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
import { servicoVelas as servicoVelasType } from '../lib/websocket-velas';

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

interface ResultadoCT {
  hora: string;
  janela: string;        // "HH:00", "HH:20" ou "HH:40"
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  resultado_g1: 'vitoria' | 'derrota' | 'na';
  resultado_g2: 'vitoria' | 'derrota' | 'na';
  confianca: number;
  vela_referencia: number; // 11 ou 10
  timestamp: number;
}

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Janelas: entrada ocorre em :22, :42, :02 → correspondentes a :00, :20, :40
const JANELA_LABELS = [':00 (entrada :22)', ':20 (entrada :42)', ':40 (entrada +1h:02)'];
const CHUNK_SIZE = 1000;

function getFaixa(hora: number): string {
  if (hora < 6) return 'Madrugada (00-06)';
  if (hora < 12) return 'Manhã (06-12)';
  if (hora < 18) return 'Tarde (12-18)';
  return 'Noite (18-00)';
}

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

function ehDoji(abertura: number, fechamento: number, maxima: number, minima: number): boolean {
  const corpo = Math.abs(fechamento - abertura);
  const range = maxima - minima;
  if (range === 0) return true;
  return corpo / range < 0.1;
}

function simularFinanceiro(
  resultados: ResultadoCT[],
  maxGale: 0 | 1 | 2,
  valorEntrada: number,
  payout: number,
  multiplicador: number,
  bancaInicial: number
): { lucroTotal: number; bancaFinal: number; roi: number } {
  const ganhoBase = valorEntrada * (payout / 100);
  let saldo = bancaInicial;
  const ops = [...resultados].sort((a, b) => a.timestamp - b.timestamp);
  for (const op of ops) {
    if (op.resultado === 'vitoria') {
      saldo += ganhoBase;
    } else {
      saldo -= valorEntrada;
      if (maxGale >= 1 && op.resultado_g1 !== 'na') {
        const g1 = valorEntrada * multiplicador;
        if (op.resultado_g1 === 'vitoria') {
          saldo += g1 * (payout / 100);
        } else {
          saldo -= g1;
          if (maxGale >= 2 && op.resultado_g2 !== 'na') {
            const g2 = g1 * multiplicador;
            if (op.resultado_g2 === 'vitoria') { saldo += g2 * (payout / 100); }
            else { saldo -= g2; }
          }
        }
      }
    }
    if (saldo < 0) saldo = 0;
  }
  const lucroTotal = saldo - bancaInicial;
  return { lucroTotal, bancaFinal: saldo, roi: bancaInicial > 0 ? (lucroTotal / bancaInicial) * 100 : 0 };
}

// Determina qual janela (:00, :20, :40) gerou a entrada nesse minuto
function minutoParaJanela(horas: number, minuto: number): string {
  if (minuto === 2) {
    const hPrev = (horas - 1 + 24) % 24;
    return `${hPrev.toString().padStart(2, '0')}:40`;
  }
  if (minuto === 22) return `${horas.toString().padStart(2, '0')}:00`;
  return `${horas.toString().padStart(2, '0')}:20`; // minuto === 42
}

// Identifica o tipo de janela (:00, :20, :40) para agrupamento
function tipoJanela(janela: string): ':00' | ':20' | ':40' {
  const minPart = janela.slice(3);
  if (minPart === '00') return ':00';
  if (minPart === '20') return ':20';
  return ':40';
}

export default function MetricsCavaloTroiaContent({
  backtestAtivo, setBacktestAtivo,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas, backtestLoading, ativosPadrao,
}: Props) {
  const [subTab, setSubTab] = React.useState<'lista' | 'estatisticas' | 'janelas' | 'drawdown' | 'lucro' | 'gale'>('lista');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [valorEntrada, setValorEntrada] = React.useState(20);
  const [payout, setPayout] = React.useState(87);
  const [bancaInicial, setBancaInicial] = React.useState(1000);
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [maxGale, setMaxGale] = React.useState<0 | 1 | 2>(0);
  const [multiplicador, setMultiplicador] = React.useState(2.0);

  const [resultados, setResultados] = React.useState<ResultadoCT[]>([]);
  const [processando, setProcessando] = React.useState(false);
  const [progresso, setProgresso] = React.useState(0);

  // Backtest: encontrar posições de entrada (minuto % 20 == 2 → :02, :22, :42)
  // Para cada entrada:
  //   - Vela M2-11 = M1[min-2] + M1[min-1]  (as 2 M1 imediatamente antes)
  //   - Direção = cor da M2-11 (ou M2-10 se doji)
  //   - Resultado = cor da M2-12 = M1[min] + M1[min+1]
  React.useEffect(() => {
    if (!backtestVelas || backtestVelas.length < 30 || !backtestDataInicio || !backtestDataFim || backtestLoading) {
      setResultados([]);
      setProcessando(false);
      return;
    }

    setProcessando(true);
    setProgresso(0);
    let cancelado = false;

    const res: ResultadoCT[] = [];
    const tsMap = new Map<number, any>();
    backtestVelas.forEach((v: any) => { if (v) tsMap.set(v.timestamp, v); });

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + mI;
    const totalMinF = hF * 60 + mF;
    const cruzaMeiaNoite = totalMinI > totalMinF;

    // Processar apenas candles onde minuto % 20 == 2 (momentos de entrada)
    const startIdx = 4;
    const endIdx = backtestVelas.length - 3;
    let idx = startIdx;

    function processarChunk() {
      if (cancelado) return;
      const chunkEnd = Math.min(idx + CHUNK_SIZE, endIdx);

      for (; idx < chunkEnd; idx++) {
        const vAtual = backtestVelas[idx];
        if (!vAtual) continue;

        const d = new Date(vAtual.timestamp * 1000);
        const minuto = d.getMinutes();
        const horas = d.getHours();

        // Apenas minutos de entrada: 2, 22, 42
        if (minuto !== 2 && minuto !== 22 && minuto !== 42) continue;
        if (!diasSelecionados.includes(d.getDay())) continue;

        const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        if (localStr < backtestDataInicio || localStr > backtestDataFim) continue;

        const totalMin = horas * 60 + minuto;
        if (cruzaMeiaNoite) {
          if (totalMin < totalMinI && totalMin > totalMinF) continue;
        } else {
          if (totalMin < totalMinI || totalMin > totalMinF) continue;
        }

        // M2-11: M1 candles em timestamp-120 e timestamp-60
        const ts11a = vAtual.timestamp - 120;
        const ts11b = vAtual.timestamp - 60;
        const v11a = tsMap.get(ts11a);
        const v11b = tsMap.get(ts11b);
        if (!v11a || !v11b) continue;

        // M2-12 (resultado): M1 candles em timestamp e timestamp+60
        const v12a = tsMap.get(vAtual.timestamp);
        const v12b = tsMap.get(vAtual.timestamp + 60);
        if (!v12a || !v12b) continue;

        // Cor da M2-11
        const ab11 = v11a.abertura;
        const fc11 = v11b.fechamento;
        const mx11 = Math.max(v11a.maxima, v11b.maxima);
        const mn11 = Math.min(v11a.minima, v11b.minima);
        const doji11 = ehDoji(ab11, fc11, mx11, mn11);

        let direcao: 'compra' | 'venda';
        let vela_referencia = 11;
        let confianca = 80;

        if (!doji11) {
          direcao = fc11 > ab11 ? 'compra' : 'venda';
        } else {
          // Fallback para M2-10: timestamp-240 e timestamp-180
          const v10a = tsMap.get(vAtual.timestamp - 240);
          const v10b = tsMap.get(vAtual.timestamp - 180);
          if (!v10a || !v10b) continue;

          const ab10 = v10a.abertura;
          const fc10 = v10b.fechamento;
          const mx10 = Math.max(v10a.maxima, v10b.maxima);
          const mn10 = Math.min(v10a.minima, v10b.minima);
          if (ehDoji(ab10, fc10, mx10, mn10)) continue; // ambas doji → pula

          direcao = fc10 > ab10 ? 'compra' : 'venda';
          vela_referencia = 10;
          confianca = 70;
        }

        // Resultado: cor da M2-12
        const ab12 = v12a.abertura;
        const fc12 = v12b.fechamento;
        const winBase = (direcao === 'compra' && fc12 > ab12) || (direcao === 'venda' && fc12 < ab12);
        const resultado: 'vitoria' | 'derrota' = winBase ? 'vitoria' : 'derrota';

        // G1: próxima M2 (timestamp+120 e timestamp+180)
        let resultado_g1: 'vitoria' | 'derrota' | 'na' = 'na';
        if (resultado === 'derrota') {
          const vg1a = tsMap.get(vAtual.timestamp + 120);
          const vg1b = tsMap.get(vAtual.timestamp + 180);
          if (vg1a && vg1b) {
            const winG1 = (direcao === 'compra' && vg1b.fechamento > vg1a.abertura) || (direcao === 'venda' && vg1b.fechamento < vg1a.abertura);
            resultado_g1 = winG1 ? 'vitoria' : 'derrota';
          }
        }

        // G2: próxima M2 após G1 (timestamp+240 e timestamp+300)
        let resultado_g2: 'vitoria' | 'derrota' | 'na' = 'na';
        if (resultado_g1 === 'derrota') {
          const vg2a = tsMap.get(vAtual.timestamp + 240);
          const vg2b = tsMap.get(vAtual.timestamp + 300);
          if (vg2a && vg2b) {
            const winG2 = (direcao === 'compra' && vg2b.fechamento > vg2a.abertura) || (direcao === 'venda' && vg2b.fechamento < vg2a.abertura);
            resultado_g2 = winG2 ? 'vitoria' : 'derrota';
          }
        }

        const janela = minutoParaJanela(horas, minuto);
        res.push({
          hora: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${horas.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`,
          janela,
          direcao,
          resultado,
          resultado_g1,
          resultado_g2,
          confianca,
          vela_referencia,
          timestamp: vAtual.timestamp,
        });
      }

      if (cancelado) return;
      setProgresso(Math.round(((idx - startIdx) / (endIdx - startIdx)) * 100));

      if (idx < endIdx) {
        setTimeout(processarChunk, 0);
      } else {
        setResultados([...res]);
        setProcessando(false);
      }
    }

    processarChunk();
    return () => { cancelado = true; };
  }, [backtestVelas, backtestDataInicio, backtestDataFim, horaInicio, horaFim, diasSelecionados, backtestLoading]);

  const stats = React.useMemo(() => {
    const total = resultados.length;
    const wins = resultados.filter(r => r.resultado === 'vitoria').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    let winsComG1 = 0, winsComG2 = 0;
    resultados.forEach(r => {
      if (r.resultado === 'vitoria') { winsComG1++; winsComG2++; }
      else if (r.resultado_g1 === 'vitoria') { winsComG1++; winsComG2++; }
      else if (r.resultado_g2 === 'vitoria') winsComG2++;
    });
    const winRateG1 = total > 0 ? (winsComG1 / total) * 100 : 0;
    const winRateG2 = total > 0 ? (winsComG2 / total) * 100 : 0;

    const porDirecao: Record<string, Stat> = { compra: { total: 0, wins: 0 }, venda: { total: 0, wins: 0 } };
    const porHora: Record<number, Stat> = {};
    for (let i = 0; i < 24; i++) porHora[i] = { total: 0, wins: 0 };
    const porFaixa: Record<string, Stat> = {
      'Madrugada (00-06)': { total: 0, wins: 0 }, 'Manhã (06-12)': { total: 0, wins: 0 },
      'Tarde (12-18)': { total: 0, wins: 0 }, 'Noite (18-00)': { total: 0, wins: 0 },
    };
    const porDia: Record<number, Stat> = {};
    for (let i = 0; i < 7; i++) porDia[i] = { total: 0, wins: 0 };
    const porJanela: Record<':00' | ':20' | ':40', Stat> = {
      ':00': { total: 0, wins: 0 },
      ':20': { total: 0, wins: 0 },
      ':40': { total: 0, wins: 0 },
    };

    resultados.forEach(r => {
      const isWin = r.resultado === 'vitoria';
      const d = new Date(r.timestamp * 1000);
      const hora = d.getHours();
      const dia = d.getDay();

      porDirecao[r.direcao].total++; if (isWin) porDirecao[r.direcao].wins++;
      porHora[hora].total++; if (isWin) porHora[hora].wins++;
      const faixa = getFaixa(hora);
      porFaixa[faixa].total++; if (isWin) porFaixa[faixa].wins++;
      porDia[dia].total++; if (isWin) porDia[dia].wins++;
      const tj = tipoJanela(r.janela);
      porJanela[tj].total++; if (isWin) porJanela[tj].wins++;
    });

    const goldenHours = (Object.entries(porHora) as [string, Stat][])
      .filter(([_, s]) => s.total >= 2 && (s.wins / s.total) * 100 >= 60)
      .map(([h, s]) => ({ hora: Number(h), rate: Number(((s.wins / s.total) * 100).toFixed(1)), total: s.total }))
      .sort((a, b) => b.rate - a.rate);

    const horas24 = Array.from({ length: 24 }, (_, i) => {
      const s = porHora[i];
      const rate = s && s.total >= 2 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0;
      return { hora: `${i}h`, rate, total: s?.total || 0, wins: s?.wins || 0, isGolden: rate >= 60 && (s?.total || 0) >= 2 };
    });

    return { total, wins, winRate, winsComG1, winRateG1, winsComG2, winRateG2, porDirecao, porHora, porFaixa, porDia, porJanela, goldenHours, horas24 };
  }, [resultados]);

  const simulacao = React.useMemo(() => {
    if (resultados.length === 0) return {
      pontos: [] as { idx: number; saldo: number; hora: string; drawdown: number }[],
      bancaFinal: bancaInicial, roi: 0, maiorRebaixamento: 0, maiorSeqLoss: 0,
      riscoRuina: false, fatorSeguranca: 0, lucroTotal: 0,
    };

    const opsOrdenadas = [...resultados].sort((a, b) => a.timestamp - b.timestamp);
    let saldo = bancaInicial;
    let saldoPico = bancaInicial;
    let maiorRebaixamento = 0;
    let seqLoss = 0;
    let maiorSeqLoss = 0;
    let riscoRuina = false;
    const ganhoBase = valorEntrada * (payout / 100);

    const pontos: { idx: number; saldo: number; hora: string; drawdown: number }[] = [
      { idx: 0, saldo: bancaInicial, hora: '', drawdown: 0 }
    ];

    opsOrdenadas.forEach((op, i) => {
      if (op.resultado === 'vitoria') {
        saldo += ganhoBase; seqLoss = 0;
      } else {
        saldo -= valorEntrada; seqLoss++;
        if (maxGale >= 1 && op.resultado_g1 !== 'na') {
          const g1 = valorEntrada * multiplicador;
          if (op.resultado_g1 === 'vitoria') { saldo += g1 * (payout / 100); seqLoss = 0; }
          else {
            saldo -= g1; seqLoss++;
            if (maxGale >= 2 && op.resultado_g2 !== 'na') {
              const g2 = g1 * multiplicador;
              if (op.resultado_g2 === 'vitoria') { saldo += g2 * (payout / 100); seqLoss = 0; }
              else { saldo -= g2; seqLoss++; }
            }
          }
        }
      }
      if (saldo <= 0) { saldo = 0; riscoRuina = true; }
      if (saldo > saldoPico) saldoPico = saldo;
      const dd = saldoPico - saldo;
      if (dd > maiorRebaixamento) maiorRebaixamento = dd;
      if (seqLoss > maiorSeqLoss) maiorSeqLoss = seqLoss;
      pontos.push({ idx: i + 1, saldo, hora: op.hora, drawdown: dd });
    });

    const lucroTotal = saldo - bancaInicial;
    const roi = bancaInicial > 0 ? (lucroTotal / bancaInicial) * 100 : 0;
    const fatorSeguranca = maiorRebaixamento > 0 ? bancaInicial / maiorRebaixamento : 99;
    return { pontos, bancaFinal: saldo, roi, maiorRebaixamento, maiorSeqLoss, riscoRuina, fatorSeguranca, lucroTotal };
  }, [resultados, bancaInicial, valorEntrada, payout, maxGale, multiplicador]);

  const cenarios = React.useMemo(() => {
    if (resultados.length === 0) return null;
    return ([0, 1, 2] as const).map(g => simularFinanceiro(resultados, g, valorEntrada, payout, multiplicador, bancaInicial));
  }, [resultados, valorEntrada, payout, multiplicador, bancaInicial]);

  const toggleDia = (d: number) => setDiasSelecionados(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const TABS = [
    { key: 'lista', label: 'Lista', icon: <List size={13} /> },
    { key: 'estatisticas', label: 'Estatísticas', icon: <BarChart3 size={13} /> },
    { key: 'janelas', label: 'Janelas', icon: <Activity size={13} /> },
    { key: 'drawdown', label: 'Drawdown', icon: <AlertTriangle size={13} /> },
    { key: 'lucro', label: 'Lucro', icon: <DollarSign size={13} /> },
    { key: 'gale', label: 'Proteção', icon: <AlertTriangle size={13} /> },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Filtros — Cavalo de Troia (M2, 20min)</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ativo</label>
            <select value={backtestAtivo} onChange={e => setBacktestAtivo(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs">
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
            <label className="text-xs text-slate-400 mb-1 block">Valor Entrada (R$)</label>
            <input type="number" min={1} value={valorEntrada} onChange={e => setValorEntrada(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Payout (%)</label>
            <input type="number" min={50} max={100} value={payout} onChange={e => setPayout(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Banca Inicial (R$)</label>
            <input type="number" min={100} value={bancaInicial} onChange={e => setBancaInicial(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Máx. Proteção</label>
            <select value={maxGale} onChange={e => setMaxGale(Number(e.target.value) as 0 | 1 | 2)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs">
              <option value={0}>Sem Proteção</option>
              <option value={1}>Proteção 1</option>
              <option value={2}>Proteção 2</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Multiplicador Proteção</label>
            <input type="number" min={1.5} max={3} step={0.1} value={multiplicador} onChange={e => setMultiplicador(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg text-white text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Dias da Semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {NOMES_DIA.map((nome, i) => (
              <button key={i} onClick={() => toggleDia(i)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  diasSelecionados.includes(i) ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-slate-800/40 border-white/5 text-slate-500')}>
                {nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progresso */}
      {(processando || backtestLoading) && (
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin text-orange-400" />
          {backtestLoading ? 'Carregando velas...' : `Processando backtest Cavalo de Troia... ${progresso}%`}
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      {/* Resumo */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Win Rate (base)</p>
            <p className={cn('text-2xl font-black', stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-amber-400' : 'text-red-400')}>
              {stats.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Win Rate (P1)</p>
            <p className={cn('text-2xl font-black', stats.winRateG1 >= 60 ? 'text-emerald-400' : stats.winRateG1 >= 50 ? 'text-amber-400' : 'text-red-400')}>
              {stats.winRateG1.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Win Rate (P1+P2)</p>
            <p className={cn('text-2xl font-black', stats.winRateG2 >= 60 ? 'text-emerald-400' : stats.winRateG2 >= 50 ? 'text-amber-400' : 'text-red-400')}>
              {stats.winRateG2.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Lucro Total</p>
            <p className={cn('text-2xl font-black', simulacao.lucroTotal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {simulacao.lucroTotal >= 0 ? '+' : ''}R${simulacao.lucroTotal.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      {stats.total > 0 && (
        <>
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key as any)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  subTab === t.key ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-slate-500 hover:text-white')}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          {subTab === 'lista' && (
            <div className="bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/60 sticky top-0">
                    <tr>
                      {['Data/Hora', 'Janela', 'Ref', 'Direção', 'Base', 'P1', 'P2'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-400 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...resultados].reverse().slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/3">
                        <td className="px-3 py-1.5 text-slate-400 font-mono">{r.hora}</td>
                        <td className="px-3 py-1.5 text-orange-300 font-bold text-[10px]">{r.janela}</td>
                        <td className="px-3 py-1.5 text-slate-500 text-[10px]">V{r.vela_referencia}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn('flex items-center gap-1 font-semibold', r.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                            {r.direcao === 'compra' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {r.direcao === 'compra' ? 'COMPRA' : 'VENDA'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', r.resultado === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                            {r.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {r.resultado_g1 !== 'na' ? (
                            <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', r.resultado_g1 === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                              {r.resultado_g1 === 'vitoria' ? 'WIN' : 'LOSS'}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.resultado_g2 !== 'na' ? (
                            <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', r.resultado_g2 === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                              {r.resultado_g2 === 'vitoria' ? 'WIN' : 'LOSS'}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Estatísticas */}
          {subTab === 'estatisticas' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Direção</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Compra" total={stats.porDirecao.compra.total} wins={stats.porDirecao.compra.wins} />
                  <StatCard label="Venda" total={stats.porDirecao.venda.total} wins={stats.porDirecao.venda.wins} />
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Período do Dia</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(stats.porFaixa) as [string, Stat][]).map(([faixa, s]) => (
                    <StatCard key={faixa} label={faixa} total={s.total} wins={s.wins} />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Dia da Semana</p>
                <div className="grid grid-cols-7 gap-2">
                  {NOMES_DIA.map((nome, i) => (
                    <StatCard key={i} label={nome} total={stats.porDia[i].total} wins={stats.porDia[i].wins} />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Hora (24h)</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={stats.horas24} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 100]} />
                      <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: 8 }}
                        formatter={(v: any, _: any, p: any) => [`${v}% (${p.payload.wins}/${p.payload.total})`, 'Win Rate']} />
                      <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" />
                      <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                        {stats.horas24.map((entry, index) => (
                          <Cell key={index} fill={entry.isGolden ? '#22c55e' : entry.rate >= 50 ? '#eab308' : '#ef4444'} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {stats.goldenHours.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">Horas Douradas (≥60% win, ≥2 ops)</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.goldenHours.map(h => (
                      <div key={h.hora} className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-center">
                        <p className="text-emerald-300 font-black text-sm">{h.hora}h</p>
                        <p className="text-emerald-400 text-xs">{h.rate}% ({h.total} ops)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Janelas */}
          {subTab === 'janelas' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Win Rate por Janela de 20min</p>
                <div className="grid grid-cols-3 gap-4">
                  {([':00', ':20', ':40'] as const).map((tj, i) => {
                    const s = stats.porJanela[tj];
                    const rate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
                    return (
                      <div key={tj} className={cn('rounded-xl p-4 text-center border',
                        rate >= 60 ? 'bg-emerald-500/10 border-emerald-500/20' : rate >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20')}>
                        <p className="text-xs font-bold text-slate-300">{JANELA_LABELS[i]}</p>
                        <p className={cn('text-3xl font-black mt-2', rate >= 60 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400')}>
                          {s.total > 0 ? `${rate.toFixed(1)}%` : '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{s.wins}W / {s.total - s.wins}L ({s.total} ops)</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Gráfico por Janela</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      data={([':00', ':20', ':40'] as const).map(tj => {
                        const s = stats.porJanela[tj];
                        const rate = s.total > 0 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0;
                        return { janela: `Janela ${tj}`, rate, total: s.total, wins: s.wins };
                      })}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="janela" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 100]} />
                      <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: 8 }}
                        formatter={(v: any, _: any, p: any) => [`${v}% (${p.payload.wins}/${p.payload.total})`, 'Win Rate']} />
                      <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {([':00', ':20', ':40'] as const).map((tj, i) => {
                          const s = stats.porJanela[tj];
                          const rate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
                          return <Cell key={i} fill={rate >= 60 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444'} fillOpacity={0.7} />;
                        })}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Drawdown */}
          {subTab === 'drawdown' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Maior Rebaixamento</p>
                  <p className="text-xl font-black text-red-400">R${simulacao.maiorRebaixamento.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Fator de Segurança</p>
                  <p className={cn('text-xl font-black', simulacao.fatorSeguranca >= 5 ? 'text-emerald-400' : simulacao.fatorSeguranca >= 3 ? 'text-amber-400' : 'text-red-400')}>
                    {simulacao.fatorSeguranca >= 99 ? '∞' : simulacao.fatorSeguranca.toFixed(1)}x
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Maior Seq. Perdas</p>
                  <p className="text-xl font-black text-amber-400">{simulacao.maiorSeqLoss}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Risco de Ruína</p>
                  <p className={cn('text-xl font-black', simulacao.riscoRuina ? 'text-red-400' : 'text-emerald-400')}>
                    {simulacao.riscoRuina ? 'SIM' : 'NÃO'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Drawdown por Operação</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulacao.pontos} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: 8 }}
                        formatter={(v: any) => [`R$${Number(v).toFixed(2)}`, 'Drawdown']} />
                      <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Lucro */}
          {subTab === 'lucro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Banca Final</p>
                  <p className={cn('text-2xl font-black', simulacao.bancaFinal >= bancaInicial ? 'text-emerald-400' : 'text-red-400')}>
                    R${simulacao.bancaFinal.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Lucro Total</p>
                  <p className={cn('text-2xl font-black', simulacao.lucroTotal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {simulacao.lucroTotal >= 0 ? '+' : ''}R${simulacao.lucroTotal.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">ROI</p>
                  <p className={cn('text-2xl font-black', simulacao.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {simulacao.roi >= 0 ? '+' : ''}{simulacao.roi.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Curva de Banca</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulacao.pontos} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: 8 }}
                        formatter={(v: any) => [`R$${Number(v).toFixed(2)}`, 'Saldo']} />
                      <ReferenceLine y={bancaInicial} stroke="#64748b" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="saldo" stroke="#f97316" fill="#f9731620" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Proteção */}
          {subTab === 'gale' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-orange-400 mb-3 uppercase tracking-wider">Análise de Proteção — Cavalo de Troia</p>
                <p className="text-xs text-slate-400 mb-4">
                  Na estratégia Cavalo de Troia a Proteção entra na <strong className="text-white">próxima vela M2 (2 minutos)</strong> após o resultado.
                  P1 = M2 seguinte ao resultado | P2 = M2 após o P1.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Sem Proteção</p>
                    <p className={cn('text-3xl font-black', stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.wins}W / {stats.total - stats.wins}L</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Com P1 (M2 seguinte)</p>
                    <p className={cn('text-3xl font-black', stats.winRateG1 >= 60 ? 'text-emerald-400' : stats.winRateG1 >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRateG1.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.winsComG1}W / {stats.total - stats.winsComG1}L</p>
                    <p className="text-xs text-slate-600 mt-1">P1 acionado: {resultados.filter(r => r.resultado_g1 !== 'na').length}x</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Com P1+P2</p>
                    <p className={cn('text-3xl font-black', stats.winRateG2 >= 60 ? 'text-emerald-400' : stats.winRateG2 >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRateG2.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.winsComG2}W / {stats.total - stats.winsComG2}L</p>
                    <p className="text-xs text-slate-600 mt-1">P2 acionado: {resultados.filter(r => r.resultado_g2 !== 'na').length}x</p>
                  </div>
                </div>

                {cenarios && (
                  <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-white/5">
                    <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                      Simulação — R${valorEntrada} entrada | {payout}% payout | Banca R${bancaInicial}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(['Sem Proteção', 'Com P1', 'Com P1+P2'] as const).map((label, i) => {
                        const c = cenarios[i];
                        return (
                          <div key={i} className="bg-slate-900/60 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                            <p className={cn('text-xl font-black', c.lucroTotal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {c.lucroTotal >= 0 ? '+' : ''}R${c.lucroTotal.toFixed(2)}
                            </p>
                            <p className={cn('text-xs mt-1', c.roi >= 0 ? 'text-emerald-400/70' : 'text-red-400/70')}>
                              {c.roi >= 0 ? '+' : ''}{c.roi.toFixed(1)}% ROI
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">Banca: R${c.bancaFinal.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold text-slate-400 mb-3">Distribuição de Perdas Consecutivas (base)</p>
                  {(() => {
                    const seqs: Record<number, number> = {};
                    let seq = 0;
                    [...resultados].sort((a, b) => a.timestamp - b.timestamp).forEach(r => {
                      if (r.resultado === 'derrota') { seq++; }
                      else { if (seq > 0) { seqs[seq] = (seqs[seq] || 0) + 1; seq = 0; } }
                    });
                    if (seq > 0) seqs[seq] = (seqs[seq] || 0) + 1;
                    const maxSeq = Math.max(...Object.keys(seqs).map(Number), 0);
                    if (maxSeq === 0) return <p className="text-xs text-slate-500">Sem sequências de perda</p>;
                    return (
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: maxSeq }, (_, i) => i + 1).map(n => (
                          <div key={n} className="bg-slate-700/40 rounded-lg px-3 py-1.5 text-center min-w-[50px]">
                            <p className="text-[10px] text-slate-500">{n} perda{n > 1 ? 's' : ''}</p>
                            <p className="text-sm font-bold text-amber-400">{seqs[n] || 0}x</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!processando && !backtestLoading && stats.total === 0 && backtestVelas.length > 0 && (
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Nenhum resultado encontrado para os filtros selecionados.</p>
          <p className="text-slate-600 text-xs mt-1">Ajuste o range de datas ou horários.</p>
        </div>
      )}
    </div>
  );
}
