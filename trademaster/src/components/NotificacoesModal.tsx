import React from 'react';
import { X, Bell, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToPush } from '../lib/push';

export default function NotificacoesModal() {
  const [show, setShow] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pushError, setPushError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Don't show if already handled or if install modal hasn't been dismissed
    const installDismissed = localStorage.getItem('guias_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;

    // Se já estiver com permissão concedida, marca como ativado e não mostra o modal
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
      // Sincroniza se necessário
      subscribeToPush().catch(console.error);
      return;
    }

    // Show after install modal is dismissed, or on standalone (already installed)
    if (installDismissed || isStandalone) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTogglePush = async () => {
    setPushError(null);

    if (!('Notification' in window)) {
      setPushError('Notificações não são suportadas neste navegador.');
      return;
    }

    if (pushEnabled) {
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
        setPushEnabled(true);
        localStorage.setItem('guias_push_enabled', 'true');
        setTimeout(() => setShow(false), 1000);
      } else if (permission === 'denied') {
        setPushError('Notificações bloqueadas. Desbloqueie nas configurações do navegador.');
      }
    } catch (err) {
      console.error('Erro ao ativar notificações:', err);
      setPushError('Erro ao ativar notificações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-amber-500/10 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <span className="text-sm font-bold text-white">Notificações Push</span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-slate-400 mb-6">
              Receba notificações instantâneas quando houver uma atualização!
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-apex-trader-primary/15 flex items-center justify-center">
                  <BellRing size={18} className="text-apex-trader-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Notificações de Atualizações</p>
                  <p className="text-xs text-slate-500">Alertas em tempo real</p>
                </div>
              </div>
              <button
                onClick={handleTogglePush}
                disabled={loading}
                className={`relative w-12 h-7 rounded-full transition-colors ${pushEnabled ? 'bg-apex-trader-primary' : 'bg-slate-600'}`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${pushEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {pushError && (
              <p className="text-xs text-red-400 text-center mt-2">{pushError}</p>
            )}

            <p className="text-xs text-slate-600 text-center">
              Você pode desativar as notificações a qualquer momento nas configurações do navegador.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
