import React from 'react';
import { cn } from '../lib/utils';
import { analisarLogicaPreco } from '../lib/motor-logica-preco';
import { servicoVelas as servicoVelasType } from '../lib/websocket-velas';
import type { ConceitoLP, CicloMercado } from '../types';
import { Loader2, TrendingUp, TrendingDown, BarChart3, List, DollarSign, Layers, AlertTriangle, Globe, Activity, Zap } from 'lucide-react';
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
  conceitos: ConceitoLP[];
  ciclo: CicloMercado;
  dominioAtual: 'compra' | 'venda' | 'indefinido';
  numConceitos: number;
  numContradicoes: number;
  timestamp: number;
}

const TODOS_CONCEITOS: ConceitoLP[] = [
  'comando', 'desinstalacao', 'exaustao', 'lote', 'vela_forca',
  'vela_forca_continuacao', 'dupla_posicao', 'tripla_posicao',
  'nova_alta', 'nova_baixa', 'nova_posicao', 'pressao',
  'pressao_tendencial', 'primeiro_registro', 'projecao',
  'limite', 'transferencia_dominio',
];

const NOMES_CONCEITO: Record<string, string> = {
  comando: 'Comando', desinstalacao: 'Desinstalação', exaustao: 'Exaustão',
  lote: 'Lote', vela_forca: 'Vela de Força', vela_forca_continuacao: 'VF Continuação',
  dupla_posicao: 'Dupla Posição', tripla_posicao: 'Tripla Posição',
  nova_alta: 'Nova Alta', nova_baixa: 'Nova Baixa', nova_posicao: 'Nova Posição',
  pressao: 'Pressão', pressao_tendencial: 'Pressão Tendencial',
  primeiro_registro: 'Primeiro Registro', projecao: 'Projeção',
  limite: 'Limite', transferencia_dominio: 'Transf. Domínio',
};

const NOMES_CICLO: Record<string, string> = {
  tendencial_alta: 'Tendencial Alta', tendencial_baixa: 'Tendencial Baixa',
  correcao_tendencia: 'Correção Tendência', correcao_lateral: 'Correção Lateral',
  consolidado: 'Consolidado', acumulado: 'Acumulado',
};

const TODOS_CICLOS: CicloMercado[] = ['tendencial_alta', 'tendencial_baixa', 'correcao_tendencia', 'correcao_lateral', 'consolidado', 'acumulado'];

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getFaixa(hora: number): string {
  if (hora < 6) return 'Madrugada (00-06)';
  if (hora < 12) return 'Manhã (06-12)';
  if (hora < 18) return 'Tarde (12-18)';
  return 'Noite (18-00)';
}

const CHUNK_SIZE = 300;
const STEP = 5;

