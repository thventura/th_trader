import React from 'react';
import { cn } from '../lib/utils';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export interface ResultadoBase {
  resultado: 'vitoria' | 'derrota';
  timestamp: number;
  direcao?: 'compra' | 'venda';
}

interface OpEnriquecida extends ResultadoBase {
  nivel: 0 | 1 | 2 | 3; // 0 = normal, 1/2/3 = gale
  investidoNessa: number;
  lucroNessa: number;
  recuperou: boolean | null; // null se nível 0
}

interface SimStats {
  totalEntradas: number;
  wins: number;
  losses: number;
  winRate: number;
  lucroTotal: number;
  lossesCobertos: number;
}

interface GaleTabProps {
  resultados: ResultadoBase[];
  valorEntradaInicial: number;
  payoutInicial: number;
}

function simularGale(
  resultados: ResultadoBase[],
  maxGale: number,
  multiplicador: number,
  valorEntrada: number,
  payout: number,
): OpEnriquecida[] {
  const enriquecidas: OpEnriquecida[] = [];
  let pendingGale = 0;
  // Custo acumulado da sequência perdedora atual (para calcular lucro líquido no Gale vencedor)
  let custoAcumulado = 0;

  for (const op of resultados) {
    let nivel: 0 | 1 | 2 | 3 = 0;
    let investidoNessa = valorEntrada;
    let lucroNessa = 0;
    let recuperou: boolean | null = null;

    if (pendingGale > 0 && pendingGale <= maxGale) {
      nivel = pendingGale as 1 | 2 | 3;
      // Valor desta entrada de Gale
      investidoNessa = valorEntrada * Math.pow(multiplicador, pendingGale);

      if (op.resultado === 'vitoria') {
        lucroNessa = investidoNessa * (payout / 100);
        pendingGale = 0;
        custoAcumulado = 0;
        recuperou = true;
      } else {
        lucroNessa = -investidoNessa;
        custoAcumulado += investidoNessa;
        pendingGale++;
        recuperou = false;
        if (pendingGale > maxGale) {
          pendingGale = 0;
          custoAcumulado = 0;
        }
      }
    } else {
      nivel = 0;
      investidoNessa = valorEntrada;
      if (op.resultado === 'vitoria') {
        lucroNessa = valorEntrada * (payout / 100);
        pendingGale = 0;
        custoAcumulado = 0;
      } else {
        lucroNessa = -valorEntrada;
        pendingGale = 1;
        custoAcumulado = valorEntrada;
      }
    }

    enriquecidas.push({ ...op, nivel, investidoNessa, lucroNessa, recuperou });
  }

  return enriquecidas;
}

function calcStats(ops: OpEnriquecida[], maxGale: number): SimStats {
  // Win rate com Gale = ciclos que resultaram em lucro / total de ciclos
  // Um "ciclo" começa na entrada base e termina quando vence (ou esgota os gales)
  let ciclosGanhos = 0;
  let ciclosTotais = 0;
  let i = 0;

  if (maxGale > 0) {
    while (i < ops.length) {
      const op = ops[i];
      if (op.nivel === 0) {
        ciclosTotais++;
        if (op.resultado === 'vitoria') {
          ciclosGanhos++;
        } else {
          // Procura os gales deste ciclo
          let j = i + 1;
          let recuperou = false;
          while (j < ops.length && ops[j].nivel > 0) {
            if (ops[j].resultado === 'vitoria') { recuperou = true; break; }
            j++;
          }
          if (recuperou) ciclosGanhos++;
        }
      }
      i++;
    }
  }

  const lossesCobertos = ops.filter(o => o.nivel > 0 && o.resultado === 'vitoria').length;
  const lucroTotal = ops.reduce((acc, o) => acc + o.lucroNessa, 0);

  const totalEntradas = ops.length;
  const totalWins = ops.filter(o => o.resultado === 'vitoria').length;
  const winRate = maxGale > 0
    ? (ciclosTotais > 0 ? (ciclosGanhos / ciclosTotais) * 100 : 0)
    : (totalEntradas > 0 ? (totalWins / totalEntradas) * 100 : 0);

  return {
    totalEntradas: maxGale > 0 ? ciclosTotais : totalEntradas,
    wins: maxGale > 0 ? ciclosGanhos : totalWins,
    losses: maxGale > 0 ? ciclosTotais - ciclosGanhos : totalEntradas - totalWins,
    winRate,
    lucroTotal,
    lossesCobertos,
  };
}

