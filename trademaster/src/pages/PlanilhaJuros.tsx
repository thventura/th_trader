import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

const STORAGE_KEY = 'guias_planilha_juros';

interface DiaMes {
  dia: number;
  valorAlcancado: string;
  win: string;
  loss: string;
  retirada: string;
}

interface MesData {
  dias: DiaMes[];
}

interface DadosJuros {
  valorBanca: string;
  metaPct: string;
  meses: MesData[];
  calcDias: string;
  calcTaxa: string;
  calcBanca: string;
}

function criarMesVazio(): MesData {
  return {
    dias: Array.from({ length: 31 }, (_, i) => ({
      dia: i + 1,
      valorAlcancado: '',
      win: '',
      loss: '',
      retirada: '',
    })),
  };
}

function carregarDados(): DadosJuros {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    valorBanca: '1000',
    metaPct: '10',
    meses: Array.from({ length: 12 }, () => criarMesVazio()),
    calcDias: '30',
    calcTaxa: '10',
    calcBanca: '1000',
  };
}

interface Props {
  onVoltar: () => void;
}

export default function PlanilhaJuros({ onVoltar }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dados, setDados] = React.useState<DadosJuros>(carregarDados);
  const [mesAtual, setMesAtual] = React.useState(0);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const banca = parseFloat(dados.valorBanca) || 0;
  const metaPct = parseFloat(dados.metaPct) || 0;

  // Calcula banca inicial de cada mês (acumulada)
  const bancaInicialMes: number[] = [];
  let bancaAcum = banca;
  for (let m = 0; m < 12; m++) {
    bancaInicialMes.push(bancaAcum);
    const mes = dados.meses[m];
    for (const d of mes.dias) {
      const alcancado = parseFloat(d.valorAlcancado) || 0;
      const retirada = parseFloat(d.retirada) || 0;
      bancaAcum += alcancado - retirada;
    }
  }

  const bancaInicioMes = bancaInicialMes[mesAtual];
  const mes = dados.meses[mesAtual];
  const metaReais = bancaInicioMes * (metaPct / 100);

  // Calcular dados do mês atual
  let bancaDia = bancaInicioMes;
  const dadosDia = mes.dias.map((d) => {
    const alcancado = parseFloat(d.valorAlcancado) || 0;
    const retirada = parseFloat(d.retirada) || 0;
    const win = parseInt(d.win) || 0;
    const loss = parseInt(d.loss) || 0;
    bancaDia += alcancado - retirada;
    const pctAlcancado = bancaInicioMes > 0 ? ((bancaDia - bancaInicioMes) / bancaInicioMes) * 100 : 0;
    return { ...d, bancaFinal: bancaDia, pctAlcancado, win, loss };
  });

  const bancaFinalMes = bancaDia;
  const totalRetiradas = mes.dias.reduce((s, d) => s + (parseFloat(d.retirada) || 0), 0);
  const lucroMes = bancaFinalMes - bancaInicioMes + totalRetiradas;
  const valorAlcancadoTotal = mes.dias.reduce((s, d) => s + (parseFloat(d.valorAlcancado) || 0), 0);
  const totalWins = dadosDia.reduce((s, d) => s + d.win, 0);
  const totalLoss = dadosDia.reduce((s, d) => s + d.loss, 0);
  const valorPorOp = banca > 0 ? banca * (metaPct / 100) / 20 : 0;

  const updateDia = (idx: number, campo: keyof DiaMes, val: string) => {
    setDados(p => {
      const novosMeses = [...p.meses];
      const novosDias = [...novosMeses[mesAtual].dias];
      novosDias[idx] = { ...novosDias[idx], [campo]: val };
      novosMeses[mesAtual] = { ...novosMeses[mesAtual], dias: novosDias };
      return { ...p, meses: novosMeses };
    });
  };

  // Calculadora juros compostos
  const calcDias = parseInt(dados.calcDias) || 0;
  const calcTaxa = parseFloat(dados.calcTaxa) || 0;
  const calcBanca = parseFloat(dados.calcBanca) || 0;
  const calcResultado = calcBanca * Math.pow(1 + calcTaxa / 100, calcDias);
  const calcLucro = calcResultado - calcBanca;

  // Planejamento anual
  const planejamentoAnual = (() => {
    const rows: { mes: number; bancaInicial: number; lucroMensal: number; margem: number }[] = [];
    let b = banca;
    for (let m = 0; m < 12; m++) {
      const lucro = b * (metaPct / 100);
      rows.push({ mes: m + 1, bancaInicial: b, lucroMensal: lucro, margem: metaPct });
      b += lucro;
    }
    return rows;
  })();
  const lucroFinalAnual = planejamentoAnual.reduce((s, r) => s + r.lucroMensal, 0);

  const limparTudo = () => {
    setDados({
      valorBanca: '1000',
      metaPct: '10',
      meses: Array.from({ length: 12 }, () => criarMesVazio()),
      calcDias: '30',
      calcTaxa: '10',
      calcBanca: '1000',
    });
    setMesAtual(0);
  };

  const cell = cn('px-2 py-1.5 text-xs border', isDark ? 'border-slate-700' : 'border-gray-300');
  const headerBg = isDark ? 'bg-slate-800' : 'bg-gray-900 text-white';
  const cardBg = cn('rounded-xl border overflow-hidden', isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-950');

  return (
    <div className="space-y-6">
      <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Voltar ao Menu
      </button>

      {/* ── TÍTULO + RESUMO ── */}
      <div className={cardBg}>
        <div className="px-6 py-4 text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">PROJETO MILIONÁRIO</h2>
          <p className="text-xs text-slate-400 mt-1">Juros Compostos — Controle Mensal de Banca</p>
        </div>

        {/* Config */}
        <div className="px-6 pb-4 flex flex-wrap gap-4 justify-center">
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-600 bg-gray-800')}>
            <span className="text-[10px] font-bold text-yellow-400 uppercase">BANCA INICIAL</span>
            <input
              type="text"
              value={dados.valorBanca}
              onChange={e => setDados(p => ({ ...p, valorBanca: e.target.value }))}
              className="w-24 bg-transparent text-white text-sm font-bold text-right outline-none"
            />
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-600 bg-gray-800')}>
            <span className="text-[10px] font-bold text-green-400 uppercase">META MENSAL</span>
            <input
              type="text"
              value={dados.metaPct}
              onChange={e => setDados(p => ({ ...p, metaPct: e.target.value }))}
              className="w-16 bg-transparent text-white text-sm font-bold text-right outline-none"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        </div>

        {/* Painel resumo */}
        <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Banca Inicial', value: `R$ ${bancaInicioMes.toFixed(2)}`, color: 'text-white' },
            { label: 'Valor Alcançado', value: `R$ ${valorAlcancadoTotal.toFixed(2)}`, color: valorAlcancadoTotal >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Retiradas', value: `R$ ${totalRetiradas.toFixed(2)}`, color: 'text-orange-400' },
            { label: 'Banca Atual', value: `R$ ${bancaFinalMes.toFixed(2)}`, color: 'text-white' },
            { label: 'Lucro do Mês', value: `R$ ${lucroMes.toFixed(2)}`, color: lucroMes >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Valor/Operação', value: `R$ ${valorPorOp.toFixed(2)}`, color: 'text-cyan-400' },
          ].map(item => (
            <div key={item.label} className={cn('rounded-lg p-3 text-center', isDark ? 'bg-slate-800' : 'bg-gray-800')}>
              <p className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</p>
              <p className={cn('text-sm font-black mt-1', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── NAVEGAÇÃO DE MÊS ── */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMesAtual(p => Math.max(0, p - 1))}
          disabled={mesAtual === 0}
          className="p-2 rounded-lg bg-slate-800 text-white disabled:opacity-30 hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              onClick={() => setMesAtual(i)}
              className={cn(
                'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                mesAtual === i
                  ? 'bg-apex-trader-primary text-black'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {i + 1}°
            </button>
          ))}
        </div>
        <button
          onClick={() => setMesAtual(p => Math.min(11, p + 1))}
          disabled={mesAtual === 11}
          className="p-2 rounded-lg bg-slate-800 text-white disabled:opacity-30 hover:bg-slate-700 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── TABELA 31 DIAS ── */}
      <div className={cardBg}>
        <div className={cn('px-6 py-3 text-center', headerBg)}>
          <h2 className="text-lg font-black text-white tracking-tight">{mesAtual + 1}° MÊS — CONTROLE DIÁRIO</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {['DIA', 'BANCA', 'META(%)', 'META(R$)', 'ALCANÇADO', '%', 'WIN', 'LOSS', 'BANCA FINAL', 'RETIRADA'].map(h => (
                  <th key={h} className={cn(cell, headerBg, 'font-bold text-center text-white text-[10px]')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosDia.map((d, i) => {
                const bancaAnterior = i === 0 ? bancaInicioMes : dadosDia[i - 1].bancaFinal;
                const metaDiaReais = bancaAnterior * (metaPct / 100 / 20);
                return (
                  <tr key={d.dia} className={isDark ? 'bg-slate-900' : 'bg-gray-950'}>
                    <td className={cn(cell, 'text-center font-bold text-white w-10')}>{d.dia}</td>
                    <td className={cn(cell, 'text-center text-white text-[11px]')}>{bancaAnterior.toFixed(0)}</td>
                    <td className={cn(cell, 'text-center text-yellow-400 text-[11px]')}>{(metaPct / 20).toFixed(2)}</td>
                    <td className={cn(cell, 'text-center text-yellow-400 text-[11px]')}>{metaDiaReais.toFixed(2)}</td>
                    <td className={cn(cell, 'text-center w-20')}>
                      <input
                        type="text"
                        value={d.valorAlcancado}
                        onChange={e => updateDia(i, 'valorAlcancado', e.target.value)}
                        className={cn('w-full bg-transparent text-center text-[11px] font-bold outline-none', (parseFloat(d.valorAlcancado) || 0) >= 0 ? 'text-green-400' : 'text-red-400')}
                        placeholder="0"
                      />
                    </td>
                    <td className={cn(cell, 'text-center text-[11px] font-bold', d.pctAlcancado >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {d.pctAlcancado.toFixed(1)}
                    </td>
                    <td className={cn(cell, 'text-center w-12')}>
                      <input
                        type="text"
                        value={d.win}
                        onChange={e => updateDia(i, 'win', e.target.value)}
                        className="w-full bg-transparent text-center text-[11px] font-bold text-green-400 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className={cn(cell, 'text-center w-12')}>
                      <input
                        type="text"
                        value={d.loss}
                        onChange={e => updateDia(i, 'loss', e.target.value)}
                        className="w-full bg-transparent text-center text-[11px] font-bold text-red-400 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className={cn(cell, 'text-center font-bold text-white text-[11px]')}>{d.bancaFinal.toFixed(0)}</td>
                    <td className={cn(cell, 'text-center w-16')}>
                      <input
                        type="text"
                        value={d.retirada}
                        onChange={e => updateDia(i, 'retirada', e.target.value)}
                        className="w-full bg-transparent text-center text-[11px] font-bold text-orange-400 outline-none"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* WINS/LOSS TOTAIS */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">TOTAL WINS</p>
              <p className="text-2xl font-black text-green-400">{totalWins}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">TOTAL LOSS</p>
              <p className="text-2xl font-black text-red-400">{totalLoss}</p>
            </div>
          </div>
          <p className="text-xs font-black text-yellow-400 uppercase tracking-wider">RESPEITE O GERENCIAMENTO</p>
        </div>
      </div>

      {/* ── CALCULADORA + PLANEJAMENTO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculadora Juros Compostos */}
        <div className={cardBg}>
          <div className={cn('px-6 py-3 text-center', headerBg)}>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Calculadora Juros Compostos</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'DIAS', value: dados.calcDias, key: 'calcDias' as const },
                { label: 'TAXA (%)', value: dados.calcTaxa, key: 'calcTaxa' as const },
                { label: 'BANCA INICIAL', value: dados.calcBanca, key: 'calcBanca' as const },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</label>
                  <input
                    type="text"
                    value={item.value}
                    onChange={e => setDados(p => ({ ...p, [item.key]: e.target.value }))}
                    className={cn('w-full px-3 py-2 rounded-lg text-sm font-bold text-center outline-none', isDark ? 'bg-slate-800 text-white border border-slate-600' : 'bg-gray-800 text-white border border-gray-600')}
                  />
                </div>
              ))}
            </div>
            <div className={cn('rounded-lg p-4 text-center', isDark ? 'bg-slate-800' : 'bg-gray-800')}>
              <p className="text-[10px] font-bold text-slate-400 uppercase">RESULTADO APÓS {calcDias} DIAS</p>
              <p className="text-xl font-black text-white mt-1">R$ {calcResultado.toFixed(2)}</p>
              <p className={cn('text-sm font-bold mt-1', calcLucro >= 0 ? 'text-green-400' : 'text-red-400')}>
                Lucro: R$ {calcLucro.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Planejamento Anual */}
        <div className={cardBg}>
          <div className={cn('px-6 py-3 text-center', headerBg)}>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Planejamento Anual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(cell, headerBg, 'font-bold text-center text-white text-[10px]')}>MÊS</th>
                  <th className={cn(cell, headerBg, 'font-bold text-center text-white text-[10px]')}>BANCA INICIAL</th>
                  <th className={cn(cell, headerBg, 'font-bold text-center text-white text-[10px]')}>LUCRO MENSAL</th>
                  <th className={cn(cell, headerBg, 'font-bold text-center text-white text-[10px]')}>MARGEM</th>
                </tr>
              </thead>
              <tbody>
                {planejamentoAnual.map(r => (
                  <tr key={r.mes} className={cn(mesAtual === r.mes - 1 ? (isDark ? 'bg-slate-800' : 'bg-gray-800') : (isDark ? 'bg-slate-900' : 'bg-gray-950'))}>
                    <td className={cn(cell, 'text-center font-bold text-white')}>{r.mes}°</td>
                    <td className={cn(cell, 'text-center text-white text-[11px]')}>R$ {r.bancaInicial.toFixed(2)}</td>
                    <td className={cn(cell, 'text-center text-green-400 font-bold text-[11px]')}>R$ {r.lucroMensal.toFixed(2)}</td>
                    <td className={cn(cell, 'text-center text-yellow-400 text-[11px]')}>{r.margem.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">LUCRO FINAL PROJETADO</p>
              <p className="text-xl font-black text-green-400">R$ {lucroFinalAnual.toFixed(2)}</p>
            </div>
            <button
              onClick={limparTudo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
            >
              <Trash2 size={14} /> Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
