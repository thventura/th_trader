import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Wallet,
  LogIn,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Crown,
  BadgeCheck,
  Loader2,
  Play,
  Pause,
  Square,
  RotateCcw,
  Activity,
  TrendingUp,
  TrendingDown,
  Settings2,
  Clock,
  BarChart3,
  Zap,
  Target,
  CheckCircle2,
  XCircle,
  History,
  BarChart,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar as CalendarIcon,
  Trophy,
  CalendarDays,
  Info
} from 'lucide-react';
import { AppleActivityCard, type ActivityData } from '../components/ui/apple-activity-ring';
import { LaserFlow } from '../components/ui/laser-focus-crypto-hero-section';
import { useVorna } from '../lib/useVorna';
import { useData } from '../contexts/DataContext';
import { obterConfigAutomacao } from '../lib/vorna';
import type { ActiveInfo } from '../lib/vorna';

import { formatCurrency, cn } from '../lib/utils';
import { BRANDING } from '../config/branding';
import { SplineScene } from '../components/ui/splite';
import { Spotlight } from '../components/ui/spotlight';
import { Card } from '../components/ui/card';
import AnoAI from '../components/ui/animated-shader-background';
import { servicoVelas } from '../lib/websocket-velas';
import { classificarVela } from '../lib/motor-fluxo-velas';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import SecaoMetricasEstrategia from '../components/MetricasEstrategia';
import type { VornaCarteira, ConfigAutomacao, EstadoAutomacao, Quadrante, EstadoWebSocket, Vela, EstadoFluxoVelas, AnaliseFluxoVelas, AnaliseLogicaPreco, OperacaoLPDetalhada, AnaliseImpulsoCorrecaoEngolfo } from '../types';
import { AUTOMACAO_PLATAFORMA_KEY, CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT, type ConfigAutomacaoPlataforma, type EstrategiaAnalise } from '../types';
import type { OperacaoAberta } from '../lib/vorna';

const BROKER_URL = 'https://trade.vornabroker.com/traderoom';

const ATIVOS_FOREX = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP',
  'GBP/JPY', 'GBP/CHF', 'EUR/JPY', 'USD/CHF', 'NZD/USD', 'AUD/CAD',
  'EUR/CHF', 'EUR/CAD', 'CHF/JPY', 'GBP/AUD', 'CAD/JPY', 'CAD/CHF',
  'GBP/CAD', 'AUD/JPY', 'EUR/NZD', 'NZD/CAD', 'NZD/CHF', 'AUD/NZD', 'EUR/AUD'
];
const ATIVOS_CRIPTO = ['BTC/USD', 'SOL/USD', 'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
const ATIVOS_ACOES = ['Apple', 'Amazon', 'McDonalds', 'Microsoft', 'Tesla'];
const ATIVOS_METAIS = ['Ouro', 'Prata', 'Cobre'];
const ATIVOS_INDICES = ['Wall Street 30', 'USTech 100', 'US SPX 500'];

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '60m', value: '60' },
];

// ── Componente: Card de Carteira ──

