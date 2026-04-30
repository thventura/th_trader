import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const STORAGE_KEY = 'guias_planilha_2x1';

interface DiaControle {
  dia: number;
  resultado: string;
}

interface Dados2x1 {
  valorBanca: string;
  payout: string;
  stop: string;
  dias: DiaControle[];
}

function carregarDados(): Dados2x1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { valorBanca: parsed.valorBanca || '1000', payout: parsed.payout || '87', stop: parsed.stop || '5', dias: parsed.dias || Array.from({ length: 20 }, (_, i) => ({ dia: i + 1, resultado: '' })) };
    }
  } catch {}
  return {
    valorBanca: '1000',
    payout: '87',
    stop: '5',
    dias: Array.from({ length: 20 }, (_, i) => ({ dia: i + 1, resultado: '' })),
  };
}

interface Props {
  onVoltar: () => void;
}

export default function Planilha2x1({ onVoltar }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dados, setDados] = React.useState<Dados2x1>(carregarDados);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const banca = parseFloat(dados.valorBanca) || 0;
  const payoutPct = parseFloat(dados.payout) || 0;
  const stopPct = parseFloat(dados.stop) || 0;

  // Soros: mão fixa baseada no stop
  const maoFixa = banca * (stopPct / 100);
  const op1a = maoFixa;
  const lucroOp1a = maoFixa * (payoutPct / 100);
  const op2a = maoFixa + lucroOp1a; // Soros: mão fixa + lucro da op anterior
  const lucroOp2a = op2a * (payoutPct / 100);
  const lucroTentativa = lucroOp1a + lucroOp2a;

  // Controle mensal
  const bancaAcumulada = dados.dias.map((d, i) => {
    const prev = i === 0 ? banca : 0; // será calculado abaixo
    return { ...d, bancaVal: 0, pct: 0 };
  });

  let bancaAtual = banca;
  const dadosGrafico: { dia: number; banca: number }[] = [];

  for (let i = 0; i < dados.dias.length; i++) {
    const res = parseFloat(dados.dias[i].resultado) || 0;
    bancaAtual += res;
    bancaAcumulada[i].bancaVal = bancaAtual;
    bancaAcumulada[i].pct = banca > 0 ? ((bancaAtual - banca) / banca) * 100 : 0;
    dadosGrafico.push({ dia: i + 1, banca: Math.round(bancaAtual * 100) / 100 });
  }

  const lucroTotal = bancaAtual - banca;
  const lucroPct = banca > 0 ? ((lucroTotal / banca) * 100) : 0;

  const updateDia = (idx: number, val: string) => {
    setDados(p => ({
      ...p,
      dias: p.dias.map((d, i) => i === idx ? { ...d, resultado: val } : d),
    }));
  };

  const cell = cn('px-3 py-2 text-xs border', isDark ? 'border-slate-700' : 'border-gray-300');
  const headerBg = isDark ? 'bg-slate-800' : 'bg-gray-900 text-white';

  return (
    <div className="space-y-6">
      <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Voltar ao Menu
      </button>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── GUIA DA DISCIPLINA ── */}
        <div className="flex-1 space-y-6">
          <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-950')}>
            <div className="px-6 py-4 text-center">
              <h2 className="text-2xl font-black text-white tracking-tight">GUIA DA DISCIPLINA</h2>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Config */}
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'VALOR DA BANCA', value: dados.valorBanca, key: 'valorBanca' as const },
                  { label: 'PAYOUT', value: dados.payout, key: 'payout' as const, suffix: '%' },
                ].map(item => (
                  <div key={item.label} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-600 bg-gray-800')}>
                    <span className="text-[10px] font-bold text-yellow-400 uppercase">{item.label}</span>
                    <input
                      type="text"
                      value={item.value}
                      onChange={e => setDados(p => ({ ...p, [item.key]: e.target.value }))}
                      className="w-20 bg-transparent text-white text-sm font-bold text-right outline-none"
                    />
                    {item.suffix && <span className="text-xs text-slate-400">{item.suffix}</span>}
                  </div>
                ))}
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-600 bg-gray-800')}>
                  <span className="text-[10px] font-bold text-green-400 uppercase">STOP</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={dados.stop}
                    onChange={e => setDados(p => ({ ...p, stop: e.target.value }))}
                    className="w-24 accent-apex-trader-primary"
                  />
                  <span className="text-sm font-bold text-white">{dados.stop}%</span>
                </div>
              </div>

              {/* Tentativa 1 — Soros auto-calculado */}
              <div className="flex flex-wrap items-end gap-4">
                <div className={cn('px-3 py-1.5 rounded-lg text-xs font-black uppercase', 'bg-yellow-500 text-black')}>
                  TENTATIVA 1
                </div>
                {[
                  { label: 'OPERAÇÃO 1A', value: op1a },
                  { label: 'OPERAÇÃO 2A', value: op2a },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>
                    <div className={cn('w-28 px-3 py-2 rounded-lg text-sm font-bold text-center', isDark ? 'bg-slate-800 text-white border border-slate-600' : 'bg-gray-800 text-white border border-gray-600')}>
                      {item.value.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">LUCRO</span>
                  <div className={cn('px-4 py-2 rounded-lg text-sm font-black text-center', lucroTentativa >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white')}>
                    {lucroTentativa.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── GRÁFICO MODERNO ── */}
          <div className={cn('rounded-xl border overflow-hidden p-6', isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-950')}>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 text-center">Análise do Desempenho</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBanca2x1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34de00" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34de00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Banca']}
                />
                <Area type="monotone" dataKey="banca" stroke="#34de00" strokeWidth={2.5} fill="url(#gradBanca2x1)" dot={{ r: 4, fill: '#34de00', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#34de00', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-center text-[10px] text-slate-500 mt-2 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-apex-trader-primary inline-block" /> Valor da Banca/Dia
            </p>
          </div>
        </div>

        {/* ── CONTROLE MENSAL ── */}
        <div className="xl:w-[420px] space-y-4">
          <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-slate-700' : 'border-gray-300')}>
            <div className={cn('px-6 py-3 text-center', headerBg)}>
              <h2 className="text-lg font-black text-white tracking-tight">CONTROLE MENSAL</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={cn(cell, headerBg, 'font-bold text-center text-white')}>DIA</th>
                    <th className={cn(cell, headerBg, 'font-bold text-center text-white')}>RESULTADO</th>
                    <th className={cn(cell, headerBg, 'font-bold text-center text-white')}>BANCA</th>
                    <th className={cn(cell, headerBg, 'font-bold text-center text-white')}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.dias.map((d, i) => {
                    const res = parseFloat(d.resultado) || 0;
                    return (
                      <tr key={d.dia} className={isDark ? 'bg-slate-900' : 'bg-gray-950'}>
                        <td className={cn(cell, 'text-center font-bold text-white w-14')}>{d.dia}</td>
                        <td className={cn(cell, 'text-center w-28')}>
                          <input
                            type="text"
                            value={d.resultado}
                            onChange={e => updateDia(i, e.target.value)}
                            className={cn('w-full bg-transparent text-center text-xs font-bold outline-none', res > 0 ? 'text-green-400' : res < 0 ? 'text-red-400' : 'text-white')}
                            placeholder="0"
                          />
                        </td>
                        <td className={cn(cell, 'text-center font-bold text-white')}>{Math.round(bancaAcumulada[i].bancaVal)}</td>
                        <td className={cn(cell, 'text-center font-bold', bancaAcumulada[i].pct >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {bancaAcumulada[i].pct.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LUCRO/PREJUÍZO */}
          <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-950')}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(cell, headerBg, 'font-black text-white text-center')}>LUCRO/PREJUÍZO</th>
                  <th className={cn(cell, headerBg, 'font-black text-white text-center')}>%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={cn(cell, 'text-center text-2xl font-black', lucroTotal >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {Math.round(lucroTotal)}
                  </td>
                  <td className={cn(cell, 'text-center text-2xl font-black', lucroPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {lucroPct.toFixed(0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
