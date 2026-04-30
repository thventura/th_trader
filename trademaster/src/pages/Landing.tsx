import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import { ContainerScroll } from '../components/ui/container-scroll-animation';
import { ShootingStars } from '../components/ui/shooting-stars';
import { SplineScene } from '../components/ui/splite';
import { PricingSection } from '../components/ui/pricing';
import {
  LayoutDashboard,
  History,
  BrainCircuit,
  GraduationCap,
  Trophy,
  Users,
  Award,
  User,
  Globe,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  ChevronRight,
  Menu,
  X,
  Check,
  ArrowRight,
  Zap,
  MessageCircle,
  Clock,
  Search,
  Plus,
  BarChart3,
  Wallet,
  Headphones,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Crown,
  Medal,
  Flame,
  Lock,
  Star,
  Phone,
  Calendar,
  Activity,
  Smartphone,
} from 'lucide-react';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';

/* ============================
   PREVIEW DA PLATAFORMA (dentro do ContainerScroll)
   ============================ */

const previewNavItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { id: 'corretora', icon: Globe, label: 'Corretora' },
  { id: 'operacoes', icon: History, label: 'Reg. Operações' },
  { id: 'mindset', icon: BrainCircuit, label: 'Psicologia' },
  { id: 'aulas', icon: GraduationCap, label: 'Treinamentos' },
  { id: 'desafio', icon: Trophy, label: 'Desafio 3P' },
  { id: 'comunidades', icon: Users, label: 'Comunidades' },
  { id: 'prova', icon: Award, label: 'Prova Final' },
  { id: 'perfil', icon: User, label: 'Perfil' },
];

/* ---- Shared tiny components for previews ---- */
const MiniCard = ({ children, className = '', style, ...rest }: { children: React.ReactNode; className?: string; style?: React.CSSProperties;[key: string]: any }) => (
  <div className={`bg-slate-900/60 border border-white/5 rounded-lg ${className}`} style={style} {...rest}>{children}</div>
);

