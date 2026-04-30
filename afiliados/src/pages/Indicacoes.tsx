import { useState } from 'react';
import { Download, Users, UserCheck, CheckCircle, XCircle, Search } from 'lucide-react';
import { useConfigContext } from '../App';
import EditDrawer, { EditInput, SectionTitle } from '../components/EditDrawer';
import type { Config, IndicacaoItem } from '../defaultConfig';

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Indicacoes() {
  const { config, updateConfig } = useConfigContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localIndicacoes, setLocalIndicacoes] = useState<IndicacaoItem[]>([]);
  const [busca, setBusca] = useState('');

  const totalIndicacoes = config.indicacoes.length;
  const comFtd = config.indicacoes.filter(i => i.ftd).length;

  const filtered = config.indicacoes.filter(i =>
    !busca || i.nome.toLowerCase().includes(busca.toLowerCase()) || i.email.toLowerCase().includes(busca.toLowerCase())
  );

  function openDrawer() {
    setLocalIndicacoes(config.indicacoes.map(i => ({ ...i })));
    setDrawerOpen(true);
  }

  function handleSave() {
    updateConfig((prev: Config) => ({ ...prev, indicacoes: localIndicacoes }));
  }

  function setField(idx: number, field: keyof IndicacaoItem, value: string | number | boolean) {
    setLocalIndicacoes(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setLocalIndicacoes(prev => [...prev, { id: Date.now().toString(), nome: '', email: '', tipo: 'Lead', data_registro: '', ftd: false, saldo: 0, depositos: 0, trades: 0, comissao: 0 }]);
  }

  function removeItem(idx: number) {
    setLocalIndicacoes(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-white text-xl font-semibold">Indicações</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gerencie suas indicações e acompanhe seu desempenho</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#22c55e' }}
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} color="#9ca3af" />
            <span className="text-gray-400 text-xs">Total de Indicações</span>
          </div>
          <p className="text-white text-2xl font-bold">{totalIndicacoes}</p>
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={15} color="#22c55e" />
            <span className="text-gray-400 text-xs">Com FTD</span>
          </div>
          <p className="font-bold text-2xl" style={{ color: '#4ade80' }}>{comFtd}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
            style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}
          />
        </div>
        <select className="px-3 py-2 rounded-lg text-sm text-gray-300 outline-none" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <option>FTD: Todos</option>
          <option>Com FTD</option>
          <option>Sem FTD</option>
        </select>
        <select className="px-3 py-2 rounded-lg text-sm text-gray-300 outline-none" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <option>Tipo: Todos</option>
          <option>Lead</option>
        </select>
        <input type="date" className="px-3 py-2 rounded-lg text-sm text-gray-300 outline-none" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }} />
        <input type="date" className="px-3 py-2 rounded-lg text-sm text-gray-300 outline-none" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }} />
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
          Buscar
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #162030' }}>
              {['Usuário', 'Tipo', 'Data Registro', 'FTD', 'Saldo', 'Depósitos', 'Trades', 'Comissão'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #162339' }}>
                <td className="px-5 py-3.5">
                  <p className="text-white text-sm font-medium">{item.nome}</p>
                  <p className="text-gray-500 text-xs">{item.email}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#162030', color: '#9ca3af' }}>
                    {item.tipo}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <span>🗓</span>
                    {item.data_registro}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {item.ftd
                    ? <CheckCircle size={16} color="#22c55e" />
                    : <XCircle size={16} color="#6b7280" />}
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: item.saldo > 0 ? '#4ade80' : '#9ca3af' }}>
                  {fmt(item.saldo)}
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: item.depositos > 0 ? '#4ade80' : '#9ca3af' }}>
                  $ {fmt(item.depositos)}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-300">{item.trades}</td>
                <td className="px-5 py-3.5 text-sm" style={{ color: item.comissao > 0 ? '#4ade80' : '#9ca3af' }}>
                  {fmt(item.comissao)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar Indicações" onSave={handleSave}>
        <SectionTitle>Lista de Indicações</SectionTitle>
        {localIndicacoes.map((item, idx) => (
          <div key={item.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#090e16', border: '1px solid #253346' }}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">#{idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
            </div>
            <EditInput label="Nome" value={item.nome} onChange={e => setField(idx, 'nome', e.target.value)} />
            <EditInput label="Email" value={item.email} onChange={e => setField(idx, 'email', e.target.value)} />
            <EditInput label="Data Registro" value={item.data_registro} onChange={e => setField(idx, 'data_registro', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <EditInput label="Saldo (R$)" type="number" step="0.01" value={item.saldo} onChange={e => setField(idx, 'saldo', parseFloat(e.target.value) || 0)} />
              <EditInput label="Depósitos (R$)" type="number" step="0.01" value={item.depositos} onChange={e => setField(idx, 'depositos', parseFloat(e.target.value) || 0)} />
              <EditInput label="Trades" type="number" value={item.trades} onChange={e => setField(idx, 'trades', parseInt(e.target.value) || 0)} />
              <EditInput label="Comissão (R$)" type="number" step="0.01" value={item.comissao} onChange={e => setField(idx, 'comissao', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`ftd-${idx}`} checked={item.ftd} onChange={e => setField(idx, 'ftd', e.target.checked)} className="accent-green-500" />
              <label htmlFor={`ftd-${idx}`} className="text-gray-300 text-xs">Com FTD</label>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="w-full py-2 rounded-lg text-sm text-green-400 border transition-colors hover:bg-green-500/10" style={{ border: '1px dashed #22c55e' }}>
          + Adicionar Indicação
        </button>
      </EditDrawer>
    </div>
  );
}
