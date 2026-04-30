import { useState } from 'react';
import { DollarSign, Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useConfigContext } from '../App';
import EditDrawer, { EditInput, SectionTitle } from '../components/EditDrawer';
import type { Config, SaqueItem } from '../defaultConfig';

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatusBadge({ status }: { status: SaqueItem['status'] }) {
  if (status === 'Concluído') return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: '#4ade80' }}>
      <CheckCircle size={14} /> Concluído
    </div>
  );
  if (status === 'Rejeitado') return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: '#f87171' }}>
      <XCircle size={14} /> Rejeitado
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: '#f59e0b' }}>
      <AlertCircle size={14} /> Pendente
    </div>
  );
}

export default function Saques() {
  const { config, updateConfig } = useConfigContext();
  const s = config.saques;
  const [metodo, setMetodo] = useState<'PIX' | 'Crypto'>('PIX');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localSaques, setLocalSaques] = useState(() => ({ ...s }));
  const [localHistorico, setLocalHistorico] = useState<SaqueItem[]>([]);

  function openDrawer() {
    setLocalSaques({ ...s });
    setLocalHistorico(s.historico.map(h => ({ ...h })));
    setDrawerOpen(true);
  }

  function handleSave() {
    updateConfig((prev: Config) => ({
      ...prev,
      saques: { ...localSaques, historico: localHistorico }
    }));
  }

  function setHistField(idx: number, field: keyof SaqueItem, value: string | number) {
    setLocalHistorico(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  }

  function addHist() {
    setLocalHistorico(prev => [...prev, { id: Date.now().toString(), data: '', metodo: 'PIX', status: 'Pendente', valor: 0 }]);
  }

  function removeHist(idx: number) {
    setLocalHistorico(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-white text-xl font-semibold">Saques</h1>
        <p className="text-gray-400 text-sm mt-0.5">Solicite saque das suas comissões</p>
      </div>

      {/* 3 main cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Disponível para Saque */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={15} color="#22c55e" />
            <span className="text-gray-400 text-xs">Disponível para Saque</span>
          </div>
          <p className="text-2xl font-bold mb-3" style={{ color: '#4ade80' }}>{fmt(s.disponivel_lead + s.disponivel_sub)}</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <span>Lead <span className="text-white">{fmt(s.disponivel_lead)}</span></span>
            <span>Sub Afiliado <span style={{ color: '#4ade80' }}>{fmt(s.disponivel_sub)}</span></span>
          </div>
        </div>

        {/* Saldo a Liberar */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} color="#f59e0b" />
            <span className="text-gray-400 text-xs">Saldo a Liberar</span>
          </div>
          <p className="text-2xl font-bold mb-3" style={{ color: '#f59e0b' }}>{fmt(s.saldo_liberar_lead + s.saldo_liberar_sub)}</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <span>Lead <span className="text-white">{fmt(s.saldo_liberar_lead)}</span></span>
            <span>Sub Afiliado <span className="text-white">{fmt(s.saldo_liberar_sub)}</span></span>
          </div>
        </div>

        {/* Próxima Liberação */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} color="#60a5fa" />
            <span className="text-gray-400 text-xs">Próxima Liberação</span>
          </div>
          <p className="text-white text-base font-bold mb-2">{s.proxima_liberacao}</p>
          <p className="text-gray-500 text-xs">
            Requisito: {s.requisito_ftds} FTDs ({s.ftds_atual} atual)
          </p>
        </div>
      </div>

      {/* Método de saque */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <h3 className="text-white text-sm font-semibold mb-4">Escolha o método de saque</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMetodo('PIX')}
            className="flex flex-col items-center justify-center py-8 rounded-xl transition-all"
            style={{
              backgroundColor: metodo === 'PIX' ? 'rgba(34,197,94,0.1)' : '#090e16',
              border: `1px solid ${metodo === 'PIX' ? '#22c55e' : '#253346'}`
            }}
          >
            <DollarSign size={32} color="#22c55e" />
            <p className="text-white text-sm font-semibold mt-2">PIX</p>
            <p className="text-gray-500 text-xs mt-0.5">Transferência instantânea</p>
          </button>
          <button
            onClick={() => setMetodo('Crypto')}
            className="flex flex-col items-center justify-center py-8 rounded-xl transition-all"
            style={{
              backgroundColor: metodo === 'Crypto' ? 'rgba(245,158,11,0.1)' : '#090e16',
              border: `1px solid ${metodo === 'Crypto' ? '#f59e0b' : '#253346'}`
            }}
          >
            <span className="text-3xl" style={{ color: '#f59e0b' }}>₿</span>
            <p className="text-white text-sm font-semibold mt-2">Crypto</p>
            <p className="text-gray-500 text-xs mt-0.5">USDT, USDC, ETH, BNB</p>
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-xl" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#162030' }}>
          <h3 className="text-white text-sm font-semibold">Histórico de Saques</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #162030' }}>
              {['Data', 'Método', 'Status', 'Valor'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.historico.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #162339' }}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <span>🗓</span> {item.data}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                    {item.metodo}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#4ade80' }}>
                  {fmt(item.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar Saques" onSave={handleSave}>
        <SectionTitle>Saldos</SectionTitle>
        <EditInput label="Disponível Lead (R$)" type="number" step="0.01" value={localSaques.disponivel_lead} onChange={e => setLocalSaques(p => ({ ...p, disponivel_lead: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Disponível Sub-Afiliado (R$)" type="number" step="0.01" value={localSaques.disponivel_sub} onChange={e => setLocalSaques(p => ({ ...p, disponivel_sub: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="A Liberar Lead (R$)" type="number" step="0.01" value={localSaques.saldo_liberar_lead} onChange={e => setLocalSaques(p => ({ ...p, saldo_liberar_lead: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="A Liberar Sub-Afiliado (R$)" type="number" step="0.01" value={localSaques.saldo_liberar_sub} onChange={e => setLocalSaques(p => ({ ...p, saldo_liberar_sub: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Próxima Liberação (texto)" value={localSaques.proxima_liberacao} onChange={e => setLocalSaques(p => ({ ...p, proxima_liberacao: e.target.value }))} />
        <EditInput label="Requisito FTDs" type="number" value={localSaques.requisito_ftds} onChange={e => setLocalSaques(p => ({ ...p, requisito_ftds: parseInt(e.target.value) || 0 }))} />
        <EditInput label="FTDs Atual" type="number" value={localSaques.ftds_atual} onChange={e => setLocalSaques(p => ({ ...p, ftds_atual: parseInt(e.target.value) || 0 }))} />

        <SectionTitle>Histórico de Saques</SectionTitle>
        {localHistorico.map((h, idx) => (
          <div key={h.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#090e16', border: '1px solid #253346' }}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">#{idx + 1}</span>
              <button onClick={() => removeHist(idx)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
            </div>
            <EditInput label="Data" value={h.data} onChange={e => setHistField(idx, 'data', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 text-xs mb-1.5 font-medium">Método</label>
                <select
                  value={h.metodo}
                  onChange={e => setHistField(idx, 'metodo', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: '#162030', border: '1px solid #22303f' }}
                >
                  <option>PIX</option>
                  <option>Crypto</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1.5 font-medium">Status</label>
                <select
                  value={h.status}
                  onChange={e => setHistField(idx, 'status', e.target.value as SaqueItem['status'])}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: '#162030', border: '1px solid #22303f' }}
                >
                  <option>Concluído</option>
                  <option>Rejeitado</option>
                  <option>Pendente</option>
                </select>
              </div>
            </div>
            <EditInput label="Valor (R$)" type="number" step="0.01" value={h.valor} onChange={e => setHistField(idx, 'valor', parseFloat(e.target.value) || 0)} />
          </div>
        ))}
        <button onClick={addHist} className="w-full py-2 rounded-lg text-sm text-green-400 border transition-colors hover:bg-green-500/10" style={{ border: '1px dashed #22c55e' }}>
          + Adicionar Saque
        </button>
      </EditDrawer>
    </div>
  );
}