const StatCard = ({ icon: Icon, label, value, badge, color }: { icon: any; label: string; value: string; badge: string; color: string }) => (
  <MiniCard className="p-2 md:p-3">
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-apex-trader-primary/10 flex items-center justify-center">
        <Icon size={12} className="text-apex-trader-primary" />
      </div>
      <span className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${color.includes('green') || color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : color.includes('red') ? 'bg-red-500/10 text-red-500' : 'bg-apex-trader-primary/10 text-apex-trader-primary'}`}>{badge}</span>
    </div>
    <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`text-xs md:text-lg font-black ${color}`}>{value}</div>
  </MiniCard>
);

function PreviewDashboard() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm md:text-base font-bold text-white">Visão Geral</h2>
          <p className="text-[8px] md:text-[10px] text-slate-500">Bem-vindo de volta, Trader. Aqui está seu resumo.</p>
        </div>
        <div className="flex gap-1">
          {['Todos', 'Forex', 'Cripto'].map((f, i) => (
            <button key={f} className={`text-[7px] md:text-[9px] px-2 py-1 rounded-md font-bold ${i === 0 ? 'bg-apex-trader-primary text-black' : 'text-slate-500 bg-white/5'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
        <StatCard icon={DollarSign} label="Banca Atual" value="R$ 2.450" badge="+145%" color="text-apex-trader-primary" />
        <StatCard icon={TrendingUp} label="Lucro Total" value="+R$ 1.450" badge="23 ops" color="text-emerald-500" />
        <StatCard icon={Target} label="Win Rate" value="72%" badge="17W / 6L" color="text-apex-trader-primary" />
        <StatCard icon={Shield} label="Margem de Controle" value="R$ 650" badge="65% banca" color="text-amber-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Evolution Chart */}
        <MiniCard className="md:col-span-2 p-2 md:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400">Evolução da Banca</span>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[7px] md:text-[8px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-apex-trader-primary" />Alta</span>
              <span className="flex items-center gap-1 text-[7px] md:text-[8px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Queda</span>
            </div>
          </div>
          <div className="h-20 md:h-28 flex items-end gap-[1px] md:gap-[2px] relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[6px] text-slate-600 pr-1">
              <span>R$2.5k</span><span>R$2.0k</span><span>R$1.5k</span><span>R$1.0k</span>
            </div>
            <div className="flex-1 flex items-end gap-[1px] md:gap-[2px] pl-6">
              {[40, 45, 38, 55, 50, 62, 58, 70, 65, 75, 72, 80, 78, 85, 82, 88, 90, 88, 95, 92, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${h}%`, background: i > 0 && h > [40, 45, 38, 55, 50, 62, 58, 70, 65, 75, 72, 80, 78, 85, 82, 88, 90, 88, 95, 92, 100][i - 1] ? '#3b82f6' : '#ef4444', opacity: 0.8 }} />
              ))}
            </div>
          </div>
        </MiniCard>

        {/* Donut Chart */}
        <MiniCard className="p-2 md:p-3">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400">Desempenho por Mercado</span>
          <div className="flex items-center justify-center my-2">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="62 88" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="26 88" strokeDashoffset="-62" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] md:text-[10px] font-black text-emerald-500">+R$1.4k</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Forex', value: '+R$ 980', color: 'bg-apex-trader-primary', text: 'text-emerald-500' },
              { label: 'Cripto', value: '+R$ 470', color: 'bg-amber-500', text: 'text-emerald-500' },
              { label: 'Wins', value: '17', color: 'bg-emerald-500', text: 'text-emerald-500' },
              { label: 'Losses', value: '6', color: 'bg-red-500', text: 'text-red-500' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-[8px] md:text-[9px] px-1.5 py-1 rounded bg-white/3">
                <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${r.color}`} />{r.label}</span>
                <span className={`font-bold ${r.text}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </MiniCard>
      </div>

      {/* Recent Operations Table */}
      <MiniCard className="overflow-hidden">
        <div className="flex items-center justify-between px-2 md:px-3 py-2 border-b border-white/5">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400">Últimas Operações</span>
          <span className="text-[8px] text-slate-600">23 operações</span>
        </div>
        <table className="w-full text-[7px] md:text-[9px]">
          <thead>
            <tr className="border-b border-white/5">
              {['Data', 'Ativo', 'Mercado', 'Direção', 'Resultado', 'Lucro'].map((h) => (
                <th key={h} className="text-left p-1.5 md:p-2 text-[7px] md:text-[8px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { data: '04/03', ativo: 'EUR/USD', mercado: 'FOREX', dir: 'CALL', res: 'WIN', lucro: '+R$ 87' },
              { data: '04/03', ativo: 'BTC/USD', mercado: 'CRIPTO', dir: 'PUT', res: 'WIN', lucro: '+R$ 120' },
              { data: '03/03', ativo: 'GBP/JPY', mercado: 'FOREX', dir: 'CALL', res: 'LOSS', lucro: '-R$ 50' },
              { data: '03/03', ativo: 'ETH/USD', mercado: 'CRIPTO', dir: 'PUT', res: 'WIN', lucro: '+R$ 95' },
              { data: '02/03', ativo: 'USD/JPY', mercado: 'FOREX', dir: 'CALL', res: 'WIN', lucro: '+R$ 62' },
            ].map((op, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                <td className="p-1.5 md:p-2 text-slate-400">{op.data}</td>
                <td className="p-1.5 md:p-2 font-medium text-white">{op.ativo}</td>
                <td className="p-1.5 md:p-2"><span className={`px-1 py-0.5 rounded text-[6px] md:text-[8px] font-bold ${op.mercado === 'FOREX' ? 'bg-apex-trader-primary/10 text-apex-trader-primary' : 'bg-amber-500/10 text-amber-500'}`}>{op.mercado}</span></td>
                <td className={`p-1.5 md:p-2 font-bold ${op.dir === 'CALL' ? 'text-emerald-500' : 'text-red-500'}`}>{op.dir === 'CALL' ? '▲' : '▼'} {op.dir}</td>
                <td className="p-1.5 md:p-2"><span className={`px-1 py-0.5 rounded-full text-[6px] md:text-[8px] font-bold ${op.res === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{op.res}</span></td>
                <td className={`p-1.5 md:p-2 font-bold ${op.lucro.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{op.lucro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MiniCard>
    </div>
  );
}

function PreviewOperacoes() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm md:text-base font-bold text-white">Registros de Operações</h2>
        </div>
        <button className="flex items-center gap-1 text-[8px] md:text-[10px] font-bold bg-apex-trader-primary text-black px-2 md:px-3 py-1.5 rounded-lg">
          <Plus size={10} /> Novo Registro
        </button>
      </div>

      {/* 3 Bank Stats */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        <MiniCard className="p-2 md:p-3">
          <div className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-slate-500">Banca Atual</div>
          <div className="text-xs md:text-lg font-black text-apex-trader-primary">R$ 2.450</div>
          <div className="text-[7px] md:text-[8px] text-emerald-500">+R$ 1.450 (+145%)</div>
        </MiniCard>
        <MiniCard className="p-2 md:p-3">
          <div className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-slate-500">Taxa de Acerto</div>
          <div className="text-xs md:text-lg font-black text-apex-trader-primary">72%</div>
          <div className="text-[7px] md:text-[8px] text-slate-500">17W / 6L · 23 total</div>
        </MiniCard>
        <MiniCard className="p-2 md:p-3 border-amber-500/20">
          <div className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-slate-500">Dist. Stop</div>
          <div className="text-xs md:text-lg font-black text-amber-500">R$ 650</div>
          <div className="text-[7px] md:text-[8px] text-slate-500">Stop: R$ 800</div>
        </MiniCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-white/5 rounded-lg p-0.5">
        <button className="flex items-center gap-1 text-[8px] md:text-[10px] font-bold bg-apex-trader-primary text-black px-3 py-1.5 rounded-md">
          <History size={10} /> Operações
        </button>
        <button className="flex items-center gap-1 text-[8px] md:text-[10px] font-medium text-slate-500 px-3 py-1.5 rounded-md">
          <BarChart3 size={10} /> Relatório
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-800 border border-white/5 rounded-lg px-2 py-1 flex-1 min-w-[100px]">
          <Search size={10} className="text-slate-500" />
          <span className="text-[8px] text-slate-600">Buscar por ativo...</span>
        </div>
        {['Todos', 'Forex', 'Cripto'].map((f, i) => (
          <button key={f} className={`text-[7px] md:text-[9px] px-2 py-1 rounded-md font-bold ${i === 0 ? 'bg-apex-trader-primary text-black' : 'text-slate-500 bg-white/5'}`}>{f}</button>
        ))}
      </div>

      {/* Full Operations Table */}
      <MiniCard className="overflow-hidden overflow-x-auto">
        <table className="w-full text-[7px] md:text-[9px] min-w-[500px]">
          <thead>
            <tr className="border-b border-white/5">
              {['Data/Hora', 'Mercado', 'Ativo', 'TF', 'Estratégia', 'Direção', 'Resultado', 'Invest.', 'Payout', 'Lucro'].map((h) => (
                <th key={h} className="text-left p-1.5 text-[6px] md:text-[8px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { data: '04/03 14:30', mercado: 'FOREX', ativo: 'EUR/USD', tf: 'M5', est: 'Pullback', dir: 'CALL', res: 'WIN', inv: 'R$ 50', pay: '87%', lucro: '+R$ 43,50' },
              { data: '04/03 15:00', mercado: 'CRIPTO', ativo: 'BTC/USD', tf: 'M15', est: 'Suporte', dir: 'PUT', res: 'WIN', inv: 'R$ 80', pay: '90%', lucro: '+R$ 72,00' },
              { data: '03/03 10:15', mercado: 'FOREX', ativo: 'GBP/JPY', tf: 'M5', est: 'Retração', dir: 'CALL', res: 'LOSS', inv: 'R$ 50', pay: '87%', lucro: '-R$ 50,00' },
              { data: '03/03 11:45', mercado: 'CRIPTO', ativo: 'ETH/USD', tf: 'M1', est: 'Fluxo Vela', dir: 'PUT', res: 'WIN', inv: 'R$ 60', pay: '92%', lucro: '+R$ 55,20' },
              { data: '02/03 09:30', mercado: 'FOREX', ativo: 'USD/JPY', tf: 'M5', est: 'Pullback', dir: 'CALL', res: 'WIN', inv: 'R$ 50', pay: '87%', lucro: '+R$ 43,50' },
            ].map((op, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                <td className="p-1.5 text-slate-400">{op.data}</td>
                <td className="p-1.5"><span className={`px-1 py-0.5 rounded text-[6px] font-bold ${op.mercado === 'FOREX' ? 'bg-apex-trader-primary/10 text-apex-trader-primary' : 'bg-amber-500/10 text-amber-500'}`}>{op.mercado}</span></td>
                <td className="p-1.5 font-medium text-white">{op.ativo}</td>
                <td className="p-1.5 text-slate-400">{op.tf}</td>
                <td className="p-1.5 text-slate-400">{op.est}</td>
                <td className={`p-1.5 font-bold ${op.dir === 'CALL' ? 'text-emerald-500' : 'text-red-500'}`}>{op.dir === 'CALL' ? '▲' : '▼'} {op.dir}</td>
                <td className="p-1.5"><span className={`px-1 py-0.5 rounded-full text-[6px] font-bold ${op.res === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{op.res}</span></td>
                <td className="p-1.5 text-slate-400">{op.inv}</td>
                <td className="p-1.5 text-slate-400">{op.pay}</td>
                <td className={`p-1.5 font-bold ${op.lucro.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{op.lucro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MiniCard>
    </div>
  );
}

function PreviewMindset() {
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="w-8 h-8 rounded-xl bg-apex-trader-primary/10 flex items-center justify-center mx-auto mb-1">
          <BrainCircuit size={14} className="text-apex-trader-primary" />
        </div>
        <h2 className="text-sm md:text-base font-bold text-white">Check-in de Mindset</h2>
        <p className="text-[7px] md:text-[9px] text-slate-500">Sua mente é sua ferramenta mais importante</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <MiniCard className="p-2.5">
          <div className="mb-2">
            <div className="flex justify-between text-[8px] mb-0.5"><span className="text-slate-400">Horas de Sono</span><span className="font-bold text-emerald-500">7.5h</span></div>
            <div className="w-full h-4 bg-slate-800 border border-white/5 rounded-lg flex items-center px-2"><span className="text-[7px] text-slate-400">7.5</span></div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[{ l: 'Estresse', v: 2, c: '#10b981' }, { l: 'Energia', v: 4, c: '#3b82f6' }, { l: 'Concentração', v: 4, c: '#3b82f6' }, { l: 'Medo de Perda', v: 2, c: '#10b981' }].map(s => (
              <div key={s.l}><div className="flex justify-between text-[7px] mb-0.5"><span className="text-slate-400">{s.l}</span><span className="font-bold" style={{ color: s.c }}>{s.v}/5</span></div><div className="w-full h-1 bg-white/5 rounded-full"><div className="h-full rounded-full" style={{ width: `${s.v * 20}%`, background: s.c }} /></div></div>
            ))}
          </div>
          <div className="mb-1.5"><span className="text-[7px] text-slate-400 block mb-0.5">Estado Emocional</span><div className="bg-slate-800 border border-white/5 rounded-lg px-2 py-1 text-[8px] text-white">😌 Calmo e Focado</div></div>
          <div className="mb-1.5"><span className="text-[7px] text-slate-400 block mb-0.5">Seguiu seu plano?</span><div className="flex gap-1">{['Sim', 'Parcial', 'Não'].map((b, i) => (<button key={b} className={`text-[7px] font-bold px-2 py-1 rounded-lg border ${i === 0 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>{b}</button>))}</div></div>
          <button className="w-full flex items-center justify-center gap-1 text-[8px] font-bold bg-apex-trader-primary text-black py-1.5 rounded-lg"><Sparkles size={10} />Analisar Prontidão</button>
        </MiniCard>
        <div className="space-y-2">
          <MiniCard className="p-2.5" style={{ borderLeft: '2px solid #10b981' }}>
            <div className="flex items-center gap-1.5 mb-1.5"><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-[9px] font-bold text-emerald-500">Pronto para Operar</span></div>
            <div className="bg-white/3 rounded-lg p-2 mb-2"><p className="text-[7px] md:text-[9px] text-slate-400 leading-relaxed italic">"Indicadores excelentes. Sono adequado, energia alta e estresse controlado. Siga seu plano com confiança."</p></div>
            <div className="space-y-1">{[{ l: 'Energia', v: 4 }, { l: 'Concentração', v: 4 }, { l: 'Equilíbrio', v: 4 }, { l: 'Controle Emoc.', v: 4 }].map(b => (<div key={b.l} className="flex items-center gap-1.5"><span className="text-[6px] text-slate-500 w-14 shrink-0">{b.l}</span><div className="flex-1 h-1 bg-white/5 rounded-full"><div className="h-full rounded-full bg-apex-trader-primary" style={{ width: `${b.v * 20}%` }} /></div><span className="text-[6px] font-bold text-apex-trader-primary">{b.v}/5</span></div>))}</div>
          </MiniCard>
          <MiniCard className="p-2">
            <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Clock size={9} />Histórico Recente</span>
            {[{ d: '04/03', s: '7.5h', st: 'APROVADO', c: 'bg-emerald-500/10 text-emerald-500' }, { d: '03/03', s: '6h', st: 'APROVADO', c: 'bg-emerald-500/10 text-emerald-500' }, { d: '02/03', s: '4h', st: 'PAUSADO', c: 'bg-red-500/10 text-red-500' }].map((h, i) => (<div key={i} className="flex items-center justify-between text-[7px] py-1 border-b border-white/3 last:border-0"><span className="text-slate-500">{h.d}</span><span className="text-slate-400">{h.s}</span><span className={`px-1.5 py-0.5 rounded-full text-[6px] font-bold ${h.c}`}>{h.st}</span></div>))}
          </MiniCard>
        </div>
      </div>
    </div>
  );
}

function PreviewAulas() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm md:text-base font-bold text-white">Treinamentos</h2>

      {/* Progress Card */}
      <MiniCard className="p-2.5 md:p-3 relative overflow-hidden">
        <Trophy size={60} className="absolute -top-2 -right-2 text-white/3" />
        <div className="flex items-center gap-3 relative z-10">
          <div>
            <span className="text-[8px] text-slate-400 block">Progresso Geral do Curso</span>
            <span className="text-xl md:text-2xl font-black text-apex-trader-primary">27%</span>
            <span className="text-[8px] text-slate-500 block">Concluído</span>
          </div>
          <div className="flex-1 flex gap-4 text-[8px] text-slate-400">
            <div><span className="block font-bold text-white text-[10px]">12 / 45</span>Aulas</div>
            <div><span className="block font-bold text-white text-[10px]">8h 45m</span>Estudo</div>
          </div>
        </div>
        <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '27%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }} />
        </div>
      </MiniCard>

      {/* Module Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 max-w-[600px] mx-auto">
        {[
          { img: 'https://i.imgur.com/R1C6Qs8.jpeg', mod: '01', title: 'Curso Completo 3P', desc: 'Protocolo completo', aulas: 45, prog: 27 },
          { img: 'https://i.imgur.com/R1C6Qs8.jpeg', mod: '02', title: 'Estratégias Elite', desc: 'Padrões avançados', aulas: 15, prog: 0 },
          { img: 'https://i.imgur.com/R1C6Qs8.jpeg', mod: '03', title: 'Mindset Vencedor', desc: 'Psicologia aplicada', aulas: 10, prog: 0 },
          { img: 'https://i.imgur.com/R1C6Qs8.jpeg', mod: '04', title: 'Gestão de Banca', desc: 'Controle profissional', aulas: 8, prog: 0 },
        ].map((m) => (
          <MiniCard key={m.mod} className="overflow-hidden cursor-pointer hover:border-apex-trader-primary/15 transition-all">
            <div className="relative">
              <img src={m.img} alt={m.title} className="w-full aspect-[4/3] object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute top-1 left-1 text-[6px] md:text-[8px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">Mod. {m.mod}</span>
              <div className="absolute bottom-1 right-1 w-6 h-6 md:w-7 md:h-7 rounded-full bg-apex-trader-primary flex items-center justify-center">
                <ChevronRight size={12} className="text-black" />
              </div>
            </div>
            <div className="p-1.5 md:p-2">
              <div className="text-[8px] md:text-[10px] font-bold text-white truncate">{m.title}</div>
              <div className="text-[7px] text-slate-500 truncate">{m.desc}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[7px] text-slate-500">{m.aulas} aulas</span>
                <span className="text-[7px] font-bold text-apex-trader-primary">{m.prog}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full mt-0.5">
                <div className="h-full rounded-full bg-apex-trader-primary" style={{ width: `${m.prog}%` }} />
              </div>
            </div>
          </MiniCard>
        ))}
      </div>
    </div>
  );
}

function PreviewDesafio() {
  const ranking = [
    { pos: 1, nome: 'Carlos M.', lucro: '+32.5%', wr: 78, ops: 45, pts: 89.2, premio: 'R$ 500', color: '#FFD700' },
    { pos: 2, nome: 'Ana S.', lucro: '+28.1%', wr: 75, ops: 38, pts: 82.7, premio: 'R$ 200', color: '#C0C0C0' },
    { pos: 3, nome: 'Pedro L.', lucro: '+24.8%', wr: 72, ops: 42, pts: 76.3, premio: 'R$ 100', color: '#CD7F32' },
    { pos: 4, nome: 'Você', lucro: '+18.2%', wr: 68, ops: 23, pts: 62.1, premio: '—', color: '' },
    { pos: 5, nome: 'Maria R.', lucro: '+15.6%', wr: 65, ops: 30, pts: 55.8, premio: '—', color: '' },
  ];
  return (
    <div className="space-y-3">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1 text-[8px] font-bold text-apex-trader-primary bg-apex-trader-primary/8 border border-apex-trader-primary/15 px-2 py-0.5 rounded-full mb-1">
          <Flame size={8} /> Desafio Protocolo 3P · Março 2026
        </div>
        <h2 className="text-sm md:text-lg font-black">
          <span className="bg-gradient-to-r from-apex-trader-primary to-[#93c5fd] bg-clip-text text-transparent">Plano · Progresso · Psicologia</span>
        </h2>
      </div>

      {/* Mini Podium */}
      <div className="flex items-end justify-center gap-2">
        {[
          { pos: 2, name: 'Ana S.', pct: '+28.1%', prize: 'R$ 200', h: 'h-20', medal: '🥈' },
          { pos: 1, name: 'Carlos M.', pct: '+32.5%', prize: 'R$ 500', h: 'h-24', medal: '🥇' },
          { pos: 3, name: 'Pedro L.', pct: '+24.8%', prize: 'R$ 100', h: 'h-16', medal: '🥉' },
        ].map((p) => (
          <div key={p.pos} className={`text-center w-16 md:w-24 ${p.h}`}>
            <div className="text-sm md:text-lg">{p.medal}</div>
            <div className="text-[7px] md:text-[9px] font-bold text-white truncate">{p.name}</div>
            <div className="text-[8px] md:text-[10px] font-black text-emerald-500">{p.pct}</div>
            <div className="text-[7px] font-bold text-slate-400">{p.prize}</div>
          </div>
        ))}
      </div>

      {/* Ranking Table */}
      <MiniCard className="overflow-hidden">
        <div className="px-2 py-1.5 border-b border-white/5 text-[9px] font-bold text-slate-400">Ranking Completo</div>
        <table className="w-full text-[7px] md:text-[8px]">
          <thead>
            <tr className="border-b border-white/5">
              {['#', 'Participante', 'Lucro%', 'Win Rate', 'Ops', 'Pontos', 'Prêmio'].map(h => (
                <th key={h} className="text-left p-1.5 text-[6px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.pos} className={`border-b border-white/3 ${r.nome === 'Você' ? 'bg-apex-trader-primary/5 border-l-2 border-l-apex-trader-primary' : ''}`}>
                <td className="p-1.5">
                  {r.pos <= 3 ? (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black text-black" style={{ background: r.color }}>{r.pos}</span>
                  ) : <span className="text-slate-500">{r.pos}</span>}
                </td>
                <td className="p-1.5 flex items-center gap-1">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold ${r.nome === 'Você' ? 'bg-apex-trader-primary text-black' : 'bg-slate-700 text-slate-300'}`}>{r.nome[0]}</div>
                  <span className="font-medium text-white">{r.nome}</span>
                  {r.nome === 'Você' && <span className="text-[5px] bg-apex-trader-primary/20 text-apex-trader-primary px-1 rounded font-bold">VOCÊ</span>}
                </td>
                <td className="p-1.5 font-bold text-emerald-500">{r.lucro}</td>
                <td className="p-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-1 bg-white/5 rounded-full"><div className="h-full rounded-full bg-apex-trader-primary" style={{ width: `${r.wr}%` }} /></div>
                    <span className="text-slate-400">{r.wr}%</span>
                  </div>
                </td>
                <td className="p-1.5 text-slate-400">{r.ops}</td>
                <td className="p-1.5 font-bold text-white">{r.pts}</td>
                <td className="p-1.5" style={{ color: r.color || '#64748b' }}>{r.premio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MiniCard>

      {/* Formula */}
      <div className="text-center">
        <span className="text-[7px] text-slate-400 block mb-1">Fórmula de Pontuação</span>
        <div className="inline-block text-[7px] md:text-[9px] font-mono font-bold text-apex-trader-primary bg-slate-900/70 border border-apex-trader-primary/20 px-3 py-1.5 rounded-lg">
          (Lucro% × 0.6) + (WR × 0.3) + (Bônus × 0.1)
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {['Seja aluno ativo', 'Registre operações', 'Mín. 5 operações', 'Opere com disciplina'].map((s, i) => (
          <div key={i} className="bg-white/3 rounded-lg p-1.5 text-center">
            <div className="w-5 h-5 rounded-md bg-apex-trader-primary/10 flex items-center justify-center text-[8px] font-black text-apex-trader-primary mx-auto mb-0.5">{i + 1}</div>
            <span className="text-[6px] md:text-[8px] text-slate-400">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCorretora() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm md:text-base font-bold text-white">Corretora</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-apex-trader-primary animate-pulse" />
          <span className="text-[8px] text-apex-trader-primary font-bold">Conectado</span>
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        {[
          { tipo: 'REAL', saldo: 'R$ 2.450,00', bonus: 'R$ 120', color: 'border-apex-trader-primary/30' },
          { tipo: 'USDT', saldo: '$ 850,00', bonus: '', color: 'border-blue-500/30' },
          { tipo: 'DEMO', saldo: 'R$ 10.000,00', bonus: '', color: 'border-slate-500/30' },
        ].map((w) => (
          <MiniCard key={w.tipo} className={`p-2 md:p-3 ${w.color}`}>
            <div className="flex items-center gap-1 mb-1">
              <Wallet size={10} className="text-apex-trader-primary" />
              <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-slate-500">{w.tipo}</span>
            </div>
            <div className="text-xs md:text-base font-black text-apex-trader-primary">{w.saldo}</div>
            {w.bonus && <div className="text-[7px] text-amber-500 mt-0.5">Bônus: {w.bonus}</div>}
          </MiniCard>
        ))}
      </div>

      {/* Chart placeholder */}
      <MiniCard className="p-2 md:p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1"><TrendingUp size={10} />Gráfico de Mercado</span>
          <span className="text-[7px] text-apex-trader-primary flex items-center gap-0.5"><ExternalLink size={8} />Abrir</span>
        </div>
        <div className="h-24 md:h-32 bg-slate-800/50 rounded-lg flex items-center justify-center border border-white/5">
          <div className="text-center">
            <Globe size={20} className="text-slate-600 mx-auto mb-1" />
            <span className="text-[8px] text-slate-500">Gráfico Puma Broker</span>
          </div>
        </div>
      </MiniCard>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Operações Hoje', value: '12', color: 'text-apex-trader-primary' },
          { label: 'Lucro Hoje', value: '+R$ 340', color: 'text-emerald-500' },
          { label: 'Automação', value: 'Ativa', color: 'text-apex-trader-primary' },
        ].map((s) => (
          <MiniCard key={s.label} className="p-2 text-center">
            <div className="text-[7px] text-slate-500">{s.label}</div>
            <div className={`text-[10px] md:text-xs font-black ${s.color}`}>{s.value}</div>
          </MiniCard>
        ))}
      </div>
    </div>
  );
}

function PreviewComunidades() {
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="w-8 h-8 rounded-xl bg-apex-trader-primary/10 flex items-center justify-center mx-auto mb-1">
          <Users size={14} className="text-apex-trader-primary" />
        </div>
        <h2 className="text-sm md:text-base font-bold text-white">Comunidades</h2>
        <p className="text-[7px] md:text-[9px] text-slate-500">Conecte-se com traders de todo o Brasil</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-1">
        {[{ l: 'Networking', d: 'Conecte-se' }, { l: 'Aprendizado', d: 'Troque ideias' }, { l: 'Suporte', d: 'Tire dúvidas' }].map(b => (
          <MiniCard key={b.l} className="p-1.5 text-center">
            <div className="text-[8px] font-bold text-white">{b.l}</div>
            <div className="text-[6px] text-slate-500">{b.d}</div>
          </MiniCard>
        ))}
      </div>

      {/* Community Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        {[
          { name: 'Discord', sub: 'Servidor da comunidade', desc: 'Interaja em tempo real com outros traders', color: '#5865F2', btn: 'Entrar no Discord' },
          { name: 'WhatsApp', sub: 'Grupo exclusivo', desc: 'Alertas, dicas e sinais operacionais', color: '#25D366', btn: 'Entrar no WhatsApp' },
          { name: 'Suporte', sub: 'Atendimento direto', desc: 'Dúvidas com equipe e mentores', color: '#3b82f6', btn: 'Fale Conosco' },
        ].map((c) => (
          <MiniCard key={c.name} className="p-2.5 text-center">
            <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center" style={{ background: `${c.color}15` }}>
              {c.name === 'Suporte' ? <Headphones size={14} style={{ color: c.color }} /> : <MessageCircle size={14} style={{ color: c.color }} />}
            </div>
            <div className="text-[9px] font-bold text-white">{c.name}</div>
            <div className="text-[7px] text-slate-500 mb-1.5">{c.desc}</div>
            <button className="w-full text-[7px] md:text-[8px] font-bold px-2 py-1.5 rounded-lg" style={{ background: `${c.color}18`, color: c.color }}>{c.btn}</button>
          </MiniCard>
        ))}
      </div>

      {/* Footer Info */}
      <MiniCard className="p-2 flex items-center gap-2">
        <ExternalLink size={12} className="text-amber-500 shrink-0" />
        <div>
          <span className="text-[8px] font-bold text-white block">Links verificados</span>
          <span className="text-[6px] text-slate-500">Todos os links são oficiais da {BRANDING.appName}</span>
        </div>
      </MiniCard>
    </div>
  );
}

function PreviewProva() {
  const questoes = [
    { id: 1, texto: 'Qual é o principal objetivo da gestão de risco no trading?', opcoes: ['Maximizar lucros a qualquer custo', 'Proteger o capital e garantir longevidade', 'Operar com o máximo de alavancagem', 'Fazer day trade todos os dias'], selecionada: 1 },
    { id: 2, texto: 'O que significa "Stop Loss" em uma operação?', opcoes: ['Limite de ganho máximo', 'Ordem de compra automática', 'Limite de perda máxima aceitável', 'Taxa cobrada pela corretora'], selecionada: 2 },
    { id: 3, texto: 'Qual timeframe é mais adequado para swing trade?', opcoes: ['M1 (1 minuto)', 'M5 (5 minutos)', 'H4 / D1 (4 horas / Diário)', 'S30 (30 segundos)'], selecionada: null },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm md:text-lg font-bold text-white">Prova Final</h2>
        <span className="text-[10px] text-slate-500">Responda todas as questões</span>
      </div>
      {/* Info bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: <Award size={12} className="text-apex-trader-primary" />, text: '10 questões' },
          { icon: <CheckCircle2 size={12} className="text-emerald-500" />, text: 'Mínimo: 70%' },
          { icon: <Trophy size={12} className="text-amber-500" />, text: '100 pontos' },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-lg">
            {b.icon}
            <span className="text-[10px] font-bold text-white">{b.text}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-lg">
          <span className="text-[10px] text-slate-400">2/10 respondidas</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-apex-trader-primary rounded-full" style={{ width: '20%' }} />
      </div>
      {/* Questions */}
      <div className="space-y-2.5">
        {questoes.map((q, idx) => (
          <div key={q.id} className={`bg-slate-900/60 border rounded-lg p-3 ${q.selecionada !== null ? 'border-apex-trader-primary/20' : 'border-white/5'}`}>
            <div className="flex items-start gap-2 mb-2">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${q.selecionada !== null ? 'bg-apex-trader-primary text-black' : 'bg-white/10 text-slate-400'}`}>{idx + 1}</span>
              <p className="text-[10px] md:text-xs font-medium text-slate-100 leading-relaxed">{q.texto}</p>
            </div>
            <div className="space-y-1 pl-7">
              {q.opcoes.map((opcao, i) => (
                <div key={i} className={`flex items-center gap-2 p-1.5 rounded-lg border text-[9px] md:text-[10px] ${q.selecionada === i ? 'bg-apex-trader-primary/10 border-apex-trader-primary/40 text-white' : 'bg-white/[0.02] border-white/5 text-slate-400'}`}>
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${q.selecionada === i ? 'border-apex-trader-primary bg-apex-trader-primary' : 'border-white/20'}`}>
                    {q.selecionada === i && <div className="w-full h-full flex items-center justify-center"><div className="w-1 h-1 bg-black rounded-full" /></div>}
                  </div>
                  <span className="font-bold text-slate-500 w-3">{['A', 'B', 'C', 'D'][i]}</span>
                  <span>{opcao}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Submit bar */}
      <div className="bg-slate-900/60 border border-white/5 rounded-lg p-3 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">Faltam 8 questão(ões) sem resposta.</span>
        <div className="px-4 py-1.5 rounded-lg text-[10px] font-bold text-black bg-apex-trader-primary/40 opacity-50">Finalizar Prova</div>
      </div>
    </div>
  );
}

function PreviewPerfil() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm md:text-lg font-bold text-white">Perfil do Aluno</h2>
        <span className="text-[10px] text-slate-500">Gerencie seus dados</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Sidebar card */}
        <div className="bg-slate-900/60 border border-white/5 rounded-lg p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-apex-trader-primary" />
          <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-apex-trader-primary/20 flex items-center justify-center text-apex-trader-primary border-2 border-apex-trader-primary/10 relative">
            <User size={28} />
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full border border-slate-950">Lvl 2</div>
          </div>
          <h3 className="text-xs font-bold text-white">Carlos Trader</h3>
          <p className="text-[9px] text-slate-500 mb-3">carlos@email.com</p>
          {/* XP */}
          <div className="space-y-1 mb-3 text-left">
            <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider">
              <span className="text-slate-500">XP</span>
              <span className="text-apex-trader-primary">1250 / 2000</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-apex-trader-primary rounded-full" style={{ width: '62.5%' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Aulas</p>
              <p className="text-[10px] font-bold text-white">12/45</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Rank</p>
              <p className="text-[10px] font-bold text-amber-500">#42</p>
            </div>
          </div>
          {/* Conquistas */}
          <div className="mt-3 space-y-1.5 text-left">
            <h4 className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Conquistas</h4>
            {[
              { icon: <Trophy size={10} />, color: 'text-amber-500 bg-amber-500/10', title: 'Primeiro Win', desc: 'Primeira vitória registrada' },
              { icon: <Star size={10} />, color: 'text-apex-trader-primary bg-apex-trader-primary/10', title: 'Estudioso', desc: 'Completou o Módulo 1' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 bg-white/5 rounded-lg border border-white/5">
                <div className={`p-1 rounded ${c.color}`}>{c.icon}</div>
                <div>
                  <p className="text-[9px] font-bold text-white">{c.title}</p>
                  <p className="text-[7px] text-slate-500">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Forms */}
        <div className="md:col-span-2 space-y-3">
          {/* Dados Pessoais */}
          <div className="bg-slate-900/60 border border-white/5 rounded-lg p-4">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
              <User size={12} className="text-apex-trader-primary" />
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nome Completo', value: 'Carlos Trader' },
                { label: 'E-mail', value: 'carlos@email.com' },
              ].map((f) => (
                <div key={f.label}>
                  <span className="text-[8px] font-medium text-slate-500">{f.label}</span>
                  <div className="mt-0.5 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white">{f.value}</div>
                </div>
              ))}
              <div className="col-span-2">
                <span className="text-[8px] font-medium text-slate-500 flex items-center gap-1"><Phone size={8} /> WhatsApp</span>
                <div className="mt-0.5 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white flex items-center gap-1">
                  <span className="text-slate-500">+55</span> (11) 99999-9999
                </div>
              </div>
            </div>
          </div>
          {/* Gestão de Risco */}
          <div className="bg-slate-900/60 border border-white/5 rounded-lg p-4">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
              <Target size={12} className="text-apex-trader-primary" />
              Gestão de Risco
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[8px] font-medium text-slate-500">Banca Inicial</span>
                <div className="mt-0.5 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white flex items-center gap-1">
                  <span className="text-slate-500">R$</span> 1.000,00
                </div>
              </div>
              <div>
                <span className="text-[8px] font-medium text-slate-500">Stop Level (Banca Mínima)</span>
                <div className="mt-0.5 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white flex items-center gap-1">
                  <span className="text-slate-500">R$</span> 800,00
                </div>
              </div>
            </div>
            <p className="text-[8px] text-slate-600 mt-2">Esses valores são usados automaticamente em Registros de Operações e Gestão de Risco.</p>
          </div>
          {/* Save button */}
          <div className="flex justify-end">
            <div className="px-6 py-2 rounded-lg text-[10px] font-bold text-black bg-apex-trader-primary shadow-lg shadow-apex-trader-primary/20">Salvar Alterações</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const previewPages: Record<string, React.FC> = {
  dashboard: PreviewDashboard,
  corretora: PreviewCorretora,
  operacoes: PreviewOperacoes,
  mindset: PreviewMindset,
  aulas: PreviewAulas,
  desafio: PreviewDesafio,
  comunidades: PreviewComunidades,
  prova: PreviewProva,
  perfil: PreviewPerfil,
};

function PlatformPreview() {
  const [activePage, setActivePage] = useState('dashboard');
  const ActiveComponent = previewPages[activePage];

  return (
    <div className="flex h-full">
      {/* Mini Sidebar */}
      <aside className="hidden md:flex flex-col w-44 border-r border-white/5 bg-slate-900/50 p-3 shrink-0">
        <div className="mb-4 px-1">
          <img
            src={BRANDING.logoUrl}
            alt={BRANDING.logoAlt}
            className="w-full h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {previewNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${activePage === item.id
                ? 'bg-apex-trader-primary/10 text-apex-trader-primary border border-apex-trader-primary/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Tab Bar (inside preview) */}
      <div className="md:hidden flex overflow-x-auto border-b border-white/5 bg-slate-900/50 absolute top-0 left-0 right-0 z-10">
        {previewNavItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex items-center gap-1 px-2 py-2 text-[8px] font-medium whitespace-nowrap ${activePage === item.id ? 'text-apex-trader-primary border-b border-apex-trader-primary' : 'text-slate-500'
              }`}
          >
            <item.icon size={10} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-3 md:p-5 overflow-y-auto pt-10 md:pt-5">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}

/* ============================
   LANDING PAGE SECTIONS
   ============================ */

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setHeaderScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-slate-950 text-slate-50 font-sans overflow-x-hidden relative" style={{ scrollBehavior: 'smooth' }}>
      {/* ===== SHOOTING STARS BACKGROUND ===== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="stars absolute inset-0" />
        <ShootingStars starColor="#3b82f6" trailColor="#93c5fd" minSpeed={15} maxSpeed={35} minDelay={1000} maxDelay={3000} />
        <ShootingStars starColor="#3b82f6" trailColor="#2563eb" minSpeed={10} maxSpeed={25} minDelay={2000} maxDelay={4500} />
        <ShootingStars starColor="#93c5fd" trailColor="#3b82f6" minSpeed={20} maxSpeed={40} minDelay={1500} maxDelay={3500} />
      </div>

      {/* ===== HEADER ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerScrolled ? 'bg-slate-950/92 backdrop-blur-xl border-b border-white/5 py-3' : 'py-4'}`}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <a href="#" className="shrink-0">
            <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-10" referrerPolicy="no-referrer" />
          </a>
          <nav className="hidden md:flex items-center gap-7">
            {['Visão Geral', 'Operações', 'Psicologia', 'Treinamentos', 'Comunidade', 'Planos'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="hidden md:inline-flex items-center gap-2 border border-white/12 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-white/5 transition-all">
              Entrar
            </button>
            <a href="https://pay.cakto.com.br/anasupy_808501" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-apex-trader-primary text-black font-bold text-sm px-6 py-2.5 rounded-xl hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all">
              Comprar
            </a>
            <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/96 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
          <button className="absolute top-6 right-6 text-white text-3xl" onClick={() => setMobileMenuOpen(false)}>
            <X size={28} />
          </button>
          {['Visão Geral', 'Operações', 'Psicologia', 'Treinamentos', 'Desafio', 'Comunidade', 'Planos', 'FAQ'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
              className="text-xl font-semibold text-slate-400 hover:text-apex-trader-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}>
              {item}
            </a>
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="border border-white/12 text-white font-semibold px-6 py-3 rounded-xl">Entrar</button>
            <a href="https://pay.cakto.com.br/anasupy_808501" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} className="bg-apex-trader-primary text-black font-bold px-6 py-3 rounded-xl">Comprar</a>
          </div>
        </div>
      )}

      {/* ===== 1. HERO + VSL ===== */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48" id="home">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            }}
          />
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px]"
            style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
          />
        </div>

        <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-apex-trader-primary bg-apex-trader-primary/6 border border-apex-trader-primary/12 px-5 py-2 rounded-full mb-8">
            <Shield size={14} className="text-apex-trader-primary" />
            A última decisão que você precisa tomar no trading
          </div>

          {/* Impact Title - ALL CAPS as requested */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8 text-white uppercase">
            Aprenda como fazer 
            <span className="text-apex-trader-primary"> R$50 por dia operando.</span>
          </h1>

          {/* VSL Subheadline - Normal Case as requested */}
          <p className="text-lg md:text-xl font-medium text-slate-300 mb-10 max-w-[850px] mx-auto leading-relaxed">
            Operações automáticas, dashboard de performance, controle emocional e treinamento completo — <span className="text-apex-trader-primary font-bold text-white">tudo em um único lugar.</span>
          </p>

          {/* VSL Video Container */}
          <div className="relative aspect-video w-full rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden mb-12">
            <CustomVideoPlayer videoId="C2qoRxiOkhs" />
          </div>

          {/* Bottom VSL Callout */}
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-6">
              <a href="https://pay.cakto.com.br/anasupy_808501" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-apex-trader-primary text-black font-black text-lg px-12 py-5 rounded-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all scale-100 hover:scale-105 active:scale-95">
                COMECE JÁ <ArrowRight size={22} />
              </a>
              
              <div className="space-y-4">
                <p className="text-base md:text-lg text-slate-400 max-w-[600px] mx-auto font-medium">
                  Comece agora e aproveite a chance de mudar a sua jornada no trading para sempre.
                </p>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 mx-auto">
                    <Shield size={14} className="text-apex-trader-primary" />
                    <span>100% Seguro</span>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. DOR REAL & EMPATIA (REFORMULADA V3 - ALINHAMENTO FINO) ===== */}
      <section className="relative overflow-hidden bg-slate-950 flex items-center justify-center" id="dor-real">
        
        <div className="relative w-full min-h-[90vh] lg:min-h-screen flex items-center">
          {/* Background Image - PC */}
          <div className="absolute inset-0 hidden lg:block">
            <img 
              src="https://i.imgur.com/3xKrgCK.jpeg" 
              alt="Fundo Impacto PC" 
              className="w-full h-full object-cover object-right"
            />
            {/* V4 Premium Overlay Gradient */}
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-950/80 via-slate-950/40 to-transparent z-10" />
            <div className="absolute inset-y-0 left-0 w-1/4 bg-slate-950 z-10" />
          </div>

          <div className="max-w-[1536px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 lg:gap-0 h-full items-center relative z-20">
            {/* LADO DA IMAGEM - MOBILE ONLY (MOVE TO TOP FOR MOBILE FLOW) */}
            <div className="lg:hidden relative w-full aspect-square h-auto overflow-hidden flex items-center justify-center bg-slate-900/20">
              <img 
                src="https://i.imgur.com/JlKevFp.png" 
                alt="Fundo Impacto Mobile" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/60 to-transparent" />
            </div>

            {/* LADO DO TEXTO - Tighter spacing, better alignment */}
            <div className="px-6 py-12 md:py-20 flex flex-col justify-center space-y-8 lg:pl-16 xl:pl-20">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-apex-trader-primary/10 border border-apex-trader-primary/20">
                  <Shield size={12} className="text-apex-trader-primary" />
                  <span className="text-apex-trader-primary font-bold uppercase tracking-[2px] text-[10px]">Consciência e Método</span>
                </div>
                <h2 className="text-4xl md:text-5xl xl:text-7xl font-black leading-[0.95] text-white tracking-tighter">
                  A verdade é que você já está <br />
                  <span className="text-apex-trader-primary">cansado de perder</span> <br />
                  assim, não está?
                </h2>
              </div>

              <div className="space-y-4 max-w-[550px]">
                {[
                  'Entrou em uma operação sem saber o que estava fazendo',
                  'Perdeu e tentou desesperadamente recuperar no impulso',
                  'Mudou de estratégia várias vezes, sem parar para pensar',
                  'Ficou perdido, sem saber se a culpa é sua ou do seu emocional',
                  'E no final, o saldo simplesmente foi embora'
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="mt-1.5 w-4 h-4 rounded-full border border-apex-trader-primary/40 flex items-center justify-center shrink-0 group-hover:border-apex-trader-primary transition-all duration-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-apex-trader-primary animate-pulse" />
                    </div>
                    <p className="text-base md:text-lg text-slate-200 font-medium leading-tight opacity-90 group-hover:opacity-100 transition-opacity">{text}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 space-y-5 max-w-[550px]">
                <div className="space-y-2">
                  <p className="text-xl md:text-2xl font-bold text-white italic tracking-tight underline decoration-apex-trader-primary/40 decoration-2 underline-offset-8">A verdade crua e simples:</p>
                </div>
                
                <p className="text-base md:text-lg text-slate-300 font-medium leading-relaxed">
                  Você não perde por falta de estratégia. Você perde porque <span className="text-apex-trader-primary font-black">não tem controle emocional</span>. 
                  Entra no mercado sem método, sem disciplina e sem saber o que está fazendo. 
                  É esse ciclo de erros que te arrasta para a falência.
                </p>

                <div className="glass-card p-6 border-l-4 border-l-apex-trader-primary bg-apex-trader-primary/5 shadow-2xl backdrop-blur-sm">
                  <p className="text-lg md:text-xl font-bold text-white italic leading-snug">
                    Até quando você vai continuar se enganando, tentando recuperar o que perdeu de forma impulsiva?
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-apex-trader-primary/20 to-transparent" />

      {/* ===== 3. QUEBRA DE CRENÇA (REFORMULADA V2 - ALINHAMENTO FINO) ===== */}
      <section className="relative overflow-hidden bg-slate-950 flex items-center justify-center" id="quebra-crenca">
        
        <div className="relative w-full min-h-[60vh] lg:min-h-screen flex items-center">
          {/* Background Image - PC */}
          <div className="absolute inset-0 hidden lg:block">
            <img 
              src="https://i.imgur.com/EZa3sI9.png" 
              alt="Quebra de Crença PC" 
              className="w-full h-full object-cover object-right"
            />
            {/* V4 Premium Overlay Gradient */}
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-950/80 via-slate-950/40 to-transparent z-10" />
            <div className="absolute inset-y-0 left-0 w-1/4 bg-slate-950 z-10" />
          </div>

          <div className="max-w-[1536px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 lg:gap-0 h-full items-center relative z-20">
            {/* LADO DA IMAGEM - MOBILE ONLY (MOVE TO TOP FOR MOBILE FLOW) */}
            <div className="lg:hidden relative w-full aspect-square h-auto overflow-hidden flex items-center justify-center bg-slate-900/20">
              <img 
                src="https://i.imgur.com/kieTDjF.png" 
                alt="Quebra de Crença Mobile" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/60 to-transparent" />
            </div>

            {/* LADO DO TEXTO */}
            <div className="px-6 py-12 md:py-20 flex flex-col justify-center space-y-10 lg:pl-16 xl:pl-20">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-apex-trader-primary/10 border border-apex-trader-primary/20">
                  <Shield size={12} className="text-apex-trader-primary" />
                  <span className="text-apex-trader-primary font-bold uppercase tracking-[2px] text-[10px]">Visão Profissional</span>
                </div>
                <h2 className="text-4xl md:text-5xl xl:text-7xl font-black leading-[0.95] text-white tracking-tighter">
                  O problema não é <br />
                  o <span className="text-apex-trader-primary italic">mercado.</span>
                </h2>
                <p className="text-2xl md:text-3xl xl:text-4xl font-bold text-slate-200 tracking-tight leading-tight">
                  O problema é operar sem <br className="hidden md:block" />
                  <span className="underline decoration-apex-trader-primary decoration-4 underline-offset-[12px]">dados, processo e controle.</span>
                </p>
              </div>

              <div className="space-y-8 max-w-[600px]">
                <div className="w-24 h-1.5 bg-apex-trader-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                
                <div className="space-y-6">
                  <p className="text-xl md:text-3xl text-white font-bold leading-relaxed">
                    Foi exatamente por isso que criamos a <span className="text-apex-trader-primary font-black">{BRANDING.appName}</span>.
                  </p>
                  <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed">
                    Uma plataforma feita para <span className="text-white font-bold">acabar com os erros</span> e fazer você parar de depender de sorte no mercado.
                  </p>
                </div>

                <div className="pt-6">
                  <a href="https://pay.cakto.com.br/anasupy_808501" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-apex-trader-primary/10 hover:bg-apex-trader-primary/20 text-apex-trader-primary font-black text-sm px-8 py-4 rounded-xl border border-apex-trader-primary/30 tracking-widest transition-all group">
                    QUERO MUDAR MEU JOGO <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===== 4. ESTRUTURA COMPLETA (NEW) ===== */}
      <section className="relative overflow-hidden bg-slate-950 flex items-start justify-center min-h-[70vh] lg:min-h-screen pt-20 lg:pt-10" id="estrutura-completa">
        {/* Background Images - Optimized for Visibility */}
        <div className="absolute inset-0 z-0">
          {/* PC Background */}
          <img 
            src="https://i.imgur.com/DMsHIxt.png" 
            alt="Estrutura Completa PC" 
            className="hidden lg:block w-full h-full object-contain object-bottom scale-110 translate-y-20"
          />
          {/* Mobile Background */}
          <img 
            src="https://i.imgur.com/Dh4j2gt.png" 
            alt="Estrutura Completa Mobile" 
            className="lg:hidden w-full h-full object-contain object-bottom scale-100 translate-y-12"
          />
          {/* Overlay for Readability - Extreme Dark at Top */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 text-center w-full">
          <div className="max-w-[1100px] mx-auto space-y-4 lg:space-y-6">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-black leading-tight text-white tracking-tighter uppercase">
              <span className="text-apex-trader-primary drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                NÃO É UM CURSO. 
              </span>
              <br />
              É UMA ESTRUTURA COMPLETA.
            </h2>
            <p className="text-base md:text-lg lg:text-2xl font-bold text-slate-100 max-w-[800px] mx-auto leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              Tudo que testamos, erramos e acertamos para ter resultado nesse mercado.
            </p>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-apex-trader-primary/20 to-transparent" />

      {/* ===== 5. APRESENTAÇÃO DO SISTEMA ===== */}
      <section className="py-24 md:py-28" id="sistema">
        <div className="max-w-[1200px] mx-auto px-6 text-center mb-16">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-trademaster-blue bg-trademaster-blue/8 border border-trademaster-blue/15 px-4 py-1.5 rounded-full mb-4">
            <LayoutDashboard size={12} /> Apresentação do Sistema
          </div>
          <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight mb-4">
            O que Você Vai Encontrar Dentro da {BRANDING.appName}
          </h2>
          <p className="text-base text-slate-400 max-w-[800px] mx-auto leading-relaxed">
            Dentro da {BRANDING.appName}, você tem acesso a tudo o que precisa para se tornar um trader profissional e consistente:
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Robô */}
          <div className="glass-card p-8 hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
             <div className="w-12 h-12 rounded-xl bg-trademaster-blue/10 flex items-center justify-center mb-6 relative z-10">
               <Zap size={24} className="text-trademaster-blue" />
             </div>
             <h3 className="text-xl font-bold text-white mb-4 relative z-10">Robô de Operações Automáticas</h3>
             <ul className="space-y-3 relative z-10 text-slate-400">
               <li><span className="text-trademaster-blue mr-2 font-black">•</span>Escolha entre diferentes estratégias e deixe o sistema operar automaticamente.</li>
               <li><span className="text-trademaster-blue mr-2 font-black">•</span>Sem decisões impulsivas.</li>
               <li><span className="text-trademaster-blue mr-2 font-black">•</span>Sem interferência emocional.</li>
             </ul>
          </div>

          {/* Dashboard */}
          <div className="glass-card p-8 hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={100} /></div>
             <div className="w-12 h-12 rounded-xl bg-trademaster-blue/10 flex items-center justify-center mb-6 relative z-10">
               <BarChart3 size={24} className="text-trademaster-blue" />
             </div>
             <h3 className="text-xl font-bold text-white mb-4 relative z-10">Dashboard Profissional de Performance</h3>
             <p className="text-slate-400 mb-4 font-medium">Acompanhe de forma simples e clara:</p>
             <ul className="space-y-2 mb-4 relative z-10 text-slate-400">
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" />Histórico de operações</li>
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" />Taxa de assertividade</li>
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" />Lucro acumulado</li>
               <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" />Evolução do desempenho</li>
             </ul>
             <p className="text-slate-300 font-bold italic border-l-2 border-trademaster-blue pl-3">Sem manipulação. Sem achismos.</p>
          </div>

          {/* IA Psicológica */}
          <div className="glass-card p-8 hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit size={100} /></div>
             <div className="w-12 h-12 rounded-xl bg-trademaster-blue/10 flex items-center justify-center mb-6 relative z-10">
               <BrainCircuit size={24} className="text-trademaster-blue" />
             </div>
             <h3 className="text-xl font-bold text-white mb-4 relative z-10">Análise Psicológica com IA</h3>
             <p className="text-sm text-slate-400 mb-3 relative z-10">Antes de operar, faça um check-in de mindset (sono, estresse, energia). A IA analisa as respostas e gera:</p>
             <ul className="space-y-2 mb-4 relative z-10 text-slate-400 text-sm font-medium">
               <li className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg"><Sparkles size={12} className="text-trademaster-blue" />Insights psicológicos</li>
               <li className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg"><Sparkles size={12} className="text-trademaster-blue" />Alertas emocionais</li>
               <li className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg"><Sparkles size={12} className="text-trademaster-blue" />Rec. para o dia</li>
             </ul>
             <p className="text-xs text-slate-300 font-bold bg-trademaster-blue/10 p-2 rounded border border-trademaster-blue/20">
               No trading, o maior inimigo não é o mercado. É a própria mente.
             </p>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-trademaster-blue/15 to-transparent" />

      {/* ===== 10. RESUMO DA OFERTA & CTA FINAL ===== */}
      <section className="py-28 md:py-36" id="resumo" style={{ background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.03) 50%, transparent)' }}>
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-trademaster-blue bg-trademaster-blue/8 border border-trademaster-blue/15 px-4 py-1.5 rounded-full mb-4">
              Resumo da Oferta
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-8">
              Tudo Que Você Precisa em <span className="text-trademaster-blue">Um Único Lugar</span>
            </h2>
            <p className="text-slate-400 mb-6 font-medium text-lg">Dentro da {BRANDING.appName}, você terá:</p>
            <ul className="space-y-4 mb-8">
              {[
                'Robôs automáticos',
                'Dashboard de performance',
                'Análise psicológica com IA',
                'Curso completo de trading',
                'Ranking de traders',
                'Comunidade privada',
                'Aulas ao vivo de segunda a sexta-feira',
                'Premiação em dinheiro',
                'Certificação'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-lg md:text-xl font-medium text-slate-200">
                  <div className="w-6 h-6 rounded-full bg-trademaster-blue/20 border border-trademaster-blue/30 flex items-center justify-center shrink-0">
                     <Check size={14} className="text-trademaster-blue" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
             <div className="glass-card p-6 border-l-4 border-l-trademaster-blue inline-block">
               <p className="text-2xl font-black text-white">Tudo em uma única assinatura.</p>
             </div>
          </div>
          <div>
            <div className="glass-card p-10 border border-trademaster-blue/20 shadow-[0_0_50px_rgba(59,130,246,0.05)] sticky top-32">
              <div className="text-center mb-8">
                <div className="text-4xl font-black text-white">A Hora de Agir é Agora!</div>
              </div>
              
              <div className="space-y-6 text-center text-lg text-slate-300 leading-relaxed mb-8">
                <p>
                  Se você quer parar de operar no impulso e começar a tratar o trading como um processo profissional…
                </p>
                <p className="font-bold text-white">
                  Escolha o seu plano abaixo e entre agora para a {BRANDING.appName}.
                </p>
              </div>

              <PricingSection 
                heading="Escolha Seu Plano"
                description="Selecione a melhor opção para sua jornada no trading."
                plans={[
                  {
                    highlighted: true,
                    name: 'Plano Protocolo 3P',
                    info: 'Tudo o que você precisa em uma única assinatura',
                    price: { monthly: 47, yearly: 447 },
                    features: [
                      { text: 'O Robô de Automação Automática' },
                      { text: 'Aulas ao Vivo Segunda a Sexta' },
                      { text: 'Dados Reais da Planilha' },
                      { text: 'Check-in e Trade Psicológicos' },
                      { text: 'Curso com Aulas Gravadas' },
                    ],
                    btn: { text: 'GARANTIR MINHA VAGA', href: 'https://pay.cakto.com.br/anasupy_808501' }
                  }
                ]}
              />

              <div className="mt-8 text-center pt-8 border-t border-white/10">
                 <a href="https://pay.cakto.com.br/anasupy_808501" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 bg-apex-trader-primary text-black font-black text-xl px-11 py-5 rounded-xl shadow-[0_0_50px_rgba(59,130,246,0.6)] hover:shadow-[0_0_80px_rgba(59,130,246,0.8)] transition-all scale-100 hover:scale-105 active:scale-95">
                   COMEÇAR AGORA
                   <ArrowRight size={22} className="ml-2 animate-pulse" />
                 </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. GAMIFICAÇÃO ====== */}
      <section className="py-24 md:py-28" id="gamificacao">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-trademaster-blue bg-trademaster-blue/8 border border-trademaster-blue/15 px-4 py-1.5 rounded-full mb-4">
              <Trophy size={12} /> Gamificação
            </div>
            <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight mb-4">Estímulo à Evolução Constante</h2>
            <p className="text-base text-slate-400 max-w-[640px] mx-auto leading-relaxed">
              Para estimular sua evolução constante, temos um ranking de traders dentro da plataforma. Os melhores traders são avaliados com base em: <strong className="text-trademaster-blue">Lucro</strong> e <strong className="text-trademaster-blue">Taxa de assertividade</strong>.
            </p>
          </div>

          {/* Podium */}
          <div className="flex items-end justify-center gap-2 md:gap-6 my-12 flex-nowrap w-full">
            {/* 2nd */}
            <div className="text-center p-3 md:p-8 rounded-2xl min-h-[160px] md:min-h-[260px] w-1/3 max-w-[200px]" style={{ background: 'linear-gradient(180deg, rgba(192,192,192,0.08), rgba(15,23,42,0.5))', border: '1px solid rgba(192,192,192,0.15)' }}>
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-black text-black text-sm md:text-2xl mx-auto mb-2 md:mb-4">2</div>
              <div className="text-[8px] md:text-[11px] font-bold uppercase tracking-[1.5px] text-gray-400 mb-1 md:mb-3">2º Lugar</div>
              <div className="text-[10px] md:text-sm font-semibold truncate text-slate-400 mb-2">Ana S.</div>
              <div className="text-lg md:text-2xl font-black text-white mt-auto">R$ 100</div>
            </div>
            {/* 1st */}
            <div className="text-center p-3 md:p-8 rounded-2xl min-h-[190px] md:min-h-[320px] w-1/3 max-w-[220px] shadow-[0_0_20px_rgba(255,215,0,0.05)] md:shadow-[0_0_40px_rgba(255,215,0,0.08)] z-10" style={{ background: 'linear-gradient(180deg, rgba(255,215,0,0.12), rgba(15,23,42,0.5))', border: '1px solid rgba(255,215,0,0.2)' }}>
              <div className="flex justify-center mb-1 md:mb-2"><Trophy className="text-yellow-400 w-4 h-4 md:w-6 md:h-6" /></div>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-black text-black text-lg md:text-2xl mx-auto mb-2 md:mb-4">1</div>
              <div className="text-[8px] md:text-[11px] font-bold uppercase tracking-[1.5px] text-yellow-500 mb-1 md:mb-3">1º Lugar</div>
              <div className="text-[10px] md:text-sm font-semibold truncate text-slate-400 mb-3">Carlos M.</div>
              <div className="text-xl md:text-3xl font-black text-white mt-auto">R$ 200</div>
            </div>
            {/* 3rd */}
            <div className="text-center p-3 md:p-8 rounded-2xl min-h-[150px] md:min-h-[260px] w-1/3 max-w-[200px]" style={{ background: 'linear-gradient(180deg, rgba(205,127,50,0.08), rgba(15,23,42,0.5))', border: '1px solid rgba(205,127,50,0.15)' }}>
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center font-black text-white text-sm md:text-2xl mx-auto mb-2 md:mb-4">3</div>
              <div className="text-[8px] md:text-[11px] font-bold uppercase tracking-[1.5px] text-orange-600 mb-1 md:mb-3">3º Lugar</div>
              <div className="text-[10px] md:text-sm font-semibold truncate text-slate-400 mb-2">Pedro L.</div>
              <div className="text-lg md:text-2xl font-black text-white mt-auto">R$ 50</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-400 text-lg mb-3">
              Os Top 3 traders ficam em destaque, criando uma competição saudável e mostrando performance real.
            </p>
            <div className="inline-block font-bold text-lg text-trademaster-blue bg-slate-900/70 border border-trademaster-blue/20 px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              Transforme cada operação em uma oportunidade de subir no ranking!
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. COMUNIDADE ===== */}
      <section className="py-24 md:py-28" id="comunidade">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-trademaster-blue bg-trademaster-blue/8 border border-trademaster-blue/15 px-4 py-1.5 rounded-full mb-4">
              <Users size={12} /> Comunidade
            </div>
            <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight mb-4">Você não evolui sozinho</h2>
            <p className="text-base text-slate-400 max-w-[640px] mx-auto leading-relaxed">Troque experiências, tire dúvidas, acompanhe análises e receba direcionamento dentro de uma comunidade feita para quem quer amadurecer no mercado de verdade.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Discord', desc: 'Participe das aulas, análises e trocas em tempo real com a comunidade.', color: '#5865F2', btnText: 'Ver como funciona o Discord' },
              { name: 'WhatsApp', desc: 'Receba avisos, conteúdos e mantenha contato com a comunidade e os mentores.', color: '#25D366', btnText: 'Conhecer o grupo exclusivo' },
              { name: 'Suporte', desc: 'Tire dúvidas e continue avançando com acompanhamento mais próximo.', color: '#3b82f6', btnText: 'Entender o suporte por dentro' },
            ].map((c) => (
              <div key={c.name} className="glass-card p-8 text-center hover:-translate-y-1 transition-transform">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: `${c.color}15` }}>
                  <MessageCircle size={28} style={{ color: c.color }} />
                </div>
                <h3 className="text-lg font-bold mb-2.5">{c.name}</h3>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed">{c.desc}</p>
                <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all" style={{ background: `${c.color}18`, color: c.color }}>
                  {c.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-trademaster-blue/15 to-transparent" />

      {/* ===== 9. CERTIFICAÇÃO ===== */}
      <section className="py-24 md:py-28" id="certificado">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-trademaster-blue bg-trademaster-blue/8 border border-trademaster-blue/15 px-4 py-1.5 rounded-full mb-4">
            🎓 Certificação
          </div>
          <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight mb-8">Prove Sua Competência</h2>
          
          <div className="glass-card max-w-[700px] mx-auto p-10 border-t-2 border-trademaster-blue/40">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-trademaster-blue/20 to-transparent border border-trademaster-blue/30">
              <Award size={40} className="text-trademaster-blue" />
            </div>
            <p className="text-lg text-slate-300 leading-relaxed max-w-[500px] mx-auto mb-6">
              Após concluir o treinamento, você pode fazer a prova final. Se for aprovado, você recebe o Certificado de Conclusão do Curso de Trading.
            </p>
            <p className="text-base font-bold text-trademaster-blue px-6 py-3 bg-trademaster-blue/10 inline-block rounded-xl border border-trademaster-blue/20">
              Um selo de competência para mostrar que você está pronto(a) para operar de forma profissional.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 py-10 text-center bg-slate-950">
        <div className="max-w-[1200px] mx-auto px-6">
          <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-8 mx-auto mb-4" referrerPolicy="no-referrer" />
          <p className="text-sm text-slate-500">&copy; 2026 {BRANDING.appName}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

