import React from 'react';
import { BRANDING } from '../config/branding';
import {
  TrendingUp,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X,
} from 'lucide-react';
import { useVorna } from '../lib/useVorna';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Customized,
} from 'recharts';
import { formatCurrency, cn, debounce } from '../lib/utils';
import { upsertOperacoesBatch, updateProfile } from '../lib/supabaseService';
import { useData } from '../contexts/DataContext';
import { obterHistoricoOperacoes, obterSessaoVorna } from '../lib/vorna';
import { SalesDashboard } from '../components/ui/LiveSalesDashboard';

interface StoredOp {
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  data: string;
  hora?: string;
  ativo: string;
  mercado: 'forex' | 'cripto';
  estrategia?: string;
  direcao?: 'compra' | 'venda';
  timeframe?: string;
  corretora?: string;
}

interface ChartPoint {
  date: string;
  name: string;
  value: number;
  prevValue: number;
  dayLucro: number;
  wins: number;
  losses: number;
  totalOps: number;
  forexLucro: number;
  criptoLucro: number;
}

const readOps = (): StoredOp[] => [];

// Custom tooltip rendered in DOM (outside SVG)
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0].payload;
  const isUp = d.dayLucro >= 0;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '12px 16px',
      minWidth: 210,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#fff', fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
        {d.date.split('-').reverse().join('/')}
      </p>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>
        Banca:{' '}
        <span style={{ color: '#fff', fontWeight: 600 }}>{formatCurrency(d.value)}</span>
      </p>
      <p style={{ color: isUp ? '#34de00' : '#ef4444', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        {isUp ? '+' : ''}{formatCurrency(d.dayLucro)} no dia
      </p>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 11, color: '#64748b' }}>{d.wins}W / {d.losses}L · {d.totalOps} operação(ões)</p>
        {d.forexLucro !== 0 && (
          <p style={{ fontSize: 11, color: '#64748b' }}>
            Forex: <span style={{ color: d.forexLucro >= 0 ? '#34de00' : '#ef4444', fontWeight: 600 }}>{formatCurrency(d.forexLucro)}</span>
          </p>
        )}
        {d.criptoLucro !== 0 && (
          <p style={{ fontSize: 11, color: '#64748b' }}>
            Cripto: <span style={{ color: d.criptoLucro >= 0 ? '#34de00' : '#ef4444', fontWeight: 600 }}>{formatCurrency(d.criptoLucro)}</span>
          </p>
        )}
      </div>
    </div>
  );
};

