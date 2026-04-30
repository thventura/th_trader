import { useState } from 'react';
import { Code2, Bell, Save, Copy, AlertCircle } from 'lucide-react';

const gtmEvents = [
  { key: 'affiliate_registration', desc: 'Quando um lead se cadastrar' },
  { key: 'affiliate_ftd', desc: 'Quando um lead fizer o primeiro depósito (FTD)' },
  { key: 'affiliate_deposit', desc: 'Quando um lead fizer um depósito' },
  { key: 'affiliate_withdrawal', desc: 'Quando um lead fizer um saque' },
  { key: 'affiliate_trade', desc: 'Quando um lead realizar uma operação' },
];

export default function Integracoes() {
  const [tab, setTab] = useState<'gtm' | 'pushcut'>('gtm');
  const [gtmId, setGtmId] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopy(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-white text-xl font-semibold">Integrações</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure integrações para rastrear e receber notificações dos seus leads</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('gtm')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === 'gtm' ? '#22c55e' : '#0c1018',
            color: tab === 'gtm' ? 'white' : '#9ca3af',
            border: '1px solid',
            borderColor: tab === 'gtm' ? '#22c55e' : '#162030',
          }}
        >
          <Code2 size={14} />
          Google Tag Manager
        </button>
        <button
          onClick={() => setTab('pushcut')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === 'pushcut' ? '#22c55e' : '#0c1018',
            color: tab === 'pushcut' ? 'white' : '#9ca3af',
            border: '1px solid',
            borderColor: tab === 'pushcut' ? '#22c55e' : '#162030',
          }}
        >
          <Bell size={14} />
          PushCut
        </button>
      </div>

      {tab === 'gtm' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-1">
            <Code2 size={18} color="#6b7280" />
            <h2 className="text-white text-base font-semibold">Google Tag Manager</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">Integre o Google Tag Manager para rastrear eventos dos seus indicados</p>

          {/* Status */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg mb-5"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <AlertCircle size={15} color="#f59e0b" />
            <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
              {gtmId ? 'Configurado' : 'Não configurado'}
            </span>
          </div>

          {/* Input */}
          <div className="mb-5">
            <label className="block text-gray-400 text-xs mb-2 font-medium">ID do Container GTM</label>
            <input
              value={gtmId}
              onChange={e => setGtmId(e.target.value)}
              placeholder="GTM-XXXXXXX"
              className="w-64 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-green-500"
              style={{ backgroundColor: '#162030', border: '1px solid #22303f' }}
            />
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#22c55e' }}
          >
            <Save size={14} />
            {saved ? 'Salvo!' : 'Salvar'}
          </button>

          {/* Events */}
          <div className="mt-7">
            <h3 className="text-white text-sm font-semibold mb-4">Eventos Disponíveis</h3>
            <p className="text-gray-500 text-xs mb-4">
              Quando seus indicados realizarem as ações abaixo, eventos serão disparados no Data Layer do GTM:
            </p>
            <div className="space-y-2">
              {gtmEvents.map(ev => (
                <div
                  key={ev.key}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ backgroundColor: '#090e16', border: '1px solid #162030' }}
                >
                  <div className="flex items-center gap-4">
                    <code
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: '#06080e', color: '#9ca3af' }}
                    >
                      {ev.key}
                    </code>
                    <span className="text-gray-400 text-sm">{ev.desc}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(ev.key)}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Copiar"
                  >
                    <Copy size={14} color={copied === ev.key ? '#22c55e' : undefined} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'pushcut' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={18} color="#6b7280" />
            <h2 className="text-white text-base font-semibold">PushCut</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">Receba notificações push em tempo real sobre a atividade dos seus leads</p>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <AlertCircle size={15} color="#f59e0b" />
            <span className="text-sm" style={{ color: '#f59e0b' }}>Não configurado</span>
          </div>
          <p className="text-gray-500 text-xs mt-5">Configure o PushCut para receber notificações push automáticas quando seus leads realizarem ações importantes.</p>
        </div>
      )}
    </div>
  );
}
