import React from 'react';
import { RefreshCw, Search, TrendingUp, TrendingDown, Calendar, BarChart3, Zap, LogIn, Eye, EyeOff, Globe, LogOut, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency, debounce } from '../lib/utils';
import type { Op } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { updateProfile, upsertOperacoesBatch, getSeguidoresCopyTrade, replicarOperacoesParaSeguidores } from '../lib/supabaseService';
import { useData } from '../contexts/DataContext';
import { obterHistoricoOperacoes, verificarOperacoesAbertas, obterDadosUsuario, type OperacaoAberta } from '../lib/vorna';
import { useVorna } from '../lib/useVorna';

export default function Operacoes() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = todayStr.slice(0, 7) + '-01';

  // Profile + Ops do DataContext (compartilhado entre páginas)
  const { profile, operacoes: ops, userId, recarregarOps } = useData();

  // ── Puma hook (fonte de verdade da sessão, passa userId para persistir ops automação) ──
  const { sessao, estado, erro, requer2fa, conectar, desconectar } = useVorna(userId);
  const isPumaConnected = estado === 'conectado' && !!sessao?.conectado;
  const pumaEmail = sessao?.usuario?.email || '';

  // Saldo real da carteira (REAL, USDT ou DEMO) da Puma
  const saldoPumaReal = (() => {
    const wallets = sessao?.usuario?.carteiras || [];
    const active = wallets.find(c => c.tipo === 'REAL') ||
      wallets.find(c => c.tipo === 'USDT') ||
      wallets.find(c => c.tipo === 'DEMO');
    return active?.saldo ?? sessao?.perfil?.saldo ?? null;
  })();

  // ── Formulário de login mini ─────────────────────────────────────
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginSenha, setLoginSenha] = React.useState('');
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [isConectando, setIsConectando] = React.useState(false);

  const handleConectar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginSenha || isConectando) return;
    setIsConectando(true);
    try {
      await conectar(loginEmail, loginSenha);
    } finally {
      setIsConectando(false);
    }
  };

  // ── Estados gerais ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<'todas' | 'automacao' | 'relatorio'>('todas');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isManualSyncing, setIsManualSyncing] = React.useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsAutoSyncEnabled(localStorage.getItem('vorna_auto_sync') === 'true');
  }, []);
  const bancaInicial = profile?.banca_inicial ?? 0;
  const registradoEm = profile?.created_at?.slice(0, 10) || null;

  // Ref para detectar mudanças no sync
  const lastSyncCountRef = React.useRef(0);

  // Ref para preservar estratégias de automação (evita ops como dep de useEffect)
  const autoEstrategias = React.useRef<Map<string, string>>(new Map());
  React.useEffect(() => {
    ops.forEach(op => {
      if (['Quadrantes', 'FluxoVelas'].some(k => op.estrategia.includes(k))) {
        autoEstrategias.current.set(op.id, op.estrategia);
      }
    });
  }, [ops]);

  const [searchText, setSearchText] = React.useState('');
  const [marketFilter, setMarketFilter] = React.useState<'all' | 'forex' | 'cripto'>('all');
  const [dateFrom, setDateFrom] = React.useState(firstOfMonth);
  const [dateTo, setDateTo] = React.useState(todayStr);

  // ── Operações abertas (polling) ──
  const [opsAbertas, setOpsAbertas] = React.useState<OperacaoAberta[]>([]);
  React.useEffect(() => {
    if (!isPumaConnected) { setOpsAbertas([]); return; }
    let mounted = true;
    const poll = async () => {
      try {
        const { operacoes } = await verificarOperacoesAbertas();
        if (mounted) setOpsAbertas(operacoes.filter(op => op.demo !== '1'));
      } catch { /* silencioso */ }
    };
    poll();
    const id = setInterval(poll, 12000); // Increased from 5s to 12s for performance

    // Force balance refresh on mount
    obterDadosUsuario().catch(() => {});

    return () => { mounted = false; clearInterval(id); };
  }, [isPumaConnected]);

  // ── Ao conectar Puma: sincronizar automaticamente ────────────────
  React.useEffect(() => {
    if (!isPumaConnected || !userId) return;
    let mounted = true;
    const doAutoSync = async () => {
      try {
        const historicoPuma = await obterHistoricoOperacoes();
        console.log('[Operacoes] Sync: recebeu', historicoPuma.length, 'operações da Puma');
        if (historicoPuma[0]) console.log('[Operacoes] Primeira op:', JSON.stringify(historicoPuma[0]));
        if (!mounted || historicoPuma.length === 0) return;
        const opsFiltradas = registradoEm ? historicoPuma.filter(op => op.data >= registradoEm) : historicoPuma;
        if (opsFiltradas.length === 0) return;
        const corretoraTag = `VornaBroker (${pumaEmail})`;
        const toUpsert = opsFiltradas.map(opSync => {
          const savedStrat = autoEstrategias.current.get(opSync.id);
          return {
            id: opSync.id,
            user_id: userId,
            data: opSync.data,
            hora: opSync.hora,
            corretora: corretoraTag,
            ativo: opSync.ativo,
            mercado: opSync.mercado,
            estrategia: savedStrat || opSync.estrategia,
            direcao: opSync.direcao,
            resultado: opSync.resultado,
            investido: opSync.investido,
            payout: opSync.payout,
            lucro: opSync.lucro,
            timeframe: opSync.timeframe,
            confianca: opSync.confianca,
          };
        });
        await upsertOperacoesBatch(toUpsert);
        getSeguidoresCopyTrade().then(seguidores => replicarOperacoesParaSeguidores(toUpsert, seguidores)).catch(() => {});
        if (mounted) {
          await recarregarOps();
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
          window.dispatchEvent(new CustomEvent('apex-trader:ops-updated'));
        }
      } catch (err) {
        console.error('[Operacoes] Erro ao auto-sync após conexão:', err);
      }
    };
    doAutoSync();
    return () => { mounted = false; };
  }, [isPumaConnected, userId, registradoEm, pumaEmail, recarregarOps]);

  // ── Sync manual (botão "Sincronizar Agora") ──────────────────────
  const syncNow = React.useCallback(async () => {
    if (!userId || isManualSyncing || !isPumaConnected) return;
    try {
      setIsManualSyncing(true);
      const historicoPuma = await obterHistoricoOperacoes();
      const filtroData = registradoEm || '2000-01-01';

      const opsFiltradas = historicoPuma.filter(op => op.data >= filtroData);

      if (historicoPuma.length === 0) {
        alert('A API da corretora não retornou nenhuma operação (lista vazia). Verifique se existem operações fechadas.');
      } else {
        alert(`A API retornou ${historicoPuma.length} operações.\nFiltrando a partir de ${filtroData}...\nRestaram: ${opsFiltradas.length} operações.`);
      }

      if (opsFiltradas.length === 0) {
        setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        return;
      }
      const corretoraTag = `VornaBroker (${pumaEmail})`;
      const toUpsert = opsFiltradas.map(opSync => {
        const savedStrat = autoEstrategias.current.get(opSync.id);
        return {
          id: opSync.id,
          user_id: userId,
          data: opSync.data,
          hora: opSync.hora,
          corretora: corretoraTag,
          ativo: opSync.ativo,
          mercado: opSync.mercado,
          estrategia: savedStrat || opSync.estrategia,
          direcao: opSync.direcao,
          resultado: opSync.resultado,
          investido: opSync.investido,
          payout: opSync.payout,
          lucro: opSync.lucro,
          timeframe: opSync.timeframe,
          confianca: opSync.confianca,
        };
      });
      await upsertOperacoesBatch(toUpsert);
      getSeguidoresCopyTrade().then(seguidores => replicarOperacoesParaSeguidores(toUpsert, seguidores)).catch(() => {});
      await recarregarOps();
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      window.dispatchEvent(new CustomEvent('apex-trader:ops-updated'));
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setIsManualSyncing(false);
    }
  }, [userId, isManualSyncing, isPumaConnected, registradoEm, pumaEmail, todayStr, recarregarOps]);

  // ── Auto-sync a cada 30s (com change detection) ─────────────────
  React.useEffect(() => {
    if (!isAutoSyncEnabled || !userId || !isPumaConnected) return;
    let mounted = true;
    const doSync = async () => {
      if (!mounted) return;
      try {
        setIsSyncing(true);
        const historicoPuma = await obterHistoricoOperacoes();
        if (historicoPuma.length === 0) return;
        const filtroData = registradoEm || '2000-01-01';
        const opsFiltradas = historicoPuma.filter(op => op.data >= filtroData);
        if (opsFiltradas.length === 0) return;

        // Change detection: só faz upsert se a quantidade mudou
        if (opsFiltradas.length === lastSyncCountRef.current) return;
        lastSyncCountRef.current = opsFiltradas.length;

        const corretoraTag = `VornaBroker (${pumaEmail})`;
        const toUpsert = opsFiltradas.map(opSync => {
          const savedStrat = autoEstrategias.current.get(opSync.id);
          return {
            id: opSync.id,
            user_id: userId,
            data: opSync.data,
            hora: opSync.hora,
            corretora: corretoraTag,
            ativo: opSync.ativo,
            mercado: opSync.mercado,
            estrategia: savedStrat || opSync.estrategia,
            direcao: opSync.direcao,
            resultado: opSync.resultado,
            investido: opSync.investido,
            payout: opSync.payout,
            lucro: opSync.lucro,
            timeframe: opSync.timeframe,
            confianca: opSync.confianca,
          };
        });
        await upsertOperacoesBatch(toUpsert);
        getSeguidoresCopyTrade().then(seguidores => replicarOperacoesParaSeguidores(toUpsert, seguidores)).catch(() => {});
        if (mounted) {
          await recarregarOps();
          window.dispatchEvent(new CustomEvent('apex-trader:ops-updated'));
        }
      } catch (err) {
        console.error('Auto Sync Error:', err);
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };
    doSync();
    const intervalId = setInterval(doSync, 45000); // Increased from 30s to 45s
    return () => { mounted = false; clearInterval(intervalId); };
  }, [isAutoSyncEnabled, userId, isPumaConnected, registradoEm, pumaEmail, todayStr, recarregarOps]);

  // ── Operações filtradas por conta ────────────────────────────────
  const accountOps = ops.filter(op => isPumaConnected && op.corretora?.includes(pumaEmail));
  
  // Filtro Rigoroso: Apenas operações a partir da data de criação da conta no Guias Academy
  const opsPorConta = React.useMemo(() => {
    if (!registradoEm) return accountOps;
    return accountOps.filter(op => op.data >= registradoEm);
  }, [accountOps, registradoEm]);

  const totalWinsAll = opsPorConta.filter(op => op.resultado === 'vitoria').length;
  const winRateAll = opsPorConta.length > 0 ? Math.round((totalWinsAll / opsPorConta.length) * 100) : 0;
  
  // Banca Atual: Prioridade ABSOLUTA para o saldo real da corretora. 
  // Se não tiver saldoPumaReal, a gente usa o cálculo mas isso é o fallback do fallback.
  const bancaAtual = saldoPumaReal ?? parseFloat((bancaInicial + opsPorConta.reduce((s, op) => s + op.lucro, 0)).toFixed(2));

  // ── Filtro de automação ────────────────────────────────────────
  const AUTOMACAO_KEYWORDS = ['Quadrantes', 'FluxoVelas'];
  const isAutoOp = (op: Op) => AUTOMACAO_KEYWORDS.some(k => op.estrategia.includes(k));
  const opsAutomacao = opsPorConta.filter(isAutoOp);
  const opsBase = activeTab === 'automacao' ? opsAutomacao : opsPorConta;

  // Persist banca_atual e win_rate no perfil Supabase (com debounce)
  const debouncedUpdateProfile = React.useMemo(
    () => debounce((uid: string, banca: number, wr: number) => {
      updateProfile(uid, { banca_atual: banca, win_rate: wr }).catch(console.error);
    }, 2000),
    []
  );

  React.useEffect(() => {
    if (!userId) return;
    if (profile?.performance_manual) return; // Protege valores manuais
    debouncedUpdateProfile(userId, bancaAtual, winRateAll);
    return () => debouncedUpdateProfile.cancel();
  }, [bancaAtual, winRateAll, userId, debouncedUpdateProfile, profile?.performance_manual]);

  const filteredOps = React.useMemo(() => {
    // Ordenação cronológica rigorosa (mais recente primeiro)
    const sorted = [...opsBase].sort((a, b) => {
      const dateTimeA = `${a.data} ${a.hora}`;
      const dateTimeB = `${b.data} ${b.hora}`;
      return dateTimeB.localeCompare(dateTimeA);
    });

    return sorted.filter(op => {
      const matchMercado = marketFilter === 'all' || op.mercado === marketFilter;
      const matchSearch = !searchText ||
        op.ativo.toLowerCase().includes(searchText.toLowerCase()) ||
        op.estrategia.toLowerCase().includes(searchText.toLowerCase()) ||
        op.corretora.toLowerCase().includes(searchText.toLowerCase());
      const matchData = op.data >= dateFrom && op.data <= dateTo;
      return matchMercado && matchSearch && matchData;
    });
  }, [opsBase, marketFilter, searchText, dateFrom, dateTo]);

  const dailySummary = React.useMemo(() => {
    const days: Record<string, { lucro: number; total: number; wins: number }> = {};
    filteredOps.forEach(op => {
      if (!days[op.data]) days[op.data] = { lucro: 0, total: 0, wins: 0 };
      days[op.data].lucro += op.lucro;
      days[op.data].total += 1;
      if (op.resultado === 'vitoria') days[op.data].wins += 1;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, v]) => ({
        data: data.slice(5).replace('-', '/'),
        dataFull: data,
        lucro: v.lucro,
        total: v.total,
        wins: v.wins,
        winrate: Math.round((v.wins / v.total) * 100),
      }));
  }, [filteredOps]);

  const totalLucro = filteredOps.reduce((s, op) => s + op.lucro, 0);
  const totalWins = filteredOps.filter(op => op.resultado === 'vitoria').length;
  const winRate = filteredOps.length > 0 ? Math.round((totalWins / filteredOps.length) * 100) : 0;

  const toggleAutoSync = () => {
    const newVal = !isAutoSyncEnabled;
    setIsAutoSyncEnabled(newVal);
    localStorage.setItem('vorna_auto_sync', String(newVal));
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Registros de Operações</h2>
          <p className="text-slate-400">
            Mantenha um histórico detalhado de todas as suas entradas.
            {lastSyncTime && (
              <span className="ml-2 text-xs text-slate-500">Última sync: {lastSyncTime}</span>
            )}
          </p>
        </div>
        {isPumaConnected && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Botão sync manual */}
            <button
              onClick={syncNow}
              disabled={isManualSyncing}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all border",
                isManualSyncing
                  ? "bg-trademaster-blue/20 text-trademaster-blue border-trademaster-blue/30 opacity-70 cursor-not-allowed"
                  : "bg-trademaster-blue text-slate-950 border-transparent hover:brightness-110"
              )}
            >
              <Zap size={16} className={isManualSyncing ? 'animate-pulse' : ''} />
              {isManualSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
            {/* Toggle auto-sync */}
            <button
              onClick={toggleAutoSync}
              className={cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all overflow-hidden",
                isAutoSyncEnabled
                  ? "bg-trademaster-blue/20 text-trademaster-blue border border-trademaster-blue hover:bg-trademaster-blue/30"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10"
              )}
            >
              {isAutoSyncEnabled && (
                <div className="absolute inset-0 bg-trademaster-blue/10 animate-pulse pointer-events-none" />
              )}
              <RefreshCw size={16} className={cn(isAutoSyncEnabled && isSyncing && "animate-spin")} />
              <span className="text-sm">Auto <span className={isAutoSyncEnabled ? "text-trademaster-blue" : "text-slate-500"}>{isAutoSyncEnabled ? 'ON' : 'OFF'}</span></span>
            </button>
          </div>
        )}
      </header>

      {isPumaConnected ? (
        <>
          {/* Conta conectada — badge */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">Conta conectada:</span>
              <span className="text-sm font-bold text-white">{pumaEmail}</span>
              {registradoEm && (
                <span className="text-xs text-slate-500 hidden md:inline">· Ops a partir de {registradoEm.split('-').reverse().join('/')}</span>
              )}
            </div>
            <button
              onClick={desconectar}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>

          {/* Cards de saldo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Banca Atual (VornaBroker)</p>
              <p className={cn('text-2xl font-black', bancaAtual >= bancaInicial ? 'text-emerald-500' : 'text-red-500')}>
                {formatCurrency(bancaAtual)}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                {bancaAtual >= bancaInicial ? '+' : ''}{formatCurrency(bancaAtual - bancaInicial)} vs meta inicial
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Taxa de Acerto All-Time</p>
              <p className={cn('text-2xl font-black', winRateAll >= 60 ? 'text-trademaster-blue' : 'text-amber-500')}>
                {winRateAll}%
              </p>
              <p className="text-[10px] text-slate-600 mt-1">{totalWinsAll}W · {opsPorConta.length - totalWinsAll}L · {opsPorConta.length} total</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Performance (R$)</p>
              <p className={cn('text-2xl font-black', totalLucro >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {totalLucro >= 0 ? '+' : ''}{formatCurrency(totalLucro)}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">Neste período filtrado</p>
            </div>
          </div>

          {/* Operações Abertas */}
          {opsAbertas.length > 0 && (
            <div className="glass-card p-4 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-bold text-amber-400">Operações Abertas ({opsAbertas.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {opsAbertas.map(op => (
                  <div key={op.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[10px] font-black px-1.5 py-0.5 rounded',
                        op.trend === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {op.trend === 'BUY' ? 'COMPRA' : 'VENDA'}
                      </span>
                      <span className="text-sm font-bold text-white">{op.asset}</span>
                      <span className="text-[10px] text-slate-500">{op.interval}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">${parseFloat(op.lot).toFixed(2)}</p>
                      <p className="text-[10px] text-trademaster-blue">{op.payout_percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entradas</p>
                <p className="text-xl font-bold">{filteredOps.length}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vitórias</p>
                <p className="text-xl font-bold text-emerald-500">{totalWins}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Derrotas</p>
                <p className="text-xl font-bold text-red-500">{filteredOps.length - totalWins}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                <p className="text-xl font-bold text-trademaster-blue">{winRate}%</p>
              </div>
              <div className="w-px h-8 bg-white/10 hidden md:block" />
              <div className="hidden md:block">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Financeiro</p>
                <p className={cn('text-xl font-bold flex items-center gap-1', totalLucro >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {totalLucro >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {totalLucro > 0 ? '+' : ''}{formatCurrency(totalLucro)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('todas')}
              className={cn(
                "px-6 py-2 rounded-lg font-bold text-sm transition-all relative",
                activeTab === 'todas' ? "bg-trademaster-blue text-slate-950 shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveTab('automacao')}
              className={cn(
                "px-6 py-2 rounded-lg font-bold text-sm transition-all relative flex items-center gap-2",
                activeTab === 'automacao' ? "bg-trademaster-blue text-slate-950 shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Zap size={16} />
              Automação
              {opsAutomacao.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-white/10">{opsAutomacao.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('relatorio')}
              className={cn(
                "px-6 py-2 rounded-lg font-bold text-sm transition-all relative flex items-center gap-2",
                activeTab === 'relatorio' ? "bg-trademaster-blue text-slate-950 shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <BarChart3 size={16} />
              Estatísticas
            </button>
          </div>

          {/* Mini-resumo de período (só na aba Automação) */}
          {activeTab === 'automacao' && opsAutomacao.length > 0 && (() => {
            const hoje = new Date().toISOString().slice(0, 10);
            const agora = new Date();
            const diaSemana = agora.getDay();
            const inicioSemana = new Date(agora);
            inicioSemana.setDate(agora.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
            const semanaStr = inicioSemana.toISOString().slice(0, 10);
            const mesStr = hoje.slice(0, 7) + '-01';

            const calcStats = (opsArr: Op[]) => {
              const wins = opsArr.filter(o => o.resultado === 'vitoria').length;
              const losses = opsArr.length - wins;
              const lucro = opsArr.reduce((s, o) => s + o.lucro, 0);
              return { wins, losses, lucro };
            };

            const statsHoje = calcStats(opsAutomacao.filter(o => o.data === hoje));
            const statsSemana = calcStats(opsAutomacao.filter(o => o.data >= semanaStr));
            const statsMes = calcStats(opsAutomacao.filter(o => o.data >= mesStr));

            return (
              <div className="glass-card p-4 flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Hoje:</span>
                  <span className="text-emerald-400 font-bold">{statsHoje.wins}W</span>
                  <span className="text-red-400 font-bold">{statsHoje.losses}L</span>
                  <span className={cn('font-bold', statsHoje.lucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    ({statsHoje.lucro >= 0 ? '+' : ''}{formatCurrency(statsHoje.lucro)})
                  </span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Semana:</span>
                  <span className="text-emerald-400 font-bold">{statsSemana.wins}W</span>
                  <span className="text-red-400 font-bold">{statsSemana.losses}L</span>
                  <span className={cn('font-bold', statsSemana.lucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    ({statsSemana.lucro >= 0 ? '+' : ''}{formatCurrency(statsSemana.lucro)})
                  </span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Mês:</span>
                  <span className="text-emerald-400 font-bold">{statsMes.wins}W</span>
                  <span className="text-red-400 font-bold">{statsMes.losses}L</span>
                  <span className={cn('font-bold', statsMes.lucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    ({statsMes.lucro >= 0 ? '+' : ''}{formatCurrency(statsMes.lucro)})
                  </span>
                </div>
              </div>
            );
          })()}

          {(activeTab === 'todas' || activeTab === 'automacao') && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2.5 rounded-xl flex-1 max-w-md w-full focus-within:ring-2 focus-within:ring-trademaster-blue transition-all border border-white/5">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar ativo ou estratégia..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder:text-slate-500"
                  />
                </div>
                {/* Market filter */}
                <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl gap-1">
                  {(['all', 'forex', 'cripto'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMarketFilter(m)}
                      className={cn(
                        'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                        marketFilter === m ? 'bg-trademaster-blue text-black' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {m === 'all' ? 'Todos' : m === 'forex' ? 'Forex' : 'Cripto'}
                    </button>
                  ))}
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl px-4 py-2">
                  <Calendar size={16} className="text-slate-500 shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-transparent text-sm outline-none text-slate-300 w-32"
                  />
                  <span className="text-slate-600">→</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-transparent text-sm outline-none text-slate-300 w-32"
                  />
                </div>
              </div>

              {filteredOps.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <Calendar size={48} className="text-slate-700 mb-4" />
                  <p className="text-slate-400">Pronto para iniciar? Quando você realizar transações na conta {pumaEmail}, elas aparecerão aqui!</p>
                  <button
                    onClick={syncNow}
                    disabled={isManualSyncing}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-trademaster-blue text-slate-950 hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    <Zap size={16} className={isManualSyncing ? 'animate-pulse' : ''} />
                    {isManualSyncing ? 'Buscando...' : 'Buscar operações'}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest text-center">
                        <th className="p-4 font-semibold w-12 rounded-tl-xl text-left">Ativo / Tipo</th>
                        <th className="p-4 font-semibold">Data / Hora</th>
                        <th className="p-4 font-semibold">Corretora</th>
                        <th className="p-4 font-semibold text-right">Financeiro (R$)</th>
                        <th className="p-4 font-semibold rounded-tr-xl">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOps.map((op, i) => (
                        <tr key={op.id || i} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ring-1 ring-inset",
                                op.direcao === 'compra'
                                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 ring-red-500/20"
                              )}>
                                {op.direcao === 'compra' ? 'CALL' : 'PUT'}
                              </div>
                              <div>
                                <p className="font-bold text-white leading-tight mb-0.5">{op.ativo}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{op.timeframe} · {op.estrategia}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <p className="text-sm font-medium text-slate-300">{op.data.split('-').reverse().join('/')}</p>
                            <p className="text-xs text-slate-500 font-mono">{op.hora}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/5">
                              {op.corretora}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Entrada</span>
                              <p className="text-sm font-bold text-white mb-1">{formatCurrency(op.investido)}</p>
                              <div className={cn(
                                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black',
                                op.lucro >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              )}>
                                {op.lucro >= 0 ? '+' : ''}{formatCurrency(op.lucro)}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={cn(
                              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ring-1 ring-inset shadow-sm inline-block min-w-20",
                              op.resultado === 'vitoria'
                                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                                : "bg-red-500/10 text-red-400 ring-red-500/20"
                            )}>
                              {op.resultado === 'vitoria' ? 'Vitória' : 'Derrota'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'relatorio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-6 min-h-[400px]">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-trademaster-blue" />
                  Evolução do Saldo (Diário)
                </h3>
                {dailySummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailySummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="data" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      />
                      <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                        {dailySummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.lucro >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Sem dados suficientes
                  </div>
                )}
              </div>

              <div className="glass-card p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-trademaster-blue" />
                  Métricas Diárias
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-3">
                    {dailySummary.slice().reverse().map(d => (
                      <div key={d.dataFull} className="p-4 rounded-xl bg-slate-800/30 border border-white/5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{d.data}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{d.wins} Win · {d.total - d.wins} Loss ({d.winrate}%)</p>
                        </div>
                        <p className={cn(
                          'font-bold text-lg',
                          d.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {d.lucro >= 0 ? '+' : ''}{formatCurrency(d.lucro)}
                        </p>
                      </div>
                    ))}
                    {dailySummary.length === 0 && (
                      <p className="text-center text-slate-500 py-12">Nenhuma operação neste período.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── NOT CONNECTED: mini formulário de login Puma ── */
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-full max-w-md">
            <div className="glass-card p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-trademaster-blue/10 mb-4">
                  <Globe size={32} className="text-trademaster-blue" />
                </div>
                <h3 className="text-xl font-bold mb-1">Conecte sua conta VornaBroker</h3>
                <p className="text-sm text-slate-400">
                  Entre com suas credenciais para ver seu histórico de operações e saldo atualizados.
                </p>
              </div>

              {/* Erro de conexão */}
              {erro && (
                <div className={`p-3 rounded-xl mb-4 flex items-start gap-2 text-sm ${requer2fa
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                  <span>⚠ {erro}</span>
                </div>
              )}

              <form onSubmit={handleConectar} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Email da VornaBroker</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-trademaster-blue/50 transition-colors"
                    disabled={isConectando}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Senha</label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={loginSenha}
                      onChange={e => setLoginSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-trademaster-blue/50 transition-colors pr-12"
                      disabled={isConectando}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isConectando || !loginEmail || !loginSenha}
                  className="w-full py-3 bg-trademaster-blue text-slate-950 font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isConectando ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Entrar e Sincronizar
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} />
                <span>Seus dados são enviados diretamente à corretora com segurança</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
