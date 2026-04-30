import React from 'react';
import { Wrench } from 'lucide-react';
import { ManutencaoConfig } from '../types';

interface Props {
  config: ManutencaoConfig;
  onExpire?: () => void;
}

function calcularRestante(terminoEm: string | null): number {
  if (!terminoEm) return Infinity;
  return Math.max(0, new Date(terminoEm).getTime() - Date.now());
}

function formatarContagem(ms: number): string {
  if (!isFinite(ms)) return '';
  const totalSeg = Math.floor(ms / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`;
}

export default function ManutencaoScreen({ config, onExpire }: Props) {
  const [restante, setRestante] = React.useState(() => calcularRestante(config.termino_em));

  React.useEffect(() => {
    if (!config.termino_em) return;

    const tick = () => {
      const r = calcularRestante(config.termino_em);
      setRestante(r);
      if (r === 0) onExpire?.();
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.termino_em, onExpire]);

  if (restante === 0) return null;

  const temContagem = config.termino_em !== null && isFinite(restante);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8 px-4 text-center animate-in fade-in duration-500">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <Wrench className="w-10 h-10 text-amber-400" style={{ animation: 'spin 3s linear infinite' }} />
        </div>
        <div className="absolute -inset-2 rounded-full border border-amber-500/10 animate-ping" />
      </div>

      <div className="space-y-3 max-w-md">
        <p className="text-xs font-black text-amber-400 uppercase tracking-[0.25em]">Em Atualização</p>
        <h2 className="text-3xl font-black text-white">Voltamos em breve</h2>
        <p className="text-slate-400 text-sm leading-relaxed">{config.mensagem}</p>
      </div>

      {temContagem && (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl px-8 py-5 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo estimado</p>
          <p className="text-2xl font-black text-white tabular-nums tracking-tight">
            {formatarContagem(restante)}
          </p>
        </div>
      )}
    </div>
  );
}
