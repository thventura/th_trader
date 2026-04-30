import { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useConfigContext } from '../App';
import EditDrawer, { EditInput, SectionTitle } from '../components/EditDrawer';
import type { Config, ConviteItem } from '../defaultConfig';

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Cadastrado: { bg: 'rgba(96,165,250,0.2)', text: '#60a5fa' },
    Pendente: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
    Depositou: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
    Completo: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  };
  const c = colors[status] || { bg: '#162030', text: '#9ca3af' };
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1" style={{ backgroundColor: c.bg, color: c.text }}>
      ✦ {status}
    </span>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all hover:scale-105"
      style={{ backgroundColor: '#22c55e' }}
    >
      ⚙ Editar Dados
    </button>
  );
}

export default function Convites() {
  const { config, updateConfig } = useConfigContext();
  const c = config.convites;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localConvites, setLocalConvites] = useState(() => ({ ...c }));
  const [localLista, setLocalLista] = useState<ConviteItem[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos os status');

  function openDrawer() {
    setLocalConvites({ ...c });
    setLocalLista(c.lista.map(i => ({ ...i })));
    setDrawerOpen(true);
  }

  function handleSave() {
    updateConfig((prev: Config) => ({
      ...prev,
      convites: { ...localConvites, lista: localLista }
    }));
  }

  function setField(idx: number, field: keyof ConviteItem, value: string | number) {
    setLocalLista(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setLocalLista(prev => [...prev, {
      id: Date.now().toString(), convidador_nome: '', convidador_email: '', convidado_email: '', convidado_nome: '',
      status: 'Cadastrado', volume: 0, meta_volume: 1000, recompensa: 50, codigo: '', enviado: ''
    }]);
  }

  function removeItem(idx: number) {
    setLocalLista(prev => prev.filter((_, i) => i !== idx));
  }

  const miniStats = [
    { label: 'TOTAL ENVIADOS', value: c.total, icon: '✉' },
    { label: 'PENDENTES', value: c.pendentes, icon: '⏰' },
    { label: 'CADASTRADOS', value: c.cadastrados, icon: '👤' },
    { label: 'DEPOSITARAM', value: c.depositaram, icon: '💰' },
    { label: 'COMPLETOS', value: c.completos, icon: '✅' },
    { label: 'RECOMPENSAS PAGAS', value: c.recompensas === 0 ? 'R$ 0,00' : fmt(c.recompensas), icon: '🎁' },
  ];

  const filtered = c.lista.filter(item => {
    const matchBusca = !busca || item.convidado_email.toLowerCase().includes(busca.toLowerCase()) || item.codigo.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'Todos os status' || item.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-white text-xl font-semibold">Convites</h1>
          <p className="text-gray-400 text-sm mt-0.5">Convites enviados pelos seus leads</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
          style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {miniStats.map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
            <p className="text-gray-500 text-xs mb-2">{label}</p>
            <p className="text-white text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por email ou código..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
            style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}
          />
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
          Buscar
        </button>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-gray-300 outline-none"
          style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}
        >
          {['Todos os status', 'Cadastrado', 'Pendente', 'Depositou', 'Completo'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #162030' }}>
              {['CONVIDADOR', 'CONVIDADO', 'STATUS', 'VOLUME', 'RECOMPENSA', 'CÓDIGO', 'ENVIADO'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #162339' }}>
                <td className="px-4 py-3.5">
                  <p className="text-white text-sm font-medium">{item.convidador_nome}</p>
                  <p className="text-gray-500 text-xs">{item.convidador_email}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-white text-sm">{item.convidado_email}</p>
                  <p className="text-gray-500 text-xs">{item.convidado_nome}</p>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-400">
                  {fmt(item.volume)}<br />
                  <span className="text-gray-600 text-xs">/ {fmt(item.meta_volume)}</span>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: '#4ade80' }}>{fmt(item.recompensa)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-300 font-mono">{item.codigo}</td>
                <td className="px-4 py-3.5 text-sm text-gray-400">{item.enviado}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum convite encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditBtn onClick={openDrawer} />

      <EditDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar Convites" onSave={handleSave}>
        <SectionTitle>Contadores</SectionTitle>
        <EditInput label="Total Enviados" type="number" value={localConvites.total} onChange={e => setLocalConvites(p => ({ ...p, total: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Pendentes" type="number" value={localConvites.pendentes} onChange={e => setLocalConvites(p => ({ ...p, pendentes: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Cadastrados" type="number" value={localConvites.cadastrados} onChange={e => setLocalConvites(p => ({ ...p, cadastrados: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Depositaram" type="number" value={localConvites.depositaram} onChange={e => setLocalConvites(p => ({ ...p, depositaram: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Completos" type="number" value={localConvites.completos} onChange={e => setLocalConvites(p => ({ ...p, completos: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Recompensas Pagas (R$)" type="number" step="0.01" value={localConvites.recompensas} onChange={e => setLocalConvites(p => ({ ...p, recompensas: parseFloat(e.target.value) || 0 }))} />

        <SectionTitle>Lista de Convites</SectionTitle>
        {localLista.map((item, idx) => (
          <div key={item.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#090e16', border: '1px solid #253346' }}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">#{idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
            </div>
            <EditInput label="Convidador Nome" value={item.convidador_nome} onChange={e => setField(idx, 'convidador_nome', e.target.value)} />
            <EditInput label="Convidador Email" value={item.convidador_email} onChange={e => setField(idx, 'convidador_email', e.target.value)} />
            <EditInput label="Convidado Email" value={item.convidado_email} onChange={e => setField(idx, 'convidado_email', e.target.value)} />
            <EditInput label="Convidado Nome" value={item.convidado_nome} onChange={e => setField(idx, 'convidado_nome', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <EditInput label="Volume (R$)" type="number" step="0.01" value={item.volume} onChange={e => setField(idx, 'volume', parseFloat(e.target.value) || 0)} />
              <EditInput label="Meta Volume (R$)" type="number" step="0.01" value={item.meta_volume} onChange={e => setField(idx, 'meta_volume', parseFloat(e.target.value) || 0)} />
              <EditInput label="Recompensa (R$)" type="number" step="0.01" value={item.recompensa} onChange={e => setField(idx, 'recompensa', parseFloat(e.target.value) || 0)} />
              <EditInput label="Código" value={item.codigo} onChange={e => setField(idx, 'codigo', e.target.value)} />
            </div>
            <EditInput label="Enviado em" value={item.enviado} onChange={e => setField(idx, 'enviado', e.target.value)} />
            <div>
              <label className="block text-gray-400 text-xs mb-1.5 font-medium">Status</label>
              <select
                value={item.status}
                onChange={e => setField(idx, 'status', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#162030', border: '1px solid #22303f' }}
              >
                {['Cadastrado', 'Pendente', 'Depositou', 'Completo'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="w-full py-2 rounded-lg text-sm text-green-400 border transition-colors hover:bg-green-500/10" style={{ border: '1px dashed #22c55e' }}>
          + Adicionar Convite
        </button>
      </EditDrawer>
    </div>
  );
}