import { StyledDropdown } from '../components/ui/styled-dropdown';
import { Globe, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [period, setPeriod] = React.useState('7d');
  const [marketFilter, setMarketFilter] = React.useState<'all' | 'forex' | 'cripto'>('all');
  const [selectedPoint, setSelectedPoint] = React.useState<ChartPoint | null>(null);
  const [isSyncingPuma, setIsSyncingPuma] = React.useState(false);

  // Profile + Ops do DataContext (compartilhado entre páginas)
  const { profile, operacoes: dataOps, userId, recarregarOps } = useData();

  // Puma integration (passa userId para persistir ops automação no Supabase)
  const { sessao, operacoesAbertas } = useVorna(userId);
  const bancaInicial = profile?.banca_inicial ?? 0;
  const nome = profile?.nome || 'Trader';
  const registradoEm = profile?.created_at?.slice(0, 10) || null;

  // Ref para detectar mudanças no sync
  const lastSyncCountRef = React.useRef(0);

  // Ref para preservar estratégias de automação (evita dataOps como dep de useEffect)
  const autoEstrategias = React.useRef<Map<string, string>>(new Map());
  React.useEffect(() => {
    dataOps.forEach(op => {
      if (['Quadrantes', 'FluxoVelas'].some(k => op.estrategia.includes(k))) {
        autoEstrategias.current.set(op.id, op.estrategia);
      }
    });
  }, [dataOps]);

  // Mapear ops do DataContext para o formato local
  const ops: StoredOp[] = React.useMemo(() => dataOps.map(r => ({
    resultado: r.resultado as 'vitoria' | 'derrota',
    lucro: r.lucro || 0,
    data: r.data || '',
    hora: r.hora || undefined,
    ativo: r.ativo || '',
    mercado: (r.mercado || 'forex') as 'forex' | 'cripto',
    estrategia: r.estrategia || undefined,
    direcao: r.direcao as 'compra' | 'venda' | undefined,
    timeframe: r.timeframe || undefined,
    corretora: r.corretora || '',
  })), [dataOps]);

  // Auto-sync histórico da Puma ao conectar (intervalo 60s, com change detection)
  React.useEffect(() => {
    if (!sessao?.conectado || !userId) return;

    let mounted = true;
    const syncPuma = async () => {
      try {
        setIsSyncingPuma(true);
        const sessaoAtual = obterSessaoVorna();
        if (!sessaoAtual?.conectado) return;

        const historicoPuma = await obterHistoricoOperacoes();
        if (!mounted) return;

        // Filtra: só operações a partir da data de registro no Guias Academy se existir
        const opsFiltradas = registradoEm ? historicoPuma.filter(op => op.data >= registradoEm) : historicoPuma;
        if (opsFiltradas.length === 0) return;

        // Change detection: só faz upsert se a quantidade mudou
        if (opsFiltradas.length === lastSyncCountRef.current) return;
        lastSyncCountRef.current = opsFiltradas.length;

        const corretoraTag = `VornaBroker (${sessaoAtual.usuario?.email})`;
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
        if (mounted) {
          await recarregarOps();
          window.dispatchEvent(new CustomEvent('apex-trader:ops-updated'));
        }
      } catch (err) {
        console.error('Dashboard: erro ao sincronizar VornaBroker:', err);
      } finally {
        if (mounted) setIsSyncingPuma(false);
      }
    };

    syncPuma();
    const intv = setInterval(syncPuma, 60000);
    return () => { mounted = false; clearInterval(intv); };
  }, [sessao?.conectado, userId, registradoEm, recarregarOps]);

  const nameDisplay = sessao?.usuario?.nome || nome;

  const currentPumaEmail = sessao?.usuario?.email;

  // Filtered ops for charts/stats: only show ops from currently connected Puma account
  const accountBaseOps = currentPumaEmail ? ops.filter(op => op.corretora?.includes(currentPumaEmail)) : ops;
  
  // Filtro Rigoroso: Apenas operações a partir da data de criação da conta no Guias Academy
  const accountOps = React.useMemo(() => {
    if (!registradoEm) return accountBaseOps;
    return accountBaseOps.filter(op => op.data >= registradoEm);
  }, [accountBaseOps, registradoEm]);

  const filtered = accountOps.filter(op => marketFilter === 'all' || op.mercado === marketFilter);
  const wins = filtered.filter(op => op.resultado === 'vitoria').length;
  const losses = filtered.length - wins;
  const totalLucro = filtered.reduce((s, op) => s + op.lucro, 0);
  const winRate = filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;

  // Saldo real da carteira (REAL, USDT ou DEMO) da Puma
  const saldoPumaReal = (() => {
    const wallets = sessao?.usuario?.carteiras || [];
    const active = wallets.find(c => c.tipo === 'REAL') ||
      wallets.find(c => c.tipo === 'USDT') ||
      wallets.find(c => c.tipo === 'DEMO');
    return active?.saldo ?? sessao?.perfil?.saldo ?? undefined;
  })();
  const bancaAtual = saldoPumaReal ?? parseFloat((bancaInicial + accountOps.reduce((s, op) => s + op.lucro, 0)).toFixed(2));
  const baseParaGrafico = saldoPumaReal !== undefined ? parseFloat((saldoPumaReal - totalLucro).toFixed(2)) : bancaInicial;

  // Persistir banca_atual no Supabase com debounce (evita spam de requisições)
  const debouncedUpdateProfile = React.useMemo(
    () => debounce((uid: string, banca: number, wr: number) => {
      updateProfile(uid, { banca_atual: banca, win_rate: wr }).catch(console.error);
    }, 2000),
    []
  );

  React.useEffect(() => {
    if (!userId) return;
    if (profile?.performance_manual) return; // Protege valores manuais
    debouncedUpdateProfile(userId, bancaAtual, winRate);
    return () => debouncedUpdateProfile.cancel();
  }, [bancaAtual, winRate, userId, debouncedUpdateProfile, profile?.performance_manual]);



  // Enriched chart data: one point per day with all details
  const chartData: ChartPoint[] = React.useMemo(() => {
    const byDay: Record<string, { lucro: number; ops: StoredOp[] }> = {};
    filtered.forEach(op => {
      const day = op.data?.slice(0, 10) || '?';
      if (!byDay[day]) byDay[day] = { lucro: 0, ops: [] };
      byDay[day].lucro += op.lucro;
      byDay[day].ops.push(op);
    });
    let running = baseParaGrafico;
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { lucro, ops: dayOps }]) => {
        const prev = running;
        running = parseFloat((running + lucro).toFixed(2));
        const w = dayOps.filter(o => o.resultado === 'vitoria').length;
        return {
          date,
          name: date.slice(5).replace('-', '/'),
          value: running,
          prevValue: prev,
          dayLucro: lucro,
          wins: w,
          losses: dayOps.length - w,
          totalOps: dayOps.length,
          forexLucro: dayOps.filter(o => o.mercado === 'forex').reduce((s, o) => s + o.lucro, 0),
          criptoLucro: dayOps.filter(o => o.mercado === 'cripto').reduce((s, o) => s + o.lucro, 0),
        };
      });
  }, [filtered, bancaInicial]);

  const forexLucro = ops.filter(op => op.mercado === 'forex').reduce((s, op) => s + op.lucro, 0);
  const criptoLucro = ops.filter(op => op.mercado === 'cripto').reduce((s, op) => s + op.lucro, 0);
  const recentOps = filtered.slice(0, 5);
  const hasData = ops.length > 0;

  // SVG overlay: colored segments + interactive dots — rendered inside the chart SVG
  const renderChartOverlay = React.useCallback((chartProps: any) => {
    const points = chartProps.formattedGraphicalItems?.[0]?.props?.points as
      Array<{ x: number; y: number; payload: ChartPoint }> | undefined;
    if (!points?.length) return null;

    return (
      <g>
        {/* Colored line segments */}
        {points.slice(1).map((pt, i) => {
          const prev = points[i];
          const isUp = pt.payload.value >= prev.payload.value;
          return (
            <line
              key={`seg-${i}`}
              x1={prev.x} y1={prev.y}
              x2={pt.x} y2={pt.y}
              stroke={isUp ? '#34de00' : '#ef4444'}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}

        {/* Interactive dots */}
        {points.map((pt, i) => {
          const isUp = i === 0 ? true : pt.payload.value >= points[i - 1].payload.value;
          const isSelected = selectedPoint?.date === pt.payload.date;
          const color = isUp ? '#34de00' : '#ef4444';
          return (
            <g
              key={`dot-${i}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedPoint(isSelected ? null : pt.payload)}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle cx={pt.x} cy={pt.y} r={13}
                  fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.35}
                />
              )}
              {/* Outer stroke for visibility */}
              <circle cx={pt.x} cy={pt.y} r={isSelected ? 7 : 5}
                fill="#0f172a" stroke={color} strokeWidth={2}
              />
              {/* Inner fill */}
              <circle cx={pt.x} cy={pt.y} r={isSelected ? 4 : 3}
                fill={color}
              />
            </g>
          );
        })}
      </g>
    );
  }, [selectedPoint, setSelectedPoint]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
            Visão Geral
            <div className="w-2 h-2 rounded-full bg-apex-trader-primary animate-pulse" />
            {isSyncingPuma && (
              <span className="text-xs font-medium text-slate-500 animate-pulse">Sincronizando VornaBroker...</span>
            )}
          </h2>
          <p className="text-slate-400 font-medium">Bem-vindo de volta, <span className="text-white font-bold">{nameDisplay}</span>. Aqui está sua performance atual.</p>
          

        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <StyledDropdown
            label="Mercado"
            className="w-full sm:w-[180px]"
            options={[
              { id: 'all', label: 'Todos Mercados', icon: Globe },
              { id: 'forex', label: 'Forex', icon: TrendingUp },
              { id: 'cripto', label: 'Criptomoedas', icon: Activity },
            ]}
            value={marketFilter}
            onChange={(val) => setMarketFilter(val as any)}
          />

          <StyledDropdown
            label="Período"
            className="w-full sm:w-[160px]"
            options={[
              { id: '7d', label: 'Últimos 7 dias', icon: Calendar },
              { id: 'week', label: 'Esta Semana', icon: Calendar },
              { id: 'month', label: 'Este Mês', icon: Calendar },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>
      </header>

      {/* Mobile Background Warning */}
      <div className="md:hidden p-4 bg-apex-trader-primary/10 border border-apex-trader-primary/20 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-apex-trader-primary/20 rounded-xl text-apex-trader-primary">
          <Globe size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-apex-trader-primary uppercase tracking-wider">Atenção ao Operar no Mobile</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Mantenha o <strong>{BRANDING.platformName} aberto ou em tela dividida</strong>. O sistema mobile pode interromper o robô se o navegador for para o segundo plano.
          </p>
        </div>
      </div>

      <SalesDashboard />
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl px-3 py-2 text-center min-w-[64px]">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={cn('text-sm font-bold', color)}>{value}</p>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon: Icon }: any) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-apex-trader-primary/10 rounded-lg text-apex-trader-primary">
          <Icon size={20} />
        </div>
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
          trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' :
            trend === 'down' ? 'bg-red-500/10 text-red-500' :
              'bg-slate-500/10 text-slate-400'
        )}>
          {trend === 'up' && <ArrowUpRight size={12} />}
          {trend === 'down' && <ArrowDownRight size={12} />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
