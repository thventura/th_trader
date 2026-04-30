import React from 'react';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency } from '../lib/utils';
import { useData } from '../contexts/DataContext';
import { useVorna } from '../lib/useVorna';

// ── Types ──────────────────────────────────────────────────────────────────
type TipoGestao = '2x1' | '4x2' | 'jc' | 'jcs';
type TipoMercado = 'forex' | 'cripto';
type Timeframe = 'M1' | 'M5' | 'M15';

interface HistoricoOp {
  id: string;
  numero: number;
  entrada: number;
  sorosAplicado: number;
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  bancaApos: number;
  mercado: TipoMercado;
  timeframe: Timeframe;
  ativo: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const gestaoOpcoes: { id: TipoGestao; titulo: string; descricao: string; cor: string }[] = [
  { id: '2x1', titulo: '2x1 Sem Soros', descricao: 'Entrada fixa · Stop após 1 loss', cor: 'text-trademaster-blue' },
  { id: '4x2', titulo: '4x2 Sem Soros', descricao: 'Ciclos de 4 operações · Máx. 2 losses', cor: 'text-amber-400' },
  { id: 'jc', titulo: 'Juros Compostos Sem Soros', descricao: '% da banca inicial por operação', cor: 'text-purple-400' },
  { id: 'jcs', titulo: 'Juros Compostos Com Soros', descricao: '% da banca atual + lucro anterior (WIN)', cor: 'text-emerald-400' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function calcEntrada(
  gestao: TipoGestao,
  entradaBase: number,
  percentual: number,
  bancaAtual: number,
  bancaInicial: number,
  ultimoLucro: number,
  ultimoResultado: 'vitoria' | 'derrota' | null,
): { valor: number; sorosAplicado: number } {
  if (gestao === 'jc') {
    const valor = Math.max(0.01, parseFloat((bancaInicial * percentual / 100).toFixed(2)));
    return { valor, sorosAplicado: 0 };
  }
  if (gestao === 'jcs') {
    const base = parseFloat((bancaAtual * percentual / 100).toFixed(2));
    if (ultimoResultado === 'vitoria' && ultimoLucro > 0) {
      const valor = Math.max(0.01, parseFloat((base + ultimoLucro).toFixed(2)));
      return { valor, sorosAplicado: ultimoLucro };
    }
    return { valor: Math.max(0.01, base), sorosAplicado: 0 };
  }
  // 2x1 e 4x2: entrada fixa
  return { valor: entradaBase, sorosAplicado: 0 };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function GestaoRisco() {
  const { profile } = useData();
  const [bancaInicial, setBancaInicial] = React.useState(0);

  React.useEffect(() => {
    if (profile) setBancaInicial(profile.banca_inicial ?? 0);
  }, [profile]);

  // Setup
  const [configurado, setConfigurado] = React.useState(false);
  const [gestao, setGestao] = React.useState<TipoGestao>('2x1');
  const [entradaBase, setEntradaBase] = React.useState(10);
  const [percentual, setPercentual] = React.useState(2);
  const [payout, setPayout] = React.useState(87);

  // Runtime
  const [bancaAtual, setBancaAtual] = React.useState(bancaInicial);
  const [ultimoResultado, setUltimoResultado] = React.useState<'vitoria' | 'derrota' | null>(null);
  const [ultimoLucro, setUltimoLucro] = React.useState(0);
  const [historico, setHistorico] = React.useState<HistoricoOp[]>([]);
  const [emStop, setEmStop] = React.useState(false);

  // 4x2 cycle tracking
  const [opsNoCiclo, setOpsNoCiclo] = React.useState(0);
  const [lossesNoCiclo, setLossesNoCiclo] = React.useState(0);
  const [cicloAtual, setCicloAtual] = React.useState<Array<'vitoria' | 'derrota' | null>>([null, null, null, null]);

  // Register form
  const [mercado, setMercado] = React.useState<TipoMercado>('forex');
  const [timeframe, setTimeframe] = React.useState<Timeframe>('M5');
  const [ativo, setAtivoField] = React.useState('EUR/USD');

  // Market filter
  const [marketFilter, setMarketFilter] = React.useState<'all' | TipoMercado>('all');

  // Integração com Puma (Global Asset)
  const { ativoSelecionado, setAtivoSelecionado } = useVorna();

  // Sincroniza o campo local com o global
  React.useEffect(() => {
    setAtivoField(ativoSelecionado);
  }, [ativoSelecionado]);

  const aoMudarAtivo = (val: string) => {
    setAtivoField(val);
    setAtivoSelecionado(val);
  };

  const opcaoAtual = gestaoOpcoes.find(o => o.id === gestao)!;
  const { valor: proximaEntrada, sorosAplicado: proximoSoros } = calcEntrada(
    gestao, entradaBase, percentual, bancaAtual, bancaInicial, ultimoLucro, ultimoResultado
  );
  const retornoEstimado = parseFloat((proximaEntrada * payout / 100).toFixed(2));

  // Stats
  const totalLucro = bancaAtual - bancaInicial;
  const totalOps = historico.length;
  const totalWins = historico.filter(op => op.resultado === 'vitoria').length;
  const winRate = totalOps > 0 ? Math.round((totalWins / totalOps) * 100) : 0;
  const forexLucro = historico.filter(op => op.mercado === 'forex').reduce((s, op) => s + op.lucro, 0);
  const criptoLucro = historico.filter(op => op.mercado === 'cripto').reduce((s, op) => s + op.lucro, 0);

  const chartData = [
    { name: 'Início', value: bancaInicial },
    ...historico.slice().reverse().map(op => ({ name: `#${op.numero}`, value: op.bancaApos })),
  ];

  // ── Actions ───────────────────────────────────────────────────────────────
  const iniciar = () => {
    setBancaAtual(bancaInicial);
    setEmStop(false);
    setUltimoResultado(null);
    setUltimoLucro(0);
    setHistorico([]);
    setOpsNoCiclo(0);
    setLossesNoCiclo(0);
    setCicloAtual([null, null, null, null]);
    setConfigurado(true);
  };

  const registrar = (resultado: 'vitoria' | 'derrota') => {
    if (emStop) return;

    const entrada = proximaEntrada;
    let lucro: number;
    let novaBanca: number;
    let novoStop = false;

    if (resultado === 'vitoria') {
      lucro = parseFloat((entrada * payout / 100).toFixed(2));
      novaBanca = parseFloat((bancaAtual + lucro).toFixed(2));
    } else {
      lucro = -entrada;
      novaBanca = parseFloat((bancaAtual - entrada).toFixed(2));
    }

    // 2x1: stop após qualquer loss
    if (gestao === '2x1' && resultado === 'derrota') {
      novoStop = true;
    }

    // 4x2: rastrear ciclo
    let novoOps = opsNoCiclo;
    let novoLosses = lossesNoCiclo;
    let novoCiclo = [...cicloAtual] as Array<'vitoria' | 'derrota' | null>;

    if (gestao === '4x2') {
      novoCiclo[novoOps] = resultado;
      novoOps++;
      if (resultado === 'derrota') novoLosses++;

      if (novoLosses >= 2) {
        novoStop = true;
      } else if (novoOps >= 4) {
        // Ciclo completo com sucesso, reinicia
        novoOps = 0;
        novoLosses = 0;
        novoCiclo = [null, null, null, null];
      }
    }

    const op: HistoricoOp = {
      id: Date.now().toString(),
      numero: historico.length + 1,
      entrada,
      sorosAplicado: proximoSoros,
      resultado,
      lucro,
      bancaApos: novaBanca,
      mercado,
      timeframe,
      ativo,
    };

    setHistorico(prev => [op, ...prev]);
    setBancaAtual(novaBanca);
    setUltimoResultado(resultado);
    setUltimoLucro(resultado === 'vitoria' ? lucro : 0);
    if (gestao === '4x2') {
      setOpsNoCiclo(novoOps);
      setLossesNoCiclo(novoLosses);
      setCicloAtual(novoCiclo);
    }
    if (novoStop) setEmStop(true);
  };

  const resetarCiclo = () => {
    setEmStop(false);
    setUltimoResultado(null);
    setUltimoLucro(0);
    if (gestao === '4x2') {
      setOpsNoCiclo(0);
      setLossesNoCiclo(0);
      setCicloAtual([null, null, null, null]);
    }
  };

  // ── Setup Screen ──────────────────────────────────────────────────────────
  if (!configurado) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Gestão de Risco</h2>
          <p className="text-slate-400">Configure seu gerenciamento antes de começar a operar.</p>
        </header>

        {/* Tipo de gerenciamento */}
        <div className="glass-card p-8">
          <h3 className="text-xs font-bold mb-5 flex items-center gap-2 text-slate-300 uppercase tracking-widest">
            <Calculator size={16} className="text-trademaster-blue" />
            Tipo de Gerenciamento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gestaoOpcoes.map(op => (
              <button
                key={op.id}
                onClick={() => setGestao(op.id)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  gestao === op.id
                    ? 'border-trademaster-blue bg-trademaster-blue/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-sm font-black', op.cor)}>{op.titulo}</span>
                  {gestao === op.id && <CheckCircle2 size={16} className="text-trademaster-blue" />}
                </div>
                <span className="text-xs text-slate-500">{op.descricao}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configurações */}
        <div className="glass-card p-8 space-y-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Wallet size={16} className="text-trademaster-blue" />
            Configurações da Banca
          </h3>

          {/* Banca inicial — somente leitura, vem do perfil */}
          <div className="p-4 bg-trademaster-blue/5 border border-trademaster-blue/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                Banca Inicial (Perfil)
              </p>
              <p className="text-2xl font-black text-white">{formatCurrency(bancaInicial)}</p>
            </div>
            <Wallet size={20} className="text-trademaster-blue opacity-60" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {gestao === 'jc' || gestao === 'jcs' ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  % por Operação
                  <span className="ml-2 text-xs text-slate-500">
                    = {formatCurrency(parseFloat((bancaInicial * percentual / 100).toFixed(2)))} entrada
                  </span>
                </span>
                <input
                  type="number" step="0.1" min="0.1" max="20" value={percentual}
                  onChange={e => setPercentual(Number(e.target.value))}
                  className="mt-1 block w-full bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-trademaster-blue"
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Entrada Base (R$)</span>
                <input
                  type="number" min="0.01" step="0.01" value={entradaBase}
                  onChange={e => setEntradaBase(Number(e.target.value))}
                  className="mt-1 block w-full bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-trademaster-blue"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Payout da Corretora (%)</span>
              <input
                type="number" min="1" max="100" value={payout}
                onChange={e => setPayout(Number(e.target.value))}
                className="mt-1 block w-full bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-trademaster-blue"
              />
            </label>
          </div>

          {/* Preview de como o soros funciona para JCS */}
          {gestao === 'jcs' && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-slate-400 space-y-1">
              <p className="font-bold text-emerald-400 mb-2">Como funciona o Soros:</p>
              <p>• <span className="text-white">WIN</span> → próxima entrada = (banca atual × {percentual}%) + lucro anterior</p>
              <p>• <span className="text-white">LOSS</span> → próxima entrada = banca atual × {percentual}% (soros é resetado)</p>
              <p className="text-slate-500 mt-2">Exemplo: banca R${bancaInicial}, ganhou R${formatCurrency(parseFloat((bancaInicial * percentual / 100 * payout / 100).toFixed(2)))} → próxima = R${formatCurrency(parseFloat((bancaInicial * percentual / 100).toFixed(2)))} + R${formatCurrency(parseFloat((bancaInicial * percentual / 100 * payout / 100).toFixed(2)))}</p>
            </div>
          )}

          <button
            onClick={iniciar}
            className="w-full bg-trademaster-blue hover:bg-[#2563eb] text-black font-black py-4 rounded-xl shadow-lg shadow-trademaster-blue/20 transition-all text-lg"
          >
            Iniciar Gestão
          </button>
        </div>
      </div>
    );
  }

  // ── Active Management Screen ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Gestão de Risco</h2>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold', opcaoAtual.cor)}>{opcaoAtual.titulo}</span>
            <span className="text-slate-700">·</span>
            <span className="text-sm text-slate-500">{opcaoAtual.descricao}</span>
          </div>
        </div>
        <button
          onClick={() => setConfigurado(false)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-sm font-medium transition-all"
        >
          <RotateCcw size={16} />
          Alterar Configuração
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Banca Atual',
            value: formatCurrency(bancaAtual),
            sub: `Início: ${formatCurrency(bancaInicial)}`,
            cor: 'text-white',
          },
          {
            label: 'Lucro / Perda',
            value: `${totalLucro >= 0 ? '+' : ''}${formatCurrency(totalLucro)}`,
            sub: `${Math.abs(Math.round((totalLucro / bancaInicial) * 100))}% da banca`,
            cor: totalLucro >= 0 ? 'text-emerald-500' : 'text-red-500',
          },
          {
            label: 'Win Rate',
            value: `${winRate}%`,
            sub: `${totalWins}W / ${totalOps - totalWins}L de ${totalOps} ops`,
            cor: winRate >= 60 ? 'text-trademaster-blue' : 'text-amber-500',
          },
          {
            label: gestao === 'jcs' ? 'Soros Disponível' : 'Próxima Entrada',
            value: gestao === 'jcs'
              ? (ultimoResultado === 'vitoria' ? `+${formatCurrency(ultimoLucro)}` : '—')
              : formatCurrency(proximaEntrada),
            sub: gestao === 'jcs'
              ? (ultimoResultado === 'vitoria' ? 'Será adicionado à próxima' : 'Sem soros (último foi loss)')
              : `Retorno: +${formatCurrency(retornoEstimado)}`,
            cor: gestao === 'jcs' ? (ultimoResultado === 'vitoria' ? 'text-trademaster-blue' : 'text-slate-500') : 'text-slate-300',
          },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={cn('text-2xl font-black', stat.cor)}>{stat.value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: controles */}
        <div className="space-y-4">

          {/* Stop alert */}
          {emStop && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">
                  {gestao === '2x1' ? 'STOP — Loss registrado' : 'STOP — 2 losses no ciclo'}
                </p>
                <p className="text-xs text-red-300/70 mt-1">
                  {gestao === '2x1'
                    ? 'Analise o mercado antes de continuar operando.'
                    : 'Ciclo 4x2 encerrado. Analise antes de iniciar novo ciclo.'}
                </p>
                <button
                  onClick={resetarCiclo}
                  className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  Novo Ciclo
                </button>
              </div>
            </div>
          )}

          {/* 4x2 ciclo visual */}
          {gestao === '4x2' && !emStop && (
            <div className="glass-card p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Ciclo Atual — {opsNoCiclo}/4 ops · {lossesNoCiclo}/2 losses
              </p>
              <div className="flex gap-2">
                {cicloAtual.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 h-10 rounded-xl flex items-center justify-center border transition-all',
                      r === 'vitoria' ? 'bg-trademaster-blue/10 border-trademaster-blue/30' :
                        r === 'derrota' ? 'bg-red-500/10 border-red-500/30' :
                          i === opsNoCiclo ? 'bg-white/5 border-white/20 animate-pulse' :
                            'bg-white/[0.02] border-white/5'
                    )}
                  >
                    {r === 'vitoria'
                      ? <CheckCircle2 size={16} className="text-trademaster-blue" />
                      : r === 'derrota'
                        ? <XCircle size={16} className="text-red-400" />
                        : <span className="text-[10px] text-slate-600 font-bold">{i + 1}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próxima entrada */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: '#3b82f6' }} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Próxima Entrada</p>
            <p className="text-4xl font-black text-white mb-1">{formatCurrency(proximaEntrada)}</p>
            {proximoSoros > 0 && (
              <p className="text-xs text-trademaster-blue font-medium mb-1">
                Base {formatCurrency(proximaEntrada - proximoSoros)} + Soros {formatCurrency(proximoSoros)}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mb-5">
              Retorno estimado: <span className="text-emerald-500 font-bold">+{formatCurrency(retornoEstimado)}</span>
            </p>

            {!emStop && (
              <>
                {/* Seletores: mercado, timeframe, ativo */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mercado</p>
                    <div className="flex gap-1">
                      {(['forex', 'cripto'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setMercado(m)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all',
                            mercado === m
                              ? m === 'forex' ? 'bg-trademaster-blue text-black' : 'bg-amber-500 text-black'
                              : 'bg-white/5 text-slate-500 hover:text-white'
                          )}
                        >
                          {m === 'forex' ? 'FX' : 'BTC'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Timeframe</p>
                    <div className="flex gap-1">
                      {(['M1', 'M5', 'M15'] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                            timeframe === tf ? 'bg-trademaster-blue text-black' : 'bg-white/5 text-slate-500 hover:text-white'
                          )}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ativo</p>
                    <select
                      value={ativo}
                      onChange={e => aoMudarAtivo(e.target.value)}
                      className="w-full bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-slate-300"
                    >
                      <optgroup label="Forex">
                        <option>EUR/USD</option>
                        <option>GBP/USD</option>
                        <option>USD/JPY</option>
                        <option>AUD/USD</option>
                      </optgroup>
                      <optgroup label="Cripto">
                        <option>BTC/USD</option>
                        <option>ETH/USDT</option>
                        <option>SOL/USD</option>
                      </optgroup>
                      <optgroup label="Ações">
                        <option>Apple</option>
                        <option>Amazon</option>
                        <option>Tesla</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* WIN / LOSS */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => registrar('vitoria')}
                    className="flex items-center justify-center gap-2 py-5 rounded-xl font-black text-base text-black transition-all shadow-lg shadow-[#3b82f6]/20"
                    style={{ background: '#3b82f6' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
                  >
                    <CheckCircle2 size={22} />
                    WIN
                  </button>
                  <button
                    onClick={() => registrar('derrota')}
                    className="flex items-center justify-center gap-2 py-5 rounded-xl font-black text-base bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                  >
                    <XCircle size={22} />
                    LOSS
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: gráfico + breakdown por mercado */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evolução da banca */}
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold mb-6">Evolução da Banca</h3>
            {chartData.length > 1 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      formatter={(v: any) => [formatCurrency(v), 'Banca']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#bankGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 text-sm">
                Registre sua primeira operação para visualizar o gráfico.
              </div>
            )}
          </div>

          {/* Desempenho por mercado */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Desempenho por Mercado</h3>
              <div className="flex bg-slate-900 p-0.5 rounded-xl border border-white/5 gap-0.5">
                {(['all', 'forex', 'cripto'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMarketFilter(m)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                      marketFilter === m ? 'bg-trademaster-blue text-black' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {m === 'all' ? 'Todos' : m === 'forex' ? 'Forex' : 'Cripto'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: 'Forex',
                  valor: forexLucro,
                  ops: historico.filter(o => o.mercado === 'forex').length,
                  wins: historico.filter(o => o.mercado === 'forex' && o.resultado === 'vitoria').length,
                  cor: 'text-trademaster-blue', bg: 'bg-trademaster-blue',
                },
                {
                  label: 'Cripto',
                  valor: criptoLucro,
                  ops: historico.filter(o => o.mercado === 'cripto').length,
                  wins: historico.filter(o => o.mercado === 'cripto' && o.resultado === 'vitoria').length,
                  cor: 'text-amber-400', bg: 'bg-amber-500',
                },
                {
                  label: 'Geral',
                  valor: totalLucro,
                  ops: totalOps,
                  wins: totalWins,
                  cor: totalLucro >= 0 ? 'text-emerald-500' : 'text-red-500',
                  bg: 'bg-emerald-500',
                },
              ].map(row => {
                const wr = row.ops > 0 ? Math.round((row.wins / row.ops) * 100) : 0;
                return (
                  <div key={row.label} className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{row.label}</p>
                    <p className={cn('text-xl font-black mb-1', row.cor)}>
                      {row.valor >= 0 ? '+' : ''}{formatCurrency(row.valor)}
                    </p>
                    <p className="text-xs text-slate-500">{row.ops} ops · {wr}% wr</p>
                    <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', row.bg)} style={{ width: `${wr}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Histórico da Sessão</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/5 uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Ativo</th>
                  <th className="px-5 py-4 font-medium">Mercado</th>
                  <th className="px-5 py-4 font-medium">TF</th>
                  <th className="px-5 py-4 font-medium">Entrada</th>
                  {gestao === 'jcs' && <th className="px-5 py-4 font-medium">Soros</th>}
                  <th className="px-5 py-4 font-medium">Resultado</th>
                  <th className="px-5 py-4 font-medium text-right">Lucro / Perda</th>
                  <th className="px-5 py-4 font-medium text-right">Banca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historico.map(op => (
                  <tr key={op.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-sm">#{op.numero}</td>
                    <td className="px-5 py-3.5 text-sm font-medium">{op.ativo}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded uppercase',
                        op.mercado === 'forex' ? 'bg-trademaster-blue/10 text-trademaster-blue' : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {op.mercado}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-slate-400">
                        {op.timeframe}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-sm">{formatCurrency(op.entrada)}</td>
                    {gestao === 'jcs' && (
                      <td className="px-5 py-3.5 text-sm">
                        {op.sorosAplicado > 0
                          ? <span className="text-trademaster-blue font-bold">+{formatCurrency(op.sorosAplicado)}</span>
                          : <span className="text-slate-600">—</span>
                        }
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'flex items-center gap-1 text-xs font-bold',
                        op.resultado === 'vitoria' ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {op.resultado === 'vitoria' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {op.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                    <td className={cn(
                      'px-5 py-3.5 font-mono font-bold text-right text-sm',
                      op.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {op.lucro >= 0 ? '+' : ''}{formatCurrency(op.lucro)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-right text-slate-400">
                      {formatCurrency(op.bancaApos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
