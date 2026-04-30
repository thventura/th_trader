import React, { useState } from 'react';
import { ShieldAlert, LogOut, CreditCard, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BRANDING } from '../config/branding';

export default function AccessDenied() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleRenew = () => {
    window.open('https://pay.cakto.com.br/anasupy_808501', '_blank');
  };

  const handleSupport = () => {
    window.open('https://wa.me/+5588982297684?text=Quero%20renovar%20minha%20assinatura.', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-apex-trader-primary/5 blur-[120px]" />

      <div className="max-w-xl w-full glass-card p-8 md:p-12 text-center space-y-8 relative z-10 border-t-2 border-red-500/30">
        <div className="inline-flex p-5 bg-red-500/10 rounded-2xl text-red-500 mb-2 animate-pulse">
          <ShieldAlert size={56} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">
            Acesso <span className="text-red-500">Bloqueado</span>
          </h2>
          <p className="text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
            Identificamos que sua assinatura no Protocolo 3P <span className="text-white font-bold">não está ativa</span> ou foi cancelada recentemente.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4 text-left">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-apex-trader-primary" />
            Vantagens de manter o acesso ativo:
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Robôs Automáticos Ativos',
              'Sinais em Tempo Real',
              'Comunidade VIP no Discord',
              'Aulas ao Vivo Diárias'
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase">
                <ArrowRight size={10} className="text-apex-trader-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRenew}
            className="w-full flex items-center justify-center gap-3 bg-apex-trader-primary text-black font-black py-5 rounded-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all group uppercase italic text-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <CreditCard size={20} />
            Renovar Minha Assinatura
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-col md:flex-row gap-2">
            <button
               onClick={handleSupport}
               className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 rounded-xl transition-all border border-white/5 text-sm"
            >
              <MessageCircle size={16} className="text-emerald-500" />
              Falar com Suporte
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-red-500/5 text-slate-500 hover:text-red-400 font-bold py-3 rounded-xl transition-all text-sm"
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[3px]">
          {BRANDING.appName} · Protocolo 3P
        </p>
      </div>
    </div>
  );
}
