import React from 'react';
import { ArrowRight, BarChart3, TrendingUp, Percent } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { GLSLHills } from '../components/ui/glsl-hills';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import Planilha2x1 from './Planilha2x1';
import Planilha4x2 from './Planilha4x2';
import PlanilhaJuros from './PlanilhaJuros';

type PlanilhaView = 'home' | '2x1' | '4x2' | 'juros';

export default function Planilha() {
  const { theme } = useTheme();
  const [view, setView] = React.useState<PlanilhaView>('home');

  if (view === '2x1') return <Planilha2x1 onVoltar={() => setView('home')} />;
  if (view === '4x2') return <Planilha4x2 onVoltar={() => setView('home')} />;
  if (view === 'juros') return <PlanilhaJuros onVoltar={() => setView('home')} />;

  const botoes = [
    {
      id: '2x1' as PlanilhaView,
      icon: BarChart3,
      titulo: 'Gerenciamento 2x1',
      descricao: 'Controle de operações com estratégia de gerenciamento 2x1 para maximizar seus resultados.',
    },
    {
      id: '4x2' as PlanilhaView,
      icon: TrendingUp,
      titulo: 'Gerenciamento 4x2',
      descricao: 'Estratégia avançada de gerenciamento 4x2 para traders que buscam consistência.',
    },
    {
      id: 'juros' as PlanilhaView,
      icon: Percent,
      titulo: 'Juros Compostos',
      descricao: 'Calculadora de juros compostos para projetar o crescimento da sua banca.',
    },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[80vh] overflow-hidden rounded-2xl">
      {/* Background GLSL Hills */}
      <div className="absolute inset-0 z-0">
        <GLSLHills width="100%" height="100%" speed={0.3} cameraZ={130} />
      </div>

      {/* Gradient overlay para legibilidade */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/40 to-black/60 pointer-events-none" />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-12 max-w-3xl mx-auto space-y-8">
        {/* Logo */}
        <img
          src="https://i.imgur.com/tqpshJj.png"
          alt={BRANDING.logoAlt}
          className="h-28 md:h-36 object-contain drop-shadow-[0_0_30px_rgba(52,222,0,0.3)]"
          referrerPolicy="no-referrer"
        />

        {/* Título */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            PLANILHA DE GERENCIAMENTO
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Planilha de registro de operações para controle detalhado de compras, vendas e lucros, ideal para acompanhar o desempenho e otimizar suas estratégias no mercado financeiro.
          </p>
        </div>

        {/* Botões */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
          {botoes.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setView(btn.id)}
              className={cn(
                'group flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 text-left',
                'bg-white/5 backdrop-blur-md border-white/10',
                'hover:bg-apex-trader-primary/10 hover:border-apex-trader-primary/30 hover:scale-[1.02]',
                'hover:shadow-lg hover:shadow-apex-trader-primary/10'
              )}
            >
              <div className="w-14 h-14 rounded-xl bg-apex-trader-primary/10 flex items-center justify-center group-hover:bg-apex-trader-primary/20 transition-colors">
                <btn.icon size={28} className="text-apex-trader-primary" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-white group-hover:text-apex-trader-primary transition-colors">
                  {btn.titulo}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {btn.descricao}
                </p>
              </div>
              <div className="w-full px-4 py-2.5 bg-apex-trader-primary hover:bg-apex-trader-primary/90 text-black text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors mt-1">
                Acessar <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
