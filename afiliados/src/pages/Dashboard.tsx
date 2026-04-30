import { useState } from 'react';
import { TrendingUp, Clock, ClipboardList, Users, UserCheck, DollarSign, Activity, Wallet } from 'lucide-react';
import { useConfigContext } from '../App';
import EditDrawer, { EditInput, SectionTitle } from '../components/EditDrawer';
import type { Config, LeadItem } from '../defaultConfig';

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Dashboard() {
  const { config, updateConfig } = useConfigContext();
  const d = config.dashboard;
  const [tab, setTab] = useState<'leads' | 'comissoes'>('leads');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Local edit state
  const [local, setLocal] = useState(() => ({ ...d }));
  const [localUsuario, setLocalUsuario] = useState(() => ({ ...config.usuario }));
  const [localLeads, setLocalLeads] = useState<LeadItem[]>(() => [...config.leads]);

  function openDrawer() {
    setLocal({ ...d });
    setLocalUsuario({ ...config.usuario });
    setLocalLeads([...config.leads]);
    setDrawerOpen(true);
  }

  function handleSave() {
    updateConfig((prev: Config) => ({
      ...prev,
      usuario: { ...localUsuario },
      dashboard: { ...local },
      leads: localLeads,
    }));
  }

  function setLeadField(idx: number, field: keyof LeadItem, value: string | number) {
    setLocalLeads(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function addLead() {
    setLocalLeads(prev => [...prev, { id: Date.now().toString(), nome: '', email: '', depositos: 0, saldo: 0, trades: 0, volume: 0, comissao: 0 }]);
  }

  function removeLead(idx: number) {
    setLocalLeads(prev => prev.filter((_, i) => i !== idx));
  }

  const totalTrades = config.leads.reduce((s, l) => s + l.trades, 0);
  const totalVolume = config.leads.reduce((s, l) => s + l.volume, 0);

  return (
    <div className="p-7" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-white text-xl font-semibold">Olá, {config.usuario.nome}!</h1>
        <p className="text-gray-400 text-sm mt-0.5">Bem-vindo ao seu painel de afiliados</p>
      </div>

      {/* 3 main cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Disponível para Saque */}
        <div className="rounded-xl p-5 flex justify-between items-start" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div>
            <p className="text-gray-400 text-xs mb-2">Disponível para Saque</p>
            <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>{fmt(d.disponivel_saque)}</p>
            <p className="text-gray-500 text-xs mt-1">Após {d.dias_retencao} dias de retenção</p>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
            <TrendingUp size={18} color="#22c55e" />
          </div>
        </div>

        {/* Saldo Pendente */}
        <div className="rounded-xl p-5 flex justify-between items-start" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div>
            <p className="text-gray-400 text-xs mb-2">Saldo Pendente</p>
            <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{fmt(d.saldo_pendente)}</p>
            <p className="text-gray-500 text-xs mt-1">Próxima liberação: {d.proxima_liberacao}</p>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Clock size={18} color="#f59e0b" />
          </div>
        </div>

        {/* Total já Sacado */}
        <div className="rounded-xl p-5 flex justify-between items-start" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div>
            <p className="text-gray-400 text-xs mb-2">Total já Sacado</p>
            <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>{fmt(d.total_sacado)}</p>
            <p className="text-gray-500 text-xs mt-1">Histórico de saques</p>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(168,85,247,0.15)' }}>
            <ClipboardList size={18} color="#a855f7" />
          </div>
        </div>
      </div>

      {/* 5 mini cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { icon: Users, label: 'Indicações', value: d.indicacoes.toString() },
          { icon: UserCheck, label: 'FTDs', value: d.ftds.toString() },
          { icon: DollarSign, label: 'Total Depositado', value: fmt(d.total_depositado) },
          { icon: Activity, label: 'Total Trades', value: d.total_trades.toString() },
          { icon: Wallet, label: 'Saldo Total dos Leads', value: fmt(d.saldo_total_leads) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={13} color="#9ca3af" />
              <span className="text-gray-400 text-xs">{label}</span>
            </div>
            <p className="text-white text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Leads/Comissões table section */}
      <div className="rounded-xl mb-6" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#162030' }}>
          <button
            onClick={() => setTab('leads')}
            className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === 'leads' ? 'text-green-400 border-green-400' : 'text-gray-400 border-transparent hover:text-white'}`}
          >
            Leads
          </button>
          <button
            onClick={() => setTab('comissoes')}
            className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === 'comissoes' ? 'text-green-400 border-green-400' : 'text-gray-400 border-transparent hover:text-white'}`}
          >
            Comissões
          </button>
        </div>

        {/* Period filter */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#162030' }}>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>PERÍODO:</span>
            <span>De</span>
            <input type="date" defaultValue="2025-11-01" className="text-gray-300 text-sm rounded px-2 py-1" style={{ backgroundColor: '#162030', border: '1px solid #22303f' }} />
            <span>Até</span>
            <input type="date" defaultValue="2025-11-21" className="text-gray-300 text-sm rounded px-2 py-1" style={{ backgroundColor: '#162030', border: '1px solid #22303f' }} />
          </div>
          <div className="text-gray-400 text-xs">
            {d.ftds} leads &nbsp;·&nbsp; {totalTrades} trades &nbsp;·&nbsp; Volume: {fmt(totalVolume)} &nbsp;·&nbsp; Comissão: <span style={{ color: '#4ade80' }}>+{fmt(d.total_sacado)}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #162030' }}>
                {['USUÁRIO', 'DEPÓSITOS', 'SALDO', 'TRADES', 'VOLUME', 'COMISSÃO'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #162339' }}>
                  <td className="px-5 py-3.5">
                    <p className="text-white text-sm font-medium">{lead.nome}</p>
                    <p className="text-gray-500 text-xs">{lead.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: '#4ade80' }}>{fmt(lead.depositos)}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: lead.saldo > 0 ? '#4ade80' : '#9ca3af' }}>{fmt(lead.saldo)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-300">{lead.trades}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-300">{fmt(lead.volume)}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: '#4ade80' }}>+{fmt(lead.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Taxas de Comissão */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
        <h3 className="text-white text-sm font-semibold mb-4">Suas Taxas de Comissão</h3>
        <div className="flex gap-12">
          <div>
            <p className="text-gray-400 text-xs mb-1">Comissão Afiliado</p>
            <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>{d.comissao_afiliado}%</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>{d.tipo_comissao}</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Comissão Sub-Afiliado</p>
            <p className="text-2xl font-bold" style={{ color: '#60a5fa' }}>{d.comissao_sub_afiliado}%</p>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-4">
          Requisito: {d.requisito_ftds} FTDs para saque &nbsp;|&nbsp; Liberação: {d.liberacao_dia}
        </p>
      </div>

      <EditDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar Dashboard" onSave={handleSave}>
        <SectionTitle>Usuário</SectionTitle>
        <EditInput label="Nome" value={localUsuario.nome} onChange={e => setLocalUsuario(p => ({ ...p, nome: e.target.value }))} />
        <EditInput label="Email" value={localUsuario.email} onChange={e => setLocalUsuario(p => ({ ...p, email: e.target.value }))} />

        <SectionTitle>Métricas Principais</SectionTitle>
        <EditInput label="Disponível para Saque (R$)" type="number" step="0.01" value={local.disponivel_saque} onChange={e => setLocal(p => ({ ...p, disponivel_saque: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Dias de Retenção" type="number" value={local.dias_retencao} onChange={e => setLocal(p => ({ ...p, dias_retencao: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Saldo Pendente (R$)" type="number" step="0.01" value={local.saldo_pendente} onChange={e => setLocal(p => ({ ...p, saldo_pendente: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Próxima Liberação" value={local.proxima_liberacao} onChange={e => setLocal(p => ({ ...p, proxima_liberacao: e.target.value }))} />
        <EditInput label="Total já Sacado (R$)" type="number" step="0.01" value={local.total_sacado} onChange={e => setLocal(p => ({ ...p, total_sacado: parseFloat(e.target.value) || 0 }))} />

        <SectionTitle>Mini Estatísticas</SectionTitle>
        <EditInput label="Indicações" type="number" value={local.indicacoes} onChange={e => setLocal(p => ({ ...p, indicacoes: parseInt(e.target.value) || 0 }))} />
        <EditInput label="FTDs" type="number" value={local.ftds} onChange={e => setLocal(p => ({ ...p, ftds: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Total Depositado (R$)" type="number" step="0.01" value={local.total_depositado} onChange={e => setLocal(p => ({ ...p, total_depositado: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Total Trades" type="number" value={local.total_trades} onChange={e => setLocal(p => ({ ...p, total_trades: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Saldo Total dos Leads (R$)" type="number" step="0.01" value={local.saldo_total_leads} onChange={e => setLocal(p => ({ ...p, saldo_total_leads: parseFloat(e.target.value) || 0 }))} />

        <SectionTitle>Taxas de Comissão</SectionTitle>
        <EditInput label="Comissão Afiliado (%)" type="number" value={local.comissao_afiliado} onChange={e => setLocal(p => ({ ...p, comissao_afiliado: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Tipo de Comissão" value={local.tipo_comissao} onChange={e => setLocal(p => ({ ...p, tipo_comissao: e.target.value }))} />
        <EditInput label="Comissão Sub-Afiliado (%)" type="number" value={local.comissao_sub_afiliado} onChange={e => setLocal(p => ({ ...p, comissao_sub_afiliado: parseFloat(e.target.value) || 0 }))} />
        <EditInput label="Requisito FTDs" type="number" value={local.requisito_ftds} onChange={e => setLocal(p => ({ ...p, requisito_ftds: parseInt(e.target.value) || 0 }))} />
        <EditInput label="Dia de Liberação" value={local.liberacao_dia} onChange={e => setLocal(p => ({ ...p, liberacao_dia: e.target.value }))} />

        <SectionTitle>Leads</SectionTitle>
        {localLeads.map((lead, idx) => (
          <div key={lead.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#090e16', border: '1px solid #253346' }}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Lead #{idx + 1}</span>
              <button onClick={() => removeLead(idx)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
            </div>
            <EditInput label="Nome" value={lead.nome} onChange={e => setLeadField(idx, 'nome', e.target.value)} />
            <EditInput label="Email" value={lead.email} onChange={e => setLeadField(idx, 'email', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <EditInput label="Depósitos (R$)" type="number" step="0.01" value={lead.depositos} onChange={e => setLeadField(idx, 'depositos', parseFloat(e.target.value) || 0)} />
              <EditInput label="Saldo (R$)" type="number" step="0.01" value={lead.saldo} onChange={e => setLeadField(idx, 'saldo', parseFloat(e.target.value) || 0)} />
              <EditInput label="Trades" type="number" value={lead.trades} onChange={e => setLeadField(idx, 'trades', parseInt(e.target.value) || 0)} />
              <EditInput label="Volume (R$)" type="number" step="0.01" value={lead.volume} onChange={e => setLeadField(idx, 'volume', parseFloat(e.target.value) || 0)} />
              <EditInput label="Comissão (R$)" type="number" step="0.01" value={lead.comissao} onChange={e => setLeadField(idx, 'comissao', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        ))}
        <button onClick={addLead} className="w-full py-2 rounded-lg text-sm text-green-400 border transition-colors hover:bg-green-500/10" style={{ border: '1px dashed #22c55e' }}>
          + Adicionar Lead
        </button>
      </EditDrawer>
    </div>
  );
}