const NIVEL_CORES: Record<number, string> = {
  0: '',
  1: 'text-amber-400',
  2: 'text-orange-400',
  3: 'text-red-400',
};

const NIVEL_BG: Record<number, string> = {
  0: '',
  1: 'bg-amber-400/10 border border-amber-400/20',
  2: 'bg-orange-400/10 border border-orange-400/20',
  3: 'bg-red-400/10 border border-red-400/20',
};

const NIVEL_LABEL: Record<number, string> = { 0: 'NORMAL', 1: 'P1', 2: 'P2', 3: 'P3' };

function formatCur(v: number) {
  return v >= 0
    ? `+R$ ${v.toFixed(2)}`
    : `-R$ ${Math.abs(v).toFixed(2)}`;
}

interface CardProps {
  titulo: string;
  stats: SimStats;
  cor: string;
  destaque?: boolean;
}

function StatCard({ titulo, stats, cor, destaque }: CardProps) {
  const isPos = stats.lucroTotal >= 0;
  return (
    <div className={cn(
      'rounded-xl p-4 flex flex-col gap-2',
      destaque ? 'bg-slate-800/80 border border-slate-600/50' : 'bg-slate-900/60 border border-slate-700/40',
    )}>
      <p className={cn('text-xs font-semibold uppercase tracking-wider', cor)}>{titulo}</p>
      <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
      <p className="text-xs text-slate-400">{stats.wins}W / {stats.losses}L · {stats.totalEntradas} ciclos</p>
      <p className={cn('text-sm font-semibold', isPos ? 'text-emerald-400' : 'text-red-400')}>
        {formatCur(stats.lucroTotal)}
      </p>
      {stats.lossesCobertos > 0 && (
        <p className="text-xs text-amber-400">{stats.lossesCobertos} perda(s) coberta(s)</p>
      )}
    </div>
  );
}

