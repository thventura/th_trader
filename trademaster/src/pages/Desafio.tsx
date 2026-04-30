import React from 'react';
import { Trophy, TrendingUp, Target, BarChart3, Users, Star, CheckCircle2, Flame, Crown, Medal, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { BRANDING } from '../config/branding';
import AnoAI from '../components/ui/animated-shader-background';
import { supabase } from '../lib/supabase';
import { getProfile, getOperacoes, getGlobalRanking, RankingEntry } from '../lib/supabaseService';

// ── RetroGrid (adaptado para verde TradeMaster) ──

function RetroGrid({
  angle = 65,
  cellSize = 60,
  opacity = 0.4,
  lightLineColor = '#1a3d1a',
  darkLineColor = '#0d2e0d',
}: {
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lightLineColor?: string; darkLineColor?: string;
}) {
  const gridStyles = {
    '--grid-angle': `${angle}deg`,
    '--cell-size': `${cellSize}px`,
    '--opacity': opacity,
    '--light-line': lightLineColor,
    '--dark-line': darkLineColor,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        'pointer-events-none absolute size-full overflow-hidden [perspective:200px]',
        'opacity-[var(--opacity)]',
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent to-90%" />
    </div>
  );
}

const PREMIOS = [500, 200, 100];
const PERIODO = 'Março 2026';

export default function Desafio() {
  const [ranking, setRanking] = React.useState<RankingEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);
      try {
        const data = await getGlobalRanking();
        setRanking(data);
      } catch (err) {
        console.error('Erro ao carregar ranking:', err);
      }
      setLoading(false);
    })();
  }, []);

  const top3 = ranking.slice(0, 3);
  const restante = ranking.slice(3);

  const getRankInfo = (pos: number) => {
    if (pos === 0) return { label: '1º', cor: '#FFD700', corText: '#7a5200', shadow: 'rgba(255,215,0,0.5)', gradiente: 'linear-gradient(135deg,#FFE55C,#FFD700,#C8A800)', icon: Crown, label3D: 'OURO' };
    if (pos === 1) return { label: '2º', cor: '#C0C0C0', corText: '#3a3a3a', shadow: 'rgba(192,192,192,0.5)', gradiente: 'linear-gradient(135deg,#E8E8E8,#C0C0C0,#909090)', icon: Medal, label3D: 'PRATA' };
    return { label: '3º', cor: '#CD7F32', corText: '#4a2800', shadow: 'rgba(205,127,50,0.5)', gradiente: 'linear-gradient(135deg,#E8A060,#CD7F32,#9A5C1A)', icon: Medal, label3D: 'BRONZE' };
  };

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd layout
  const podiumHeights = ['h-28', 'h-40', 'h-20']; // prata, ouro, bronze

  return (
    <div className="space-y-10">

      {/* ── Hero Section com RetroGrid ── */}
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background glow & Shader */}
        <div className="absolute inset-0 z-0">
          <AnoAI className="opacity-25" />
        </div>
        <div className="absolute top-0 z-0 h-full w-full bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(52,222,0,0.15),rgba(0,0,0,0))]" />

        <RetroGrid angle={65} cellSize={50} opacity={0.35} lightLineColor="#1a3d1a" darkLineColor="#0d2e0d" />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 py-16 md:py-24">
          <div className="space-y-5 max-w-3xl mx-auto text-center">
            {/* Tag superior */}
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-sm text-slate-400 group mx-auto px-5 py-2 bg-gradient-to-tr from-emerald-900/20 via-emerald-800/20 to-transparent border-[2px] border-white/5 rounded-3xl w-fit flex items-center gap-2">
                <Flame size={14} className="text-trademaster-blue" />
                Desafio Protocolo 3P
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-trademaster-blue/15 text-trademaster-blue">
                  {PERIODO}
                </span>
                <ChevronRight className="inline w-4 h-4 ml-1 group-hover:translate-x-1 duration-300 text-slate-500" />
              </h1>
            </div>

            {/* Título principal */}
            <h2 className="text-4xl tracking-tighter font-black mx-auto md:text-6xl bg-clip-text text-transparent bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
              Plano · Progresso ·{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-trademaster-blue">
                Psicologia
              </span>
            </h2>

            {/* Descrição */}
            <p className="max-w-2xl mx-auto text-slate-400 text-sm md:text-base">
              Comprove que você aplica o protocolo de forma consistente e concorra a prêmios em dinheiro. A classificação é justa — baseada em proporção de lucro, não em valor absoluto da banca.
            </p>

            {/* CTA com borda animada */}
            <div className="flex items-center justify-center gap-x-3 pt-2">
              <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#34de00_0%,#0a4a00_50%,#34de00_100%)]" />
                <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 text-sm font-bold backdrop-blur-3xl">
                  <a
                    href="#ranking"
                    className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-emerald-900/20 via-trademaster-blue/20 to-transparent text-white border-input border-[1px] border-white/5 hover:from-emerald-900/30 hover:via-trademaster-blue/30 transition-all py-3.5 px-8 gap-2"
                  >
                    <Trophy size={16} className="text-trademaster-blue" />
                    Ver Ranking
                  </a>
                </div>
              </span>
            </div>

            {/* Prêmios inline */}
            <div className="flex items-center justify-center gap-6 pt-4">
              {[
                { pos: '1º', premio: 'R$500', cor: '#FFD700' },
                { pos: '2º', premio: 'R$200', cor: '#C0C0C0' },
                { pos: '3º', premio: 'R$100', cor: '#CD7F32' },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Trophy size={14} style={{ color: p.cor }} />
                  <span className="text-xs font-black" style={{ color: p.cor }}>{p.pos}</span>
                  <span className="text-sm font-bold text-white">{p.premio}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Podium Top 3 — Cards Modernos ── */}
      <div id="ranking">
        <h2 className="text-2xl font-bold tracking-tight mb-8 flex items-center gap-2">
          <Trophy size={22} className="text-trademaster-blue" />
          Top 3 do Mês
        </h2>

        {/* Pódio: 2º | 1º (maior) | 3º */}
        <div className="flex items-end justify-center gap-1 sm:gap-3 md:gap-5 px-1 md:px-2">
          {podiumOrder.map((p, i) => {
            const realPos = i === 0 ? 1 : i === 1 ? 0 : 2;
            const info = getRankInfo(realPos);
            const premio = PREMIOS[realPos];
            const isFirst = realPos === 0;
            const cardHeight = isFirst ? 'min-h-[220px] sm:min-h-[260px] md:min-h-[340px]' : 'min-h-[190px] sm:min-h-[220px] md:min-h-[280px]';

            return (
              <div key={p.id} className="flex flex-col items-center flex-1 max-w-[220px]">
                {/* Estrelas douradas acima do 1º lugar */}
                {isFirst && (
                  <div className="flex items-center gap-0.5 mb-1 md:mb-3">
                    <Star size={12} className="text-yellow-400 fill-yellow-400 md:w-4 md:h-4" />
                    <Star size={16} className="text-yellow-400 fill-yellow-400 md:w-5 md:h-5" />
                    <Star size={12} className="text-yellow-400 fill-yellow-400 md:w-4 md:h-4" />
                  </div>
                )}

                {/* Card do participante */}
                <div
                  className={cn(
                    'w-full rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 flex flex-col items-center justify-center gap-1.5 md:gap-3 relative overflow-hidden transition-all',
                    cardHeight,
                  )}
                  style={{
                    background: `linear-gradient(180deg, ${info.cor}08 0%, ${info.cor}03 100%)`,
                    border: `1px solid ${info.cor}25`,
                    boxShadow: isFirst ? `0 0 40px ${info.shadow}, 0 8px 32px rgba(0,0,0,0.4)` : `0 4px 20px rgba(0,0,0,0.3)`,
                  }}
                >
                  {/* Glow de fundo */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 md:w-32 md:h-32 rounded-full blur-3xl opacity-20"
                    style={{ background: info.cor }}
                  />

                  {/* Medalha ribbon */}
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Ribbon */}
                    <div className="flex gap-0.5 mb-1">
                      <div className="w-1 md:w-2 h-4 md:h-6 rounded-sm" style={{ background: '#002395' }} />
                      <div className="w-1 md:w-2 h-4 md:h-6 rounded-sm bg-white" />
                      <div className="w-1 md:w-2 h-4 md:h-6 rounded-sm" style={{ background: '#ED2939' }} />
                    </div>
                    {/* Medal circle */}
                    <div
                      className="w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-xl relative"
                      style={{
                        background: info.gradiente,
                        boxShadow: `0 4px 16px ${info.shadow}`,
                      }}
                    >
                      <div
                        className="w-6 h-6 md:w-10 md:h-10 rounded-full flex items-center justify-center border-[1.5px] md:border-2"
                        style={{ borderColor: `${info.corText}30`, background: `${info.cor}cc` }}
                      >
                        {realPos === 0 ? (
                          <Crown size={12} style={{ color: info.corText }} className="md:w-[18px] md:h-[18px]" />
                        ) : (
                          <Medal size={12} style={{ color: info.corText }} className="md:w-[18px] md:h-[18px]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Posição */}
                  <span
                    className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] relative z-10 text-center leading-none"
                    style={{ color: info.cor }}
                  >
                    {info.label3D}
                  </span>

                  {/* Info do participante */}
                  <div className="relative z-10 text-center space-y-0.5 md:space-y-1">
                    <p className="text-[9px] md:text-sm font-bold text-white truncate max-w-[65px] sm:max-w-[100px] md:max-w-[160px]" title={p.nome}>
                      {p.nome}{p.id === userId ? ' (Você)' : ''}
                    </p>
                    <p className={cn(
                      "text-[10px] md:text-lg font-black",
                      p.lucro_percentual >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {p.lucro_percentual >= 0 ? '+' : ''}{p.lucro_percentual.toFixed(1)}%
                    </p>
                  </div>

                  {/* Prêmio */}
                  <div
                    className="relative z-10 px-1.5 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-sm font-black whitespace-nowrap"
                    style={{ background: `${info.cor}15`, color: info.cor, border: `1px solid ${info.cor}30` }}
                  >
                    {formatCurrency(premio)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full ranking table */}
        <div className="glass-card overflow-hidden mt-6">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Classificação Geral</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/5 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Participante</th>
                  <th className="px-5 py-3 font-medium">Lucro %</th>
                  <th className="px-5 py-3 font-medium">Win Rate</th>
                  <th className="px-5 py-3 font-medium">Operações</th>
                  <th className="px-5 py-3 font-medium">Pontuação</th>
                  <th className="px-5 py-3 font-medium text-right">Prêmio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranking.map((p, idx) => {
                  const info = idx < 3 ? getRankInfo(idx) : null;
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "transition-colors",
                        p.id === userId
                          ? "bg-trademaster-blue/5 border-l-2 border-trademaster-blue"
                          : "hover:bg-white/5"
                      )}
                    >
                      <td className="px-5 py-3.5">
                        {info ? (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                            style={{ background: `${info.cor}20`, color: info.cor }}
                          >
                            {idx + 1}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500 font-bold pl-1">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: p.id === userId ? '#34de00' : info ? `${info.cor}20` : 'rgba(255,255,255,0.05)',
                              color: p.id === userId ? '#000' : info ? info.cor : '#94a3b8',
                            }}
                          >
                            {p.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className={cn("text-sm font-bold", p.isCurrentUser ? "text-trademaster-blue" : "text-slate-200")}>
                              {p.nome}
                            </span>
                            {p.isCurrentUser && (
                              <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-trademaster-blue/20 text-trademaster-blue">Você</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("text-sm font-bold", p.lucro_percentual >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {p.lucro_percentual >= 0 ? '+' : ''}{p.lucro_percentual.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-trademaster-blue rounded-full" style={{ width: `${p.win_rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-trademaster-blue">{p.win_rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{p.total_ops}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-black text-white">{p.score.toFixed(1)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {idx < 3 ? (
                          <span className="text-sm font-black" style={{ color: info!.cor }}>
                            {formatCurrency(PREMIOS[idx])}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Fórmula de Pontuação — Futurista ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute top-0 z-0 h-full w-full bg-[radial-gradient(ellipse_40%_60%_at_50%_0%,rgba(52,222,0,0.08),rgba(0,0,0,0))]" />
        <RetroGrid angle={65} cellSize={40} opacity={0.15} lightLineColor="#0d2e0d" darkLineColor="#0a1f0a" />

        <div className="relative z-10 p-8 md:p-12 space-y-8">
          {/* Título */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-trademaster-blue/10 border border-trademaster-blue/20 text-xs font-black text-trademaster-blue uppercase tracking-wider mx-auto">
              <BarChart3 size={14} />
              Sistema Fair Play
            </div>
            <h3 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.4)_100%)]">
              Fórmula de Pontuação
            </h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Para garantir que ninguém leve vantagem por ter uma banca maior, a classificação é baseada em <strong className="text-white">proporção de lucro</strong> (%), não em valor absoluto.
            </p>
          </div>

          {/* Fórmula com borda animada */}
          <div className="flex justify-center">
            <span className="relative inline-block overflow-hidden rounded-2xl p-[1.5px]">
              <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#34de00_0%,#0a4a00_50%,#34de00_100%)]" />
              <div className="relative rounded-2xl bg-slate-950 px-8 py-5 font-mono text-sm md:text-base text-center">
                <span className="text-trademaster-blue font-black">Pontuação</span>
                <span className="text-slate-500"> = </span>
                <span className="text-emerald-400 font-bold">(Lucro% × 0,6)</span>
                <span className="text-slate-600"> + </span>
                <span className="text-blue-400 font-bold">(Win Rate × 0,3)</span>
                <span className="text-slate-600"> + </span>
                <span className="text-amber-400 font-bold">(Bônus × 0,1)</span>
              </div>
            </span>
          </div>

          {/* 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, cor: '#10b981', corBg: 'rgba(16,185,129,0.08)', corBorder: 'rgba(16,185,129,0.2)', peso: '60%', titulo: 'Proporção de Lucro', desc: 'Lucro total ÷ banca inicial × 100. Bancas maiores NÃO levam vantagem.' },
              { icon: Target, cor: '#3b82f6', corBg: 'rgba(59,130,246,0.08)', corBorder: 'rgba(59,130,246,0.2)', peso: '30%', titulo: 'Taxa de Acerto', desc: 'Percentual de operações vencedoras. Mínimo de 5 ops para qualificar.' },
              { icon: Star, cor: '#f59e0b', corBg: 'rgba(245,158,11,0.08)', corBorder: 'rgba(245,158,11,0.2)', peso: '10%', titulo: 'Bônus Atividade', desc: 'Bônus por volume de operações (máximo com 50+ ops no período).' },
            ].map((item, i) => (
              <div
                key={i}
                className="relative p-6 rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
                style={{ background: item.corBg, border: `1px solid ${item.corBorder}` }}
              >
                {/* Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: item.cor }} />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl" style={{ background: `${item.cor}15` }}>
                      <item.icon size={22} style={{ color: item.cor }} />
                    </div>
                    <span
                      className="text-xs font-black px-3 py-1 rounded-full"
                      style={{ background: `${item.cor}15`, color: item.cor, border: `1px solid ${item.cor}30` }}
                    >
                      {item.peso}
                    </span>
                  </div>
                  <p className="text-base font-bold text-white">{item.titulo}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Como Participar — Futurista ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute top-0 z-0 h-full w-full bg-[radial-gradient(ellipse_30%_50%_at_80%_20%,rgba(52,222,0,0.06),rgba(0,0,0,0))]" />
        <RetroGrid angle={65} cellSize={45} opacity={0.1} lightLineColor="#0d2e0d" darkLineColor="#091a09" />

        <div className="relative z-10 p-8 md:p-12 space-y-8">
          {/* Título */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-trademaster-blue/10 border border-trademaster-blue/20 text-xs font-black text-trademaster-blue uppercase tracking-wider mx-auto">
              <Users size={14} />
              Passo a Passo
            </div>
            <h3 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.4)_100%)]">
              Como Participar
            </h3>
          </div>

          {/* 4 steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { num: '01', titulo: 'Seja aluno ativo', desc: `Faça parte da comunidade ${BRANDING.appName} e esteja com sua matrícula ativa no mês do desafio.` },
              { num: '02', titulo: 'Registre suas operações', desc: 'Cadastre todas as suas operações no sistema. A pontuação é calculada automaticamente com base nos seus dados.' },
              { num: '03', titulo: 'Mínimo de 5 operações', desc: 'Para qualificar no ranking, é necessário registrar no mínimo 5 operações durante o período do desafio.' },
              { num: '04', titulo: 'Opere com disciplina', desc: 'Siga o Protocolo 3P: tenha um Plano claro, registre seu Progresso diariamente e cuide da sua Psicologia.' },
            ].map((step, i) => (
              <div
                key={i}
                className="group relative flex gap-5 p-5 rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(52,222,0,0.03)',
                  border: '1px solid rgba(52,222,0,0.1)',
                }}
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_0%_50%,rgba(52,222,0,0.08),transparent_70%)]" />
                {/* Número grande */}
                <div className="relative z-10 shrink-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52,222,0,0.15), rgba(52,222,0,0.05))',
                      border: '1px solid rgba(52,222,0,0.25)',
                      color: '#34de00',
                      boxShadow: '0 0 20px rgba(52,222,0,0.1)',
                    }}
                  >
                    {step.num}
                  </div>
                </div>
                <div className="relative z-10 flex flex-col justify-center">
                  <p className="text-base font-bold text-white mb-1">{step.titulo}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Regras do Desafio — Futurista ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute top-0 z-0 h-full w-full bg-[radial-gradient(ellipse_30%_50%_at_20%_80%,rgba(52,222,0,0.06),rgba(0,0,0,0))]" />
        <RetroGrid angle={65} cellSize={55} opacity={0.08} lightLineColor="#0d2e0d" darkLineColor="#091a09" />

        <div className="relative z-10 p-8 md:p-12 space-y-8">
          {/* Título */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-trademaster-blue/10 border border-trademaster-blue/20 text-xs font-black text-trademaster-blue uppercase tracking-wider mx-auto">
              <CheckCircle2 size={14} />
              Regulamento
            </div>
            <h3 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.4)_100%)]">
              Regras do Desafio
            </h3>
          </div>

          {/* Regras em cards */}
          <div className="space-y-3">
            {[
              'O desafio tem duração mensal, com início no 1º dia e encerramento no último dia do mês.',
              'A classificação é baseada na pontuação composta (Lucro% + Win Rate + Bônus Atividade), garantindo igualdade entre bancas de diferentes tamanhos.',
              `Operações não registradas no sistema ${BRANDING.appName} até o último dia do mês não serão contabilizadas.`,
              'O participante deve ter no mínimo 5 operações registradas no período para aparecer no ranking.',
              'Operações com dados incorretos ou incompletos poderão ser desconsideradas pelo administrador.',
              'Em caso de empate na pontuação, desempata-se por: (1) maior Lucro%, (2) maior Win Rate, (3) maior número de operações.',
              'Os prêmios serão pagos via PIX até o 5º dia útil do mês seguinte ao término do desafio.',
              'O administrador reserva o direito de desclassificar participantes em caso de dados suspeitos ou irregulares.',
              'A participação no desafio implica a aceitação de todas as regras acima.',
            ].map((regra, i) => (
              <div
                key={i}
                className="group flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-trademaster-blue/[0.03]"
                style={{ border: '1px solid rgba(255,255,255,0.03)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(52,222,0,0.15), rgba(52,222,0,0.05))',
                    border: '1px solid rgba(52,222,0,0.2)',
                    color: '#34de00',
                    boxShadow: '0 0 12px rgba(52,222,0,0.08)',
                  }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed pt-1">{regra}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