function CartaoCarteira({ carteira }: { carteira: VornaCarteira }) {
  const cores: Record<string, { bg: string; texto: string; borda: string }> = {
    REAL: { bg: 'bg-emerald-500/10', texto: 'text-emerald-500', borda: 'border-emerald-500/20' },
    USDT: { bg: 'bg-blue-500/10', texto: 'text-blue-500', borda: 'border-blue-500/20' },
    DEMO: { bg: 'bg-slate-500/10', texto: 'text-slate-400', borda: 'border-slate-500/20' },
  };

  const cor = cores[carteira.tipo] || cores.DEMO;
  const progressoRollover =
    carteira.rollover_total > 0
      ? Math.min((carteira.rollover / carteira.rollover_total) * 100, 100)
      : 0;

  return (
    <div className={`glass-card p-4 border ${cor.borda}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${cor.bg}`}>
            <Wallet size={14} className={cor.texto} />
          </div>
          <span className="text-xs font-bold text-slate-300">{carteira.tipo}</span>
        </div>
      </div>
      <p className={`text-xl font-bold ${cor.texto}`}>
        {carteira.tipo === 'USDT' ? `$ ${carteira.saldo.toFixed(2)}` : formatCurrency(carteira.saldo)}
      </p>
      {carteira.bonus > 0 && (
        <p className="text-xs text-amber-400 mt-1">
          Bônus: {carteira.tipo === 'USDT' ? `$ ${carteira.bonus.toFixed(2)}` : formatCurrency(carteira.bonus)}
        </p>
      )}
      {carteira.rollover_total > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Rollover</span>
            <span>{progressoRollover.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${cor.texto.replace('text-', 'bg-')}`}
              style={{ width: `${progressoRollover}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


// ── Componente: Painel de Automação ──

function PainelAutomacao({
  automacao,
  onIniciar,
  onPausar,
  onRetomar,
  onFinalizar,
  onResetar,
  ativoSelecionado,
  setAtivoSelecionado,
  ativosSDK,
  afiliadoAprovado,
}: {
  automacao: EstadoAutomacao;
  onIniciar: (config: ConfigAutomacao) => void;
  onPausar: () => void;
  onRetomar: () => void;
  onFinalizar: () => void;
  onResetar: () => void;
  ativoSelecionado: string;
  setAtivoSelecionado: (a: string) => void;
  ativosSDK: ActiveInfo[];
  afiliadoAprovado?: boolean;
}) {
  const configPlataforma: ConfigAutomacaoPlataforma = React.useMemo(() => {
    try {
      const saved = localStorage.getItem(AUTOMACAO_PLATAFORMA_KEY);
      return saved ? JSON.parse(saved) : { ...CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT };
    } catch {
      return { ...CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT };
    }
  }, []);

  const nomeExibido = (key: EstrategiaAnalise) =>
    configPlataforma.nomes_estrategias?.[key]?.trim() || BRANDING.strategyLabels[key] || key;

  const configSalva = obterConfigAutomacao();
  const [form, setForm] = useState<ConfigAutomacao>(
    configSalva || {
      estrategia: 'Quadrantes',
      gerenciamento: 'Fixo',
      quantidade_operacoes: 5,
      valor_stop: 50,
      divisao_stop: 5,
      valor_por_operacao: 10,
      ativo: 'EUR/USD',
      mercado: 'forex',
      timeframe: 'M1',
      payout: 87,
      multiplicador_martingale: 2,
      multiplicador_soros: 1.8,
      max_martingale: 2,
      usar_filtro_volume: false,
      usar_filtro_dupla_exposicao: false,
    }
  );

  // Sincroniza o form com o ativo global quando este muda
  useEffect(() => {
    setForm(prev => ({ ...prev, ativo: ativoSelecionado }));
  }, [ativoSelecionado]);

  // Sincroniza o ativo global quando o form muda (se não estiver em operação)
  const aoMudarAtivo = (novoAtivo: string) => {
    atualizarForm('ativo', novoAtivo);
    setAtivoSelecionado(novoAtivo);
  };

  // Auto-calcular valor por operação
  useEffect(() => {
    if (form.divisao_stop > 0) {
      setForm(prev => ({
        ...prev,
        valor_por_operacao: parseFloat((prev.valor_stop / prev.divisao_stop).toFixed(2)),
      }));
    }
  }, [form.valor_stop, form.divisao_stop]);

  // Buscar payout do ativo direto de ativosSDK (já carregado, sem chamada extra)
  useEffect(() => {
    if (!ativosSDK || ativosSDK.length === 0) return;
    const ativoEncontrado = ativosSDK.find(a => a.displayName === form.ativo || a.ticker === form.ativo);
    if (ativoEncontrado && ativoEncontrado.payout > 0) {
      setForm(prev => ({ ...prev, payout: ativoEncontrado.payout }));
    }
  }, [form.ativo, ativosSDK]);

  // Filtragem dinâmica de ativos do SDK por tipo de instrumento e mercado
  const ativosCalculados = useMemo<{ value: string; label: string }[]>(() => {
    if (!ativosSDK || ativosSDK.length === 0) {
      const fallback = form.mercado === 'forex' ? ATIVOS_FOREX
        : form.mercado === 'cripto' ? ATIVOS_CRIPTO
        : form.mercado === 'acoes' ? ATIVOS_ACOES
        : form.mercado === 'metais' ? ATIVOS_METAIS
        : ATIVOS_INDICES;
      return fallback.flatMap(t => [
        { value: t, label: t },
        { value: `${t} (OTC)`, label: `${t} (OTC)` },
      ]);
    }

    const tipoFiltro = form.instrumento_tipo || 'blitz';
    const base = ativosSDK.filter(a => a.instrumentType === tipoFiltro && !a.isSuspended);

    const filtered = base.filter(a => {
      const t = a.ticker.replace(/-OTC$/i, '').toUpperCase();
      if (form.mercado === 'forex') {
        return t.length === 6 && !t.includes('USDT') && !t.includes('BTC') && !t.includes('ETH');
      }
      if (form.mercado === 'cripto') {
        return t.includes('BTC') || t.includes('ETH') || t.includes('SOL') || t.includes('USDT') || t.includes('DOGE');
      }
      if (form.mercado === 'acoes') {
        return !t.includes('/') && t.length > 2 && t.length < 10 && !t.includes('USD') && !t.includes('JPY') && !t.includes('CHF') && !t.includes('GBP') && !t.includes('AUD') && !t.includes('NZD') && !t.includes('CAD');
      }
      if (form.mercado === 'metais') {
        return t.includes('GOLD') || t.includes('SILVER') || t.includes('XAU') || t.includes('XAG') || t.includes('COPPER');
      }
      if (form.mercado === 'indices') {
        return t.includes('SPX') || t.includes('NDX') || t.includes('DJI') || t.includes('DAX') || t.includes('NIKKEI') || t.includes('FTSE');
      }
      return true;
    });

    // Agrupar: mercado aberto primeiro, OTC depois
    const normais = filtered.filter(a => !a.isOtc).map(a => ({ value: a.displayName, label: a.displayName }));
    const otcs = filtered.filter(a => a.isOtc).map(a => ({ value: a.displayName, label: a.displayName }));
    return [...normais, ...otcs];
  }, [ativosSDK, form.mercado, form.instrumento_tipo]);

  const emOperacao = automacao.status === 'em_operacao' || automacao.status === 'pausado';
  const finalizado = automacao.status === 'finalizado';

  const aoIniciar = () => {
    onIniciar(form);
  };

  const aoNovaSessao = () => {
    onResetar();
  };

  const atualizarForm = (campo: keyof ConfigAutomacao, valor: string | number) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const corStatus: Record<string, string> = {
    aguardando: 'bg-slate-500',
    em_operacao: 'bg-emerald-500 animate-pulse',
    pausado: 'bg-amber-500',
    finalizado: 'bg-blue-500',
  };

  const textoStatus: Record<string, string> = {
    aguardando: 'Aguardando',
    em_operacao: 'Em Operação',
    pausado: 'Pausado',
    finalizado: 'Finalizado',
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-slate-300">Automação de Operações — {BRANDING.platformName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${corStatus[automacao.status]}`} />
          <span className="text-xs text-slate-400">{textoStatus[automacao.status]}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Banner: acesso restrito a afiliados */}
        {afiliadoAprovado === false && (
          <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-yellow-300 text-sm font-semibold">Acesso restrito</p>
              <p className="text-yellow-400/80 text-xs mt-1">
                A automação está disponível apenas para usuários cadastrados na VornaBroker pelo link de afiliado do {BRANDING.appName}.
                Cadastre-se pelo link correto e faça login novamente.
              </p>
            </div>
          </div>
        )}

        {/* Formulário de Configuração */}
        <div className={cn('space-y-4', (emOperacao || afiliadoAprovado === false) && 'opacity-50 pointer-events-none')}>
          {/* Linha 1: Estratégia + Gerenciamento + Quantidade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Estratégia</label>
              <select
                value={form.estrategia}
                onChange={e => atualizarForm('estrategia', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                {configPlataforma.estrategias_ativas.includes('Quadrantes') && <option value="Quadrantes">{nomeExibido('Quadrantes')}</option>}
                {configPlataforma.estrategias_ativas.includes('Quadrantes5min') && <option value="Quadrantes5min">{nomeExibido('Quadrantes5min')}</option>}
                {configPlataforma.estrategias_ativas.includes('FluxoVelas') && <option value="FluxoVelas">{nomeExibido('FluxoVelas')}</option>}
                {configPlataforma.estrategias_ativas.includes('LogicaDoPreco') && <option value="LogicaDoPreco">{nomeExibido('LogicaDoPreco')}</option>}
                {configPlataforma.estrategias_ativas.includes('ImpulsoCorrecaoEngolfo') && <option value="ImpulsoCorrecaoEngolfo">{nomeExibido('ImpulsoCorrecaoEngolfo')}</option>}
                {configPlataforma.estrategias_ativas.includes('CavaloTroia') && <option value="CavaloTroia">{nomeExibido('CavaloTroia')}</option>}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Gerenciamento</label>
              <select
                value={form.gerenciamento}
                onChange={e => atualizarForm('gerenciamento', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                {configPlataforma.gerenciamentos_ativos.includes('Fixo') && <option value="Fixo">Fixo</option>}
                {configPlataforma.gerenciamentos_ativos.includes('Martingale') && <option value="Martingale">Proteção</option>}
                {configPlataforma.gerenciamentos_ativos.includes('Soros') && <option value="Soros">Soros</option>}
                {configPlataforma.gerenciamentos_ativos.includes('P6') && <option value="P6">P6 — 6 Proteções</option>}
              </select>
            </div>
            {form.gerenciamento === 'P6' ? (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Sessões por dia (P6)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.sessoes_alvo_dia ?? 1}
                  onChange={e => atualizarForm('sessoes_alvo_dia', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                  disabled={emOperacao}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Quantidade de Operações</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.quantidade_operacoes}
                  onChange={e => atualizarForm('quantidade_operacoes', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                  disabled={emOperacao}
                />
              </div>
            )}
          </div>

          {/* Linha 2: Stop + Divisão + Valor por Op */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Valor do Stop (R$)</label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={form.valor_stop}
                onChange={e => atualizarForm('valor_stop', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Divisão do Stop</label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.divisao_stop}
                onChange={e => atualizarForm('divisao_stop', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Valor por Operação</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={form.valor_por_operacao}
                onChange={e => atualizarForm('valor_por_operacao', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              />
            </div>
          </div>

          {/* Linha 3: Mercado + Ativo + Timeframe + Payout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Mercado</label>
              <select
                value={form.mercado}
                onChange={e => {
                  const m = e.target.value as any;
                  // Recalcular lista filtrada para o novo mercado para pegar o primeiro ativo
                  const listaFiltrada = (() => {
                    if (!ativosSDK || ativosSDK.length === 0) {
                      if (m === 'forex') return ATIVOS_FOREX.map(t => t);
                      if (m === 'cripto') return ATIVOS_CRIPTO.map(t => t);
                      if (m === 'acoes') return ATIVOS_ACOES.map(t => t);
                      if (m === 'metais') return ATIVOS_METAIS.map(t => t);
                      return ATIVOS_INDICES.map(t => t);
                    }
                    return ativosSDK
                      .filter(a => a.instrumentType === 'blitz' && !a.isSuspended)
                      .filter(a => {
                        const t = a.ticker.replace(/-OTC$/i, '').toUpperCase();
                        if (m === 'forex') return t.length === 6 && !t.includes('USDT') && !t.includes('BTC') && !t.includes('ETH');
                        if (m === 'cripto') return t.includes('BTC') || t.includes('ETH') || t.includes('SOL') || t.includes('USDT') || t.includes('DOGE');
                        if (m === 'acoes') return !t.includes('/') && t.length > 2 && t.length < 10 && !t.includes('USD') && !t.includes('JPY') && !t.includes('CHF') && !t.includes('GBP') && !t.includes('AUD') && !t.includes('NZD') && !t.includes('CAD');
                        if (m === 'metais') return t.includes('GOLD') || t.includes('SILVER') || t.includes('XAU') || t.includes('XAG') || t.includes('COPPER');
                        if (m === 'indices') return t.includes('SPX') || t.includes('NDX') || t.includes('DJI') || t.includes('DAX') || t.includes('NIKKEI') || t.includes('FTSE');
                        return true;
                      })
                      .map(a => a.displayName);
                  })();
                  const novoAtivo = listaFiltrada[0] || '';
                  setForm(prev => ({ ...prev, mercado: m, ativo: novoAtivo }));
                  setAtivoSelecionado(novoAtivo);
                }}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                <option value="forex">Forex</option>
                <option value="cripto">Cripto</option>
                <option value="acoes">Ações</option>
                <option value="metais">Metais</option>
                <option value="indices">Índices</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Tipo de Opção</label>
              <select
                value={form.instrumento_tipo || 'blitz'}
                onChange={e => setForm((prev: ConfigAutomacao) => ({ ...prev, instrumento_tipo: e.target.value as 'blitz' | 'binary' | 'digital' }))}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                <option value="blitz">Blitz</option>
                <option value="binary">Binária</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Expiração</label>
              <select
                value={form.duracao_expiracao || 60}
                onChange={e => setForm((prev: ConfigAutomacao) => ({ ...prev, duracao_expiracao: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                <option value={60}>M1 — Final da vela M1</option>
                <option value={120}>M2 — Final da vela M2</option>
                <option value={300}>M5 — Final da vela M5</option>
                <option value={900}>M15 — Final da vela M15</option>
                <option value={1800}>M30 — Final da vela M30</option>
                <option value={3600}>H1 — Final da vela H1</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Ativo</label>
              <select
                value={form.ativo}
                onChange={e => aoMudarAtivo(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                {ativosCalculados.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Timeframe</label>
              <select
                value={form.timeframe}
                onChange={e => atualizarForm('timeframe', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              >
                <option value="M1">M1</option>
                <option value="M2">M2</option>
                <option value="M5">M5</option>
                <option value="M15">M15</option>
                {(form.estrategia === 'FluxoVelas' || form.estrategia === 'LogicaDoPreco') && (
                  <>
                    <option value="M30">M30</option>
                    <option value="M60">M60</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Payout (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.payout}
                onChange={e => atualizarForm('payout', parseInt(e.target.value) || 87)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                disabled={emOperacao}
              />
            </div>
          </div>

          {/* Campos exclusivos do Fluxo de Velas */}
          {form.estrategia === 'FluxoVelas' && (
            <div className="space-y-3 p-4 bg-apex-trader-primary/5 border border-apex-trader-primary/15 rounded-xl">
              <p className="text-xs font-bold text-apex-trader-primary uppercase tracking-wider">Configurações — Fluxo de Velas</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Janela de Horas */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Janela de Análise</label>
                  <select
                    value={form.janela_horas || 1}
                    onChange={e => setForm(prev => ({ ...prev, janela_horas: parseInt(e.target.value) as 1 | 2 | 3 | 4 }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50"
                    disabled={emOperacao}
                  >
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={3}>3 horas</option>
                    <option value={4}>4 horas</option>
                  </select>
                </div>

                {/* Meta de Lucro */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 placeholder-slate-700"
                    disabled={emOperacao}
                  />
                </div>
              </div>

              {/* Modo Contínuo */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn(
                    'w-10 h-5 rounded-full transition-all relative shrink-0',
                    form.modo_continuo ? 'bg-apex-trader-primary' : 'bg-slate-700'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                    form.modo_continuo ? 'left-5' : 'left-0.5'
                  )} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          {/* Campos exclusivos da Lógica do Preço */}
          {form.estrategia === 'LogicaDoPreco' && (
            <div className="space-y-3 p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Configurações — Lógica do Preço</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Meta de Lucro */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
                    disabled={emOperacao}
                  />
                </div>
              </div>

              {/* Modo Contínuo */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn(
                    'w-10 h-5 rounded-full transition-all relative shrink-0',
                    form.modo_continuo ? 'bg-purple-500' : 'bg-slate-700'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                    form.modo_continuo ? 'left-5' : 'left-0.5'
                  )} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          {/* Configurações Impulso-Correção-Engolfo */}
          {form.estrategia === 'ImpulsoCorrecaoEngolfo' && (
            <div className="space-y-3 p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Configurações — Impulso-Correção-Engolfo</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Detecta o padrão: <span className="text-cyan-400 font-medium">Impulso</span> (3-10 velas predominantes) →{' '}
                <span className="text-amber-400 font-medium">Correção</span> (2-5 velas contra) →{' '}
                <span className="text-emerald-400 font-medium">Engolfo</span> (candle de continuação). Opera na direção do impulso quando há espaço até o pivô.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number" min={0} step={0.01} placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    disabled={emOperacao}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative shrink-0', form.modo_continuo ? 'bg-cyan-500' : 'bg-slate-700')}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.modo_continuo ? 'left-5' : 'left-0.5')} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          {/* Filtros extras Quadrantes */}
          {form.estrategia === 'Quadrantes' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div
                    onClick={() => !emOperacao && setForm(prev => ({ ...prev, usar_filtro_volume: !prev.usar_filtro_volume }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-all relative shrink-0',
                      form.usar_filtro_volume ? 'bg-apex-trader-primary' : 'bg-slate-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                      form.usar_filtro_volume ? 'left-5' : 'left-0.5'
                    )} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Filtro de Volume</span>
                    <p className="text-[10px] text-slate-600">Confirmação via média SMA 20</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div
                    onClick={() => !emOperacao && setForm(prev => ({ ...prev, usar_filtro_dupla_exposicao: !prev.usar_filtro_dupla_exposicao }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-all relative shrink-0',
                      form.usar_filtro_dupla_exposicao ? 'bg-amber-500' : 'bg-slate-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                      form.usar_filtro_dupla_exposicao ? 'left-5' : 'left-0.5'
                    )} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Dupla Exposição</span>
                    <p className="text-[10px] text-slate-600">Níveis de suporte/resistência local</p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number" min={0} step={0.01} placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 placeholder-slate-700"
                    disabled={emOperacao}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative shrink-0', form.modo_continuo ? 'bg-apex-trader-primary' : 'bg-slate-700')}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.modo_continuo ? 'left-5' : 'left-0.5')} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          {/* Configurações Quadrantes 5min */}
          {form.estrategia === 'Quadrantes5min' && (
            <div className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configurações — Quadrantes 5min</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Máx. Proteção</label>
                  <select
                    value={form.max_martingale}
                    onChange={e => setForm(prev => ({ ...prev, max_martingale: parseInt(e.target.value) as 0 | 1 | 2 }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    disabled={emOperacao}
                  >
                    <option value={0}>Sem Proteção</option>
                    <option value={1}>Até P1</option>
                    <option value={2}>Até P2</option>
                  </select>
                </div>
                {form.max_martingale > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Multiplicador Proteção</label>
                    <input
                      type="number"
                      min={1.1}
                      max={5}
                      step={0.1}
                      value={form.multiplicador_martingale}
                      onChange={e => atualizarForm('multiplicador_martingale', parseFloat(e.target.value) || 2)}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      disabled={emOperacao}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number" min={0} step={0.01} placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-slate-700"
                    disabled={emOperacao}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative shrink-0', form.modo_continuo ? 'bg-emerald-500' : 'bg-slate-700')}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.modo_continuo ? 'left-5' : 'left-0.5')} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          {/* Configurações Cavalo de Troia */}
          {form.estrategia === 'CavaloTroia' && (
            <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Configurações — Cavalo de Troia</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Meta de Lucro (R$)</label>
                  <input
                    type="number" min={0} step={0.01} placeholder="Sem meta"
                    value={form.meta || ''}
                    onChange={e => setForm(prev => ({ ...prev, meta: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-slate-700"
                    disabled={emOperacao}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !emOperacao && setForm(prev => ({ ...prev, modo_continuo: !prev.modo_continuo }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative shrink-0', form.modo_continuo ? 'bg-amber-500' : 'bg-slate-700')}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.modo_continuo ? 'left-5' : 'left-0.5')} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">Modo Contínuo</span>
                  <p className="text-xs text-slate-600">Opera sem limite de operações até desligar manualmente</p>
                </div>
              </label>
            </div>
          )}

          <p className="text-xs text-slate-600">
            {form.estrategia === 'FluxoVelas'
              ? 'Fluxo de Velas: EMA 9/21 + Correção + Retomada. Modo derivado automaticamente da contagem do fluxo (2-3 velas → 2ª retomada, 4+ velas → 3ª retomada).'
              : form.estrategia === 'LogicaDoPreco'
              ? 'Lógica do Preço: 15 conceitos de price action (Comando, VF, Dupla Posição, etc). Confluência de conceitos gera sinais CALL/PUT.'
              : form.estrategia === 'ImpulsoCorrecaoEngolfo'
              ? 'Impulso-Correção-Engolfo: Detecta movimento dominante (3-10 velas) → pausa corretiva (2-5 velas) → candle de engolfo na direção do impulso com espaço ao pivô.'
              : form.estrategia === 'Quadrantes5min'
              ? 'Quadrantes 5min: 12 quadrantes por hora (5 min cada). Sinal = cor da última vela do quadrante. Proteção imediata na próxima vela M1.'
              : form.estrategia === 'CavaloTroia'
              ? 'Cavalo de Troia: janelas fixas de 20min (:00/:20/:40). Conta 11 velas M2 → entra na 12ª seguindo a cor da vela 11. Expiração 2min.'
              : 'Análise de quadrantes (6 por hora). Execução automática a cada 10 min.'}
          </p>
        </div>

        {/* Botões de Controle */}
        <div className="flex items-center gap-3 pt-2">
          {automacao.status === 'aguardando' && (
            <button
              onClick={aoIniciar}
              className="flex-1 py-3 bg-apex-trader-primary text-slate-950 font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Iniciar Automação
            </button>
          )}

          {automacao.status === 'em_operacao' && (
            <>
              <button
                onClick={onPausar}
                className="flex-1 py-3 bg-amber-500/10 text-amber-400 font-bold rounded-xl hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Pause size={18} />
                Pausar
              </button>
              <button
                onClick={onFinalizar}
                className="flex-1 py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Square size={18} />
                Finalizar
              </button>
            </>
          )}

          {automacao.status === 'pausado' && (
            <>
              <button
                onClick={onRetomar}
                className="flex-1 py-3 bg-apex-trader-primary text-slate-950 font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Retomar
              </button>
              <button
                onClick={onFinalizar}
                className="flex-1 py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Square size={18} />
                Finalizar
              </button>
            </>
          )}

          {finalizado && (
            <button
              onClick={aoNovaSessao}
              className="flex-1 py-3 bg-apex-trader-primary text-slate-950 font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Nova Sessão
            </button>
          )}
        </div>

        {/* Progresso (visível quando em operação ou finalizado) */}
        {(emOperacao || finalizado) && (
          <div className="p-4 bg-slate-800/30 border border-white/5 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Executadas</p>
                <p className="text-lg font-bold text-white">
                  {automacao.operacoes_executadas}/{automacao.operacoes_total}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Lucro</p>
                <p className="text-lg font-bold text-emerald-500">
                  <TrendingUp size={14} className="inline mr-1" />
                  {formatCurrency(automacao.lucro_acumulado)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Perda</p>
                <p className="text-lg font-bold text-red-500">
                  <TrendingDown size={14} className="inline mr-1" />
                  {formatCurrency(automacao.perda_acumulada)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Stop Restante</p>
                <p className="text-lg font-bold text-amber-400">
                  {formatCurrency(
                    Math.max(0, (automacao.config?.valor_stop || 0) - automacao.perda_acumulada)
                  )}
                </p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="mt-3 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-apex-trader-primary rounded-full transition-all duration-500"
                style={{
                  width: `${automacao.operacoes_total > 0
                    ? (automacao.operacoes_executadas / automacao.operacoes_total) * 100
                    : 0
                    }%`,
                }}
              />
            </div>

            {automacao.inicio && (
              <p className="text-xs text-slate-600 text-center mt-2">
                Iniciado: {new Date(automacao.inicio).toLocaleTimeString('pt-BR')}
                {automacao.ultima_verificacao && (
                  <> · Última verificação: {new Date(automacao.ultima_verificacao).toLocaleTimeString('pt-BR')}</>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Componente: Formulário de Login ──

function FormularioConexao({
  onConectar,
  carregando,
  erro,
  requer2fa,
}: {
  onConectar: (email: string, senha: string) => void;
  carregando: boolean;
  erro: string | null;
  requer2fa: boolean;
}) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const aoSubmeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) return;
    onConectar(email, senha);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col pt-6 md:pt-12">
      <header className="mb-10 text-center">
        <h2 className="text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
          Acesso à Corretora
        </h2>
        <p className="text-slate-400 mb-6">Gerencie sua conta e inicie suas operações automáticas.</p>
        
        <div className="max-w-2xl mx-auto p-4 bg-apex-trader-primary/5 border border-apex-trader-primary/20 rounded-2xl mb-4">
          <p className="text-sm text-slate-300 leading-relaxed text-center">
            <strong className="text-apex-trader-primary">Atenção!</strong> Para usar as automações do <strong className="text-white">{BRANDING.platformName}</strong>, clique no link e crie sua conta na VornaBroker.
            Toda a nossa automação funciona exclusivamente nesta corretora. Após o primeiro login, sua conta será registrada no <strong className="text-white">{BRANDING.platformName}</strong>, e você poderá utilizá-la com sua assinatura.
          </p>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Coluna 1: Criar Conta */}
          <div className="glass-card p-8 flex flex-col justify-between border-apex-trader-primary/10 hover:border-apex-trader-primary/20 transition-all group overflow-hidden relative">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-apex-trader-primary/5 blur-3xl rounded-full group-hover:bg-apex-trader-primary/10 transition-all" />
            
            <div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-apex-trader-primary/10 mb-6 group-hover:scale-110 transition-transform">
                <ExternalLink size={28} className="text-apex-trader-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Novo na VornaBroker?</h3>
              <p className="text-slate-400 leading-relaxed mb-8">
                Crie sua conta oficial e garanta integração total com o <strong>{BRANDING.platformName}</strong>.
              </p>
              
              <ul className="space-y-3 mb-10">
                {[
                  'Abertura de conta instantânea',
                  `Suporte VIP para membros ${BRANDING.platformName}`,
                  'Sem manipulações de gráfico',
                  'Integração nativa de automação'
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 size={16} className="text-apex-trader-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={BROKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 text-slate-950 font-black rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-apex-trader-primary/20 text-center flex items-center justify-center gap-2"
              style={{ background: '#3b82f6' }}
            >
              Criar Conta na VornaBroker
              <ExternalLink size={18} />
            </a>
          </div>

          {/* Coluna 2: Login */}
          <div className="glass-card p-8 border-apex-trader-primary/10 hover:border-apex-trader-primary/20 transition-all group overflow-hidden relative">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-apex-trader-primary/5 blur-3xl rounded-full group-hover:bg-apex-trader-primary/10 transition-all" />

            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-apex-trader-primary/10 mb-6 group-hover:scale-110 transition-transform">
                <LogIn size={28} className="text-apex-trader-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-1 text-white">Já possui conta?</h3>
              <p className="text-slate-400">Insira suas credenciais para conectar.</p>
            </div>

            {erro && (
              <div
                className={`p-4 rounded-xl mb-6 flex items-start gap-3 text-sm ${requer2fa
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
              >
                <AlertTriangle size={18} className="shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={aoSubmeter} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Seu Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-5 py-3.5 bg-slate-900 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-apex-trader-primary/50 transition-all"
                  disabled={carregando}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Sua Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 bg-slate-900 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-apex-trader-primary/50 transition-all pr-12"
                    disabled={carregando}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando || !email || !senha}
                className="w-full py-4 bg-apex-trader-primary text-slate-950 font-black rounded-2xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-apex-trader-primary/20"
              >
                {carregando ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Conectar Agora
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-600 italic">
              <ShieldCheck size={14} />
              <span>Conexão criptografada de ponta a ponta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Seção Apex Trader (Robô 3D) ──

function SecaoApexTrader() {
  const [notificacoes, setNotificacoes] = useState<{ id: number; valor: number; x: number; startY: number }[]>([]);

  useEffect(() => {
    const valores = [187, 312, 500, 200, 1000, 250, 425, 780, 150, 87, 350, 620];
    let counter = 0;

    const criarNotificacao = () => {
      const valor = valores[counter % valores.length];
      const x = 52 + Math.random() * 38;
      const startY = 25 + Math.random() * 35;
      const id = Date.now() + Math.random();

      setNotificacoes(prev => [...prev, { id, valor, x, startY }]);
      setTimeout(() => {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }, 3500);
      counter++;
    };

    const initialTimer = setTimeout(criarNotificacao, 1200);
    const interval = setInterval(criarNotificacao, 2200);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="w-full h-[500px] md:h-[500px] bg-slate-950/90 border-white/5 relative overflow-hidden rounded-2xl">
      <style>{`
        @keyframes floatUpMoney {
          0% { opacity: 0; transform: translateY(0px) scale(0.7); filter: blur(2px); }
          12% { opacity: 1; transform: translateY(-15px) scale(1); filter: blur(0px); }
          75% { opacity: 0.9; transform: translateY(-90px) scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: translateY(-130px) scale(0.85); filter: blur(3px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.35); }
        }
      `}</style>

      <AnoAI className="opacity-30 mix-blend-screen" />

      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20 z-10"
        fill="#3b82f6"
      />

      <div className="flex flex-col md:flex-row h-full">
        {/* Lado esquerdo — Texto */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            {BRANDING.platformName}
          </h1>
          <p className="mt-4 text-neutral-300 max-w-lg text-sm md:text-base leading-relaxed">
            O {BRANDING.platformName} foi desenvolvido para apoiar suas decisões no trading com mais clareza e consistência.
            Ele combina análise inteligente com execução automatizada, ajudando você a identificar oportunidades
            e operar com mais organização ao longo do tempo.
          </p>
        </div>

        {/* Lado direito — Robô 3D */}
        <div className="flex-1 relative">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* ── Notificações de dinheiro flutuantes ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {notificacoes.map(n => (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.startY}%`,
              animation: 'floatUpMoney 3.5s ease-out forwards',
            }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md whitespace-nowrap"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                animation: 'pulseGlow 2s ease-in-out infinite',
              }}
            >
              <TrendingUp size={13} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-black text-emerald-400">
                +{formatCurrency(n.valor)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Componente: Seção de Quadrantes (Análise de Velas) ──

function SecaoQuadrantes({
  quadranteAtual,
  countdownTexto,
  estadoWS,
  cicloMartingale,
  valorOperacaoAtual,
  historicoQuadrantes,
  estrategia,
}: {
  quadranteAtual: Quadrante | null;
  countdownTexto: string;
  estadoWS: EstadoWebSocket;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  historicoQuadrantes: Quadrante[];
  estrategia: string;
}) {
  const analise = quadranteAtual?.analise;
  const velas = quadranteAtual?.velas || [];
  const slots = Array.from({ length: 10 }, (_, i) => velas[i] || null);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-slate-300">Análise de Quadrantes</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', estadoWS.conectado ? 'bg-emerald-500' : 'bg-red-500')} />
          <span className="text-xs text-slate-500">
            {estadoWS.conectado ? 'WS Conectado' : 'WS Desconectado'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-apex-trader-primary/10">
              <Clock size={20} className="text-apex-trader-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Próxima operação em</p>
              <p className="text-2xl font-bold font-mono text-apex-trader-primary">{countdownTexto}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Quadrante Atual</p>
            <p className="text-lg font-bold text-white">
              Q{quadranteAtual?.numero || '-'}{' '}
              <span className="text-xs text-slate-500 font-normal">
                ({quadranteAtual ? `${quadranteAtual.inicio_minuto}-${quadranteAtual.fim_minuto}` : '--'})
              </span>
            </p>
          </div>
        </div>

        {/* Velas visuais — 10 slots */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3">Velas do Quadrante (M1)</p>
          <div className="flex gap-1.5">
            {slots.map((vela, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all',
                  vela
                    ? vela.cor === 'alta'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-slate-800/50 border border-white/5 text-slate-600'
                )}
              >
                {vela ? (vela.cor === 'alta' ? 'A' : 'B') : '-'}
              </div>
            ))}
          </div>

          {/* Contagem */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-emerald-400">
              Alta: {analise?.total_alta || 0}
            </span>
            <span className="text-red-400">
              Baixa: {analise?.total_baixa || 0}
            </span>
            <span className="text-slate-500">
              Pendentes: {10 - velas.length}
            </span>
          </div>
        </div>

        {/* Direção provável + Estratégia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-apex-trader-primary" />
              <p className="text-xs text-slate-500">Direção Provável</p>
            </div>
            {analise ? (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-lg font-bold uppercase',
                    analise.direcao_operacao === 'compra' ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {analise.direcao_operacao === 'compra' ? 'COMPRA (CALL)' : 'VENDA (PUT)'}
                </span>
                <span className="text-xs text-slate-500">({analise.confianca}%)</span>
              </div>
            ) : (
              <span className="text-sm text-slate-600">Aguardando velas...</span>
            )}
          </div>

          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-apex-trader-primary" />
              <p className="text-xs text-slate-500">Estratégia</p>
            </div>
            <p className="text-sm font-bold text-white">
              {estrategia}
              {estrategia !== 'Fixo' && (
                <span className="text-xs text-slate-500 font-normal ml-2">
                  (Ciclo {cicloMartingale})
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Próx. valor: {formatCurrency(valorOperacaoAtual)}
            </p>
          </div>
        </div>

        {/* Volume e Filtros adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-apex-trader-primary" />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Análise de Volume</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-600 uppercase">Vol. Quadrante</p>
                <p className="text-sm font-mono font-bold text-white">{analise?.volume_medio || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-600 uppercase">SMA 20</p>
                <p className="text-sm font-mono font-bold text-slate-400">{analise?.volume_sma_20 || 0}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className={cn(
                "px-2 py-0.5 rounded text-[8px] font-bold uppercase border",
                analise?.volume_confirmacao 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-slate-500/5 text-slate-500 border-white/5"
              )}>
                {analise?.volume_confirmacao ? "Alta Pressão" : "Baixa Pressão"}
              </div>
              <div className="text-[9px] text-slate-600 italic">
                {analise?.volume_confirmacao ? "Confirmado" : "Abaixo da média"}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-apex-trader-primary" />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dupla Exposição</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-2 py-0.5 rounded text-[8px] font-bold uppercase border",
                analise?.dupla_exposicao_detectada 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]" 
                  : "bg-slate-500/5 text-slate-500 border-white/5"
              )}>
                {analise?.dupla_exposicao_detectada ? "Detectada" : "Inativa"}
              </div>
              <span className="text-[9px] text-slate-500">
                {analise?.dupla_exposicao_detectada ? "Nível de suporte/resistência local" : "Sem níveis coincidentes"}
              </span>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
               <div 
                 className={cn("h-full transition-all", analise?.dupla_exposicao_detectada ? "bg-amber-400 w-full" : "bg-slate-800 w-0")}
               />
            </div>
          </div>
        </div>

        {/* Explicação da Operação */}
        {analise?.explicacao && (
          <div className="bg-apex-trader-primary/5 border border-apex-trader-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-apex-trader-primary" />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Racional da Operação</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{analise.explicacao}"
            </p>
          </div>
        )}

        {/* Mini-grid de quadrantes (Q1-Q6) — estilo premium */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quadrantes da Hora</p>
            <p className="text-[10px] text-slate-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map(q => {
              const hist = historicoQuadrantes.find(h => h.numero === q);
              const ehAtual = quadranteAtual?.numero === q;

              const win = hist?.resultado === 'vitoria';
              const loss = hist?.resultado === 'derrota';
              const pendente = hist && hist.resultado === null;
              const minInicio = (q === 6 ? 50 : (q - 1) * 10);
              const minFim = (q === 6 ? 59 : (q - 1) * 10 + 9);

              return (
                <div
                  key={q}
                  className="relative overflow-hidden rounded-xl border transition-all duration-300"
                  style={{
                    background: ehAtual
                      ? 'rgba(59,130,246,0.06)'
                      : win
                        ? 'rgba(16,185,129,0.06)'
                        : loss
                          ? 'rgba(239,68,68,0.06)'
                          : pendente
                            ? 'rgba(245,158,11,0.06)'
                            : 'rgba(255,255,255,0.02)',
                    borderColor: ehAtual
                      ? 'rgba(59,130,246,0.4)'
                      : win
                        ? 'rgba(16,185,129,0.3)'
                        : loss
                          ? 'rgba(239,68,68,0.3)'
                          : pendente
                            ? 'rgba(245,158,11,0.3)'
                            : 'rgba(255,255,255,0.06)',
                    boxShadow: ehAtual
                      ? '0 0 16px rgba(59,130,246,0.12), inset 0 0 12px rgba(59,130,246,0.04)'
                      : win
                        ? '0 0 8px rgba(16,185,129,0.08)'
                        : loss
                          ? '0 0 8px rgba(239,68,68,0.08)'
                          : 'none',
                  }}
                >
                  <div className="px-2 pt-2.5 pb-2 flex flex-col items-center gap-1.5">
                    {/* Label */}
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{
                      color: ehAtual ? '#3b82f6' : win ? '#10b981' : loss ? '#ef4444' : pendente ? '#f59e0b' : '#475569'
                    }}>Q{q}</p>

                    {/* Ícone de status */}
                    <div className="relative flex items-center justify-center">
                      {pendente ? (
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map(d => (
                            <div
                              key={d}
                              className="w-1 h-1 rounded-full bg-amber-400"
                              style={{ animation: `bounce 1s ease-in-out ${d * 0.2}s infinite` }}
                            />
                          ))}
                        </div>
                      ) : win ? (
                        <span className="text-base font-black text-emerald-400">W</span>
                      ) : loss ? (
                        <span className="text-base font-black text-red-400">✗</span>
                      ) : ehAtual ? (
                        <div className="relative">
                          <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}
                          />
                        </div>
                      ) : (
                        <span className="text-base font-black text-slate-700">·</span>
                      )}
                    </div>

                    {/* Faixa de minutos */}
                    <p className="text-[8px] font-mono text-slate-600">{minInicio}–{minFim}</p>
                  </div>

                  {/* Barra inferior de status */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-500"
                    style={{
                      background: ehAtual
                        ? 'linear-gradient(90deg, transparent, #3b82f6, transparent)'
                        : win ? '#10b981' : loss ? '#ef4444' : 'transparent',
                      opacity: ehAtual || win || loss ? 1 : 0
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Seção de Quadrantes 5 Minutos ──

function SecaoQuadrantes5min({
  quadranteAtual,
  countdownTexto,
  estadoWS,
  cicloMartingale,
  valorOperacaoAtual,
  historicoQuadrantes,
  galeNivel,
  gerenciamento,
  valorBase,
  payout,
  multiplicadorGale,
}: {
  quadranteAtual: import('../types').Quadrante5min | null;
  countdownTexto: string;
  estadoWS: EstadoWebSocket;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  historicoQuadrantes: import('../types').Quadrante5min[];
  galeNivel: number;
  gerenciamento: string;
  valorBase: number;
  payout: number;
  multiplicadorGale: number;
}) {
  const analise = quadranteAtual?.analise;
  const velas = quadranteAtual?.velas || [];
  const slots = Array.from({ length: 5 }, (_, i) => velas[i] || null);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-slate-300">Quadrantes 5min</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', estadoWS.conectado ? 'bg-emerald-500' : 'bg-red-500')} />
          <span className="text-xs text-slate-500">
            {estadoWS.conectado ? 'WS Conectado' : 'WS Desconectado'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Countdown + Quadrante */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-apex-trader-primary/10">
              <Clock size={20} className="text-apex-trader-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Próxima operação em</p>
              <p className="text-2xl font-bold font-mono text-apex-trader-primary">{countdownTexto}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Quadrante Atual</p>
            <p className="text-lg font-bold text-white">
              Q{quadranteAtual?.numero || '-'}{' '}
              <span className="text-xs text-slate-500 font-normal">
                ({quadranteAtual ? `${quadranteAtual.inicio_minuto}-${quadranteAtual.fim_minuto}min` : '--'})
              </span>
            </p>
          </div>
        </div>

        {/* Velas visuais — 5 slots */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3">Últimas 5 velas M1 do quadrante</p>
          <div className="flex gap-2">
            {slots.map((vela, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-xl flex flex-col items-center justify-center gap-1 py-3 transition-all border',
                  i === slots.length - 1 && vela
                    ? vela.cor === 'alta'
                      ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-red-500/20 border-red-500/60 ring-1 ring-red-500/30'
                    : vela
                    ? vela.cor === 'alta'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-600'
                )}
              >
                <span className="text-xs font-bold">
                  {vela ? (vela.cor === 'alta' ? 'A' : 'B') : '-'}
                </span>
                {i === slots.length - 1 && vela && (
                  <span className="text-[9px] font-bold text-slate-400">SINAL</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-emerald-400">Alta: {analise?.total_alta || 0}</span>
            <span className="text-red-400">Baixa: {analise?.total_baixa || 0}</span>
            <span className="text-slate-500">Pendentes: {5 - velas.length}</span>
          </div>
        </div>

        {/* Direção + Confiança */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-apex-trader-primary" />
              <p className="text-xs text-slate-500">Direção (Última Vela)</p>
            </div>
            {analise ? (
              <span className={cn('text-lg font-bold uppercase', analise.direcao_operacao === 'compra' ? 'text-emerald-400' : 'text-red-400')}>
                {analise.direcao_operacao === 'compra' ? '▲ COMPRA' : '▼ VENDA'}
              </span>
            ) : (
              <span className="text-sm text-slate-600">Aguardando...</span>
            )}
          </div>
          <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">Confiança</p>
            {analise ? (
              <div>
                <p className={cn('text-lg font-bold', analise.confianca >= 60 ? 'text-emerald-400' : analise.confianca >= 40 ? 'text-amber-400' : 'text-red-400')}>
                  {analise.confianca}%
                </p>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1.5">
                  <div className={cn('h-1.5 rounded-full', analise.confianca >= 60 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${analise.confianca}%` }} />
                </div>
              </div>
            ) : (
              <span className="text-sm text-slate-600">--</span>
            )}
          </div>
        </div>

        {/* Gerenciamento + Gale */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">{gerenciamento}</p>
              <p className="text-sm font-bold text-white">
                R$ {valorOperacaoAtual > 0 ? valorOperacaoAtual.toFixed(2) : '--'}
              </p>
            </div>
            {galeNivel > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                <span className="text-amber-400 font-bold text-sm">P{galeNivel}</span>
                <span className="text-xs text-amber-400/70">Proteção ativa</span>
              </div>
            )}
            {gerenciamento !== 'Fixo' && cicloMartingale > 0 && galeNivel === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                <span className="text-xs text-blue-400">Ciclo {cicloMartingale}</span>
              </div>
            )}
          </div>
        </div>

        {/* Simulador Financeiro da Sessão */}
        {(() => {
          const ops = historicoQuadrantes.filter(h => h.resultado !== null);
          if (ops.length === 0) return null;
          let pnl = 0;
          let wins = 0; let losses = 0;
          let winsBase = 0; let winsG1 = 0; let winsG2 = 0;
          for (const op of ops) {
            const nivel = op.gale_nivel ?? 0;
            const aposta = valorBase * Math.pow(multiplicadorGale, nivel);
            if (op.resultado === 'vitoria') {
              pnl += aposta * (payout / 100);
              wins++;
              if (nivel === 0) winsBase++;
              else if (nivel === 1) winsG1++;
              else winsG2++;
            } else {
              pnl -= aposta;
              losses++;
            }
          }
          return (
            <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulador — Sessão</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Resultado</p>
                  <p className={cn('text-base font-bold font-mono', pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {pnl >= 0 ? '+' : ''}R$ {pnl.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Win / Loss</p>
                  <p className="text-base font-bold">
                    <span className="text-emerald-400">{wins}W</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-red-400">{losses}L</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg">Base: {winsBase}W</span>
                <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg">G1: {winsG1}W</span>
                <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded-lg">G2: {winsG2}W</span>
              </div>
            </div>
          );
        })()}

        {/* Histórico de quadrantes (1-12) */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quadrantes da Hora (5min)</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(q => {
              const hist = historicoQuadrantes.find(h => h.numero === q);
              const ehAtual = quadranteAtual?.numero === q;
              const win = hist?.resultado === 'vitoria';
              const loss = hist?.resultado === 'derrota';
              const pendente = hist && hist.resultado === null;
              const minInicio = (q - 1) * 5;
              const minFim = minInicio + 4;

              return (
                <div
                  key={q}
                  className="relative overflow-hidden rounded-xl border transition-all"
                  style={{
                    background: ehAtual ? 'rgba(59,130,246,0.06)' : win ? 'rgba(16,185,129,0.06)' : loss ? 'rgba(239,68,68,0.06)' : pendente ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: ehAtual ? 'rgba(59,130,246,0.4)' : win ? 'rgba(16,185,129,0.3)' : loss ? 'rgba(239,68,68,0.3)' : pendente ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="px-1 pt-2 pb-1.5 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">Q{q}</span>
                    <span className="text-[9px] text-slate-600">{minInicio}-{minFim}</span>
                    <span className={cn('text-[10px] font-bold', win ? 'text-emerald-400' : loss ? 'text-red-400' : pendente ? 'text-amber-400' : ehAtual ? 'text-apex-trader-primary' : 'text-slate-600')}>
                      {win ? 'WIN' : loss ? 'LOSS' : pendente ? '...' : ehAtual ? 'NOW' : '-'}
                    </span>
                    {hist?.gale_nivel && hist.gale_nivel > 0 ? (
                      <span className="text-[9px] text-amber-400">G{hist.gale_nivel}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Painel de Velas em Tempo Real ──

function PainelVelas({
  ativoSelecionado,
  setAtivoSelecionado,
  timeframeSelecionado,
  setTimeframeSelecionado,
  aberto,
  onToggle,
  ativosSDK,
}: {
  ativoSelecionado: string;
  setAtivoSelecionado: (a: string) => void;
  timeframeSelecionado: string;
  setTimeframeSelecionado: (t: string) => void;
  aberto: boolean;
  onToggle: () => void;
  ativosSDK: ActiveInfo[];
}) {

  const [velas, setVelas] = useState<Vela[]>([]);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setConectado(false);
      return;
    }

    let ultimoUpdate = 0;

    // Subscrever para receber atualizações de velas
    const removerListener = servicoVelas.adicionarListener((novasVelas) => {
      const agora = Date.now();
      // Throttle: atualiza a tela no máx a cada 1 segundo para evitar travamentos
      if (agora - ultimoUpdate > 1000) {
        ultimoUpdate = agora;
        setVelas(novasVelas.slice(-20));
        setConectado(true);
      }
    });

    // Checar estado da conexão via evento
    const syncEstado = () => setConectado(servicoVelas.estaConectado());
    window.addEventListener('trademaster:ws-estado', syncEstado);

    // Sincroniza estado inicial
    setConectado(servicoVelas.estaConectado());
    setVelas(servicoVelas.obterTodasVelas().slice(-20));

    return () => {
      removerListener();
      window.removeEventListener('trademaster:ws-estado', syncEstado);
    };
  }, [aberto]);

  // Detecta Doji: corpo < 10% do range total (alinhado com o motor)
  const isDoji = (vela: Vela): boolean => {
    const corpo = Math.abs(vela.fechamento - vela.abertura);
    const range = vela.maxima - vela.minima;
    return range > 0 && (corpo / range < 0.1);
  };

  const formatHora = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatVal = (n: number) => {
    // Forex usa 5 casas, cripto pode ter menos
    const decimals = n > 100 ? 2 : 5;
    return n.toFixed(decimals);
  };

  // Exibe as últimas 20 velas, da mais recente para a mais antiga
  const velasExibidas = [...velas].reverse();

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-white/5 cursor-pointer hover:bg-white/2 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-slate-300">Análise de Velas (M1)</h3>
        </div>
        <div className="flex items-center gap-3">
          {aberto && (
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full transition-all', conectado ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600')} />
              <span className="text-xs text-slate-500">{conectado ? 'Ao vivo' : 'Conectando...'}</span>
            </div>
          )}
          {aberto ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 space-y-4">
              {/* Controles: ativo + timeframe */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 tracking-wider">Ativo</p>
                  <select
                    value={ativoSelecionado}
                    onChange={e => setAtivoSelecionado(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-apex-trader-primary/50 transition-colors"
                  >
                    {ativosSDK && ativosSDK.length > 0 ? (() => {
                      const grupos: Record<string, ActiveInfo[]> = {};
                      for (const a of ativosSDK) {
                        const t = a.ticker.replace(/-OTC$/i, '').toUpperCase();
                        let grupo: string;
                        if (a.isOtc) {
                          const isCripto = t.includes('BTC') || t.includes('ETH') || t.includes('SOL') || t.includes('USDT') || t.includes('DOGE');
                          grupo = isCripto ? 'Cripto OTC' : 'Forex OTC';
                        } else if (t.length === 6 && !t.includes('USDT') && !t.includes('BTC') && !t.includes('ETH')) {
                          grupo = 'Forex';
                        } else if (t.includes('BTC') || t.includes('ETH') || t.includes('SOL') || t.includes('USDT') || t.includes('DOGE')) {
                          grupo = 'Cripto';
                        } else if (t.includes('GOLD') || t.includes('SILVER') || t.includes('XAU') || t.includes('XAG') || t.includes('COPPER')) {
                          grupo = 'Metais';
                        } else if (t.includes('SPX') || t.includes('NDX') || t.includes('DJI') || t.includes('DAX') || t.includes('NIKKEI') || t.includes('FTSE')) {
                          grupo = 'Índices';
                        } else {
                          grupo = 'Outros';
                        }
                        if (!grupos[grupo]) grupos[grupo] = [];
                        grupos[grupo].push(a);
                      }
                      const ordem = ['Forex', 'Forex OTC', 'Cripto', 'Cripto OTC', 'Metais', 'Índices', 'Outros'];
                      return ordem.filter(g => grupos[g]).map(g => (
                        <optgroup key={g} label={g}>
                          {grupos[g].map(a => (
                            <option key={`${a.ticker}_${a.instrumentType}`} value={a.displayName}>{a.displayName}</option>
                          ))}
                        </optgroup>
                      ));
                    })() : (
                      <>
                        <optgroup label="Forex">
                          {ATIVOS_FOREX.map(a => <option key={a} value={a}>{a}</option>)}
                        </optgroup>
                        <optgroup label="Cripto">
                          {ATIVOS_CRIPTO.map(a => <option key={a} value={a}>{a}</option>)}
                        </optgroup>
                        <optgroup label="Ações">
                          {ATIVOS_ACOES.map(a => <option key={a} value={a}>{a}</option>)}
                        </optgroup>
                        <optgroup label="Metais">
                          {ATIVOS_METAIS.map(a => <option key={a} value={a}>{a}</option>)}
                        </optgroup>
                        <optgroup label="Índices">
                          {ATIVOS_INDICES.map(a => <option key={a} value={a}>{a}</option>)}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 tracking-wider">Timeframe</p>
                  <div className="flex gap-1">
                    {TIMEFRAMES.map(tf => (
                      <button
                        key={tf.value}
                        onClick={() => setTimeframeSelecionado(tf.value)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-bold transition-all',
                          timeframeSelecionado === tf.value
                            ? 'bg-apex-trader-primary text-black shadow-lg shadow-apex-trader-primary/20'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5 hover:border-white/15'
                        )}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
                  Alta (A)
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500/70" />
                  Baixa (B)
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-400/70" />
                  Doji (D)
                </div>
                <span className="ml-auto text-[10px] text-slate-600">{velasExibidas.length} velas</span>
              </div>

              {/* Grid de Velas */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10"
              >
                {velasExibidas.map((vela, i) => {
                  const doji = isDoji(vela);
                  const alta = vela.cor === 'alta' && !doji;
                  const baixa = vela.cor === 'baixa' && !doji;

                  const corpo = Math.abs(vela.fechamento - vela.abertura);
                  const range = vela.maxima - vela.minima;
                  const variacao = vela.abertura > 0
                    ? ((corpo / vela.abertura) * 100).toFixed(4)
                    : '0.0000';

                  return (
                    <div
                      key={`${vela.timestamp}-${i}`}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all',
                        i === 0 && 'ring-1',
                        alta
                          ? cn('bg-emerald-500/5 border-emerald-500/15', i === 0 && 'ring-emerald-500/20')
                          : baixa
                            ? cn('bg-red-500/5 border-red-500/15', i === 0 && 'ring-red-500/20')
                            : cn('bg-amber-500/5 border-amber-500/15', i === 0 && 'ring-amber-500/20')
                      )}
                    >
                      {/* Badge tipo */}
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                        alta ? 'bg-emerald-500/15 text-emerald-400' :
                          baixa ? 'bg-red-500/15 text-red-400' :
                            'bg-amber-500/15 text-amber-400'
                      )}>
                        {alta ? 'A' : baixa ? 'B' : 'D'}
                      </div>

                      {/* Hora */}
                      <span className="text-xs text-slate-500 font-mono w-10 shrink-0">
                        {formatHora(vela.timestamp)}
                      </span>

                      {/* OHLC */}
                      <div className="flex-1 grid grid-cols-4 gap-1 text-xs font-mono min-w-0">
                        <div className="truncate">
                          <span className="text-slate-600">O </span>
                          <span className="text-slate-300">{formatVal(vela.abertura)}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-600">H </span>
                          <span className="text-emerald-400">{formatVal(vela.maxima)}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-600">L </span>
                          <span className="text-red-400">{formatVal(vela.minima)}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-600">C </span>
                          <span className={cn(
                            alta ? 'text-emerald-400' : baixa ? 'text-red-400' : 'text-amber-400'
                          )}>
                            {formatVal(vela.fechamento)}
                          </span>
                        </div>
                      </div>

                      {/* Variação % */}
                      <span className={cn(
                        'text-xs font-mono shrink-0 w-16 text-right',
                        alta ? 'text-emerald-400' : baixa ? 'text-red-400' : 'text-amber-400'
                      )}>
                        {alta ? '+' : ''}{variacao}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Componente: Painel de Fluxo de Velas (Real-time Analysis) ──

function PainelFluxoVelas({ analise }: { analise: AnaliseFluxoVelas | null }) {
  if (!analise) return null;

  const cat = analise.catalogacao;
  const tendenciaAlta = analise.tendencia === 'alta';
  const tendenciaBaixa = analise.tendencia === 'baixa';

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-apex-trader-primary" />
          <h3 className="text-sm font-bold text-slate-300">Análise: Fluxo de Velas</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
            tendenciaAlta ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              tendenciaBaixa ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                "bg-slate-500/10 text-slate-400 border border-slate-500/20"
          )}>
            {analise.tendencia === 'lateral' ? 'Lateralizado' : `Tendência de ${analise.tendencia}`}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* EMAs e Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">EMA 9 (Rápida)</span>
            <span className="text-sm font-mono text-slate-200">{analise.ema_rapida.toFixed(5)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">EMA 21 (Lenta)</span>
            <span className="text-sm font-mono text-slate-200">{analise.ema_lenta.toFixed(5)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Estado</span>
            <span className={cn(
              "text-sm font-bold",
              analise.em_correcao ? "text-amber-400" :
                analise.velas_retomada > 0 ? "text-emerald-400" : "text-slate-400"
            )}>
              {analise.em_correcao ? "Correção" :
                analise.velas_retomada > 0 ? `${analise.velas_retomada} velas de Retomada` : "Aguardando"}
            </span>
            {analise.num_velas_fluxo >= 2 && (
              <p className="text-[10px] text-slate-500 mt-1">
                Fluxo: {analise.num_velas_fluxo} velas → entrada na {analise.modo_ativo === '2-3' ? '2ª' : '3ª'} retomada
              </p>
            )}
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Confiança</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">{analise.confianca}%</span>
              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-apex-trader-primary transition-all"
                  style={{ width: `${analise.confianca}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Catalogação de Fluxos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalogação (Janela Escolhida)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Alta 2-3 */}
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex flex-col items-center">
              <span className="text-[10px] text-emerald-500/60 font-bold mb-1">Fluxos 2-3 (↑)</span>
              <span className="text-xl font-black text-emerald-400">{cat.fluxos_23_alta}</span>
            </div>
            {/* Alta 3+ */}
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex flex-col items-center">
              <span className="text-[10px] text-emerald-500/60 font-bold mb-1">Fluxos 3+ (↑)</span>
              <span className="text-xl font-black text-emerald-400">{cat.fluxos_3mais_alta}</span>
            </div>
            {/* Baixa 2-3 */}
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex flex-col items-center">
              <span className="text-[10px] text-red-500/60 font-bold mb-1">Fluxos 2-3 (↓)</span>
              <span className="text-xl font-black text-red-400">{cat.fluxos_23_baixa}</span>
            </div>
            {/* Baixa 3+ */}
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex flex-col items-center">
              <span className="text-[10px] text-red-500/60 font-bold mb-1">Fluxos 3+ (↓)</span>
              <span className="text-xl font-black text-red-400">{cat.fluxos_3mais_baixa}</span>
            </div>
            {/* Dominância */}
            <div className="col-span-2 md:col-span-1 p-3 bg-apex-trader-primary/5 border border-apex-trader-primary/10 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-apex-trader-primary/60 font-bold mb-1">Dominância</span>
              <div className="text-center">
                <p className="text-xs font-black text-slate-200">{cat.tipo_dominante || '--'} Velas</p>
                <p className={cn(
                  "text-[10px] font-bold uppercase",
                  cat.direcao_dominante === 'alta' ? "text-emerald-400" :
                    cat.direcao_dominante === 'baixa' ? "text-red-400" : "text-slate-500"
                )}>
                  {cat.direcao_dominante || 'Lateral'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de Sinal Atual */}
        {analise.operar && (
          <div className={cn(
            "p-4 rounded-xl border animate-pulse flex items-center justify-between",
            analise.direcao_operacao === 'compra' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
          )}>
            <div className="flex items-center gap-3">
              <Zap className={analise.direcao_operacao === 'compra' ? "text-emerald-400" : "text-red-400"} />
              <div>
                <p className="text-sm font-bold text-slate-200">Sinal de Entrada Detectado!</p>
                <p className="text-xs text-slate-400">Fluxo de {analise.num_velas_fluxo} velas → Modo {analise.modo_ativo}</p>
              </div>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest",
              analise.direcao_operacao === 'compra' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            )}>
              {analise.direcao_operacao === 'compra' ? 'AUTOMAÇÃO: COMPRA' : 'AUTOMAÇÃO: VENDA'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente: Painel de Resultados da Estratégia ──

function PainelResultadosFluxo({ historico }: { historico: any[] }) {
  if (historico.length === 0) return null;

  const total = historico.length;
  const wins = historico.filter(h => h.resultado === 'vitoria').length;
  const losses = total - wins;
  const assertividade = ((wins / total) * 100).toFixed(1);
  const lucroTotal = historico.reduce((acc, h) => acc + h.lucro, 0);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
        <div className="flex items-center gap-2">
          <BarChart size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-300">Catalogação de Resultados</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Últimas {total} operações</span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Winrate</span>
            <span className="text-2xl font-black text-emerald-400">{assertividade}%</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">WIN / LOSS</span>
            <span className="text-2xl font-black text-slate-200">{wins} <span className="text-slate-600">/</span> {losses}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Resultado Líquido</span>
            <span className={cn(
              "text-2xl font-black",
              lucroTotal >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {formatCurrency(lucroTotal)}
            </span>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex gap-1 justify-center">
              {historico.slice(-10).map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-6 rounded-sm",
                    h.resultado === 'vitoria' ? "bg-emerald-500" : "bg-red-500"
                  )}
                  title={h.resultado}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-600 mt-1 font-bold">Últimas 10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Estatísticas Premium (Activity Rings + Histórico Apex) ──

function SecaoEstatisticasPremium({ 
  ops, 
  bancaAtual, 
  bancaInicial,
  totalPerformance,
  onSync
}: { 
  ops: any[], 
  bancaAtual: number,
  bancaInicial: number,
  totalPerformance: number,
  onSync?: () => Promise<void>
}) {
  const [periodo, setPeriodo] = useState<'hoje' | '7d' | '30d' | 'total'>('hoje');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync || syncing) return;
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setTimeout(() => setSyncing(false), 1000);
    }
  };

  const formatTradeDate = (dataStr: string) => {
    try {
      const d = new Date(dataStr + 'T12:00:00'); // evitar problemas de timezone
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${d.getDate()} ${meses[d.getMonth()]}`;
    } catch {
      return dataStr;
    }
  };

  const STRATEGIES_ROBOT = ['fluxovelas', 'quadrantes', 'logica', 'lógica', 'fluxo'];

  const { stats, opsFiltradasParaHistograma } = useMemo(() => {
    const agora = new Date();
    const hojeStr = agora.toISOString().slice(0, 10);
    
    let dataInicio = new Date();
    if (periodo === '7d') dataInicio.setDate(agora.getDate() - 7);
    else if (periodo === '30d') dataInicio.setDate(agora.getDate() - 30);
    
    const inicioStr = dataInicio.toISOString().slice(0, 10);
    
    // Filtro para os anéis e histórico: Somente ROBÔ
    const filtradasRobo = ops.filter(op => {
      const estrMin = (op.estrategia || '').toLowerCase();
      const isRobo = estrMin.startsWith('q') || STRATEGIES_ROBOT.some(s => estrMin.includes(s));
      if (!isRobo) return false;
      
      if (periodo === 'total') return true;
      if (periodo === 'hoje') return op.data === hojeStr;
      return op.data >= inicioStr;
    });
    
    const wins = filtradasRobo.filter(op => op.resultado === 'vitoria').length;
    const losses = filtradasRobo.length - wins;
    const lucro = parseFloat(filtradasRobo.reduce((s, op) => s + op.lucro, 0).toFixed(2));
    const winrate = filtradasRobo.length > 0 ? Math.round((wins / filtradasRobo.length) * 100) : 0;
    
    return { 
      stats: { wins, losses, lucro, winrate, total: filtradasRobo.length },
      opsFiltradasParaHistograma: filtradasRobo.sort((a, b) => b.hora.localeCompare(a.hora))
    };
  }, [ops, periodo]);

  const rings: ActivityData[] = [
    {
      label: "TAXA DE ACERTO",
      value: stats.winrate,
      color: "#00E0FF", // Apex Trader Blue
      size: 180,
      current: stats.winrate,
      target: 100,
      unit: "%",
    },
    {
      label: "VITÓRIAS",
      value: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      color: "#10B981", // Emerald
      size: 145,
      current: stats.wins,
      target: stats.total,
      unit: "W",
    },
    {
      label: "PERFORMANCE",
      value: Math.min(100, Math.max(0, (stats.lucro / 100) * 100)), // Base 100 for target-like visual
      color: stats.lucro >= 0 ? "#F59E0B" : "#EF4444", // Amber or Red
      size: 110,
      current: stats.lucro >= 0 ? `+${stats.lucro}` : stats.lucro,
      target: 100,
      unit: "R$",
    },
  ];

  return (
    <div className="relative glass-card overflow-hidden border-white/5 bg-slate-900/40 flex flex-col transition-all duration-500">
      {/* Laser Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <LaserFlow 
          color="#0066FF" 
          horizontalBeamOffset={0.2} 
          verticalBeamOffset={0.1}
          verticalSizing={15}
          horizontalSizing={1}
          fogIntensity={0.5}
        />
      </div>

      <div className="relative z-10 p-6 flex flex-col md:flex-row gap-8 items-center justify-between">
        {/* Left Side: Main Stats Card */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic tracking-tighter text-white/90">
              ESTATÍSTICAS <span className="text-apex-trader-primary">PREMIUM</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  "p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/10",
                  syncing && "opacity-50"
                )}
                title="Sincronizar Operações"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              </button>
              <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
                {(['hoje', '7d', '30d', 'total'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-full transition-all uppercase",
                      periodo === p ? "bg-apex-trader-primary text-white shadow-lg shadow-apex-trader-primary/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/2 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Target size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Banca Atual</span>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", bancaAtual >= bancaInicial ? "text-emerald-400" : "text-red-400")}>
                {formatCurrency(bancaAtual)}
              </p>
              <div className="mt-1 flex items-center gap-1">
                  {bancaInicial > 0 ? (
                    <span className={cn("text-[10px] font-bold", bancaAtual >= bancaInicial ? "text-emerald-500/80" : "text-red-500/80")}>
                      {bancaAtual >= bancaInicial ? '+' : ''}{(( (bancaAtual / bancaInicial) - 1) * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-apex-trader-primary">
                      {bancaAtual > 0 ? '+100%' : '0%'}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600 font-medium">desde o início</span>
              </div>
            </div>

            <div className="bg-white/2 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Trophy size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Performance Robô {periodo}</span>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", stats.lucro >= 0 ? "text-amber-400" : "text-red-400")}>
                {stats.lucro >= 0 ? '+' : ''}{formatCurrency(stats.lucro)}
              </p>
              <div className="mt-1 flex items-center gap-1">
                 <span className="text-[10px] text-slate-400 font-bold">{stats.total} operações</span>
              </div>
            </div>

            <div className="bg-white/2 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Activity size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Vitórias / Derrotas (Robô)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{stats.wins}</span>
                <span className="text-slate-700 font-bold">/</span>
                <span className="text-2xl font-black text-red-500">{stats.losses}</span>
              </div>
            </div>

            <div className="bg-white/2 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <CalendarDays size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Performance Total</span>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", totalPerformance >= 0 ? "text-apex-trader-primary" : "text-red-400")}>
                {totalPerformance >= 0 ? '+' : ''}{formatCurrency(totalPerformance)}
              </p>
              <div className="mt-1">
                 <span className="text-[10px] text-slate-600 font-medium uppercase tracking-tighter">Histórico {BRANDING.appName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Activity Rings */}
        <div className="flex-1 flex items-center justify-center">
          <AppleActivityCard activities={rings} className="bg-transparent border-none p-0 scale-90 md:scale-110" />
        </div>
      </div>

      {/* Collapsible History Section */}
      <div className="relative z-10 border-t border-white/5">
        <button 
          onClick={() => setHistoricoAberto(!historicoAberto)}
          className="w-full py-4 px-6 flex items-center justify-between hover:bg-white/2 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-apex-trader-primary/10 flex items-center justify-center text-apex-trader-primary group-hover:scale-110 transition-transform">
              <History size={16} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest text-white/80">Histórico de Operações Apex</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Clique para {historicoAberto ? 'recolher' : 'expandir'} os registros da automação</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-slate-600">{opsFiltradasParaHistograma.length} ENTRADAS {periodo.toUpperCase()}</span>
             {historicoAberto ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
          </div>
        </button>

        <AnimatePresence>
          {historicoAberto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-black/20"
            >
              <div className="px-6 py-2">
                <div className="space-y-1 py-4">
                  {opsFiltradasParaHistograma.length === 0 ? (
                    <div className="py-10 text-center text-slate-500">
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhuma operação registrada pela automação neste período.</p>
                    </div>
                  ) : (
                    opsFiltradasParaHistograma.map((op) => (
                      <div key={op.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                        {/* Left: Time & Date */}
                        <div className="flex flex-col min-w-[50px]">
                          <span className="text-sm font-black text-white leading-none mb-1">{op.hora}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            {formatTradeDate(op.data)}
                          </span>
                        </div>

                        {/* Center: Asset Details */}
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-apex-trader-primary/30 transition-colors">
                             <div className="absolute inset-0 bg-apex-trader-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             {op.ativo.includes('/') ? (
                               <Globe size={18} className="text-apex-trader-primary/70" />
                             ) : (
                               <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                 <Zap size={14} className="text-amber-500" />
                               </div>
                             )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-200 tracking-tight">{op.ativo}</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                              {op.ativo.includes('/') ? 'Forex' : 'Crypto'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Result & Stake */}
                        <div className="flex flex-col items-end min-w-[100px]">
                           <span className={cn(
                             "text-sm font-black tracking-tighter mb-0.5",
                             op.resultado === 'vitoria' ? "text-emerald-400" : "text-red-500 line-through decoration-red-500/50"
                           )}>
                             {op.resultado === 'vitoria' ? '+' : '-'} {formatCurrency(Math.abs(op.resultado === 'vitoria' ? op.lucro : op.investido))}
                           </span>
                           <div className="flex items-center gap-1.5">
                              {op.resultado === 'vitoria' ? (
                                <TrendingUp size={10} className="text-emerald-500/50" />
                              ) : (
                                <TrendingDown size={10} className="text-red-500/50" />
                              )}
                              <span className="text-[10px] font-black text-slate-600 uppercase">
                                {formatCurrency(op.investido)}
                              </span>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Componente: Painel Conectado ──

function PainelCorretora({
  sessao,
  onDesconectar,
  onAtualizar,
  automacao,
  operacoesAbertas,
  onIniciarAutomacao,
  onPausarAutomacao,
  onRetomarAutomacao,
  onFinalizarAutomacao,
  onResetarAutomacao,
  estadoWS,
  quadranteAtual,
  countdownTexto,
  cicloMartingale,
  valorOperacaoAtual,
  historicoQuadrantes,
  quadrante5minAtual,
  historicoQuadrantes5min,
  galeNivel5min,
  estadoFluxoVelas,
  analiseLogicaPreco,
  historicoLP,
  analiseICE,
  ativoSelecionado,
  setAtivoSelecionado,
  timeframeSelecionado,
  setTimeframeSelecionado,
  ativosSDK,
  modoVPS,
  vpsStatus,
}: {
  sessao: NonNullable<ReturnType<typeof useVorna>['sessao']>;
  onDesconectar: () => void;
  onAtualizar: () => Promise<void>;
  automacao: EstadoAutomacao;
  operacoesAbertas: OperacaoAberta[];
  onIniciarAutomacao: (config: ConfigAutomacao) => void;
  onPausarAutomacao: () => void;
  onRetomarAutomacao: () => void;
  onFinalizarAutomacao: () => void;
  onResetarAutomacao: () => void;
  estadoWS: EstadoWebSocket;
  quadranteAtual: Quadrante | null;
  countdownTexto: string;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  historicoQuadrantes: Quadrante[];
  quadrante5minAtual: import('../types').Quadrante5min | null;
  historicoQuadrantes5min: import('../types').Quadrante5min[];
  galeNivel5min: number;
  estadoFluxoVelas: EstadoFluxoVelas;
  analiseLogicaPreco: AnaliseLogicaPreco | null;
  historicoLP: OperacaoLPDetalhada[];
  analiseICE: AnaliseImpulsoCorrecaoEngolfo | null;
  ativoSelecionado: string;
  setAtivoSelecionado: (a: string) => void;
  timeframeSelecionado: string;
  setTimeframeSelecionado: (t: string) => void;
  ativosSDK: ActiveInfo[];
  modoVPS: boolean;
  vpsStatus: 'desconhecido' | 'online' | 'offline';
}) {
  const [atualizando, setAtualizando] = useState(false);
  const [velasAberto, setVelasAberto] = useState(false);
  const { profile, operacoes: ops } = useData();

  const usuario = sessao.usuario;
  const carteiras = usuario?.carteiras || [];
  const pumaEmail = usuario?.email || '';
  const registradoEm = profile?.created_at?.slice(0, 10) || null;

  // Cálculos de Estatísticas (Portado de Operacoes.tsx)
  const accountOps = useMemo(() => ops.filter(op => op.corretora?.includes(pumaEmail)), [ops, pumaEmail]);

  const opsPorConta = useMemo(() => {
    if (!registradoEm) return accountOps;
    return accountOps.filter(op => op.data >= registradoEm);
  }, [accountOps, registradoEm]);

  const totalWinsAll = opsPorConta.filter(op => op.resultado === 'vitoria').length;
  const winRateAll = opsPorConta.length > 0 ? Math.round((totalWinsAll / opsPorConta.length) * 100) : 0;
  const totalLucroAll = parseFloat(opsPorConta.reduce((s, op) => s + op.lucro, 0).toFixed(2));

  const bancaInicial = profile?.banca_inicial ?? 0;
  const saldoPumaReal = (() => {
    const active = carteiras.find(c => c.tipo === 'REAL') ||
      carteiras.find(c => c.tipo === 'USDT') ||
      carteiras.find(c => c.tipo === 'DEMO');
    return active?.saldo ?? null;
  })();

  const bancaAtualDisplay = saldoPumaReal ?? parseFloat((bancaInicial + totalLucroAll).toFixed(2));

  const aoAtualizar = async () => {
    setAtualizando(true);
    try {
      await onAtualizar();
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Corretora</h2>
          <p className="text-slate-400">Painel integrado com a VornaBroker.</p>
        </div>
        <div className="flex items-center gap-3">
          {usuario && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-8 h-8 rounded-full bg-apex-trader-primary/20 flex items-center justify-center text-apex-trader-primary font-bold text-sm">
                {usuario.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{usuario.nome}</span>
                {usuario.verificado && <BadgeCheck size={14} className="text-apex-trader-primary" />}
                {usuario.vip && (
                  <Crown size={12} className="text-amber-400" />
                )}
              </div>
            </div>
          )}
          <button
            onClick={aoAtualizar}
            disabled={atualizando}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={20} className={atualizando ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onDesconectar}
            className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Desconectar</span>
          </button>
        </div>
      </header>

      {/* Apex Trader — Robô 3D */}
      <SecaoApexTrader />

      {/* Carteiras (compactas) */}
      {carteiras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {carteiras.map((carteira, index) => (
            <div key={carteira.tipo || index}>
              <CartaoCarteira carteira={carteira} />
            </div>
          ))}
        </div>
      )}

      {/* Estatísticas Premium (Activity Rings) */}
      <SecaoEstatisticasPremium
        ops={opsPorConta}
        bancaAtual={bancaAtualDisplay}
        bancaInicial={bancaInicial}
        totalPerformance={totalLucroAll}
        onSync={aoAtualizar}
      />

      {/* Análise de Estratégias — backtest de velas históricas por estratégia */}
      <SecaoMetricasEstrategia ativosSDK={ativosSDK} />

      {/* Gráfico removido por solicitação - Performance e leveza prioritárias */}

      {/* Últimas Velas (tempo real) - Colapsável */}
      <PainelVelas
        ativoSelecionado={ativoSelecionado}
        setAtivoSelecionado={setAtivoSelecionado}
        timeframeSelecionado={timeframeSelecionado}
        setTimeframeSelecionado={setTimeframeSelecionado}
        aberto={velasAberto}
        onToggle={() => setVelasAberto(!velasAberto)}
        ativosSDK={ativosSDK}
      />

      {/* Automação */}
      <PainelAutomacao
        automacao={automacao}
        onIniciar={onIniciarAutomacao}
        onPausar={onPausarAutomacao}
        onRetomar={onRetomarAutomacao}
        onFinalizar={onFinalizarAutomacao}
        onResetar={onResetarAutomacao}
        ativoSelecionado={ativoSelecionado}
        setAtivoSelecionado={setAtivoSelecionado}
        ativosSDK={ativosSDK}
        afiliadoAprovado={sessao.afiliadoAprovado}
      />

      {/* Barra de diagnóstico — visível apenas durante automação ativa */}
      {automacao.status === 'em_operacao' && (
        <div className="glass-card px-4 py-2.5 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Diagnóstico:</span>
          {/* Feed de velas */}
          <span
            title={estadoWS.conectado ? 'Feed de candles ativo' : 'Sem candles — trades bloqueados'}
            className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs', estadoWS.conectado ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400')}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', estadoWS.conectado ? 'bg-emerald-400' : 'bg-red-400 animate-pulse')} />
            {estadoWS.conectado ? 'Velas OK' : 'Sem Velas'}
          </span>
          {/* VPS (somente se modo VPS ativo) */}
          {modoVPS && (
            <span
              title={vpsStatus === 'offline' ? 'VPS indisponível — executando localmente' : vpsStatus === 'online' ? 'Bot VPS ativo' : 'Aguardando resposta do VPS'}
              className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs', vpsStatus === 'offline' ? 'bg-orange-900/40 text-orange-400' : vpsStatus === 'online' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700/40 text-slate-400')}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', vpsStatus === 'offline' ? 'bg-orange-400 animate-pulse' : vpsStatus === 'online' ? 'bg-emerald-400' : 'bg-slate-400')} />
              {vpsStatus === 'offline' ? 'VPS Offline (local)' : vpsStatus === 'online' ? 'VPS OK' : 'VPS...'}
            </span>
          )}
          {/* Motivo do VPS (última decisão da estratégia) */}
          {modoVPS && automacao.ultimo_motivo && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-700/40 text-slate-400">
              {automacao.ultimo_motivo}
            </span>
          )}
          {/* Operação travada */}
          {operacoesAbertas.length > 0 && (() => {
            const op = operacoesAbertas[0];
            const sec = Math.round((Date.now() - new Date(op.hora_envio ?? 0).getTime()) / 1000);
            const stuck = sec > (op.duracao ?? 60) + 90;
            return (
              <span
                title={stuck ? 'Operação fantasma detectada — será limpa automaticamente' : 'Operação em andamento'}
                className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs', stuck ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400')}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', stuck ? 'bg-red-400 animate-pulse' : 'bg-blue-400')} />
                {stuck ? `Op travada ${sec}s` : `Op aberta ${sec}s`}
              </span>
            );
          })()}
        </div>
      )}

      {/* Análise Fluxo de Velas (visível quando estratégia selecionada ou em uso) */}
      {(automacao.config?.estrategia === 'FluxoVelas' || estadoFluxoVelas.analise) && (
        <PainelFluxoVelas analise={estadoFluxoVelas.analise} />
      )}

      {/* Catalogação de Resultados Fluxo */}
      {automacao.config?.estrategia === 'FluxoVelas' && (
        <PainelResultadosFluxo historico={estadoFluxoVelas.historico_resultados} />
      )}

      {/* Lógica do Preço (visível quando estratégia selecionada) */}
      {automacao.config?.estrategia === 'LogicaDoPreco' && analiseLogicaPreco && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap size={18} className="text-purple-400" />
              Lógica do Preço
            </h3>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-bold',
              analiseLogicaPreco.operar
                ? analiseLogicaPreco.direcao_operacao === 'compra'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
                : 'bg-slate-700/50 text-slate-400'
            )}>
              {analiseLogicaPreco.operar
                ? `${analiseLogicaPreco.direcao_operacao === 'compra' ? 'CALL' : 'PUT'} — ${analiseLogicaPreco.confianca}%`
                : 'Sem sinal'}
            </div>
          </div>

          {/* Resumo */}
          <p className="text-sm text-slate-300">{analiseLogicaPreco.resumo}</p>

          {/* Domínio + Ciclo */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Domínio:</span>
              <span className={cn(
                'text-xs font-bold',
                analiseLogicaPreco.dominioAtual === 'compra' ? 'text-emerald-400' :
                analiseLogicaPreco.dominioAtual === 'venda' ? 'text-red-400' : 'text-slate-500'
              )}>
                {analiseLogicaPreco.dominioAtual === 'compra' ? 'Compradores' :
                 analiseLogicaPreco.dominioAtual === 'venda' ? 'Vendedores' : 'Indefinido'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Ciclo:</span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-bold',
                analiseLogicaPreco.cicloAtual === 'correcao_tendencia' ? 'bg-emerald-500/20 text-emerald-400' :
                analiseLogicaPreco.cicloAtual === 'tendencial_alta' ? 'bg-blue-500/20 text-blue-400' :
                analiseLogicaPreco.cicloAtual === 'tendencial_baixa' ? 'bg-orange-500/20 text-orange-400' :
                analiseLogicaPreco.cicloAtual === 'correcao_lateral' ? 'bg-amber-500/20 text-amber-400' :
                analiseLogicaPreco.cicloAtual === 'acumulado' ? 'bg-slate-500/20 text-slate-400' :
                'bg-slate-600/20 text-slate-400'
              )}>
                {{
                  tendencial_alta: 'Tendencial Alta',
                  tendencial_baixa: 'Tendencial Baixa',
                  correcao_tendencia: 'Correção em Tendência',
                  correcao_lateral: 'Correção Lateral',
                  consolidado: 'Consolidado',
                  acumulado: 'Acumulado',
                }[analiseLogicaPreco.cicloAtual]}
              </span>
            </div>
          </div>

          {/* Conceitos ativos */}
          {analiseLogicaPreco.conceitosAtivos.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Conceitos Detectados:</p>
              <div className="flex flex-wrap gap-1.5">
                {analiseLogicaPreco.conceitosAtivos.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-md text-xs font-medium">
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Marcações de preço */}
          {analiseLogicaPreco.marcacoes.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Marcações ({analiseLogicaPreco.marcacoes.filter(m => m.ativa).length} ativas):</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 max-h-24 overflow-y-auto">
                {analiseLogicaPreco.marcacoes.filter(m => m.ativa).slice(-8).map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-800/50 px-2 py-1 rounded">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      m.tipo === 'comando' ? 'bg-blue-400' :
                      m.tipo === 'vela_forca' ? 'bg-amber-400' :
                      m.tipo === 'defesa' ? 'bg-emerald-400' :
                      m.tipo === 'limite' ? 'bg-red-400' :
                      'bg-purple-400'
                    )} />
                    <span className="text-slate-400">{m.tipo.replace(/_/g, ' ')}</span>
                    <span className="text-white font-mono ml-auto">{m.preco.toFixed(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sinais recentes */}
          {analiseLogicaPreco.sinais.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Sinais ({analiseLogicaPreco.sinais.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {analiseLogicaPreco.sinais.slice(-5).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-slate-800/30 px-3 py-1.5 rounded">
                    <span className={cn(
                      'font-bold',
                      s.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {s.direcao === 'compra' ? 'CALL' : 'PUT'}
                    </span>
                    <span className="text-slate-400 flex-1 truncate">{s.descricao}</span>
                    <span className="text-slate-500">{s.confianca}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Painel de Explicação — Última Operação Lógica do Preço */}
      {automacao.config?.estrategia === 'LogicaDoPreco' && historicoLP.length > 0 && (
        <div className="bg-slate-900/60 border border-purple-500/30 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Última Operação Executada
          </h4>

          {(() => {
            const ultima = historicoLP[0];
            const cicloLabels: Record<string, string> = {
              tendencial_alta: 'Tendencial Alta',
              tendencial_baixa: 'Tendencial Baixa',
              correcao_tendencia: 'Correção em Tendência',
              correcao_lateral: 'Correção Lateral',
              consolidado: 'Consolidado',
              acumulado: 'Acumulado',
            };
            return (
              <div className="space-y-3">
                {/* Cabeçalho: direção + ativo + confiança + resultado */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn(
                    'px-3 py-1 rounded-lg text-sm font-bold',
                    ultima.direcao === 'compra' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {ultima.direcao === 'compra' ? 'CALL' : 'PUT'}
                  </span>
                  <span className="text-sm text-slate-300">{ultima.ativo}</span>
                  <span className="text-sm text-slate-400">{ultima.confianca}% confiança</span>
                  {ultima.resultado && (
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-bold',
                      ultima.resultado === 'vitoria' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {ultima.resultado === 'vitoria' ? 'Vitória' : 'Derrota'}
                      {ultima.lucro != null && ` R$${ultima.lucro.toFixed(2)}`}
                    </span>
                  )}
                  {!ultima.resultado && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 animate-pulse">
                      Aguardando...
                    </span>
                  )}
                </div>

                {/* Ciclo + Domínio */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Ciclo:</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded',
                    ultima.ciclo === 'correcao_tendencia' ? 'bg-emerald-500/20 text-emerald-400' :
                    ultima.ciclo === 'tendencial_alta' ? 'bg-blue-500/20 text-blue-400' :
                    ultima.ciclo === 'tendencial_baixa' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-500/20 text-slate-400'
                  )}>
                    {cicloLabels[ultima.ciclo] || ultima.ciclo}
                  </span>
                  <span className="text-slate-500">Domínio:</span>
                  <span className={cn(
                    'font-medium',
                    ultima.dominio === 'compra' ? 'text-emerald-400' :
                    ultima.dominio === 'venda' ? 'text-red-400' : 'text-slate-500'
                  )}>
                    {ultima.dominio === 'compra' ? 'Compradores' :
                     ultima.dominio === 'venda' ? 'Vendedores' : 'Indefinido'}
                  </span>
                </div>

                {/* Por que operou — lista de sinais com descrição */}
                {ultima.sinais.length > 0 && (
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs text-purple-400 font-semibold mb-2">Por que operou:</p>
                    <div className="space-y-1">
                      {ultima.sinais.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span className="text-slate-300">{s.descricao}</span>
                          <span className="text-slate-500 ml-auto shrink-0">{s.confianca}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumo */}
                <p className="text-xs text-slate-500 italic">{ultima.resumo}</p>

                {/* Mini-histórico das últimas 5 operações */}
                {historicoLP.length > 1 && (
                  <div className="border-t border-slate-700/50 pt-2 mt-2">
                    <p className="text-xs text-slate-500 mb-1.5">Histórico recente:</p>
                    <div className="space-y-1">
                      {historicoLP.slice(0, 5).map((op, i) => (
                        <div key={op.id || i} className="flex items-center gap-2 text-xs bg-slate-800/30 px-2 py-1 rounded">
                          <span className="text-slate-500 w-12">
                            {new Date(op.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={cn(
                            'font-bold w-8',
                            op.direcao === 'compra' ? 'text-emerald-400' : 'text-red-400'
                          )}>
                            {op.direcao === 'compra' ? 'CALL' : 'PUT'}
                          </span>
                          <span className="text-slate-400 w-8 text-right">{op.confianca}%</span>
                          {op.resultado ? (
                            <span className={cn(
                              'w-16 text-right',
                              op.resultado === 'vitoria' ? 'text-emerald-400' : 'text-red-400'
                            )}>
                              {op.resultado === 'vitoria' ? '+' : ''}{op.lucro != null ? `R$${op.lucro.toFixed(2)}` : '—'}
                            </span>
                          ) : (
                            <span className="text-amber-400 w-16 text-right">...</span>
                          )}
                          <span className="text-slate-500 flex-1 truncate text-right">
                            {op.conceitos.slice(0, 2).join(' + ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Painel Impulso-Correção-Engolfo */}
      {automacao.config?.estrategia === 'ImpulsoCorrecaoEngolfo' && analiseICE && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" />
              Impulso-Correção-Engolfo
            </h3>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-bold',
              analiseICE.operar
                ? analiseICE.direcao_operacao === 'compra'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
                : 'bg-slate-700/50 text-slate-400'
            )}>
              {analiseICE.operar
                ? `${analiseICE.direcao_operacao === 'compra' ? 'CALL' : 'PUT'} — ${analiseICE.confianca}%`
                : 'Aguardando padrão'}
            </div>
          </div>

          <p className="text-sm text-slate-300">{analiseICE.resumo}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className={cn('p-3 rounded-lg border', analiseICE.impulsoDetectado ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-800/40 border-white/5')}>
              <p className="text-xs text-slate-500 mb-1">Impulso</p>
              <p className={cn('text-sm font-bold', analiseICE.impulsoDetectado ? 'text-cyan-400' : 'text-slate-600')}>
                {analiseICE.impulsoDetectado ? `${analiseICE.velasImpulso}v ${analiseICE.direcaoImpulso}` : '—'}
              </p>
            </div>
            <div className={cn('p-3 rounded-lg border', analiseICE.correcaoDetectada ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/40 border-white/5')}>
              <p className="text-xs text-slate-500 mb-1">Correção</p>
              <p className={cn('text-sm font-bold', analiseICE.correcaoDetectada ? 'text-amber-400' : 'text-slate-600')}>
                {analiseICE.correcaoDetectada ? `${analiseICE.velasCorrecao}v` : '—'}
              </p>
            </div>
            <div className={cn('p-3 rounded-lg border', analiseICE.engolfoDetectado ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/40 border-white/5')}>
              <p className="text-xs text-slate-500 mb-1">Engolfo</p>
              <p className={cn('text-sm font-bold', analiseICE.engolfoDetectado ? 'text-emerald-400' : 'text-slate-600')}>
                {analiseICE.engolfoDetectado ? 'Confirmado' : '—'}
              </p>
            </div>
          </div>

          {analiseICE.impulsoDetectado && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Pivô:</span>
                <span className="text-white font-mono">{analiseICE.fundoPivo.toFixed(5)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Espaço:</span>
                <span className={analiseICE.temEspacoAtePivo ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {analiseICE.temEspacoAtePivo ? 'OK' : 'Insuficiente'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quadrantes 10min (visível quando automação ativa) */}
      {automacao.config?.estrategia === 'Quadrantes' && (automacao.status === 'em_operacao' || automacao.status === 'pausado') && (
        <SecaoQuadrantes
          quadranteAtual={quadranteAtual}
          countdownTexto={countdownTexto}
          estadoWS={estadoWS}
          cicloMartingale={cicloMartingale}
          valorOperacaoAtual={valorOperacaoAtual}
          historicoQuadrantes={historicoQuadrantes}
          estrategia={automacao.config?.gerenciamento || 'Fixo'}
        />
      )}

      {/* Quadrantes 5min (visível quando automação ativa) */}
      {automacao.config?.estrategia === 'Quadrantes5min' && (automacao.status === 'em_operacao' || automacao.status === 'pausado') && (
        <SecaoQuadrantes5min
          quadranteAtual={quadrante5minAtual}
          countdownTexto={countdownTexto}
          estadoWS={estadoWS}
          cicloMartingale={cicloMartingale}
          valorOperacaoAtual={valorOperacaoAtual}
          historicoQuadrantes={historicoQuadrantes5min}
          galeNivel={galeNivel5min}
          gerenciamento={automacao.config?.gerenciamento || 'Fixo'}
          valorBase={automacao.config?.valor_por_operacao || 0}
          payout={automacao.config?.payout || 80}
          multiplicadorGale={automacao.config?.multiplicador_martingale || 2}
        />
      )}


      {/* Última atualização */}
      <p className="text-xs text-slate-600 text-center">
        Última atualização: {new Date(sessao.ultima_atualizacao).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

// ── Página Principal ──

export default function Corretora() {
  // Estado local que garante exibir o formulário após desconexão explícita
  // Isso evita race conditions com o estado assíncrono do usePuma
  const [forcaFormulario, setForcaFormulario] = useState(false);

  const { userId, profile } = useData();

  const {
    sessao,
    estado,
    erro,
    requer2fa,
    conectar,
    desconectar,
    atualizarDados,
    automacao,
    operacoesAbertas,
    iniciarAutomacao,
    pausarAutomacao,
    retomarAutomacao,
    finalizarAutomacao,
    resetarAutomacao,
    estadoWS,
    quadranteAtual,
    countdownTexto,
    cicloMartingale,
    valorOperacaoAtual,
    historicoQuadrantes,
    quadrante5minAtual,
    historicoQuadrantes5min,
    galeNivel5min,
    estadoFluxoVelas,
    analiseLogicaPreco,
    historicoLP,
    analiseICE,
    ativoSelecionado,
    setAtivoSelecionado,
    timeframeSelecionado,
    setTimeframeSelecionado,
    ativosSDK,
    modoVPS,
    vpsStatus,
  } = useVorna(userId, profile);

  // Quando conectar com sucesso, libera o painel novamente
  useEffect(() => {
    if (estado === 'conectado' && sessao?.conectado) {
      setForcaFormulario(false);
    }
  }, [estado, sessao?.conectado]);

  // Desconectar explicitamente: força o formulário ANTES de chamar desconectar()
  const handleDesconectar = () => {
    setForcaFormulario(true);
    desconectar();
  };

  // Conectar: reseta o estado local e chama conectar()
  const handleConectar = async (email: string, senha: string) => {
    setForcaFormulario(false);
    await conectar(email, senha);
  };

  if (!forcaFormulario && estado === 'conectado' && sessao?.conectado) {
    return (
      <ErrorBoundary onReset={() => setForcaFormulario(true)}>
        <PainelCorretora
          sessao={sessao}
          onDesconectar={handleDesconectar}
          onAtualizar={atualizarDados}
          automacao={automacao}
          operacoesAbertas={operacoesAbertas}
          onIniciarAutomacao={iniciarAutomacao}
          onPausarAutomacao={pausarAutomacao}
          onRetomarAutomacao={retomarAutomacao}
          onFinalizarAutomacao={finalizarAutomacao}
          onResetarAutomacao={resetarAutomacao}
          estadoWS={estadoWS}
          quadranteAtual={quadranteAtual}
          countdownTexto={countdownTexto}
          cicloMartingale={cicloMartingale}
          valorOperacaoAtual={valorOperacaoAtual}
          historicoQuadrantes={historicoQuadrantes}
          quadrante5minAtual={quadrante5minAtual}
          historicoQuadrantes5min={historicoQuadrantes5min}
          galeNivel5min={galeNivel5min}
          estadoFluxoVelas={estadoFluxoVelas}
          analiseLogicaPreco={analiseLogicaPreco}
          historicoLP={historicoLP}
          analiseICE={analiseICE}
          ativoSelecionado={ativoSelecionado}
          setAtivoSelecionado={setAtivoSelecionado}
          timeframeSelecionado={timeframeSelecionado}
          setTimeframeSelecionado={setTimeframeSelecionado}
          ativosSDK={ativosSDK}
          modoVPS={modoVPS}
          vpsStatus={vpsStatus}
        />
      </ErrorBoundary>
    );
  }

  return (
    <FormularioConexao
      onConectar={handleConectar}
      carregando={estado === 'conectando'}
      erro={erro}
      requer2fa={requer2fa}
    />
  );
}
