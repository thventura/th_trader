import React from 'react';
import { X, Share, Plus, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BRANDING } from '../config/branding';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppModal() {
  const [show, setShow] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if already dismissed
    const dismissed = localStorage.getItem('guias_install_dismissed');
    if (dismissed) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // For Android/Chrome — capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS — show after a short delay
    if (ios) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    // For other browsers on mobile — show instructions
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('guias_install_dismissed', 'installed');
      }
      setDeferredPrompt(null);
    }
    handleClose();
  };

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('guias_install_dismissed', 'true');
  };

  if (isStandalone || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-apex-trader-primary/10 border-b border-white/5">
            <span className="text-sm font-bold text-white">Instale o App</span>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src={BRANDING.logoUrl}
                alt={BRANDING.logoAlt}
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Adicione à Tela de Início</h3>
            <p className="text-sm text-slate-400 mb-6">
              Para receber notificações de atualizações, você precisa instalar o app no seu dispositivo.
            </p>

            {/* Steps — iOS (manual) */}
            {isIOS && (
              <div className="space-y-4 mb-6 text-left">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-apex-trader-primary/20 text-apex-trader-primary text-sm font-bold shrink-0">1</span>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    Toque no botão <strong className="text-white">Compartilhar</strong>
                    <Share size={16} className="text-apex-trader-primary shrink-0" />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-apex-trader-primary/20 text-apex-trader-primary text-sm font-bold shrink-0">2</span>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    Role para baixo e toque em <strong className="text-white">Adicionar à Tela de Início</strong>
                    <Plus size={16} className="text-apex-trader-primary shrink-0" />
                  </div>
                </div>
              </div>
            )}

            {/* Steps — Android without beforeinstallprompt */}
            {!isIOS && !deferredPrompt && (
              <div className="space-y-4 mb-6 text-left">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-apex-trader-primary/20 text-apex-trader-primary text-sm font-bold shrink-0">1</span>
                  <p className="text-sm text-slate-300">
                    Toque no menu <strong className="text-white">⋮</strong> do navegador
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-apex-trader-primary/20 text-apex-trader-primary text-sm font-bold shrink-0">2</span>
                  <p className="text-sm text-slate-300">
                    Toque em <strong className="text-white">Instalar aplicativo</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Button */}
            {deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 bg-apex-trader-primary text-black font-bold py-3.5 rounded-xl hover:brightness-110 transition-all"
              >
                <Download size={18} />
                Instalar Agora
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="w-full bg-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/15 transition-all"
              >
                Entendi
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
