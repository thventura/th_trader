import React from 'react';
import { Clock, ShieldAlert, LogOut, CalendarX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BRANDING } from '../config/branding';

interface Props {
  mode?: 'aguardando' | 'expirado';
}

export default function WaitingApproval({ mode = 'aguardando' }: Props) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (mode === 'expirado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full glass-card p-10 text-center space-y-6">
          <div className="inline-flex p-4 bg-red-500/10 rounded-2xl text-red-500 mb-2">
            <CalendarX size={48} />
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Acesso Encerrado</h2>

          <p className="text-slate-400 leading-relaxed">
            O seu período de acesso ao {BRANDING.appName} chegou ao fim. Para continuar utilizando a plataforma, entre em contato com o administrador.
          </p>

          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3 text-left">
            <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Se acredita que isso é um erro ou deseja renovar seu acesso, fale diretamente com o suporte pelo WhatsApp ou e-mail.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full glass-card p-10 text-center space-y-6">
        <div className="inline-flex p-4 bg-yellow-500/10 rounded-2xl text-yellow-500 mb-2">
          <Clock size={48} />
        </div>

        <h2 className="text-3xl font-bold tracking-tight">Aguardando Aprovação</h2>

        <p className="text-slate-400 leading-relaxed">
          Sua conta foi criada com sucesso! Por motivos de segurança, um administrador precisa aprovar seu acesso antes que você possa começar a operar.
        </p>

        <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3 text-left">
          <ShieldAlert size={20} className="text-apex-trader-primary shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Geralmente as aprovações ocorrem em menos de 24 horas. Você receberá um e-mail assim que seu acesso for liberado.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
        >
          <LogOut size={18} />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
