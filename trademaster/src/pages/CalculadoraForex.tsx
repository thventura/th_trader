import React from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RotateCcw,
  Target,
  DollarSign,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

const STORAGE_KEY = 'calculadora_forex_dados';

interface DadosCalculadora {
  precoEntrada: string;
  precoStopLoss: string;
  precoTakeProfit: string;
  risco: string;
  par: string;
}

const VALORES_PADRAO: DadosCalculadora = {
  precoEntrada: '',
  precoStopLoss: '',
  precoTakeProfit: '',
  risco: '',
  par: '',
};

const PARES = [
  { nome: 'EUR/USD', pipSize: 0.0001, valorPipLote: 10 },
  { nome: 'GBP/USD', pipSize: 0.0001, valorPipLote: 10 },
  { nome: 'USD/JPY', pipSize: 0.01, valorPipLote: 6.7 },
  { nome: 'USD/CHF', pipSize: 0.0001, valorPipLote: 11.2 },
  { nome: 'AUD/USD', pipSize: 0.0001, valorPipLote: 10 },
  { nome: 'NZD/USD', pipSize: 0.0001, valorPipLote: 10 },
  { nome: 'USD/CAD', pipSize: 0.0001, valorPipLote: 7.4 },
  { nome: 'XAU/USD', pipSize: 0.01, valorPipLote: 1 },
];

function carregarDados(): DadosCalculadora {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...VALORES_PADRAO };
}

function formatUSD(valor: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(valor);
}

