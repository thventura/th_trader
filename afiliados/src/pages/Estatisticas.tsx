import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useConfigContext } from '../App';
import EditDrawer, { EditInput, SectionTitle } from '../components/EditDrawer';
import type { Config, GraficoPoint, DetalhamentoItem } from '../defaultConfig';

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Estatisticas() {
  const { config, updateConfig } = useConfigContext();
  const e = config.estatisticas;
  const [periodo, setPeriodo] = useState<7 | 30 | 90>(30);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localStats, setLocalStats] = useState(() => ({ registros: e.registros, ftds: e.ftds, depositos: e.depositos, trades: e.trades, comissao_total: e.comissao_total }));
  const [localGrafico, setLocalGrafico] = useState<GraficoPoint[]>([]);
  const [localDet, setLocalDet] = useState<DetalhamentoItem[]>([]);

  const graficoData = e.grafico.slice(-periodo);

  const maxVal = useMemo(() => Math.max(...graficoData.map(d => d.valor), 0), [graficoData]);
  const minVal = useMemo(() => Math.min(...graficoData.map(d => d.valor), 0), [graficoData]);
  const gradientOffset = useMemo(() => {
    if (maxVal <= 0) return 0;
    if (minVal >= 0) return 1;
    return maxVal / (maxVal - minVal);
  }, [maxVal, minVal]);

  function openDrawer() {
    setLocalStats({ registros: e.registros, ftds: e.ftds, depositos: e.depositos, trades: e.trades, comissao_total: e.comissao_total });
    setLocalGrafico(e.grafico.map(g => ({ ...g })));
    setLocalDet(e.detalhamento.map(d => ({ ...d })));
    setDrawerOpen(true);
  }

  function handleSave() {
    updateConfig((prev: Config) => ({
      ...prev,
      estatisticas: { ...localStats, grafico: localGrafico, detalhamento: localDet }
    }));
  }

  function setGraficoField(idx: number, field: keyof GraficoPoint, value: string | number) {
    setLocalGrafico(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  function setDetField(idx: number, field: keyof DetalhamentoItem, value: string | number) {
    setLocalDet(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-white text-xl font-semibold">Estatísticas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Análise detalhada do seu desempenho como afiliado</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {([7, 30, 90] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: periodo === p ? '#22c55e' : '#0c1018',
              color: periodo === p ? 'white' : '#9ca3af',
              border: '1px solid',
              borderColor: periodo === p ? '#22c55e' : '#162030',
            }}
          >
            {p} dias
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Registros', value: e.registros.toString(), icon: '👤' },
          { label: 'FTDs', value: e.ftds.toString(), icon: '💰' },
          { label: 'Depósitos', value: fmt(e.depositos), icon: '📈' },
          { label: 'Trades', value: e.trades.toString(), icon: '📊' },
          { label: 'Comissão Total', value: fmt(e.comissao_total), icon: '💵', green: true },
        ].map(({ label, value, green }) => (
          <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
            <p className="text-gray-400 text-xs mb-2">{label}</p>
            <p className="text-lg font-bold" style={{ color: green ? '#4ade80' : '#f9fafb' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-gray-400 text-sm">📊</span>
          <h3 className="text-white text-sm font-semibold">Comissões por Dia</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={graficoData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset={gradientOffset} stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset={gradientOffset} stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#162030" vertical={false} />
            <XAxis dataKey="data" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0c1018', border: '1px solid #162030', borderRadius: '8px', color: '#f9fafb' }}
              formatter={(v) => [fmt(Number(v ?? 0)), 'Comissão']}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="url(#splitColor)"
              fill="url(#splitFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily breakdown */}
      <div className="rounded-xl" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#162030' }}>
          <span className="text-gray-400 text-sm">📅</span>
          <h3 className="text-white text-sm font-semibold">Detalhamento Diário</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #162030' }}>
              {['Data', 'Registros', 'FTDs', 'Qtd Dep.', 'Depósitos', 'Trades', 'Comissão'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {e.detalhamento.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #162339' }}>
                <td className="px-5 py-3.5 text-sm text-white">{row.data}</td>
                <td className="px-5 py-3.5 text-sm text-gray-400">{row.registros}</td>
                <td className="px-5 py-3.5 text-sm" style={{ color: row.ftds > 0 ? '#4ade80' : '#9ca3af' }}>{row.ftds}</td>
                <td className="px-5 py-3.5 text-sm" style={{ color: row.qtd_dep > 0 ? '#4ade80' : '#9ca3af' }}>{row.qtd_dep}</td>
                <td className="px-5 py-3.5 text-sm text-gray-400">{fmt(row.depositos)}</td>
                <td className="px-5 py-3.5 text-sm text-gray-400">{row.trades}</td>
                <td className="px-5 py-3.5 text-sm font-medium" style={{ color: row.comissao >= 0 ? '#4ade80' : '#ef4444' }}>
                  {row.comissao >= 0 ? '+' : ''}{fmt(row.comissao)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar Estatísticas" onSave={handleSave}>
        <SectionTitle>Cards de Resumo</SectionTitle>
        <EditInput label="Registros" type="number" value={localStats.registros} onChange={e => setLocalStats(p => ({ ...p, registros: parseInt(e.target.value) || 0 }))} />
        <EditInput label="FTDs" type="number" value={localStats.ftds} onChange={e => setLocalStats(p => ({ ...p, ftds: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Depósitos (R$)" type="number" step="0.01" value={localStats.depositos} onChange={e => setLocalStats(p => ({ ...p, depositos: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Trades" type="number" value={localStats.trades} onChange={e => setLocalStats(p => ({ ...p, trades: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Comissão Total (R$)" type="number" step="0.01" value={localStats.comissao_total} onChange={e => setLocalStats(p => ({ ...p, comissao_total: parseFloat(e.target.value) || 0 }))} />

        <SectionTitle>Dados do Gráfico</SectionTitle>
        {localGrafico.map((pt, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <EditInput label={`Data ${idx + 1}`} value={pt.data} onChange={e => setGraficoField(idx, 'data', e.target.value)} />
            <EditInput label="Valor (R$)" type="number" step="0.01" value={pt.valor} onChange={e => setGraficoField(idx, 'valor', parseFloat(e.target.value) || 0)} />
          </div>
        ))}

        <SectionTitle>Detalhamento Diário</SectionTitle>
        {localDet.map((row, idx) => (
          <div key={idx} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#090e16', border: '1px solid #253346' }}>
            <EditInput label="Data" value={row.data} onChange={e => setDetField(idx, 'data', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <EditInput label="Trades" type="number" value={row.trades} onChange={e => setDetField(idx, 'trades', parseInt(e.target.value) || 0)} />
              <EditInput label="Comissão (R$)" type="number" step="0.01" value={row.comissao} onChange={e => setDetField(idx, 'comissao', parseFloat(e.target.value) || 0)} />
              <EditInput label="Depósitos (R$)" type="number" step="0.01" value={row.depositos} onChange={e => setDetField(idx, 'depositos', parseFloat(e.target.value) || 0)} />
              <EditInput label="Qtd Dep." type="number" value={row.qtd_dep} onChange={e => setDetField(idx, 'qtd_dep', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        ))}
      </EditDrawer>
    </div>
  );
}