export default function GaleTab({ resultados, valorEntradaInicial, payoutInicial }: GaleTabProps) {
  const [maxGale, setMaxGale] = React.useState<1 | 2 | 3>(2);
  const [multiplicador, setMultiplicador] = React.useState(2.0);
  const [valorEntrada, setValorEntrada] = React.useState(valorEntradaInicial);
  const [payout, setPayout] = React.useState(payoutInicial);
  const [pagina, setPagina] = React.useState(0);
  const POR_PAGINA = 50;

  // Atualiza quando props mudam
  React.useEffect(() => { setValorEntrada(valorEntradaInicial); }, [valorEntradaInicial]);
  React.useEffect(() => { setPayout(payoutInicial); }, [payoutInicial]);

  const opsEnriquecidas = React.useMemo(
    () => simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), maxGale, multiplicador, valorEntrada, payout),
    [resultados, maxGale, multiplicador, valorEntrada, payout],
  );

  const statsSemGale = React.useMemo(() => calcStats(
    simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), 0, multiplicador, valorEntrada, payout),
    0,
  ), [resultados, multiplicador, valorEntrada, payout]);

  const statsG1 = React.useMemo(() => calcStats(
    simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), 1, multiplicador, valorEntrada, payout),
    1,
  ), [resultados, multiplicador, valorEntrada, payout]);

  const statsG2 = React.useMemo(() => calcStats(
    simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), 2, multiplicador, valorEntrada, payout),
    2,
  ), [resultados, multiplicador, valorEntrada, payout]);

  const statsG3 = React.useMemo(() => calcStats(
    simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), 3, multiplicador, valorEntrada, payout),
    3,
  ), [resultados, multiplicador, valorEntrada, payout]);

  // Curva de banca: sem gale vs com gale selecionado
  const curvaData = React.useMemo(() => {
    const semGaleOps = simularGale([...resultados].sort((a, b) => a.timestamp - b.timestamp), 0, multiplicador, valorEntrada, payout);
    let bancaSemGale = 0;
    let bancaComGale = 0;
    const pts: { idx: number; semGale: number; comGale: number }[] = [];

    const maxLen = Math.max(semGaleOps.length, opsEnriquecidas.length);
    let si = 0;
    let gi = 0;
    let ptIdx = 0;

    while (si < semGaleOps.length || gi < opsEnriquecidas.length) {
      if (si < semGaleOps.length) { bancaSemGale += semGaleOps[si].lucroNessa; si++; }
      if (gi < opsEnriquecidas.length) { bancaComGale += opsEnriquecidas[gi].lucroNessa; gi++; }
      ptIdx++;
      if (ptIdx % Math.max(1, Math.floor(maxLen / 100)) === 0 || si >= semGaleOps.length) {
        pts.push({ idx: ptIdx, semGale: parseFloat(bancaSemGale.toFixed(2)), comGale: parseFloat(bancaComGale.toFixed(2)) });
      }
    }
    // Garante último ponto
    if (pts.length === 0 || pts[pts.length - 1].idx !== ptIdx) {
      pts.push({ idx: ptIdx, semGale: parseFloat(bancaSemGale.toFixed(2)), comGale: parseFloat(bancaComGale.toFixed(2)) });
    }
    return pts;
  }, [resultados, maxGale, multiplicador, valorEntrada, payout, opsEnriquecidas]);

  const totalPaginas = Math.ceil(opsEnriquecidas.length / POR_PAGINA);
  const opsPagina = opsEnriquecidas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (resultados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw size={32} className="mb-3 opacity-40" />
        <p>Execute o backtest primeiro para ver a simulação de Proteção.</p>
      </div>
    );
  }

  const statsAtual = maxGale === 1 ? statsG1 : maxGale === 2 ? statsG2 : statsG3;
  const ganhou = statsAtual.lucroTotal >= statsSemGale.lucroTotal;

  return (
    <div className="space-y-6">
      {/* Configurações */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuração da Simulação</p>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Max Gales */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Máx. Proteções</label>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setMaxGale(n)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                    maxGale === n
                      ? 'bg-apex-trader-primary text-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white',
                  )}
                >
                  P{n}
                </button>
              ))}
            </div>
          </div>

          {/* Multiplicador */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Multiplicador</label>
            <input
              type="number"
              value={multiplicador}
              onChange={e => setMultiplicador(Math.max(1.1, parseFloat(e.target.value) || 2))}
              step="0.1"
              min="1.1"
              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center"
            />
          </div>

          {/* Valor Entrada */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Valor entrada (R$)</label>
            <input
              type="number"
              value={valorEntrada}
              onChange={e => setValorEntrada(Math.max(0.01, parseFloat(e.target.value) || 0))}
              step="1"
              min="0.01"
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center"
            />
          </div>

          {/* Payout */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Payout (%)</label>
            <input
              type="number"
              value={payout}
              onChange={e => setPayout(Math.max(1, parseFloat(e.target.value) || 0))}
              step="1"
              min="1"
              max="200"
              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center"
            />
          </div>

          {/* Info multiplicador P1/P2/P3 */}
          <div className="text-xs text-slate-500 flex flex-col gap-0.5">
            <span>P1: R$ {(valorEntrada * multiplicador).toFixed(2)}</span>
            {maxGale >= 2 && <span>P2: R$ {(valorEntrada * Math.pow(multiplicador, 2)).toFixed(2)}</span>}
            {maxGale >= 3 && <span>P3: R$ {(valorEntrada * Math.pow(multiplicador, 3)).toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {/* Cards comparativos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard titulo="Sem Proteção" stats={statsSemGale} cor="text-slate-400" />
        <StatCard titulo="Com P1" stats={statsG1} cor="text-amber-400" destaque={maxGale === 1} />
        <StatCard titulo="Com P1+P2" stats={statsG2} cor="text-orange-400" destaque={maxGale === 2} />
        <StatCard titulo="Com P1+P2+P3" stats={statsG3} cor="text-red-400" destaque={maxGale === 3} />
      </div>

      {/* Resumo da comparação */}
      <div className={cn(
        'rounded-xl p-4 border text-sm',
        ganhou ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-red-400/5 border-red-400/20',
      )}>
        <p className={cn('font-semibold', ganhou ? 'text-emerald-400' : 'text-red-400')}>
          {ganhou
            ? `Proteção P${maxGale} melhora o resultado: ${formatCur(statsAtual.lucroTotal)} vs ${formatCur(statsSemGale.lucroTotal)} sem Proteção`
            : `Proteção P${maxGale} piora o resultado: ${formatCur(statsAtual.lucroTotal)} vs ${formatCur(statsSemGale.lucroTotal)} sem Proteção`
          }
        </p>
        <p className="text-slate-400 mt-1">
          Win rate: <span className="text-white font-semibold">{statsSemGale.winRate.toFixed(1)}%</span> sem Proteção →{' '}
          <span className="text-white font-semibold">{statsAtual.winRate.toFixed(1)}%</span> com P{maxGale}
          {statsAtual.lossesCobertos > 0 && ` · ${statsAtual.lossesCobertos} perda(s) recuperada(s)`}
        </p>
      </div>

      {/* Curva de banca */}
      {curvaData.length > 1 && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Curva de Banca</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={curvaData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="idx" hide />
              <YAxis
                tickFormatter={v => `R$${v}`}
                tick={{ fill: '#64748b', fontSize: 10 }}
                width={52}
              />
              <ReTooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                formatter={(val: number, name: string) => [
                  `R$ ${val.toFixed(2)}`,
                  name === 'semGale' ? 'Sem Proteção' : `Com P${maxGale}`,
                ]}
                labelFormatter={() => ''}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="semGale" stroke="#64748b" dot={false} strokeWidth={1.5} name="semGale" />
              <Line
                type="monotone"
                dataKey="comGale"
                stroke={ganhou ? '#34d399' : '#f87171'}
                dot={false}
                strokeWidth={2}
                name="comGale"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-4 h-0.5 bg-slate-500 inline-block" /> Sem Proteção
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={cn('w-4 h-0.5 inline-block', ganhou ? 'bg-emerald-400' : 'bg-red-400')} /> Com P{maxGale}
            </span>
          </div>
        </div>
      )}

      {/* Lista de operações */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Operações Simuladas ({opsEnriquecidas.length})
          </p>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                disabled={pagina === 0}
                onClick={() => setPagina(p => p - 1)}
                className="px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700"
              >
                ←
              </button>
              <span>{pagina + 1} / {totalPaginas}</span>
              <button
                disabled={pagina >= totalPaginas - 1}
                onClick={() => setPagina(p => p + 1)}
                className="px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="divide-y divide-slate-800/60">
          {opsPagina.map((op, idx) => {
            const isWin = op.resultado === 'vitoria';
            const hora = new Date(op.timestamp * 1000);
            const horaStr = `${hora.getDate().toString().padStart(2, '0')}/${(hora.getMonth() + 1).toString().padStart(2, '0')} ${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

            return (
              <div
                key={`${op.timestamp}-${idx}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm',
                  op.nivel > 0 ? NIVEL_BG[op.nivel] : '',
                )}
              >
                {/* Badge nível */}
                <span className={cn(
                  'text-xs font-bold w-14 text-center py-0.5 rounded',
                  op.nivel === 0
                    ? (isWin ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400')
                    : cn('font-bold', NIVEL_CORES[op.nivel]),
                )}>
                  {NIVEL_LABEL[op.nivel]}
                </span>

                {/* Hora */}
                <span className="text-slate-500 text-xs w-28">{horaStr}</span>

                {/* Direção */}
                {op.direcao && (
                  <span className={cn('text-xs', op.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                    {op.direcao === 'compra' ? '▲' : '▼'}
                  </span>
                )}

                {/* Resultado */}
                {isWin
                  ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  : <XCircle size={14} className="text-red-400 shrink-0" />
                }

                {/* Valor investido */}
                <span className="text-slate-400 text-xs">R$ {op.investidoNessa.toFixed(2)}</span>

                {/* Lucro desta entrada */}
                <span className={cn('text-xs font-semibold ml-auto', op.lucroNessa >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCur(op.lucroNessa)}
                </span>

                {/* Indicador se Gale recuperou */}
                {op.nivel > 0 && op.recuperou !== null && (
                  <span className={cn('text-xs', op.recuperou ? 'text-emerald-400' : 'text-red-400')}>
                    {op.recuperou ? '✓ recuperou' : '✗ falhou'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
