import { Link2, Plus } from 'lucide-react';

export default function Links() {
  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-white text-xl font-semibold">Links de Indicação</h1>
          <p className="text-gray-400 text-sm mt-0.5">Crie e gerencie seus links personalizados com métricas detalhadas</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#22c55e' }}
        >
          <Plus size={15} />
          Criar Novo Link
        </button>
      </div>

      {/* Empty state */}
      <div
        className="rounded-xl flex flex-col items-center justify-center py-20"
        style={{ backgroundColor: '#0c1018', border: '1px solid #162030' }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#162030' }}>
          <Link2 size={24} color="#6b7280" />
        </div>
        <h3 className="text-white text-base font-semibold mb-1">Nenhum link criado ainda</h3>
        <p className="text-gray-400 text-sm mb-6">Crie seu primeiro link personalizado para começar a acompanhar suas indicações</p>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#22c55e' }}
        >
          <Plus size={15} />
          Criar Primeiro Link
        </button>
      </div>
    </div>
  );
}
