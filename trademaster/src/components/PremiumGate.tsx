import React from 'react';
import { Lock, Crown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { BRANDING } from '../config/branding';

const CACTO_URL = 'https://pay.cakto.com.br/anasupy_808501';

interface PremiumGateProps {
  children: React.ReactNode;
  tier: 'gratuito' | 'premium';
}

export default function PremiumGate({ children, tier }: PremiumGateProps) {
  const { theme } = useTheme();

  if (tier === 'premium') {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      {/* Conteúdo borrado por trás */}
      <div className="blur-[6px] pointer-events-none select-none opacity-60" aria-hidden="true">
        {children}
      </div>

      {/* Overlay de bloqueio */}
      <div className="absolute inset-0 flex items-center justify-center z-30">
        <div
          className={cn(
            'flex flex-col items-center gap-6 p-10 rounded-3xl border shadow-2xl max-w-md mx-4 text-center backdrop-blur-xl',
            theme === 'light'
              ? 'bg-white/90 border-gray-200'
              : 'bg-slate-900/90 border-white/10'
          )}
        >
          <div className="w-20 h-20 rounded-full bg-apex-trader-primary/10 flex items-center justify-center">
            <Lock size={36} className="text-apex-trader-primary" />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Conteúdo Exclusivo</h2>
            <p className={cn('text-sm leading-relaxed', theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>
              Este recurso está disponível apenas para membros <strong className="text-apex-trader-primary">Premium</strong> do {BRANDING.appName}.
            </p>
          </div>

          <a
            href={CACTO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-3.5 bg-apex-trader-primary hover:bg-apex-trader-primary/90 text-black font-bold rounded-xl transition-all duration-200 shadow-lg shadow-apex-trader-primary/20 hover:shadow-apex-trader-primary/40 hover:scale-[1.02]"
          >
            <Crown size={20} />
            Quero ser Premium
          </a>

          <p className={cn('text-xs', theme === 'light' ? 'text-slate-400' : 'text-slate-600')}>
            Desbloqueie todos os recursos da plataforma
          </p>
        </div>
      </div>
    </div>
  );
}
