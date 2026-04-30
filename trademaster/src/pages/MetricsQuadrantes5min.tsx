import React from 'react';
import { cn } from '../lib/utils';
import { servicoVelas as servicoVelasType } from '../lib/websocket-velas';
import { Loader2, TrendingUp, TrendingDown, BarChart3, List, DollarSign, AlertTriangle, Activity, Grid } from 'lucide-react';
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
  resultado_g1: 'vitoria' | 'derrota' | 'na';
  resultado_g2: 'vitoria' | 'derrota' | 'na';
  confianca: number;
  quadrante: number;
  ultima_vela_cor: 'alta' | 'baixa';
  timestamp: number;
}

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const QUADRANTE_LABELS = ['Q1\n00-04','Q2\n05-09','Q3\n10-14','Q4\n15-19','Q5\n20-24','Q6\n25-29','Q7\n30-34','Q8\n35-39','Q9\n40-44','Q10\n45-49','Q11\n50-54','Q12\n55-59'];

function getFaixa(hora: number): string {
  if (hora < 6) return 'Madrugada (00-06)';
  if (hora < 12) return 'Manhã (06-12)';
  if (hora < 18) return 'Tarde (12-18)';
  return 'Noite (18-00)';
}

const CHUNK_SIZE = 1000;

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

function simularFinanceiro(
  resultados: ResultadoBacktest[],
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

export default function MetricsQuadrantes5minContent({
  backtestAtivo, setBacktestAtivo,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas, backtestLoading, ativosPadrao,
}: Props) {
  const [subTab, setSubTab] = React.useState<'lista' | 'estatisticas' | 'quadrantes' | 'drawdown' | 'lucro' | 'gale'>('lista');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [valorEntrada, setValorEntrada] = React.useState(20);
  const [payout, setPayout] = React.useState(87);
  const [bancaInicial, setBancaInicial] = React.useState(1000);
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [maxGale, setMaxGale] = React.useState<0 | 1 | 2>(2);
  const [multiplicador, setMultiplicador] = React.useState(2.0);

  const [backtestResultados, setBacktestResultados] = React.useState<ResultadoBacktest[]>([]);
  const [processando, setProcessando] = React.useState(false);
  const [progresso, setProgresso] = React.useState(0);

  // Backtest: agrupar velas M1 em blocos de 5 minutos
  React.useEffect(() => {
    if (!backtestVelas || backtestVelas.length < 6 || !backtestDataInicio || !backtestDataFim || backtestLoading) {
      setBacktestResultados([]);
      setProcessando(false);
      return;
    }

    setProcessando(true);
    setProgresso(0);
    let cancelado = false;

    const resultados: ResultadoBacktest[] = [];

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + mI;
    const totalMinF = hF * 60 + mF;
    const cruzaMeiaNoite = totalMinI > totalMinF;

    // Map timestamp → vela para lookups rápidos
    const tsMap = new Map<number, any>();
    backtestVelas.forEach((v: any) => { if (v) tsMap.set(v.timestamp, v); });

    // Só processar velas onde minuto % 5 == 4 (última vela do quadrante)
    // Precisamos de pelo menos 1 vela seguinte para resultado
    const startIdx = 5;
    const endIdx = backtestVelas.length - 3; // buffer para G1/G2
    let idx = startIdx;

    function processarChunk() {
      if (cancelado) return;
      const chunkEnd = Math.min(idx + CHUNK_SIZE, endIdx);

      for (; idx < chunkEnd; idx++) {
        const velaAtual = backtestVelas[idx];
        if (!velaAtual || !velaAtual.cor) continue;

        const d = new Date(velaAtual.timestamp * 1000);
        const minuto = d.getMinutes();

        // Só processar últimas velas de quadrante (minutos 4,9,14,19,24,29,34,39,44,49,54,59)
        if (minuto % 5 !== 4) continue;

        if (!diasSelecionados.includes(d.getDay())) continue;

        const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        if (localStr < backtestDataInicio || localStr > backtestDataFim) continue;

        const totalMin = d.getHours() * 60 + minuto;
        if (cruzaMeiaNoite) {
          if (totalMin < totalMinI && totalMin > totalMinF) continue;
        } else {
          if (totalMin < totalMinI || totalMin > totalMinF) continue;
        }

        // Buscar as 5 velas do quadrante (incluindo a atual) para calcular confiança
        const inicioMinuto = minuto - 4;
        const horaAlvo = d.getHours();
        let totalAlta = 0, totalBaixa = 0;
        for (let j = Math.max(0, idx - 4); j <= idx; j++) {
          const v = backtestVelas[j];
          if (!v || !v.cor) continue;
          const dv = new Date(v.timestamp * 1000);
          if (dv.getHours() === horaAlvo && dv.getMinutes() >= inicioMinuto && dv.getMinutes() <= minuto) {
            if (v.cor === 'alta') totalAlta++;
            else totalBaixa++;
          }
        }

        const ultima_vela_cor = velaAtual.cor as 'alta' | 'baixa';
        const direcao: 'compra' | 'venda' = ultima_vela_cor === 'alta' ? 'compra' : 'venda';
        const concordam = ultima_vela_cor === 'alta' ? totalAlta : totalBaixa;
        const totalVelas = totalAlta + totalBaixa;
        const confianca = totalVelas > 0 ? Math.round((concordam / totalVelas) * 100) : 50;

        const quadrante = Math.floor(minuto / 5) + 1; // 1-12

        // Resultado base: próxima vela M1 (T+60)
        const proximaVela = tsMap.get(velaAtual.timestamp + 60);
        if (!proximaVela || !proximaVela.cor) continue;

        const winBase = (direcao === 'compra' && proximaVela.cor === 'alta') ||
                        (direcao === 'venda' && proximaVela.cor === 'baixa');
        const resultado: 'vitoria' | 'derrota' = winBase ? 'vitoria' : 'derrota';

        // G1: próxima M1 após o resultado (T+120)
        let resultado_g1: 'vitoria' | 'derrota' | 'na' = 'na';
        if (resultado === 'derrota') {
          const velaG1 = tsMap.get(velaAtual.timestamp + 120);
          if (velaG1 && velaG1.cor) {
            const winG1 = (direcao === 'compra' && velaG1.cor === 'alta') ||
                          (direcao === 'venda' && velaG1.cor === 'baixa');
            resultado_g1 = winG1 ? 'vitoria' : 'derrota';
          }
        }

        // G2: próxima M1 após G1 (T+180)
        let resultado_g2: 'vitoria' | 'derrota' | 'na' = 'na';
        if (resultado_g1 === 'derrota') {
          const velaG2 = tsMap.get(velaAtual.timestamp + 180);
          if (velaG2 && velaG2.cor) {
            const winG2 = (direcao === 'compra' && velaG2.cor === 'alta') ||
                          (direcao === 'venda' && velaG2.cor === 'baixa');
            resultado_g2 = winG2 ? 'vitoria' : 'derrota';
          }
        }

        resultados.push({
          hora: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`,
          direcao,
          resultado,
          resultado_g1,
          resultado_g2,
          confianca,
          quadrante,
          ultima_vela_cor,
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
  }, [backtestVelas, backtestDataInicio, backtestDataFim, horaInicio, horaFim, diasSelecionados, backtestLoading]);

  // Estatísticas
  const stats = React.useMemo(() => {
    const total = backtestResultados.length;
    const wins = backtestResultados.filter(r => r.resultado === 'vitoria').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Win rate considerando gale
    let winsComG1 = 0, winsComG2 = 0;
    backtestResultados.forEach(r => {
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
    const porQuadrante: Record<number, Stat> = {};
    for (let i = 1; i <= 12; i++) porQuadrante[i] = { total: 0, wins: 0 };

    backtestResultados.forEach(r => {
      const isWin = r.resultado === 'vitoria';
      const d = new Date(r.timestamp * 1000);
      const hora = d.getHours();
      const dia = d.getDay();

      porDirecao[r.direcao].total++; if (isWin) porDirecao[r.direcao].wins++;
      porHora[hora].total++; if (isWin) porHora[hora].wins++;
      const faixa = getFaixa(hora);
      porFaixa[faixa].total++; if (isWin) porFaixa[faixa].wins++;
      porDia[dia].total++; if (isWin) porDia[dia].wins++;
      porQuadrante[r.quadrante].total++; if (isWin) porQuadrante[r.quadrante].wins++;
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

    return { total, wins, winRate, winsComG1, winRateG1, winsComG2, winRateG2, porDirecao, porHora, porFaixa, porDia, porQuadrante, goldenHours, horas24 };
  }, [backtestResultados]);

  // Simulação financeira com gale embutido
  const simulacao = React.useMemo(() => {
    if (backtestResultados.length === 0) return {
      pontos: [] as { idx: number; saldo: number; hora: string; drawdown: number }[],
      bancaFinal: bancaInicial, roi: 0, maiorRebaixamento: 0, maiorSeqLoss: 0,
      riscoRuina: false, fatorSeguranca: 0, lucroTotal: 0,
    };

    const opsOrdenadas = [...backtestResultados].sort((a, b) => a.timestamp - b.timestamp);
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
      // Simula a operação com gale interno
      if (op.resultado === 'vitoria') {
        saldo += ganhoBase;
        seqLoss = 0;
      } else {
        // Base: perda
        saldo -= valorEntrada;
        seqLoss++;

        if (maxGale >= 1 && op.resultado_g1 !== 'na') {
          const valorG1 = valorEntrada * multiplicador;
          if (op.resultado_g1 === 'vitoria') {
            saldo += valorG1 * (payout / 100) - valorEntrada; // lucro G1 menos perda base já descontada acima... aguarda
            // Correto: já descontamos valorEntrada acima; agora adicionamos o lucro do G1
            // mas na verdade já subtraímos a base, então: saldo += ganhoG1
            // Vou recalcular: saldo já está com -valorEntrada. Agora G1 vence:
            // net G1 = lucroG1 - valorG1 + valorG1*(payout/100)... não.
            // Vamos simplificar: resultado líquido da sequência.
            // Base perde: -valorEntrada
            // G1 vence: +valorG1*(payout/100)
            saldo += valorG1 * (payout / 100);
            seqLoss = 0;
          } else {
            // G1 perde
            saldo -= valorG1;
            seqLoss++;

            if (maxGale >= 2 && op.resultado_g2 !== 'na') {
              const valorG2 = valorG1 * multiplicador;
              if (op.resultado_g2 === 'vitoria') {
                saldo += valorG2 * (payout / 100);
                seqLoss = 0;
              } else {
                saldo -= valorG2;
                seqLoss++;
              }
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
  }, [backtestResultados, bancaInicial, valorEntrada, payout, maxGale, multiplicador]);

  const cenarios = React.useMemo(() => {
    if (backtestResultados.length === 0) return null;
    return ([0, 1, 2] as const).map(g => simularFinanceiro(backtestResultados, g, valorEntrada, payout, multiplicador, bancaInicial));
  }, [backtestResultados, valorEntrada, payout, multiplicador, bancaInicial]);

  const toggleDia = (d: number) => setDiasSelecionados(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const TABS = [
    { key: 'lista', label: 'Lista', icon: <List size={13} /> },
    { key: 'estatisticas', label: 'Estatísticas', icon: <BarChart3 size={13} /> },
    { key: 'quadrantes', label: 'Quadrantes', icon: <Grid size={13} /> },
    { key: 'drawdown', label: 'Drawdown', icon: <Activity size={13} /> },
    { key: 'lucro', label: 'Lucro', icon: <DollarSign size={13} /> },
    { key: 'gale', label: 'Proteção', icon: <AlertTriangle size={13} /> },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-4">
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Filtros — Quadrantes 5 Min</p>

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
            <p className="text-xs text-slate-500">Win Rate (com P1)</p>
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
                  subTab === t.key ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-white')}>
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
                      {['Data/Hora', 'Q', 'Direção', 'Conf.', 'Base', 'P1', 'P2'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-400 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...backtestResultados].reverse().slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/3">
                        <td className="px-3 py-1.5 text-slate-400 font-mono">{r.hora}</td>
                        <td className="px-3 py-1.5 text-slate-300 font-bold">Q{r.quadrante}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn('flex items-center gap-1 font-semibold', r.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                            {r.direcao === 'compra' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {r.direcao === 'compra' ? 'COMPRA' : 'VENDA'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-300">{r.confianca}%</td>
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
              {/* Por direção */}
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Direção</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Compra" total={stats.porDirecao.compra.total} wins={stats.porDirecao.compra.wins} />
                  <StatCard label="Venda" total={stats.porDirecao.venda.total} wins={stats.porDirecao.venda.wins} />
                </div>
              </div>

              {/* Por faixa */}
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Período</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(stats.porFaixa) as [string, Stat][]).map(([faixa, s]) => (
                    <StatCard key={faixa} label={faixa} total={s.total} wins={s.wins} />
                  ))}
                </div>
              </div>

              {/* Por dia */}
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Por Dia da Semana</p>
                <div className="grid grid-cols-7 gap-2">
                  {NOMES_DIA.map((nome, i) => (
                    <StatCard key={i} label={nome} total={stats.porDia[i].total} wins={stats.porDia[i].wins} />
                  ))}
                </div>
              </div>

              {/* Horas 24h */}
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

              {/* Horas douradas */}
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

          {/* Por Quadrante */}
          {subTab === 'quadrantes' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Win Rate por Quadrante (1-12)</p>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(q => {
                    const s = stats.porQuadrante[q];
                    const rate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
                    const inicioMin = (q - 1) * 5;
                    const fimMin = inicioMin + 4;
                    return (
                      <div key={q} className={cn('rounded-lg p-2.5 text-center border',
                        rate >= 60 ? 'bg-emerald-500/10 border-emerald-500/20' : rate >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20')}>
                        <p className="text-xs font-bold text-slate-300">Q{q}</p>
                        <p className="text-[10px] text-slate-500">{inicioMin.toString().padStart(2,'0')}-{fimMin.toString().padStart(2,'0')}</p>
                        <p className={cn('text-base font-black mt-1', rate >= 60 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400')}>
                          {s.total > 0 ? `${rate.toFixed(0)}%` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-600">{s.wins}W/{s.total - s.wins}L</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Gráfico por Quadrante</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      data={Array.from({ length: 12 }, (_, i) => {
                        const q = i + 1;
                        const s = stats.porQuadrante[q];
                        const rate = s.total > 0 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0;
                        return { quadrante: `Q${q}`, rate, total: s.total, wins: s.wins };
                      })}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="quadrante" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 100]} />
                      <ReTooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: 8 }}
                        formatter={(v: any, _: any, p: any) => [`${v}% (${p.payload.wins}/${p.payload.total})`, 'Win Rate']} />
                      <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" />
                      <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                        {Array.from({ length: 12 }, (_, i) => {
                          const q = i + 1;
                          const s = stats.porQuadrante[q];
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
                      <Area type="monotone" dataKey="saldo" stroke="#06b6d4" fill="#06b6d420" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Gale */}
          {subTab === 'gale' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">Análise de Proteção — Q5min</p>
                <p className="text-xs text-slate-400 mb-4">
                  No Quadrantes 5min a Proteção entra na <strong className="text-white">próxima vela M1 imediatamente</strong> após o resultado (não espera o próximo quadrante).
                  P1 = vela T+2min | P2 = vela T+3min após o sinal.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sem Proteção */}
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Sem Proteção</p>
                    <p className={cn('text-3xl font-black', stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.wins}W / {stats.total - stats.wins}L</p>
                  </div>

                  {/* Com P1 */}
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Com P1 (próxima M1)</p>
                    <p className={cn('text-3xl font-black', stats.winRateG1 >= 60 ? 'text-emerald-400' : stats.winRateG1 >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRateG1.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.winsComG1}W / {stats.total - stats.winsComG1}L</p>
                    <p className="text-xs text-slate-600 mt-1">
                      P1 acionado: {backtestResultados.filter(r => r.resultado_g1 !== 'na').length} vezes
                    </p>
                  </div>

                  {/* Com P1+P2 */}
                  <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">Com P1+P2</p>
                    <p className={cn('text-3xl font-black', stats.winRateG2 >= 60 ? 'text-emerald-400' : stats.winRateG2 >= 50 ? 'text-amber-400' : 'text-red-400')}>
                      {stats.winRateG2.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stats.winsComG2}W / {stats.total - stats.winsComG2}L</p>
                    <p className="text-xs text-slate-600 mt-1">
                      P2 acionado: {backtestResultados.filter(r => r.resultado_g2 !== 'na').length} vezes
                    </p>
                  </div>
                </div>

                {/* Simulação Financeira Comparativa */}
                {cenarios && (
                  <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-white/5">
                    <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                      Simulação Financeira — R${valorEntrada} entrada | {payout}% payout | Banca R${bancaInicial}
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

                {/* Sequências de perda */}
                <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold text-slate-400 mb-3">Distribuição de Perdas Consecutivas (base)</p>
                  {(() => {
                    const seqs: Record<number, number> = {};
                    let seq = 0;
                    [...backtestResultados].sort((a, b) => a.timestamp - b.timestamp).forEach(r => {
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
