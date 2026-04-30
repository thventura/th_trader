import React from 'react';

const TOTAL_FRAMES = 30; // Reduced from 59 for performance
const FRAME_INTERVAL = 220; 

// Generate array of paths (using every ~2nd frame for 30 total)
const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const frameIndex = i * 2;
  const num = String(frameIndex).padStart(3, '0');
  return `/cerebro/brain-${num}.jpg`;
});

// Fixed positions for sparkling lights (sinapses)
const sparklePositions = [
  { top: '18%', left: '35%', delay: '0s', duration: '2.2s' },
  { top: '25%', left: '60%', delay: '0.7s', duration: '1.8s' },
  { top: '40%', left: '28%', delay: '1.3s', duration: '2.5s' },
  { top: '32%', left: '72%', delay: '0.3s', duration: '2s' },
  { top: '55%', left: '45%', delay: '1.8s', duration: '1.6s' },
  { top: '22%', left: '50%', delay: '0.5s', duration: '2.3s' },
  { top: '48%', left: '65%', delay: '1.1s', duration: '1.9s' },
  { top: '35%', left: '40%', delay: '1.6s', duration: '2.1s' },
]; // Reduced number of sparkles for performance

const CerebroAnimado = React.memo(function CerebroAnimado() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Grid quadrado atrás */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      {/* Glow verde pulsante atrás do cérebro */}
      <div
        className="absolute rounded-full animate-pulse-glow z-[1]"
        style={{
          width: '60%',
          height: '60%',
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.12) 40%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Imagem do cérebro estática com filtro verde */}
      <img
        src="/cerebro/brain-000.jpg"
        alt="Cérebro 3D"
        className="relative z-10 w-[320px] h-auto md:w-[420px] select-none pointer-events-none opacity-80"
        style={{
          filter: 'hue-rotate(270deg) saturate(2.5) brightness(1.2)',
        }}
        draggable={false}
      />

      {/* Luzes estáticas ou sutis (sinapses) */}
      {[
        { top: '22%', left: '50%' },
        { top: '35%', left: '40%' },
        { top: '48%', left: '65%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute z-20 rounded-full animate-sparkle"
          style={{
            top: pos.top,
            left: pos.left,
            width: '4px',
            height: '4px',
            background: '#3b82f6',
            boxShadow: '0 0 6px 2px rgba(59, 130, 246, 0.6), 0 0 12px 4px rgba(59, 130, 246, 0.3)',
            animationDelay: `${i * 0.5}s`,
            animationDuration: '3s',
          }}
        />
      ))}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        @keyframes sparkle {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export default CerebroAnimado;
