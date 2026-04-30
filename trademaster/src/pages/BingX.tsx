import { useState, useEffect, useCallback, type ElementType, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Key,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Wallet,
  RefreshCw,
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  Loader2,
  History,
  BarChart3,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import type {
  BingXCredenciais,
  BingXSaldo,
  BingXPosicao,
  BingXOrdem,
  ConfigAutomacaoBingX,
  EstadoSessaoBingX,
  EstrategiaBingX,
} from '../types';
import {
  salvarCredenciais,
  carregarCredenciais,
  removerCredenciais,
  testarConexao,
  getSaldo,
  getPosicoes,
  abrirOrdem,
  fecharTodasPosicoes,
  getHistoricoOrdens,
  PARES_POPULARES,
} from '../lib/bingx';

// ── Constantes ──

type AbaInterna = 'visao-geral' | 'automacao' | 'historico';

const ESTRATEGIAS: { value: EstrategiaBingX; label: string; descricao: string }[] = [
  {
    value: 'manual',
    label: 'Manual',
    descricao: 'Você define a direção e executa a ordem manualmente.',
  },
  {
    value: 'tendencia',
    label: 'Seguidor de Tendência',
    descricao: 'Opera na direção da tendência com base em médias móveis.',
  },
  {
    value: 'scalping',
    label: 'Scalping Rápido',
    descricao: 'Entradas e saídas rápidas com alvos pequenos e SL curto.',
  },
];

// ── Helpers de formatação ──

function formatUSDT(valor: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Tela de Conexão ──

function TelaConexao({ onConectado }: { onConectado: (creds: BingXCredenciais) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [mostrarSecret, setMostrarSecret] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleConectar(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || !secretKey.trim()) return;
    setCarregando(true);
    setErro('');
    const creds = { apiKey: apiKey.trim(), secretKey: secretKey.trim() };
    const ok = await testarConexao(creds);
    if (ok) {
      salvarCredenciais(creds);
      onConectado(creds);
    } else {
      setErro('Não foi possível conectar. Verifique suas chaves e tente novamente.');
    }
    setCarregando(false);
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center pt-6 md:pt-12 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-apex-trader-primary/10 border border-apex-trader-primary/20 mb-4">
          <TrendingUp className="w-8 h-8 text-apex-trader-primary" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Crypto/Forex</h1>
        <p className="text-slate-400 text-base">
          Conecte sua conta e opere futuros perpétuos automaticamente
        </p>
      </motion.div>

      {/* Card principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 border border-apex-trader-primary/10">
          <form onSubmit={handleConectar} className="space-y-5">
            {/* API Key */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Key className="w-3 h-3" /> API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua API Key aqui"
                autoComplete="off"
                className="w-full px-4 py-3.5 bg-slate-900 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all placeholder-slate-700"
              />
            </div>

            {/* Secret Key */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Secret Key
              </label>
              <div className="relative">
                <input
                  type={mostrarSecret ? 'text' : 'password'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Cole sua Secret Key aqui"
                  autoComplete="off"
                  className="w-full px-4 py-3.5 bg-slate-900 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all placeholder-slate-700 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSecret((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {mostrarSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            <AnimatePresence>
              {erro && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {erro}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info segurança */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-white/5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-apex-trader-primary" />
              Suas chaves ficam salvas <strong className="text-slate-400">apenas localmente</strong> no seu dispositivo — nunca enviadas a servidores externos.
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando || !apiKey.trim() || !secretKey.trim()}
              className="w-full py-4 bg-apex-trader-primary text-slate-950 font-black rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-apex-trader-primary/20"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Conectar à BingX
                </>
              )}
            </button>
          </form>
        </div>

        {/* Link para docs */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Não sabe como obter suas chaves?{' '}
          <a
            href="https://bingx.com/en/support/articles/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-apex-trader-primary hover:underline inline-flex items-center gap-1"
          >
            Ver tutorial BingX <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Cards de Saldo ──

function CardSaldo({
  label,
  valor,
  icon: Icon,
  cor,
  sub,
}: {
  label: string;
  valor: number;
  icon: ElementType;
  cor: string;
  sub?: string;
}) {
  return (
    <div className={cn('glass-card p-5 border', cor)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <p className="text-2xl font-black text-white">{formatUSDT(valor)}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Aba Visão Geral ──

function AbaVisaoGeral({
  saldos,
  posicoes,
  ordens,
  carregandoDados,
  onRefresh,
  onFecharTodas,
}: {
  saldos: BingXSaldo[];
  posicoes: BingXPosicao[];
  ordens: BingXOrdem[];
  carregandoDados: boolean;
  onRefresh: () => void;
  onFecharTodas: () => void;
}) {
  const saldoUsdt = saldos.find((s) => s.ativo === 'USDT');
  const pnlAberto = posicoes.reduce((acc, p) => acc + p.pnl, 0);
  const margem = saldoUsdt?.margem ?? 0;

  return (
    <div className="space-y-6">
      {/* Cards de saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSaldo
          label="Disponível"
          valor={saldoUsdt?.saldoDisponivel ?? 0}
          icon={Wallet}
          cor="border-emerald-500/20 hover:border-emerald-500/30"
          sub="USDT — pronto para operar"
        />
        <CardSaldo
          label="Em Margem"
          valor={margem}
          icon={BarChart3}
          cor="border-amber-500/20 hover:border-amber-500/30"
          sub="Em posições abertas"
        />
        <div className={cn('glass-card p-5 border', pnlAberto >= 0 ? 'border-emerald-500/20' : 'border-red-500/20')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">P&L Aberto</span>
            {pnlAberto >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <p className={cn('text-2xl font-black', pnlAberto >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {pnlAberto >= 0 ? '+' : ''}{formatUSDT(pnlAberto)}
          </p>
          <p className="text-xs text-slate-600 mt-1">Não realizado</p>
        </div>
      </div>

      {/* Posições Abertas */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-apex-trader-primary" />
            <h3 className="text-sm font-bold text-white">Posições Abertas</h3>
            {posicoes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-apex-trader-primary/10 text-apex-trader-primary text-xs font-bold">
                {posicoes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {carregandoDados && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {posicoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <Target className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma posição aberta</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {posicoes.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('px-2 py-1 rounded-lg text-xs font-black', p.positionSide === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                    {p.positionSide}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{p.symbol}</p>
                    <p className="text-xs text-slate-500">×{p.alavancagem} · Entrada: {formatUSDT(p.precoEntrada)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold', p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {p.pnl >= 0 ? '+' : ''}{formatUSDT(p.pnl)}
                  </p>
                  <p className="text-xs text-slate-500">{p.quantidade} contratos</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {posicoes.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5">
            <button
              onClick={onFecharTodas}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Fechar todas as posições
            </button>
          </div>
        )}
      </div>

      {/* Últimas ordens */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">Últimas Ordens</h3>
        </div>
        {ordens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <p className="text-sm">Nenhuma ordem encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Hora', 'Par', 'Direção', 'Tipo', 'Qtd', 'Status'].map((col) => (
                    <th key={col} className="px-4 py-2.5 text-left text-slate-500 font-bold uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ordens.slice(0, 10).map((o) => (
                  <tr key={o.orderId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{formatTimestamp(o.criadoEm)}</td>
                    <td className="px-4 py-3 text-white font-medium">{o.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1', o.positionSide === 'LONG' ? 'text-emerald-400' : 'text-red-400')}>
                        {o.positionSide === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {o.positionSide}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{o.type}</td>
                    <td className="px-4 py-3 text-slate-400">{o.quantidade}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        o.status === 'FILLED' ? 'bg-emerald-500/10 text-emerald-400' :
                        o.status === 'CANCELLED' ? 'bg-slate-500/10 text-slate-400' :
                        o.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      )}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba Automação ──

function AbaAutomacao({
  saldoDisponivel,
  creds,
  onOrdemAberta,
}: {
  saldoDisponivel: number;
  creds: BingXCredenciais;
  onOrdemAberta: (ordem: BingXOrdem) => void;
}) {
  const [config, setConfig] = useState<ConfigAutomacaoBingX>({
    symbol: 'BTC-USDT',
    alavancagem: 10,
    percentualBanca: 5,
    stopLoss: 2,
    takeProfit: 4,
    estrategia: 'manual',
    direcao: 'LONG',
    metaLucro: 100,
    limitePerdas: 50,
  });

  const [sessao, setSessao] = useState<EstadoSessaoBingX>({
    status: 'aguardando',
    ordens: [],
    pnlSessao: 0,
    iniciadoEm: null,
  });

  const [abrindo, setAbrindo] = useState<'LONG' | 'SHORT' | null>(null);
  const [erroOrdem, setErroOrdem] = useState('');

  const tamanhoUSDT = (saldoDisponivel * config.percentualBanca) / 100;
  // Quantidade mínima aproximada em BTC (simplificado — em produção buscar da API)
  const quantidadeEstimada = config.symbol === 'BTC-USDT' ? 0.001 : 0.01;

  function set<K extends keyof ConfigAutomacaoBingX>(key: K, value: ConfigAutomacaoBingX[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function executarOrdem(direcao: 'LONG' | 'SHORT') {
    setAbrindo(direcao);
    setErroOrdem('');
    try {
      const side = direcao === 'LONG' ? 'BUY' : 'SELL';
      const ordem = await abrirOrdem(creds, {
        symbol: config.symbol,
        side,
        positionSide: direcao,
        type: 'MARKET',
        quantity: quantidadeEstimada,
        leverage: config.alavancagem,
      });
      onOrdemAberta(ordem);
      setSessao((prev) => ({
        ...prev,
        status: 'ativo',
        ordens: [ordem, ...prev.ordens],
        iniciadoEm: prev.iniciadoEm ?? new Date().toISOString(),
      }));
    } catch (err: unknown) {
      setErroOrdem(err instanceof Error ? err.message : 'Erro ao abrir ordem');
    } finally {
      setAbrindo(null);
    }
  }

  function encerrarSessao() {
    setSessao({ status: 'finalizado', ordens: sessao.ordens, pnlSessao: sessao.pnlSessao, iniciadoEm: sessao.iniciadoEm });
  }

  function novaSessao() {
    setSessao({ status: 'aguardando', ordens: [], pnlSessao: 0, iniciadoEm: null });
  }

  const estrategiaAtual = ESTRATEGIAS.find((e) => e.value === config.estrategia)!;

  return (
    <div className="space-y-6">
      {/* Configurar operação */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
          <Zap className="w-4 h-4 text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-white">Configurar Operação</h3>
        </div>

        <div className="p-5 space-y-5">
          {/* Linha 1: Par, Alavancagem, Direção */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Par</label>
              <select
                value={config.symbol}
                onChange={(e) => set('symbol', e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              >
                {PARES_POPULARES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Alavancagem</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={125}
                  value={config.alavancagem}
                  onChange={(e) => set('alavancagem', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
                />
                <span className="text-slate-500 text-sm font-bold">×</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Direção</label>
              <div className="flex gap-2">
                {(['LONG', 'SHORT'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => set('direcao', dir)}
                    className={cn(
                      'flex-1 py-3 rounded-xl text-sm font-black transition-all border',
                      config.direcao === dir
                        ? dir === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-slate-900 text-slate-500 border-white/5 hover:border-white/10',
                    )}
                  >
                    {dir === 'LONG' ? '↑ LONG' : '↓ SHORT'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha 2: Risco */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">% da Banca</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={config.percentualBanca}
                onChange={(e) => set('percentualBanca', Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Stop Loss %</label>
              <input
                type="number"
                min={0.1}
                max={50}
                step={0.1}
                value={config.stopLoss}
                onChange={(e) => set('stopLoss', Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Take Profit %</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={config.takeProfit}
                onChange={(e) => set('takeProfit', Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Gestão de Risco da Sessão */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gestão de Sessão</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Meta de Lucro (USDT)</label>
                <input
                  type="number"
                  min={0}
                  value={config.metaLucro}
                  onChange={(e) => set('metaLucro', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Limite de Perda (USDT)</label>
                <input
                  type="number"
                  min={0}
                  value={config.limitePerdas}
                  onChange={(e) => set('limitePerdas', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Resumo estimado */}
          <div className="p-4 rounded-xl bg-apex-trader-primary/5 border border-apex-trader-primary/15">
            <p className="text-xs font-bold text-apex-trader-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Resumo da Operação
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Tamanho estimado</p>
                <p className="text-white font-bold">{formatUSDT(tamanhoUSDT)}</p>
              </div>
              <div>
                <p className="text-slate-500">Perda máxima (SL)</p>
                <p className="text-red-400 font-bold">−{formatUSDT(tamanhoUSDT * config.stopLoss / 100 * config.alavancagem)}</p>
              </div>
              <div>
                <p className="text-slate-500">Ganho estimado (TP)</p>
                <p className="text-emerald-400 font-bold">+{formatUSDT(tamanhoUSDT * config.takeProfit / 100 * config.alavancagem)}</p>
              </div>
            </div>
          </div>

          {/* Erro */}
          <AnimatePresence>
            {erroOrdem && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {erroOrdem}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botões de execução */}
          <div className="flex gap-3">
            <button
              onClick={() => executarOrdem('LONG')}
              disabled={!!abrindo || sessao.status === 'finalizado'}
              className="flex-1 py-4 bg-emerald-500/10 text-emerald-400 font-black rounded-2xl hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {abrindo === 'LONG' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              Abrir LONG
            </button>
            <button
              onClick={() => executarOrdem('SHORT')}
              disabled={!!abrindo || sessao.status === 'finalizado'}
              className="flex-1 py-4 bg-red-500/10 text-red-400 font-black rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {abrindo === 'SHORT' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />}
              Abrir SHORT
            </button>
          </div>
        </div>
      </div>

      {/* Estratégia automática */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">Sessão Automática</h3>
          <div className={cn('ml-auto flex items-center gap-1.5 text-xs',
            sessao.status === 'ativo' ? 'text-emerald-400' :
            sessao.status === 'pausado' ? 'text-amber-400' :
            sessao.status === 'finalizado' ? 'text-blue-400' : 'text-slate-500'
          )}>
            <span className={cn('w-2 h-2 rounded-full',
              sessao.status === 'ativo' ? 'bg-emerald-500 animate-pulse' :
              sessao.status === 'pausado' ? 'bg-amber-500' :
              sessao.status === 'finalizado' ? 'bg-blue-500' : 'bg-slate-600'
            )} />
            {sessao.status === 'aguardando' ? 'Aguardando' :
             sessao.status === 'ativo' ? 'Em Operação' :
             sessao.status === 'pausado' ? 'Pausado' : 'Finalizado'}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Seletor de estratégia */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Estratégia</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {ESTRATEGIAS.map((est) => (
                <button
                  key={est.value}
                  onClick={() => set('estrategia', est.value)}
                  className={cn(
                    'p-3 rounded-xl text-left transition-all border text-sm',
                    config.estrategia === est.value
                      ? 'bg-apex-trader-primary/10 border-apex-trader-primary/30 text-apex-trader-primary'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10',
                  )}
                >
                  <p className="font-bold text-xs">{est.label}</p>
                  <p className="text-[11px] mt-0.5 opacity-70 line-clamp-2">{est.descricao}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info estratégia */}
          <div className="p-3 rounded-xl bg-slate-800/30 border border-white/5 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-apex-trader-primary" />
            {estrategiaAtual.descricao}
          </div>

          {/* Progresso */}
          {(sessao.status === 'ativo' || sessao.status === 'finalizado') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-slate-800/30 border border-white/5 rounded-xl"
            >
              <div className="grid grid-cols-3 gap-4 text-center mb-3">
                <div>
                  <p className="text-xs text-slate-500">Ordens</p>
                  <p className="text-lg font-black text-white">{sessao.ordens.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">P&L Sessão</p>
                  <p className={cn('text-lg font-black', sessao.pnlSessao >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {sessao.pnlSessao >= 0 ? '+' : ''}{formatUSDT(sessao.pnlSessao)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Meta</p>
                  <p className="text-lg font-black text-white">{formatUSDT(config.metaLucro)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-apex-trader-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sessao.pnlSessao / config.metaLucro) * 100)}%` }}
                />
              </div>
              {sessao.iniciadoEm && (
                <p className="text-xs text-slate-600 text-center mt-2">
                  Iniciado: {new Date(sessao.iniciadoEm).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </motion.div>
          )}

          {/* Botões de controle da sessão */}
          <div className="flex items-center gap-3">
            {sessao.status === 'aguardando' && (
              <button
                onClick={() => setSessao((p) => ({ ...p, status: 'ativo', iniciadoEm: new Date().toISOString() }))}
                className="flex items-center gap-2 px-5 py-3 bg-apex-trader-primary text-slate-950 font-black rounded-xl hover:brightness-110 transition-all shadow-lg shadow-apex-trader-primary/20 text-sm"
              >
                <Play className="w-4 h-4" />
                Iniciar Automação
              </button>
            )}
            {sessao.status === 'ativo' && (
              <>
                <button
                  onClick={() => setSessao((p) => ({ ...p, status: 'pausado' }))}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 text-amber-400 font-black rounded-xl hover:bg-amber-500/20 transition-all border border-amber-500/20 text-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
                <button
                  onClick={encerrarSessao}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 font-black rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 text-sm"
                >
                  <Square className="w-4 h-4" />
                  Finalizar
                </button>
              </>
            )}
            {sessao.status === 'pausado' && (
              <>
                <button
                  onClick={() => setSessao((p) => ({ ...p, status: 'ativo' }))}
                  className="flex items-center gap-2 px-5 py-3 bg-apex-trader-primary text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-sm"
                >
                  <Play className="w-4 h-4" />
                  Retomar
                </button>
                <button
                  onClick={encerrarSessao}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 font-black rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 text-sm"
                >
                  <Square className="w-4 h-4" />
                  Finalizar
                </button>
              </>
            )}
            {sessao.status === 'finalizado' && (
              <button
                onClick={novaSessao}
                className="flex items-center gap-2 px-5 py-3 bg-apex-trader-primary text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Nova Sessão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Aba Histórico ──

function AbaHistorico({ creds }: { creds: BingXCredenciais }) {
  const [ordens, setOrdens] = useState<BingXOrdem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroSymbol, setFiltroSymbol] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const data = await getHistoricoOrdens(creds, filtroSymbol || undefined, 100);
      setOrdens(data);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setCarregando(false);
    }
  }, [creds, filtroSymbol]);

  useEffect(() => { carregar(); }, [carregar]);

  const pnlTotal = ordens.reduce((acc, o) => acc + (o.pnl ?? 0), 0);
  const vitorias = ordens.filter((o) => (o.pnl ?? 0) > 0).length;
  const winRate = ordens.length > 0 ? (vitorias / ordens.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filtroSymbol}
            onChange={(e) => setFiltroSymbol(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-all"
          >
            <option value="">Todos os pares</option>
            {PARES_POPULARES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={carregar}
            className="flex items-center gap-2 px-4 py-2.5 bg-apex-trader-primary text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Resumo */}
      {ordens.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total Ordens</p>
            <p className="text-xl font-black text-white">{ordens.length}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">P&L Total</p>
            <p className={cn('text-xl font-black', pnlTotal >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {pnlTotal >= 0 ? '+' : ''}{formatUSDT(pnlTotal)}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Win Rate</p>
            <p className={cn('text-xl font-black', winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
              {winRate.toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="glass-card overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando histórico...
          </div>
        ) : erro ? (
          <div className="flex items-center gap-2 p-6 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {erro}
          </div>
        ) : ordens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <History className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma ordem encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Data/Hora', 'Par', 'Dir.', 'Tipo', 'Qtd', 'Preço', 'P&L', 'Status'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-slate-500 font-bold uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ordens.map((o) => (
                  <tr key={o.orderId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{formatTimestamp(o.criadoEm)}</td>
                    <td className="px-4 py-3 text-white font-medium">{o.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={cn('font-bold', o.positionSide === 'LONG' ? 'text-emerald-400' : 'text-red-400')}>
                        {o.positionSide}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{o.type}</td>
                    <td className="px-4 py-3 text-slate-400">{o.quantidade}</td>
                    <td className="px-4 py-3 text-slate-400">{formatUSDT(o.preco)}</td>
                    <td className="px-4 py-3">
                      {o.pnl !== undefined ? (
                        <span className={cn('font-bold', o.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {o.pnl >= 0 ? '+' : ''}{formatUSDT(o.pnl)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        o.status === 'FILLED' ? 'bg-emerald-500/10 text-emerald-400' :
                        o.status === 'CANCELLED' ? 'bg-slate-500/10 text-slate-400' :
                        o.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      )}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página Principal ──

export default function BingXPage() {
  const [creds, setCreds] = useState<BingXCredenciais | null>(() => carregarCredenciais());
  const [abaAtiva, setAbaAtiva] = useState<AbaInterna>('visao-geral');
  const [saldos, setSaldos] = useState<BingXSaldo[]>([]);
  const [posicoes, setPosicoes] = useState<BingXPosicao[]>([]);
  const [ordens, setOrdens] = useState<BingXOrdem[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [confirmandoDesconectar, setConfirmandoDesconectar] = useState(false);

  const saldoUsdt = saldos.find((s) => s.ativo === 'USDT');

  const carregarDados = useCallback(async () => {
    if (!creds) return;
    setCarregandoDados(true);
    try {
      const [s, p, o] = await Promise.all([
        getSaldo(creds),
        getPosicoes(creds),
        getHistoricoOrdens(creds, undefined, 20),
      ]);
      setSaldos(s);
      setPosicoes(p);
      setOrdens(o);
    } catch {
      // ignora silenciosamente — pode ser rate limit
    } finally {
      setCarregandoDados(false);
    }
  }, [creds]);

  useEffect(() => {
    if (creds) carregarDados();
  }, [creds, carregarDados]);

  function handleDesconectar() {
    removerCredenciais();
    setCreds(null);
    setSaldos([]);
    setPosicoes([]);
    setOrdens([]);
    setConfirmandoDesconectar(false);
  }

  async function handleFecharTodas() {
    if (!creds || posicoes.length === 0) return;
    await fecharTodasPosicoes(creds, posicoes);
    carregarDados();
  }

  if (!creds) {
    return <TelaConexao onConectado={setCreds} />;
  }

  const abas: { id: AbaInterna; label: string; icon: ElementType }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
    { id: 'automacao', label: 'Automação', icon: Zap },
    { id: 'historico', label: 'Histórico', icon: History },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header conectado */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-white">Conectado — Crypto/Forex</span>
            </div>
            {saldoUsdt && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-sm text-slate-400">
                  Disponível: <span className="text-white font-bold">{formatUSDT(saldoUsdt.saldoDisponivel)}</span>
                </span>
              </>
            )}
            {carregandoDados && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={carregarDados}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {confirmandoDesconectar ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Confirmar?</span>
                <button
                  onClick={handleDesconectar}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors text-xs"
                >
                  Sim, sair
                </button>
                <button
                  onClick={() => setConfirmandoDesconectar(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors text-xs"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoDesconectar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold"
              >
                <X className="w-3 h-3" />
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mt-4 p-1 bg-slate-900/50 rounded-xl">
          {abas.map((aba) => {
            const Icon = aba.icon;
            const ativo = abaAtiva === aba.id;
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all',
                  ativo
                    ? 'bg-apex-trader-primary text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-white',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{aba.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo das abas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={abaAtiva}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {abaAtiva === 'visao-geral' && (
            <AbaVisaoGeral
              saldos={saldos}
              posicoes={posicoes}
              ordens={ordens}
              carregandoDados={carregandoDados}
              onRefresh={carregarDados}
              onFecharTodas={handleFecharTodas}
            />
          )}
          {abaAtiva === 'automacao' && (
            <AbaAutomacao
              saldoDisponivel={saldoUsdt?.saldoDisponivel ?? 0}
              creds={creds}
              onOrdemAberta={(o) => setOrdens((prev) => [o, ...prev])}
            />
          )}
          {abaAtiva === 'historico' && <AbaHistorico creds={creds} />}
        </motion.div>
      </AnimatePresence>

      {/* Link discreto */}
      <div className="text-center pb-2">
        <a
          href="https://bingx.com/en/support/articles/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-500 transition-colors"
        >
          Futuros Perpétuos via BingX API <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  );
}