export default function MetricsLogicaPrecoContent({
  backtestAtivo, setBacktestAtivo,
  backtestAtivosSelecionados, setBacktestAtivosSelecionados,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas, backtestLoading, servicoVelas, ativosPadrao,
}: Props) {
  const [subTab, setSubTab] = React.useState<'lista' | 'estatisticas' | 'losses' | 'comparativo' | 'drawdown' | 'conceitos' | 'lucro' | 'gale'>('lista');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [valorEntrada, setValorEntrada] = React.useState(20);
  const [payout, setPayout] = React.useState(87);
  const [bancaInicial, setBancaInicial] = React.useState(1000);
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [conceitosAtivos, setConceitosAtivos] = React.useState<ConceitoLP[]>([...TODOS_CONCEITOS]);
  const [confiancaMinima, setConfiancaMinima] = React.useState(0);
  // Novos filtros
  const [exigirAlinhamentoDominio, setExigirAlinhamentoDominio] = React.useState(false);
  const [ciclosPermitidos, setCiclosPermitidos] = React.useState<CicloMercado[]>([...TODOS_CICLOS]);
  const [minConceitosConfluentes, setMinConceitosConfluentes] = React.useState(1);
  const [zeroContradicoes, setZeroContradicoes] = React.useState(false);

  // Async backtesting
  const [backtestResultados, setBacktestResultados] = React.useState<ResultadoBacktest[]>([]);
  const [processando, setProcessando] = React.useState(false);
  const [progresso, setProgresso] = React.useState(0);

  // Simulador de filtros (galeria de perdas)
  const [simDominio, setSimDominio] = React.useState(false);
  const [simCiclo, setSimCiclo] = React.useState(false);
  const [simContradicoes, setSimContradicoes] = React.useState(false);
  const [simConfianca, setSimConfianca] = React.useState(false);

  // Multi-ativos
  const [comparativoData, setComparativoData] = React.useState<{ ativo: string; total: number; wins: number; rate: number; bestHour: string; profit: number }[]>([]);
  const [comparativoLoading, setComparativoLoading] = React.useState(false);

  // Backtesting assíncrono em chunks
  React.useEffect(() => {
    if (!backtestVelas || backtestVelas.length < 15 || !backtestDataInicio || !backtestDataFim || backtestLoading) {
      setBacktestResultados([]);
      return;
    }

    setProcessando(true);
    setProgresso(0);
    let cancelado = false;

    const resultados: ResultadoBacktest[] = [];
    const sinaisProcessados = new Set<string>();

    const [hI] = horaInicio.split(':').map(Number);
    const [hF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + Number(horaInicio.split(':')[1]);
    const totalMinF = hF * 60 + Number(horaFim.split(':')[1]);
    const cruzaMeiaNoite = totalMinI > totalMinF;

    const tsMap = new Map<number, any>();
    backtestVelas.forEach((v: any) => { if (v) tsMap.set(v.timestamp, v); });

    const startIdx = 15;
    const endIdx = backtestVelas.length - 1;
    let idx = startIdx;

    function processarChunk() {
      if (cancelado) return;
      const chunkEnd = Math.min(idx + CHUNK_SIZE * STEP, endIdx);

      for (; idx < chunkEnd; idx += STEP) {
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

        const sliceStart = Math.max(0, idx - 60);
        const velasAte = backtestVelas.slice(sliceStart, idx + 1);
        const analise = analisarLogicaPreco(velasAte, conceitosAtivos);

        if (!analise.operar || !analise.sinal_id || !analise.direcao_operacao) continue;
        if (sinaisProcessados.has(analise.sinal_id)) continue;
        sinaisProcessados.add(analise.sinal_id);

        if (analise.confianca < confiancaMinima) continue;

        // Novos filtros
        if (!ciclosPermitidos.includes(analise.cicloAtual)) continue;

        const sinaisNaDirecao = analise.sinais.filter(s => s.direcao === analise.direcao_operacao).length;
        const sinaisContra = analise.sinais.filter(s => s.direcao !== analise.direcao_operacao).length;

        if (sinaisNaDirecao < minConceitosConfluentes) continue;
        if (zeroContradicoes && sinaisContra > 0) continue;

        if (exigirAlinhamentoDominio && analise.dominioAtual !== 'indefinido') {
          if (analise.dominioAtual !== analise.direcao_operacao) continue;
        }

        const nextV = tsMap.get(velaAtual.timestamp + 60);
        if (!nextV || !nextV.cor) continue;

        const win = (analise.direcao_operacao === 'compra' && nextV.cor === 'alta') ||
                    (analise.direcao_operacao === 'venda' && nextV.cor === 'baixa');

        const conceitosDetectados = [...new Set(analise.sinais.map(s => s.conceito))];

        resultados.push({
          hora: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          direcao: analise.direcao_operacao,
          resultado: win ? 'vitoria' : 'derrota',
          confianca: analise.confianca,
          conceitos: conceitosDetectados,
          ciclo: analise.cicloAtual,
          dominioAtual: analise.dominioAtual,
          numConceitos: sinaisNaDirecao,
          numContradicoes: sinaisContra,
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
  }, [backtestVelas, backtestDataInicio, backtestDataFim, horaInicio, horaFim, diasSelecionados, conceitosAtivos, confiancaMinima, backtestLoading, exigirAlinhamentoDominio, ciclosPermitidos, minConceitosConfluentes, zeroContradicoes]);

  // Estatísticas expandidas
  const stats = React.useMemo(() => {
    const total = backtestResultados.length;
    const wins = backtestResultados.filter(r => r.resultado === 'vitoria').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    const porConceito: Record<string, Stat> = {};
    TODOS_CONCEITOS.forEach(c => { porConceito[c] = { total: 0, wins: 0 }; });
    const porCiclo: Record<string, Stat> = {};
    const porDirecao: Record<string, Stat> = { compra: { total: 0, wins: 0 }, venda: { total: 0, wins: 0 } };
    const porHora: Record<number, Stat> = {};
    for (let i = 0; i < 24; i++) porHora[i] = { total: 0, wins: 0 };
    const porFaixa: Record<string, Stat> = {
      'Madrugada (00-06)': { total: 0, wins: 0 }, 'Manhã (06-12)': { total: 0, wins: 0 },
      'Tarde (12-18)': { total: 0, wins: 0 }, 'Noite (18-00)': { total: 0, wins: 0 },
    };
    const porDia: Record<number, Stat> = {};
    for (let i = 0; i < 7; i++) porDia[i] = { total: 0, wins: 0 };
    const porConfianca: Record<string, Stat> = {
      '0-40%': { total: 0, wins: 0 }, '40-60%': { total: 0, wins: 0 },
      '60-80%': { total: 0, wins: 0 }, '80-100%': { total: 0, wins: 0 },
    };
    const porDominio: Record<string, Stat> = { compra: { total: 0, wins: 0 }, venda: { total: 0, wins: 0 }, indefinido: { total: 0, wins: 0 } };
    const porData: Record<string, { total: number; wins: number; melhorHora: number; melhorHoraRate: number }> = {};

    backtestResultados.forEach(r => {
      const isWin = r.resultado === 'vitoria';
      const d = new Date(r.timestamp * 1000);
      const hora = d.getHours();
      const dia = d.getDay();
      const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

      r.conceitos.forEach(c => {
        if (!porConceito[c]) porConceito[c] = { total: 0, wins: 0 };
        porConceito[c].total++; if (isWin) porConceito[c].wins++;
      });
      if (!porCiclo[r.ciclo]) porCiclo[r.ciclo] = { total: 0, wins: 0 };
      porCiclo[r.ciclo].total++; if (isWin) porCiclo[r.ciclo].wins++;
      porDirecao[r.direcao].total++; if (isWin) porDirecao[r.direcao].wins++;
      porHora[hora].total++; if (isWin) porHora[hora].wins++;
      const faixa = getFaixa(hora);
      porFaixa[faixa].total++; if (isWin) porFaixa[faixa].wins++;
      porDia[dia].total++; if (isWin) porDia[dia].wins++;
      const fc = r.confianca < 40 ? '0-40%' : r.confianca < 60 ? '40-60%' : r.confianca < 80 ? '60-80%' : '80-100%';
      porConfianca[fc].total++; if (isWin) porConfianca[fc].wins++;
      porDominio[r.dominioAtual].total++; if (isWin) porDominio[r.dominioAtual].wins++;

      if (!porData[dateKey]) porData[dateKey] = { total: 0, wins: 0, melhorHora: -1, melhorHoraRate: 0 };
      porData[dateKey].total++; if (isWin) porData[dateKey].wins++;
    });

    // Melhor hora por dia
    Object.keys(porData).forEach(dateKey => {
      const horasNoDia: Record<number, Stat> = {};
      backtestResultados.filter(r => {
        const d = new Date(r.timestamp * 1000);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}` === dateKey;
      }).forEach(r => {
        const h = new Date(r.timestamp * 1000).getHours();
        if (!horasNoDia[h]) horasNoDia[h] = { total: 0, wins: 0 };
        horasNoDia[h].total++; if (r.resultado === 'vitoria') horasNoDia[h].wins++;
      });
      let bestH = -1, bestRate = 0;
      Object.entries(horasNoDia).forEach(([h, s]) => {
        const rate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
        if (rate > bestRate || (rate === bestRate && s.total > (horasNoDia[bestH]?.total || 0))) { bestH = Number(h); bestRate = rate; }
      });
      porData[dateKey].melhorHora = bestH;
      porData[dateKey].melhorHoraRate = bestRate;
    });

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

    // Janela recomendada para robô
    const horasValidas = (Object.entries(porHora) as [string, Stat][])
      .filter(([_, s]) => s.total >= 3 && (s.wins / s.total) * 100 >= 55)
      .map(([h, s]) => ({ hora: Number(h), rate: Number(((s.wins / s.total) * 100).toFixed(1)), total: s.total, wins: s.wins }))
      .sort((a, b) => a.hora - b.hora);

    let janelaRobo = { inicio: -1, fim: -1, rateMedia: 0, totalOps: 0, totalWins: 0 };
    if (horasValidas.length > 0) {
      let bestStart = 0, bestLen = 1, curStart = 0, curLen = 1;
      for (let i = 1; i < horasValidas.length; i++) {
        if (horasValidas[i].hora === horasValidas[i - 1].hora + 1) {
          curLen++;
          if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
        } else { curStart = i; curLen = 1; }
      }
      const windowHoras = horasValidas.slice(bestStart, bestStart + bestLen);
      const tw = windowHoras.reduce((s, h) => s + h.wins, 0);
      const to = windowHoras.reduce((s, h) => s + h.total, 0);
      janelaRobo = { inicio: windowHoras[0].hora, fim: windowHoras[windowHoras.length - 1].hora, rateMedia: to > 0 ? (tw / to) * 100 : 0, totalOps: to, totalWins: tw };
    }

    // Dados 24h para gráfico
    const horas24 = Array.from({ length: 24 }, (_, i) => {
      const s = porHora[i];
      const rate = s && s.total >= 2 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0;
      return { hora: `${i}h`, rate, total: s?.total || 0, wins: s?.wins || 0, isGolden: rate >= 60 && (s?.total || 0) >= 2 };
    });

    return { total, wins, winRate, porConceito, porCiclo, porDirecao, porHora, porFaixa, porDia, porConfianca, porDominio, porData, goldenHours, horaOuro, top5Horas, janelaRobo, horas24 };
  }, [backtestResultados]);

  // Simulação financeira expandida
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

  // Ranking de conceitos
  const rankingConceitos = React.useMemo(() => {
    return (Object.entries(stats.porConceito) as [string, Stat][])
      .filter(([_, s]) => s.total > 0)
      .map(([conceito, s]) => ({ conceito, nome: NOMES_CONCEITO[conceito] || conceito, total: s.total, wins: s.wins, winRate: (s.wins / s.total) * 100 }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [stats.porConceito]);

  // Auditoria de losses
  const auditoria = React.useMemo(() => {
    const losses = backtestResultados.filter(r => r.resultado === 'derrota');
    const dominioDesalinhado = losses.filter(r => r.dominioAtual !== 'indefinido' && r.dominioAtual !== r.direcao);
    const cicloDesfavoravel = losses.filter(r => ['consolidado', 'acumulado', 'correcao_lateral'].includes(r.ciclo));
    const comContradicoes = losses.filter(r => r.numContradicoes > 0);
    const confBaixa = losses.filter(r => r.confianca < 60);

    const lossesEvitaveis = new Set([...dominioDesalinhado, ...cicloDesfavoravel, ...comContradicoes, ...confBaixa]).size;
    const winRatePotencial = stats.total > 0 ? ((stats.wins) / (stats.total - lossesEvitaveis)) * 100 : 0;

    const filtros = [
      { id: 'dominio', nome: 'Exigir Alinhamento Domínio', descricao: 'Filtrar operações contra o domínio atual', lossesEvitados: dominioDesalinhado.length, winRateCom: stats.total > 0 && dominioDesalinhado.length > 0 ? (stats.wins / (stats.total - dominioDesalinhado.length)) * 100 : stats.winRate },
      { id: 'ciclo', nome: 'Excluir Ciclos Desfavoráveis', descricao: 'Evitar consolidado, acumulado e correção lateral', lossesEvitados: cicloDesfavoravel.length, winRateCom: stats.total > 0 && cicloDesfavoravel.length > 0 ? (stats.wins / (stats.total - cicloDesfavoravel.length)) * 100 : stats.winRate },
      { id: 'contradicoes', nome: 'Zero Contradições', descricao: 'Excluir sinais com conceitos contraditórios', lossesEvitados: comContradicoes.length, winRateCom: stats.total > 0 && comContradicoes.length > 0 ? (stats.wins / (stats.total - comContradicoes.length)) * 100 : stats.winRate },
      { id: 'confianca', nome: 'Confiança ≥ 60%', descricao: 'Excluir sinais com confiança abaixo de 60%', lossesEvitados: confBaixa.length, winRateCom: stats.total > 0 && confBaixa.length > 0 ? (stats.wins / (stats.total - confBaixa.length)) * 100 : stats.winRate },
    ];

    return { losses, dominioDesalinhado: dominioDesalinhado.length, cicloDesfavoravel: cicloDesfavoravel.length, comContradicoes: comContradicoes.length, confBaixa: confBaixa.length, lossesEvitaveis, winRatePotencial, filtros };
  }, [backtestResultados, stats]);

  // Simulador de filtros - resultado cumulativo
  const simuladorResult = React.useMemo(() => {
    const losses = backtestResultados.filter(r => r.resultado === 'derrota');
    const evitados = new Set<number>();

    losses.forEach((r, idx) => {
      if (simDominio && r.dominioAtual !== 'indefinido' && r.dominioAtual !== r.direcao) evitados.add(idx);
      if (simCiclo && ['consolidado', 'acumulado', 'correcao_lateral'].includes(r.ciclo)) evitados.add(idx);
      if (simContradicoes && r.numContradicoes > 0) evitados.add(idx);
      if (simConfianca && r.confianca < 60) evitados.add(idx);
    });

    const totalEvitados = evitados.size;
    const novoTotal = stats.total - totalEvitados;
    const novoWinRate = novoTotal > 0 ? (stats.wins / novoTotal) * 100 : 0;
    const lossesRestantes = losses.filter((_, idx) => !evitados.has(idx));
    const algumAtivo = simDominio || simCiclo || simContradicoes || simConfianca;
    const filtrosAtivos = [simDominio && 'Alinhamento Domínio', simCiclo && 'Excluir Ciclos', simContradicoes && 'Zero Contradições', simConfianca && 'Confiança ≥60%'].filter(Boolean).join(' + ');

    return { totalEvitados, novoTotal, novoWinRate, lossesRestantes, algumAtivo, filtrosAtivos };
  }, [backtestResultados, stats, simDominio, simCiclo, simContradicoes, simConfianca]);

  // Multi-ativos
  React.useEffect(() => {
    if (subTab !== 'comparativo' || !backtestDataInicio || !backtestDataFim || backtestAtivosSelecionados.length === 0) return;

    let cancelado = false;
    setComparativoLoading(true);

    const startTs = Math.floor(new Date(backtestDataInicio).getTime() / 1000);
    const endTs = Math.floor(new Date(backtestDataFim + 'T23:59:59').getTime() / 1000);

    async function carregarMultiAtivos() {
      const results: typeof comparativoData = [];

      for (const ativo of backtestAtivosSelecionados) {
        if (cancelado) return;
        try {
          await servicoVelas.carregarHistoricoLongo(ativo, startTs, endTs);
          const velas = servicoVelas.obterVelasDeAtivo(ativo);
          if (!velas || velas.length < 15) { results.push({ ativo, total: 0, wins: 0, rate: 0, bestHour: '-', profit: 0 }); continue; }

          const tsM = new Map<number, any>();
          velas.forEach((v: any) => { if (v) tsM.set(v.timestamp, v); });

          const sinais = new Set<string>();
          const porHora: Record<number, Stat> = {};
          let wins = 0, totalOps = 0;

          for (let i = 15; i < velas.length - 1; i += STEP) {
            const v = velas[i]; if (!v) continue;
            const sliceS = Math.max(0, i - 60);
            const a = analisarLogicaPreco(velas.slice(sliceS, i + 1), conceitosAtivos);
            if (!a.operar || !a.sinal_id || !a.direcao_operacao) continue;
            if (sinais.has(a.sinal_id)) continue;
            sinais.add(a.sinal_id);

            const nxt = tsM.get(v.timestamp + 60);
            if (!nxt || !nxt.cor) continue;

            const w = (a.direcao_operacao === 'compra' && nxt.cor === 'alta') || (a.direcao_operacao === 'venda' && nxt.cor === 'baixa');
            totalOps++; if (w) wins++;

            const h = new Date(v.timestamp * 1000).getHours();
            if (!porHora[h]) porHora[h] = { total: 0, wins: 0 };
            porHora[h].total++; if (w) porHora[h].wins++;
          }

          let bH = '-', bR = 0;
          Object.entries(porHora).forEach(([h, s]) => {
            if (s.total >= 2) { const r = (s.wins / s.total) * 100; if (r > bR) { bR = r; bH = `${h}h`; } }
          });

          const ganho = valorEntrada * (payout / 100);
          const profit = wins * ganho - (totalOps - wins) * valorEntrada;
          results.push({ ativo, total: totalOps, wins, rate: totalOps > 0 ? Number(((wins / totalOps) * 100).toFixed(1)) : 0, bestHour: bH, profit: Number(profit.toFixed(2)) });
        } catch { results.push({ ativo, total: 0, wins: 0, rate: 0, bestHour: '-', profit: 0 }); }
      }

      if (!cancelado) {
        setComparativoData(results.sort((a, b) => b.rate - a.rate));
        setComparativoLoading(false);
      }
    }

    carregarMultiAtivos();
    return () => { cancelado = true; };
  }, [subTab, backtestAtivosSelecionados, backtestDataInicio, backtestDataFim, conceitosAtivos, valorEntrada, payout]);

  const vitorias = stats.wins;
  const total = stats.total;
  const winRate = stats.winRate;

  return (
    <div className="space-y-6">
      {/* Seletores */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white/[0.02] p-6 rounded-3xl border border-white/5">
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Ativo para Análise</label>
            <select value={backtestAtivo} onChange={(e) => setBacktestAtivo(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all min-w-[180px]">
              {ativosPadrao.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Data Inicial</label>
            <input type="date" value={backtestDataInicio} onChange={(e) => setBacktestDataInicio(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Data Final</label>
            <input type="date" value={backtestDataFim} onChange={(e) => setBacktestDataFim(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-6 bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Assertividade</p>
            <p className={cn("text-xl font-black", winRate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{winRate.toFixed(1)}%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Win / Loss</p>
            <p className="text-xl font-black text-white">
              <span className="text-apex-trader-primary">{vitorias}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-red-500">{total - vitorias}</span>
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center"><p className="text-xl font-black text-white">{total}</p></div>
          {stats.horaOuro.hora >= 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Hora de Ouro</p>
                <p className="text-xl font-black text-amber-400">{stats.horaOuro.hora}h <span className="text-sm">({stats.horaOuro.rate}%)</span></p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Início</span>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
              className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fim</span>
            <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)}
              className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
        </div>
        <div className="w-px h-8 bg-white/5 mx-2 hidden md:block" />
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entrada (R$)</span>
            <input type="number" value={valorEntrada} onChange={(e) => setValorEntrada(Number(e.target.value))}
              className="w-20 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Payout (%)</span>
            <input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))}
              className="w-16 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Conf. Mín.</span>
            <input type="number" value={confiancaMinima} onChange={(e) => setConfiancaMinima(Number(e.target.value))} min={0} max={100}
              className="w-16 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mín. Confluência</span>
            <input type="number" value={minConceitosConfluentes} onChange={(e) => setMinConceitosConfluentes(Number(e.target.value))} min={1} max={5}
              className="w-14 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
          </div>
        </div>
      </div>

      {/* Filtros avançados */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Filtros:</span>
        <button onClick={() => setExigirAlinhamentoDominio(v => !v)}
          className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", exigirAlinhamentoDominio ? "bg-apex-trader-primary/20 text-apex-trader-primary border border-apex-trader-primary/30" : "bg-slate-800 text-slate-500 border border-transparent hover:text-white")}>
          Exigir Alinhamento Domínio
        </button>
        <button onClick={() => setZeroContradicoes(v => !v)}
          className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", zeroContradicoes ? "bg-apex-trader-primary/20 text-apex-trader-primary border border-apex-trader-primary/30" : "bg-slate-800 text-slate-500 border border-transparent hover:text-white")}>
          Zero Contradições
        </button>
      </div>

      {/* Filtro Dias */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Dias:</span>
        {NOMES_DIA.map((nome, idx) => (
          <button key={idx} onClick={() => setDiasSelecionados(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
            className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", diasSelecionados.includes(idx) ? "bg-apex-trader-primary text-black" : "bg-slate-800 text-slate-500 hover:text-white")}>{nome}</button>
        ))}
        <button onClick={() => setDiasSelecionados([1, 2, 3, 4, 5])} className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white ml-2">Só úteis</button>
        <button onClick={() => setDiasSelecionados([0, 1, 2, 3, 4, 5, 6])} className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white">Todos</button>
      </div>

      {/* Ciclos Permitidos */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Ciclos:</span>
        {TODOS_CICLOS.map(c => (
          <button key={c} onClick={() => setCiclosPermitidos(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
            className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", ciclosPermitidos.includes(c) ? "bg-apex-trader-primary/20 text-apex-trader-primary border border-apex-trader-primary/30" : "bg-slate-800 text-slate-500 border border-transparent hover:text-white")}>
            {NOMES_CICLO[c] || c}
          </button>
        ))}
        <button onClick={() => setCiclosPermitidos([...TODOS_CICLOS])} className="px-3 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 hover:text-white ml-2">Todos</button>
      </div>

      {/* Conceitos */}
      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conceitos Ativos</span>
          <div className="flex gap-2">
            <button onClick={() => setConceitosAtivos([...TODOS_CONCEITOS])} className="text-[10px] font-bold text-apex-trader-primary hover:underline">Todos</button>
            <button onClick={() => setConceitosAtivos([])} className="text-[10px] font-bold text-slate-500 hover:underline">Nenhum</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TODOS_CONCEITOS.map(c => (
            <button key={c} onClick={() => setConceitosAtivos(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", conceitosAtivos.includes(c) ? "bg-apex-trader-primary/20 text-apex-trader-primary border border-apex-trader-primary/30" : "bg-slate-800 text-slate-500 border border-transparent hover:text-white")}>
              {NOMES_CONCEITO[c] || c}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {backtestLoading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-apex-trader-primary" />
          <span className="text-sm text-slate-400 font-bold">Carregando velas de {backtestAtivo}...</span>
        </div>
      )}

      {!backtestLoading && processando && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 size={20} className="animate-spin text-apex-trader-primary" />
          <span className="text-sm text-slate-400 font-bold">Analisando sinais... {progresso}%</span>
          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-apex-trader-primary rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      {!backtestLoading && !processando && (
        <>
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
            {([
              { id: 'lista' as const, label: 'Sinais', icon: List, color: '' },
              { id: 'estatisticas' as const, label: 'Estatísticas', icon: BarChart3, color: '' },
              { id: 'losses' as const, label: 'Galeria de Perdas', icon: AlertTriangle, color: 'text-red-400' },
              { id: 'comparativo' as const, label: 'Multi-Ativos', icon: Globe, color: 'text-blue-400' },
              { id: 'drawdown' as const, label: 'Drawdown', icon: TrendingDown, color: 'text-orange-400' },
              { id: 'conceitos' as const, label: 'Conceitos', icon: Layers, color: '' },
              { id: 'lucro' as const, label: 'Simulador', icon: DollarSign, color: '' },
              { id: 'gale' as const, label: 'Proteção', icon: Zap, color: 'text-amber-400' },
            ]).map(t => (
              <button key={t.id} onClick={() => setSubTab(t.id)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-bold",
                  subTab === t.id ? "bg-white text-black" : cn("text-slate-500 hover:text-white", t.color))}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {/* ===== LISTA ===== */}
          {subTab === 'lista' && (
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora</th>
                      <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Direção</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Conceitos</th>
                      <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ciclo</th>
                      <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Domínio</th>
                      <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Confiança</th>
                      <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResultados.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold">Nenhum sinal encontrado no período</td></tr>
                    ) : backtestResultados.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-mono text-slate-300">{r.hora}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("inline-flex items-center gap-1 font-bold", r.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                            {r.direcao === 'compra' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {r.direcao === 'compra' ? 'CALL' : 'PUT'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {r.conceitos.slice(0, 3).map((c, ci) => (
                              <span key={ci} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold">{NOMES_CONCEITO[c] || c}</span>
                            ))}
                            {r.conceitos.length > 3 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[9px] font-bold">+{r.conceitos.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-bold text-slate-400">{NOMES_CICLO[r.ciclo] || r.ciclo}</span></td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("text-[9px] font-bold", r.dominioAtual === r.direcao ? 'text-emerald-400' : r.dominioAtual === 'indefinido' ? 'text-slate-500' : 'text-amber-400')}>
                            {r.dominioAtual === r.direcao ? 'ALINHADO' : r.dominioAtual === 'indefinido' ? 'INDEF.' : 'OPOSTO'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-300">{r.confianca}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded font-black text-[10px] uppercase", r.resultado === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                            {r.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== ESTATÍSTICAS ===== */}
          {subTab === 'estatisticas' && (
            <div className="space-y-6">
              {/* Janela Recomendada + Oportunidade de Ouro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.janelaRobo.inicio >= 0 && (
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 rounded-2xl border border-emerald-500/20">
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity size={14} /> Janela Recomendada para o Robô
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-emerald-500/20 px-4 py-2 rounded-xl">
                        <p className="text-[10px] text-emerald-300 font-bold">LIGAR</p>
                        <p className="text-2xl font-black text-emerald-400">{stats.janelaRobo.inicio}h</p>
                      </div>
                      <span className="text-slate-500 text-lg">até</span>
                      <div className="bg-red-500/20 px-4 py-2 rounded-xl">
                        <p className="text-[10px] text-red-300 font-bold">DESLIGAR</p>
                        <p className="text-2xl font-black text-red-400">{stats.janelaRobo.fim + 1}h</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Win Rate médio: <span className="text-emerald-400 font-bold">{stats.janelaRobo.rateMedia.toFixed(1)}%</span>
                      {' '}({stats.janelaRobo.totalWins}W / {stats.janelaRobo.totalOps - stats.janelaRobo.totalWins}L de {stats.janelaRobo.totalOps} ops)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 italic">Maior janela consecutiva com ≥55% win rate e ≥3 ops/hora</p>
                  </div>
                )}

                {stats.horaOuro.hora >= 0 && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6 rounded-2xl border border-amber-500/20">
                    <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Oportunidade de Ouro</h3>
                    <p className="text-4xl font-black text-amber-400 italic">{stats.horaOuro.hora}h</p>
                    <p className="text-sm text-slate-400 mt-1">Win Rate: <span className="text-amber-400 font-bold">{stats.horaOuro.rate}%</span> ({stats.horaOuro.total} ops)</p>
                    <div className="mt-3 p-3 bg-slate-950/50 rounded-xl border border-amber-500/10">
                      <p className="text-[10px] font-bold text-amber-300 mb-1">Por que este horário?</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Às {stats.horaOuro.hora}h, das {stats.horaOuro.total} operações analisadas,{' '}
                        {Math.round(stats.horaOuro.total * stats.horaOuro.rate / 100)} foram vitórias ({stats.horaOuro.rate}%).
                        Este horário apresenta{' '}
                        <span className="text-amber-400 font-bold">
                          {stats.horaOuro.rate - stats.winRate > 0 ? '+' : ''}{(stats.horaOuro.rate - stats.winRate).toFixed(1)}%
                        </span>{' '}
                        {stats.horaOuro.rate > stats.winRate ? 'mais' : 'menos'} assertividade que a média geral de{' '}
                        <span className="text-white font-bold">{stats.winRate.toFixed(1)}%</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Top 5 Melhores Horários */}
              <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Top 5 Melhores Horários</h3>
                <div className="space-y-2">
                  {stats.top5Horas.map((h, i) => (
                    <div key={h.hora} className="flex items-center gap-3">
                      <span className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black",
                        i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-500"
                      )}>#{i + 1}</span>
                      <span className="text-sm font-bold text-white">{h.hora}h</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", h.rate >= 60 ? "bg-apex-trader-primary" : "bg-amber-500")} style={{ width: `${h.rate}%` }} />
                      </div>
                      <span className={cn("text-sm font-black", h.rate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{h.rate}%</span>
                      <span className="text-[10px] text-slate-500">{h.total} ops</span>
                    </div>
                  ))}
                  {stats.top5Horas.length === 0 && <p className="text-slate-500 text-xs">Sem dados suficientes (mín. 3 ops/hora)</p>}
                </div>
              </div>

              {/* Gráfico Performance por Hora (24h) */}
              <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Hora (24h)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={stats.horas24} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                      <ReTooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${value}% (${props.payload.wins}W / ${props.payload.total - props.payload.wins}L de ${props.payload.total} ops)`,
                          'Win Rate'
                        ]}
                      />
                      <ReferenceLine y={stats.winRate} stroke="#64748b" strokeDasharray="3 3" label={{ value: `Média ${stats.winRate.toFixed(1)}%`, fill: '#64748b', fontSize: 9 }} />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {stats.horas24.map((entry, index) => (
                          <Cell key={index} fill={
                            entry.total < 2 ? 'rgba(100,116,139,0.2)' :
                            entry.rate >= 60 ? '#10b981' :
                            entry.rate >= 50 ? '#f59e0b' : '#ef4444'
                          } />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 justify-center text-[9px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> ≥60%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500 inline-block" /> 50-60%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block" /> {'<'}50%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-700 inline-block" /> {'<'}2 ops</span>
                </div>
              </div>

              {/* Golden Hours */}
              {stats.goldenHours.length > 0 && (
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-amber-500/10">
                  <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Golden Hours (≥60% Win Rate)</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.goldenHours.map(gh => (
                      <div key={gh.hora} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-center">
                        <p className="text-lg font-black text-amber-400">{gh.hora}h</p>
                        <p className="text-[10px] text-slate-400">{gh.rate}% · {gh.total} ops</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direção + Ciclo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Direção</h3>
                  <div className="space-y-3">
                    {(Object.entries(stats.porDirecao) as [string, Stat][]).map(([dir, s]) => (
                      <div key={dir} className="flex items-center justify-between">
                        <span className={cn("text-sm font-bold", dir === 'compra' ? 'text-emerald-400' : 'text-red-400')}>{dir === 'compra' ? 'Compra' : 'Venda'}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{s.total} ops</span>
                          <span className={cn("text-sm font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '0.0'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Ciclo</h3>
                  <div className="space-y-3">
                    {(Object.entries(stats.porCiclo) as [string, Stat][]).map(([ciclo, s]) => (
                      <div key={ciclo} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{NOMES_CICLO[ciclo] || ciclo}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{s.total} ops</span>
                          <span className={cn("text-sm font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '0.0'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Domínio */}
              <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Domínio de Mercado</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(stats.porDominio) as [string, Stat][]).map(([dom, s]) => (
                    <div key={dom} className="bg-black/30 p-3 rounded-xl text-center">
                      <p className={cn("text-xs font-bold mb-1", dom === 'compra' ? 'text-emerald-400' : dom === 'venda' ? 'text-red-400' : 'text-slate-400')}>{dom.toUpperCase()}</p>
                      <p className={cn("text-lg font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '—'}%</p>
                      <p className="text-[10px] text-slate-600">{s.total} ops</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confiança */}
              <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Faixa de Confiança</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(stats.porConfianca) as [string, Stat][]).map(([faixa, s]) => (
                    <div key={faixa} className="bg-black/30 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">{faixa}</p>
                      <p className={cn("text-lg font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '—'}%</p>
                      <p className="text-[10px] text-slate-600">{s.total} ops</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faixa + Dia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Taxa por Período</h3>
                  <div className="space-y-3">
                    {(Object.entries(stats.porFaixa) as [string, Stat][]).map(([faixa, s]) => (
                      <div key={faixa} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{faixa}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{s.total} ops</span>
                          <span className={cn("text-sm font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '—'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance por Dia da Semana</h3>
                  <div className="space-y-3">
                    {(Object.entries(stats.porDia) as [string, Stat][]).map(([dia, s]) => (
                      <div key={dia} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{NOMES_DIA[Number(dia)]}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{s.total} ops</span>
                          <span className={cn("text-sm font-black", s.total > 0 && (s.wins / s.total) * 100 >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '—'}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Consistência Interdiária */}
              {Object.keys(stats.porData).length > 0 && (
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Consistência Interdiária</h3>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                        <tr className="border-b border-white/5">
                          <th className="text-left px-3 py-2 text-[10px] font-black text-slate-500 uppercase">Data</th>
                          <th className="text-center px-3 py-2 text-[10px] font-black text-slate-500 uppercase">Melhor Hora</th>
                          <th className="text-center px-3 py-2 text-[10px] font-black text-slate-500 uppercase">Ops</th>
                          <th className="text-center px-3 py-2 text-[10px] font-black text-slate-500 uppercase">Win Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.entries(stats.porData) as [string, { total: number; wins: number; melhorHora: number }][]).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => {
                          const wr = d.total > 0 ? (d.wins / d.total) * 100 : 0;
                          return (
                            <tr key={date} className="border-b border-white/5">
                              <td className="px-3 py-2 font-mono text-slate-300">{date.split('-').reverse().join('/')}</td>
                              <td className="px-3 py-2 text-center text-amber-400 font-bold">{d.melhorHora >= 0 ? `${d.melhorHora}h` : '-'}</td>
                              <td className="px-3 py-2 text-center text-slate-400">{d.total}</td>
                              <td className="px-3 py-2 text-center"><span className={cn("font-black", wr >= 70 ? "text-apex-trader-primary" : wr >= 50 ? "text-amber-500" : "text-red-500")}>{wr.toFixed(1)}%</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== GALERIA DE PERDAS ===== */}
          {subTab === 'losses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 text-center">
                  <p className="text-[10px] text-red-400 font-black uppercase">Domínio Desalinhado</p>
                  <p className="text-2xl font-black text-red-400">{auditoria.dominioDesalinhado}</p>
                </div>
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 text-center">
                  <p className="text-[10px] text-red-400 font-black uppercase">Ciclo Desfavorável</p>
                  <p className="text-2xl font-black text-red-400">{auditoria.cicloDesfavoravel}</p>
                </div>
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 text-center">
                  <p className="text-[10px] text-red-400 font-black uppercase">Com Contradições</p>
                  <p className="text-2xl font-black text-red-400">{auditoria.comContradicoes}</p>
                </div>
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-center">
                  <p className="text-[10px] text-emerald-400 font-black uppercase">Win Rate Potencial</p>
                  <p className={cn("text-2xl font-black", auditoria.winRatePotencial >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>{auditoria.winRatePotencial > 0 ? auditoria.winRatePotencial.toFixed(1) : '—'}%</p>
                  <p className="text-[10px] text-slate-500 mb-2">se todos os filtros aplicados ({auditoria.lossesEvitaveis} evitáveis)</p>
                  <div className="space-y-1 text-left">
                    {auditoria.filtros.filter(f => f.lossesEvitados > 0).map(f => (
                      <div key={f.id} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">{f.nome}</span>
                        <span className="text-emerald-400 font-bold">-{f.lossesEvitados} → {f.winRateCom.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simulador de Filtros */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 rounded-2xl border border-emerald-500/10">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity size={14} /> Simulador de Filtros
                </h3>
                <p className="text-[10px] text-slate-500 mb-4">
                  Ative os filtros abaixo para simular o impacto no win rate. Os resultados são cumulativos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    simDominio ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5")}>
                    <input type="checkbox" checked={simDominio} onChange={e => setSimDominio(e.target.checked)} className="accent-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Exigir Alinhamento Domínio</p>
                      <p className="text-[9px] text-slate-500">Evitaria {auditoria.dominioDesalinhado} losses</p>
                    </div>
                    {simDominio && <span className="text-[10px] text-emerald-400 font-bold">ATIVO</span>}
                  </label>
                  <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    simCiclo ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5")}>
                    <input type="checkbox" checked={simCiclo} onChange={e => setSimCiclo(e.target.checked)} className="accent-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Excluir Ciclos Desfavoráveis</p>
                      <p className="text-[9px] text-slate-500">Evitaria {auditoria.cicloDesfavoravel} losses</p>
                    </div>
                    {simCiclo && <span className="text-[10px] text-emerald-400 font-bold">ATIVO</span>}
                  </label>
                  <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    simContradicoes ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5")}>
                    <input type="checkbox" checked={simContradicoes} onChange={e => setSimContradicoes(e.target.checked)} className="accent-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Zero Contradições</p>
                      <p className="text-[9px] text-slate-500">Evitaria {auditoria.comContradicoes} losses</p>
                    </div>
                    {simContradicoes && <span className="text-[10px] text-emerald-400 font-bold">ATIVO</span>}
                  </label>
                  <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    simConfianca ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5")}>
                    <input type="checkbox" checked={simConfianca} onChange={e => setSimConfianca(e.target.checked)} className="accent-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Confiança ≥ 60%</p>
                      <p className="text-[9px] text-slate-500">Evitaria {auditoria.confBaixa} losses</p>
                    </div>
                    {simConfianca && <span className="text-[10px] text-emerald-400 font-bold">ATIVO</span>}
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-white/5 flex-wrap gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-black uppercase">Win Rate Atual</p>
                    <p className="text-xl font-black text-white">{stats.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-3xl text-slate-600 font-black">→</div>
                  <div className="text-center">
                    <p className="text-[10px] text-emerald-400 font-black uppercase">Win Rate Simulado</p>
                    <p className={cn("text-xl font-black", simuladorResult.novoWinRate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>
                      {simuladorResult.algumAtivo ? simuladorResult.novoWinRate.toFixed(1) : stats.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-black uppercase">Losses Evitados</p>
                    <p className="text-xl font-black text-red-400">-{simuladorResult.totalEvitados}</p>
                  </div>
                </div>

                {simuladorResult.algumAtivo && simuladorResult.totalEvitados > 0 && (
                  <p className="text-xs text-emerald-400/80 mt-3 italic">
                    Se você ativar {simuladorResult.filtrosAtivos}, evitaria {simuladorResult.totalEvitados} losses e o win rate subiria de {stats.winRate.toFixed(1)}% para {simuladorResult.novoWinRate.toFixed(1)}%
                  </p>
                )}
              </div>

              <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                {simuladorResult.algumAtivo && (
                  <div className="px-4 py-2 bg-emerald-500/5 border-b border-emerald-500/10 text-[10px] text-emerald-400 font-bold">
                    Mostrando {simuladorResult.lossesRestantes.length} losses restantes (filtros do simulador aplicados)
                  </div>
                )}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Data/Hora</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Conceitos</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ciclo</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Domínio</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Conf.</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Contrad.</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ação Sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const lossesExibidas = simuladorResult.algumAtivo ? simuladorResult.lossesRestantes : auditoria.losses;
                        return lossesExibidas.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold">{simuladorResult.algumAtivo ? 'Todos os losses seriam evitados com esses filtros!' : 'Nenhuma perda no período'}</td></tr>
                        ) : lossesExibidas.map((r, i) => {
                          const domDesal = r.dominioAtual !== 'indefinido' && r.dominioAtual !== r.direcao;
                          const cicloRuim = ['consolidado', 'acumulado', 'correcao_lateral'].includes(r.ciclo);
                          const acao = domDesal ? 'Domínio desalinhado' : cicloRuim ? 'Ciclo desfavorável' : r.numContradicoes > 0 ? 'Contradições presentes' : r.confianca < 60 ? 'Confiança baixa' : 'Loss técnico';
                          return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5 font-mono text-slate-300">{r.hora}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {r.conceitos.slice(0, 2).map((c, ci) => <span key={ci} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold">{NOMES_CONCEITO[c] || c}</span>)}
                                  {r.conceitos.length > 2 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[9px] font-bold">+{r.conceitos.length - 2}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-center"><span className={cn("text-[9px] font-bold", cicloRuim ? 'text-amber-400' : 'text-slate-400')}>{NOMES_CICLO[r.ciclo] || r.ciclo}</span></td>
                              <td className="px-4 py-2.5 text-center"><span className={cn("text-[9px] font-bold", domDesal ? 'text-amber-400' : 'text-slate-400')}>{domDesal ? 'OPOSTO' : r.dominioAtual === 'indefinido' ? 'INDEF.' : 'OK'}</span></td>
                              <td className="px-4 py-2.5 text-center"><span className={cn("font-bold", r.confianca < 60 ? 'text-amber-400' : 'text-slate-300')}>{r.confianca}%</span></td>
                              <td className="px-4 py-2.5 text-center"><span className={cn("font-bold", r.numContradicoes > 0 ? 'text-amber-400' : 'text-slate-400')}>{r.numContradicoes}</span></td>
                              <td className="px-4 py-2.5">
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", acao === 'Loss técnico' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/10 text-amber-400')}>{acao}</span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== MULTI-ATIVOS ===== */}
          {subTab === 'comparativo' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativos para Comparar</span>
                  <div className="flex gap-2">
                    <button onClick={() => setBacktestAtivosSelecionados([...ativosPadrao])} className="text-[10px] font-bold text-apex-trader-primary hover:underline">Todos</button>
                    <button onClick={() => setBacktestAtivosSelecionados([backtestAtivo])} className="text-[10px] font-bold text-slate-500 hover:underline">Só atual</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ativosPadrao.map(a => (
                    <button key={a} onClick={() => {
                      if (backtestAtivosSelecionados.includes(a)) {
                        if (backtestAtivosSelecionados.length > 1) setBacktestAtivosSelecionados(backtestAtivosSelecionados.filter(x => x !== a));
                      } else {
                        setBacktestAtivosSelecionados([...backtestAtivosSelecionados, a]);
                      }
                    }} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      backtestAtivosSelecionados.includes(a) ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-slate-800 text-slate-500 border border-transparent hover:text-white")}>{a}</button>
                  ))}
                </div>
              </div>

              {comparativoLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                  <span className="text-sm text-slate-400 font-bold">Analisando {backtestAtivosSelecionados.length} ativos...</span>
                </div>
              ) : (
                <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ativo</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Win Rate</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Wins</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Losses</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Total</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Melhor Hora</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Lucro Simulado</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparativoData.map(c => (
                          <tr key={c.ativo} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 font-bold text-white">{c.ativo}</td>
                            <td className="px-4 py-2.5 text-center">
                              {c.total === 0 ? (
                                <span className="text-slate-500 text-xs italic">Sem dados</span>
                              ) : (
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", c.rate >= 60 ? "bg-apex-trader-primary" : c.rate >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(c.rate, 100)}%` }} />
                                  </div>
                                  <span className={cn("text-sm font-black", c.rate >= 60 ? "text-apex-trader-primary" : c.rate >= 50 ? "text-amber-500" : "text-red-500")}>{c.rate}%</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-emerald-400 font-bold">{c.total > 0 ? c.wins : '—'}</td>
                            <td className="px-4 py-2.5 text-center text-red-400 font-bold">{c.total > 0 ? (c.total - c.wins) : '—'}</td>
                            <td className="px-4 py-2.5 text-center text-white font-bold">{c.total > 0 ? c.total : '—'}</td>
                            <td className="px-4 py-2.5 text-center text-amber-400 font-bold">{c.bestHour}</td>
                            <td className={cn("px-4 py-2.5 text-center font-bold", c.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {c.total > 0 ? `R$ ${c.profit.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button onClick={() => { setBacktestAtivo(c.ativo); setSubTab('lista'); }}
                                className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/30">Ver</button>
                            </td>
                          </tr>
                        ))}
                        {comparativoData.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-500 font-bold">Selecione ativos e aguarde</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== DRAWDOWN ===== */}
          {subTab === 'drawdown' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/10 text-center">
                  <p className="text-[10px] text-red-400 font-black uppercase">Drawdown Máximo</p>
                  <p className="text-3xl font-black text-red-400">R$ {simulacao.maiorRebaixamento.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Maior queda do pico ao vale</p>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Momento de Maior Risco</p>
                  {simulacao.timestampMaiorDD > 0 ? <p className="text-lg font-black text-white">{new Date(simulacao.timestampMaiorDD * 1000).toLocaleString('pt-BR')}</p> : <p className="text-lg font-black text-slate-500">—</p>}
                </div>
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Fator de Segurança</p>
                  <p className={cn("text-3xl font-black", simulacao.fatorSeguranca >= 3 ? "text-apex-trader-primary" : simulacao.fatorSeguranca >= 2 ? "text-amber-500" : "text-red-500")}>{simulacao.fatorSeguranca > 0 ? `1:${simulacao.fatorSeguranca.toFixed(1)}` : '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Banca / Drawdown Máx.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Pior Sequência</p>
                  <p className="text-xl font-black text-red-500">{simulacao.maiorSeqLoss} losses</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Risco de Ruína</p>
                  <p className={cn("text-xl font-black", simulacao.riscoRuina ? "text-red-500" : "text-apex-trader-primary")}>{simulacao.riscoRuina ? 'SIM' : 'NÃO'}</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Trades p/ Recuperar</p>
                  <p className="text-xl font-black text-white">{payout > 0 ? Math.ceil(simulacao.maiorRebaixamento / (valorEntrada * (payout / 100))) : '—'}</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Exposição Média</p>
                  <p className="text-xl font-black text-white">{bancaInicial > 0 ? ((valorEntrada / bancaInicial) * 100).toFixed(1) : '0'}%</p>
                </div>
              </div>

              {simulacao.pontos.length > 1 && (
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Saldo vs Drawdown</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simulacao.pontos}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="idx" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                        <Area type="monotone" dataKey="saldo" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" strokeWidth={2} name="Saldo (R$)" />
                        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={1.5} name="Drawdown (R$)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CONCEITOS ===== */}
          {subTab === 'conceitos' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ranking de Conceitos por Assertividade</h3>
                {rankingConceitos.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-8">Nenhum conceito detectado no período</p>
                ) : (
                  <div className="space-y-2">
                    {rankingConceitos.map((c, i) => (
                      <div key={c.conceito} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-all">
                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                          i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-500"
                        )}>#{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{c.nome}</p>
                          <p className="text-[10px] text-slate-500">{c.wins}W / {c.total - c.wins}L — {c.total} sinais</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-lg font-black", c.winRate >= 60 ? "text-apex-trader-primary" : c.winRate >= 50 ? "text-amber-500" : "text-red-500")}>{c.winRate.toFixed(1)}%</p>
                        </div>
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", c.winRate >= 60 ? "bg-apex-trader-primary" : c.winRate >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(c.winRate, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {rankingConceitos.length > 0 && (
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Win Rate por Conceito</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={rankingConceitos.map(c => ({ nome: c.nome, winRate: Number(c.winRate.toFixed(1)), total: c.total }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis dataKey="nome" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} width={120} />
                        <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="winRate" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Win Rate %" />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== SIMULADOR FINANCEIRO ===== */}
          {subTab === 'lucro' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Banca Inicial (R$)</span>
                  <input type="number" value={bancaInicial} onChange={(e) => setBancaInicial(Number(e.target.value))}
                    className="w-28 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entrada</span>
                  <span className="text-xs text-white font-bold bg-slate-800 rounded-lg px-3 py-1.5">R$ {valorEntrada}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Payout</span>
                  <span className="text-xs text-white font-bold bg-slate-800 rounded-lg px-3 py-1.5">{payout}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Ops</span>
                  <span className="text-xs text-white font-bold bg-slate-800 rounded-lg px-3 py-1.5">{total}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Banca Final</p>
                  <p className={cn("text-xl font-black", simulacao.bancaFinal >= bancaInicial ? "text-apex-trader-primary" : "text-red-500")}>R$ {simulacao.bancaFinal.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">ROI</p>
                  <p className={cn("text-xl font-black", simulacao.roi >= 0 ? "text-apex-trader-primary" : "text-red-500")}>{simulacao.roi.toFixed(1)}%</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Maior Drawdown</p>
                  <p className="text-xl font-black text-orange-500">R$ {simulacao.maiorRebaixamento.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Risco de Ruína</p>
                  <p className={cn("text-xl font-black", simulacao.riscoRuina ? "text-red-500" : "text-apex-trader-primary")}>{simulacao.riscoRuina ? 'SIM' : 'NÃO'}</p>
                  <p className="text-[10px] text-slate-500">Seq. máx: {simulacao.maiorSeqLoss}</p>
                </div>
              </div>

              {simulacao.pontos.length > 1 && (
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Evolução da Banca</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={(() => {
                        const pts = simulacao.pontos.slice(1);
                        const step = pts.length > 200 ? Math.ceil(pts.length / 200) : 1;
                        return pts.filter((_, i) => i % step === 0).map(p => ({ ...p, label: `Op ${p.idx}` }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                        <ReferenceLine y={bancaInicial} stroke="#64748b" strokeDasharray="6 4" label={{ value: `R$ ${bancaInicial}`, fill: '#64748b', fontSize: 10 }} />
                        <Bar dataKey="saldo" name="Saldo (R$)" radius={[2, 2, 0, 0]}>
                          {(() => {
                            const pts = simulacao.pontos.slice(1);
                            const step = pts.length > 200 ? Math.ceil(pts.length / 200) : 1;
                            return pts.filter((_, i) => i % step === 0).map((p, i) => (
                              <Cell key={i} fill={p.saldo >= bancaInicial ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'} />
                            ));
                          })()}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Resultado projetado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Resultado da Sessão Projetada</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Lucro Líquido</span>
                      <span className={cn("font-black", simulacao.bancaFinal - bancaInicial >= 0 ? "text-emerald-400" : "text-red-400")}>R$ {(simulacao.bancaFinal - bancaInicial).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-400">Taxa Real</span><span className="font-black text-white">{winRate.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Total de Operações</span><span className="font-black text-white">{total}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Filtros Ativos</span>
                      <span className="font-bold text-slate-300 text-xs">
                        {[confiancaMinima > 0 && `Conf≥${confiancaMinima}%`, exigirAlinhamentoDominio && 'Alinhamento', zeroContradicoes && 'S/ Contradições', minConceitosConfluentes > 1 && `≥${minConceitosConfluentes} conceitos`].filter(Boolean).join(', ') || 'Nenhum'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Anatomia: Win vs Loss</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                      const winEx = backtestResultados.find(r => r.resultado === 'vitoria');
                      const lossEx = backtestResultados.find(r => r.resultado === 'derrota');
                      return (
                        <>
                          <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                            <p className="text-[10px] text-emerald-400 font-black uppercase mb-2">Exemplo WIN</p>
                            {winEx ? (
                              <div className="space-y-1 text-[10px]">
                                <p className="text-slate-400">Conceitos: <span className="text-white font-bold">{winEx.conceitos.map(c => NOMES_CONCEITO[c] || c).join(', ')}</span></p>
                                <p className="text-slate-400">Ciclo: <span className="text-white font-bold">{NOMES_CICLO[winEx.ciclo] || winEx.ciclo}</span></p>
                                <p className="text-slate-400">Conf: <span className="text-white font-bold">{winEx.confianca}%</span></p>
                              </div>
                            ) : <p className="text-slate-500 text-[10px]">Sem dados</p>}
                          </div>
                          <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                            <p className="text-[10px] text-red-400 font-black uppercase mb-2">Exemplo LOSS</p>
                            {lossEx ? (
                              <div className="space-y-1 text-[10px]">
                                <p className="text-slate-400">Conceitos: <span className="text-white font-bold">{lossEx.conceitos.map(c => NOMES_CONCEITO[c] || c).join(', ')}</span></p>
                                <p className="text-slate-400">Ciclo: <span className="text-white font-bold">{NOMES_CICLO[lossEx.ciclo] || lossEx.ciclo}</span></p>
                                <p className="text-slate-400">Conf: <span className="text-white font-bold">{lossEx.confianca}%</span></p>
                              </div>
                            ) : <p className="text-slate-500 text-[10px]">Sem dados</p>}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== GALE ===== */}
          {subTab === 'gale' && (
            <GaleTab
              resultados={backtestResultados}
              valorEntradaInicial={valorEntrada}
              payoutInicial={payout}
            />
          )}
        </>
      )}
    </div>
  );
}
