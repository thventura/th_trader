import React from 'react';
import { motion } from 'motion/react';
import { BRANDING } from '../config/branding';
import { Play } from 'lucide-react';
import { ShootingStars } from '../components/ui/shooting-stars';
import Globe from '../components/ui/globe';

export default function BemVindo() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ===== Background animado (mesmo da Landing) ===== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="stars absolute inset-0" />
        <ShootingStars starColor="#34de00" trailColor="#7fff00" minSpeed={15} maxSpeed={35} minDelay={1000} maxDelay={3000} />
        <ShootingStars starColor="#34de00" trailColor="#2bc900" minSpeed={10} maxSpeed={25} minDelay={2000} maxDelay={4500} />
        <ShootingStars starColor="#7fff00" trailColor="#34de00" minSpeed={20} maxSpeed={40} minDelay={1500} maxDelay={3500} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(52,222,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(52,222,0,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </div>

      {/* Glow radial */}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(52,222,0,0.12) 0%, transparent 70%)' }}
      />

      {/* ===== Conteúdo ===== */}
      <div className="relative z-10">

        <div className="relative min-h-[70vh] md:min-h-[80vh] flex flex-col md:flex-row items-center">

          {/* Globo — mobile: topo, desktop: lado direito */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="order-1 md:order-2 w-full md:w-1/2 flex items-center justify-center relative py-10"
          >
            {/* Container do globo adaptado para o componente CSS do usuário */}
            <div className="relative flex items-center justify-center">
              <Globe />
            </div>
          </motion.div>

          {/* Texto — mobile: segundo, desktop: primeiro (esquerda) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="order-2 md:order-1 w-full md:w-1/2 text-center md:text-left px-6 md:px-12 lg:px-16 py-8 md:py-0"
          >
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4">
              <span className="bg-gradient-to-r from-apex-trader-primary to-[#7fff00] bg-clip-text text-transparent">
                Seja Bem-Vindo
              </span>
              <br />
              <span className="text-white">à {BRANDING.appName}!</span>
            </h1>

            <p className="text-lg md:text-xl font-semibold text-apex-trader-primary mb-6">
              Sua jornada no trading começa agora
            </p>

            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
              Na {BRANDING.appName}, oferecemos uma plataforma completa para traders de todos os níveis.
              Desde treinamentos especializados, registro de operações, até a automação inteligente
              de operações com o {BRANDING.platformName}. Nossa missão é ajudar você a atingir seus objetivos
              financeiros, com ferramentas poderosas, desafios mensais e suporte dedicado.
              Assista ao vídeo abaixo para entender como aproveitar ao máximo tudo o que a
              {BRANDING.appName} tem a oferecer e comece a sua jornada rumo ao sucesso no trading!
            </p>
          </motion.div>
        </div>

        {/* ===== Seção de Vídeo ===== */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
          className="max-w-4xl mx-auto px-4 md:px-8 pb-20"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-apex-trader-primary text-sm font-bold uppercase tracking-wider mb-3">
              <Play size={16} />
              Vídeo Explicativo
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              Como Funciona a {BRANDING.appName}
            </h2>
            <p className="text-slate-400">
              O que você precisa saber para começar!
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-apex-trader-primary/20 shadow-[0_0_40px_rgba(52,222,0,0.08)]">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/__P1NzbCqww"
                title={`Como Funciona a ${BRANDING.appName}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