export default function CalculadoraForex() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dados, setDados] = React.useState<DadosCalculadora>(carregarDados);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const atualizar = (campo: keyof DadosCalculadora, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpar = () => {
    setDados({ ...VALORES_PADRAO });
  };

  // Par selecionado ou padrão
  const parInfo = PARES.find((p) => p.nome === dados.par) || {
    pipSize: 0.0001,
    valorPipLote: 10,
  };

  // Valores numéricos
  const precoEntrada = parseFloat(dados.precoEntrada) || 0;
  const precoSL = parseFloat(dados.precoStopLoss) || 0;
  const precoTP = parseFloat(dados.precoTakeProfit) || 0;
  const risco = parseFloat(dados.risco) || 0;

  // Cálculos
  const distanciaSLPips =
    precoEntrada > 0 && precoSL > 0
      ? Math.abs(precoEntrada - precoSL) / parInfo.pipSize
      : 0;
  const distanciaTPPips =
    precoEntrada > 0 && precoTP > 0
      ? Math.abs(precoEntrada - precoTP) / parInfo.pipSize
      : 0;

  const lotes =
    distanciaSLPips > 0 && parInfo.valorPipLote > 0
      ? risco / (distanciaSLPips * parInfo.valorPipLote)
      : 0;

  const lucroPotencial = distanciaTPPips * parInfo.valorPipLote * lotes;
  const razaoRR = distanciaSLPips > 0 ? distanciaTPPips / distanciaSLPips : 0;

  // Cores da razão R:R
  const corRR =
    razaoRR >= 2
      ? 'text-green-400'
      : razaoRR >= 1.5
        ? 'text-yellow-400'
        : razaoRR > 0
          ? 'text-red-400'
          : 'text-slate-500';

  const bgCorRR =
    razaoRR >= 2
      ? 'bg-green-500/10 border-green-500/30'
      : razaoRR >= 1.5
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : razaoRR > 0
          ? 'bg-red-500/10 border-red-500/30'
          : isDark
            ? 'bg-slate-800/50 border-slate-700/50'
            : 'bg-gray-50 border-gray-200';

  const cardBg = cn(
    'rounded-2xl border p-5',
    isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-gray-200'
  );

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-apex-trader-primary/40',
    isDark
      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  );

  const labelClass = cn(
    'text-xs font-semibold uppercase tracking-wider mb-1.5 block',
    isDark ? 'text-slate-400' : 'text-gray-500'
  );

  const temResultado = lotes > 0;

  return (
    <div className="space-y-6 p-2 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-apex-trader-primary/10 flex items-center justify-center">
            <Calculator size={24} className="text-apex-trader-primary" />
          </div>
          <div>
            <h1
              className={cn(
                'text-2xl md:text-3xl font-black tracking-tight',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              Calculadora Forex
            </h1>
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
              Descubra quantos lotes entrar na sua operação
            </p>
          </div>
        </div>
        <button
          onClick={limpar}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            isDark
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <RotateCcw size={16} />
          Limpar
        </button>
      </div>

      {/* Seletor de Par */}
      <div className={cardBg}>
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-3',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}
        >
          Selecione o par de moedas
        </p>
        <div className="flex flex-wrap gap-2">
          {PARES.map((par) => (
            <button
              key={par.nome}
              onClick={() => atualizar('par', par.nome)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                dados.par === par.nome
                  ? 'bg-apex-trader-primary text-black'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              )}
            >
              {par.nome}
            </button>
          ))}
        </div>
        {dados.par && (
          <p className={cn('text-[10px] mt-2', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Pip size: {parInfo.pipSize} · Valor do pip/lote: ${parInfo.valorPipLote}
          </p>
        )}
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className={cardBg}>
          <h2
            className={cn(
              'text-base font-bold mb-5 flex items-center gap-2',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            <Target size={18} className="text-apex-trader-primary" />
            Dados da Operação
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Preço de Entrada */}
            <div>
              <label className={labelClass}>Preço de Entrada</label>
              <input
                type="number"
                value={dados.precoEntrada}
                onChange={(e) => atualizar('precoEntrada', e.target.value)}
                className={inputClass}
                placeholder="Ex: 1.0850"
                step="any"
                min={0}
              />
            </div>

            {/* Risco */}
            <div>
              <label className={labelClass}>Risco (USD $)</label>
              <input
                type="number"
                value={dados.risco}
                onChange={(e) => atualizar('risco', e.target.value)}
                className={inputClass}
                placeholder="Ex: 20"
                step="any"
                min={0}
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className={labelClass}>Preço do Stop Loss</label>
              <input
                type="number"
                value={dados.precoStopLoss}
                onChange={(e) => atualizar('precoStopLoss', e.target.value)}
                className={inputClass}
                placeholder="Ex: 1.0800"
                step="any"
                min={0}
              />
              {distanciaSLPips > 0 && (
                <p className={cn('text-[10px] mt-1.5', 'text-red-400')}>
                  {distanciaSLPips.toFixed(1)} pips de distância
                </p>
              )}
            </div>

            {/* Take Profit */}
            <div>
              <label className={labelClass}>Preço do Take Profit</label>
              <input
                type="number"
                value={dados.precoTakeProfit}
                onChange={(e) => atualizar('precoTakeProfit', e.target.value)}
                className={inputClass}
                placeholder="Ex: 1.0950"
                step="any"
                min={0}
              />
              {distanciaTPPips > 0 && (
                <p className={cn('text-[10px] mt-1.5', 'text-green-400')}>
                  {distanciaTPPips.toFixed(1)} pips de distância
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          {/* Lotes — destaque principal */}
          <div
            className={cn(
              'rounded-2xl border p-6 text-center',
              temResultado
                ? 'bg-apex-trader-primary/10 border-apex-trader-primary/30'
                : isDark
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-gray-50 border-gray-200'
            )}
          >
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-2',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}
            >
              Lotes a Negociar
            </p>
            <p
              className={cn(
                'text-5xl font-black tracking-tight',
                temResultado ? 'text-apex-trader-primary' : isDark ? 'text-slate-600' : 'text-gray-300'
              )}
            >
              {temResultado ? lotes.toFixed(2) : '—'}
            </p>
            {temResultado && (
              <p className={cn('text-xs mt-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {(lotes * 100000).toLocaleString('pt-BR')} unidades
              </p>
            )}
          </div>

          {/* Razão Risco/Retorno */}
          <div className={cn('rounded-2xl border p-5 text-center', bgCorRR)}>
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-1',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}
            >
              Risco / Retorno
            </p>
            <p className={cn('text-3xl font-black', corRR)}>
              {razaoRR > 0 ? `1:${razaoRR.toFixed(1)}` : '—'}
            </p>
            {razaoRR > 0 && (
              <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-gray-400')}>
                {razaoRR >= 2
                  ? 'Excelente — operação favorável'
                  : razaoRR >= 1.5
                    ? 'Aceitável — risco moderado'
                    : 'Desfavorável — considere ajustar'}
              </p>
            )}
          </div>

          {/* Cards risco vs lucro */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                'rounded-2xl border p-4 flex flex-col gap-2',
                isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-gray-200'
              )}
            >
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-red-400" />
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  )}
                >
                  Risco
                </span>
              </div>
              <p className="text-lg font-black text-red-400">
                {risco > 0 ? formatUSD(risco) : '—'}
              </p>
              {distanciaSLPips > 0 && (
                <p className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                  {distanciaSLPips.toFixed(1)} pips
                </p>
              )}
            </div>

            <div
              className={cn(
                'rounded-2xl border p-4 flex flex-col gap-2',
                isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-gray-200'
              )}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" />
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  )}
                >
                  Lucro Potencial
                </span>
              </div>
              <p className="text-lg font-black text-green-400">
                {temResultado ? formatUSD(lucroPotencial) : '—'}
              </p>
              {distanciaTPPips > 0 && (
                <p className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                  {distanciaTPPips.toFixed(1)} pips
                </p>
              )}
            </div>
          </div>

          {/* Resumo */}
          {temResultado && (
            <div className={cardBg}>
              <h3
                className={cn(
                  'text-sm font-bold mb-3',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                Resumo
              </h3>
              <div className="space-y-2">
                <ResumoLinha isDark={isDark} label="Par" valor={dados.par || 'Padrão'} />
                <ResumoLinha isDark={isDark} label="Entrada" valor={dados.precoEntrada} />
                <ResumoLinha
                  isDark={isDark}
                  label="Stop Loss"
                  valor={`${dados.precoStopLoss} (${distanciaSLPips.toFixed(1)} pips)`}
                />
                <ResumoLinha
                  isDark={isDark}
                  label="Take Profit"
                  valor={`${dados.precoTakeProfit} (${distanciaTPPips.toFixed(1)} pips)`}
                />
                <div
                  className={cn(
                    'h-px my-1',
                    isDark ? 'bg-slate-700' : 'bg-gray-200'
                  )}
                />
                <ResumoLinha isDark={isDark} label="Lotes" valor={lotes.toFixed(2)} destaque="text-apex-trader-primary" />
                <ResumoLinha isDark={isDark} label="Risco" valor={formatUSD(risco)} destaque="text-red-400" />
                <ResumoLinha isDark={isDark} label="Lucro Potencial" valor={formatUSD(lucroPotencial)} destaque="text-green-400" />
                <ResumoLinha isDark={isDark} label="Risco/Retorno" valor={`1:${razaoRR.toFixed(1)}`} destaque={corRR} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumoLinha({
  isDark,
  label,
  valor,
  destaque,
}: {
  isDark: boolean;
  label: string;
  valor: string;
  destaque?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-bold',
          destaque || (isDark ? 'text-white' : 'text-gray-900')
        )}
      >
        {valor}
      </span>
    </div>
  );
}
