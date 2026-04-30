import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BRANDING } from '../config/branding';
import { 
  CheckCircle2, 
  MessageCircle, 
  LogIn, 
  ArrowRight,
  Shield,
  Star,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#93c5fd',
  bg: '#020617',
};

export default function Obrigado() {
  const navigate = useNavigate();

  useEffect(() => {
    // Efeito de confete ao carregar a página
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden relative flex flex-col justify-center py-20 px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="max-w-[800px] mx-auto w-full relative z-10 text-center">
        {/* Success Icon */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(59,130,246,0.3)]"
        >
          <CheckCircle2 size={48} className="text-primary" />
        </motion.div>

        {/* Headlines */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none uppercase italic">
            PARABÉNS PELA <br />
            <span className="text-primary text-6xl md:text-8xl block mt-2">SUA DECISÃO!</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium mb-12 max-w-[600px] mx-auto leading-relaxed">
            Seja muito bem-vindo à <span className="text-white font-bold">{BRANDING.appName}</span>. Você acaba de dar o passo mais importante para sua liberdade no mercado.
          </p>
        </motion.div>

        {/* Instruction Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] mb-12 text-left relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award size={120} className="text-primary" />
          </div>
          
          <h3 className="text-primary font-black uppercase text-sm mb-6 tracking-[3px]">PRÓXIMOS PASSOS:</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary font-black">1</div>
              <p className="text-lg text-slate-200 font-medium">Você recebeu um e-mail com os dados de acesso (verifique também o spam).</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary font-black">2</div>
              <p className="text-lg text-slate-200 font-medium">Entre no nosso grupo exclusivo para receber as orientações iniciais.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary font-black">3</div>
              <p className="text-lg text-slate-200 font-medium">Crie sua conta na plataforma utilizando o <span className="text-primary font-black underline">MESMO E-MAIL</span> que você usou na compra da Cakto.</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <a 
            href="https://wa.me/+5588982297684?text=Olá!%20Acabei%20de%20entrar%20para%20a%20Guias%20Academy." 
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-4 bg-white/5 hover:bg-white/10 border border-white/20 p-6 rounded-3xl transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle size={24} className="text-[#25D366]" />
            </div>
            <div className="text-left font-black uppercase tracking-tighter">
              <span className="block text-[10px] text-slate-400 tracking-[2px]">FALAR COM</span>
              <span className="text-lg">SUPORTE VIP</span>
            </div>
            <ArrowRight size={20} className="ml-auto text-slate-500 group-hover:translate-x-1 transition-transform" />
          </a>

          <button 
            onClick={() => navigate('/login')}
            style={{ backgroundColor: COLORS.primary }}
            className="group flex items-center justify-center gap-4 p-6 rounded-3xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_rgba(59,130,246,0.7)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LogIn size={24} className="text-black" />
            </div>
            <div className="text-left font-black uppercase tracking-tighter text-black">
              <span className="block text-[10px] opacity-60 tracking-[2px]">IR PARA A</span>
              <span className="text-lg">PLATAFORMA</span>
            </div>
            <ArrowRight size={20} className="ml-auto text-black/40 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 flex flex-col items-center gap-4"
        >
          <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-8 opacity-40 grayscale" />
          <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-[3px] text-[10px]">
            <Shield size={12} /> Compra 100% segura e garantida
          </div>
        </motion.div>
      </div>
    </div>
  );
}
