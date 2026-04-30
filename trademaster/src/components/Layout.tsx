import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  BrainCircuit,
  GraduationCap,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Globe,
  Award,
  Trophy,
  Users,
  Home,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  Check,
  FileSpreadsheet,
  Lock,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BRANDING } from '../config/branding';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import InstallAppModal from './InstallAppModal';
import NotificacoesModal from './NotificacoesModal';
import { getAvisos, signOut } from '../lib/supabaseService';
import { ErrorBoundary } from './ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userTier?: 'gratuito' | 'premium';
  userCreatedAt?: string;
}

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

// Páginas acessíveis gratuitamente (sem badge PRO)
const PAGINAS_GRATUITAS = ['/planilha', '/calculadora-forex', '/perfil', '/comunidades'];

export default function Layout({ children, userRole, userTier, userCreatedAt }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showNotifPanel, setShowNotifPanel] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Notifications state
  const [notificacoes, setNotificacoes] = React.useState<Notificacao[]>([]);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  // Listen for new notifications from admin
  React.useEffect(() => {
    let mounted = true;

    const fetchAvisos = async () => {
      try {
        // Busca do banco todos os avisos criados APÓS o usuário ter sido criado
        const bdAvisos = await getAvisos(userCreatedAt);
        if (!mounted) return;

        // Recupera do storage apenas o estado de "lida" (true/false) pelo ID
        let localState: Record<string, boolean> = {};
        try { localState = JSON.parse(localStorage.getItem('guias_notif_state') || '{}'); } catch { }

        const merged: Notificacao[] = bdAvisos.map((av: any) => ({
          id: av.id,
          titulo: av.titulo,
          mensagem: av.mensagem,
          created_at: av.created_at,
          lida: !!localState[av.id]
        }));

        setNotificacoes(merged);

      } catch (err) {
        console.error('[Layout] Erro ao buscar avisos', err);
      }
    };

    fetchAvisos();

    const handler = () => fetchAvisos();
    window.addEventListener('guias_notification_update', handler);

    return () => {
      mounted = false;
      window.removeEventListener('guias_notification_update', handler);
    };
  }, [userCreatedAt]);

  // Close notification panel on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    if (showNotifPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  const marcarTodasLidas = () => {
    const atualizado = notificacoes.map(n => ({ ...n, lida: true }));
    setNotificacoes(atualizado);

    // Salva o estado de lida no local storage
    const localState = atualizado.reduce((acc, n) => ({ ...acc, [n.id]: true }), {} as Record<string, boolean>);
    localStorage.setItem('guias_notif_state', JSON.stringify(localState));
  };

  const isGratuito = userTier === 'gratuito' && userRole !== 'admin';

  const navItems = [
    { to: '/planilha', icon: FileSpreadsheet, label: 'Planilha' },
    { to: '/bem-vindo', icon: Home, label: 'Seja Bem-Vindo' },
    { to: '/', icon: LayoutDashboard, label: 'Visão Geral' },
    { to: '/corretora', icon: Globe, label: 'Corretora' },
    { to: '/bingx', icon: TrendingUp, label: 'Crypto/Forex' },
    { to: '/calculadora-forex', icon: Calculator, label: 'Calculadora Forex' },
    { to: '/mindset', icon: BrainCircuit, label: `Psicologia do ${BRANDING.platformName}` },
    { to: '/aulas', icon: GraduationCap, label: 'Treinamentos' },
    { to: '/desafio', icon: Trophy, label: 'Desafio 3P' },
    { to: '/comunidades', icon: Users, label: 'Comunidades' },
    { to: '/prova', icon: Award, label: 'Prova Final' },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ];

  if (userRole === 'admin') {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Painel do Administrador' });
  }

  const handleLogout = async () => {
    try {
      // 1. Clear Supabase session server-side
      await signOut();

      // 2. Clear all local persistence
      localStorage.clear();
      sessionStorage.clear();

      // 3. Clear Puma-specific cookies if they exist (optional but good for safety)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // 4. Forced navigation with full page reload to clear ALL React/Auth states
      window.location.href = '/login';
    } catch (err) {
      console.error('[Logout] Error during sign out:', err);
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  // Notification bell dropdown (reused mobile + desktop)
  const NotifBell = () => (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => setShowNotifPanel(!showNotifPanel)}
        className={cn("relative p-2 transition-colors", theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white')}
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
            {naoLidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-[60] overflow-hidden border", theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-900 border-white/10')}
          >
            <div className={cn("flex items-center justify-between px-4 py-3 border-b", theme === 'light' ? 'border-gray-100' : 'border-white/5')}>
              <span className="text-sm font-bold">Notificações</span>
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} className="text-xs text-apex-trader-primary hover:underline flex items-center gap-1">
                  <Check size={12} /> Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <div className={cn("py-10 text-center text-sm", theme === 'light' ? 'text-slate-400' : 'text-slate-600')}>Nenhuma notificação</div>
              ) : (
                notificacoes.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 border-b transition-colors",
                      theme === 'light' ? 'border-gray-50' : 'border-white/5',
                      !n.lida && (theme === 'light' ? 'bg-green-50' : 'bg-apex-trader-primary/5')
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lida && <span className="w-2 h-2 rounded-full bg-apex-trader-primary shrink-0 mt-1.5" />}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{n.titulo}</p>
                        <p className={cn("text-xs line-clamp-2 mt-0.5", theme === 'light' ? 'text-slate-500' : 'text-slate-500')}>{n.mensagem}</p>
                        <p className={cn("text-[10px] mt-1", theme === 'light' ? 'text-slate-400' : 'text-slate-600')}>
                          {new Date(n.created_at).toLocaleDateString('pt-BR')} {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row transition-colors duration-300", theme === 'light' ? 'bg-gray-50 text-slate-900' : 'bg-slate-950 text-slate-50')}>
      {/* Sidebar - Desktop */}
      <aside className={cn("hidden md:flex flex-col w-64 border-r p-6 relative overflow-hidden", theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-950 border-white/5')}>
        <div className="mb-10 px-2 relative z-20">
          <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
        </div>

        <nav className="flex-1 space-y-1 relative">
          <div className="sidebar-glider-container" />
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 px-6 py-3.5 relative transition-all duration-300",
                isActive ? "text-apex-trader-primary" : theme === 'light' ? "text-slate-500 hover:text-slate-800" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div layoutId="sidebar-glider" className="sidebar-glider" transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1, velocity: 2 }} />
                  )}
                  <item.icon size={20} className={cn("relative z-20 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                  <span className="font-semibold text-[13.5px] tracking-tight relative z-20 flex-1">{item.label}</span>
                  {isGratuito && !PAGINAS_GRATUITAS.includes(item.to) && (
                    <span className="relative z-20 px-1.5 py-0.5 text-[9px] font-black bg-apex-trader-primary/20 text-apex-trader-primary rounded-md uppercase tracking-wider">
                      PRO
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-6 py-4 text-slate-500 hover:text-red-500 transition-all duration-200 group relative z-20">
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Sair</span>
        </button>
      </aside>

      {/* Mobile Header */}
      <header
        className={cn("md:hidden flex items-center justify-between px-4 pb-4 border-b backdrop-blur-xl sticky top-0 z-50", theme === 'light' ? 'bg-white/80 border-gray-200' : 'bg-slate-900/50 border-white/5')}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
        <div className="flex items-center gap-1">
          <button onClick={() => window.location.reload()} className={cn("p-2 transition-colors", theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white')}>
            <RefreshCw size={20} />
          </button>
          <button onClick={toggleTheme} className={cn("p-2 transition-colors", theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white')}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <NotifBell />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className={cn("md:hidden fixed inset-0 z-40 backdrop-blur-md px-4", theme === 'light' ? 'bg-white/95' : 'bg-slate-950/90')}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
        >
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200",
                  isActive ? "bg-apex-trader-primary/10 text-apex-trader-primary border border-apex-trader-primary/20" : theme === 'light' ? "text-slate-600" : "text-slate-400"
                )}
              >
                <item.icon size={24} />
                <span className="text-lg font-medium flex-1">{item.label}</span>
                {isGratuito && !PAGINAS_GRATUITAS.includes(item.to) && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-apex-trader-primary/20 text-apex-trader-primary rounded-md uppercase">
                    PRO
                  </span>
                )}
              </NavLink>
            ))}
            <button onClick={handleLogout} className={cn("w-full flex items-center gap-3 px-4 py-4 rounded-xl", theme === 'light' ? "text-slate-600" : "text-slate-400")}>
              <LogOut size={24} />
              <span className="text-lg font-medium">Sair</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main + Footer wrapper */}
      <div className="flex-1 flex flex-col">
        {/* Desktop top bar with theme toggle + bell */}
        <div className={cn("hidden md:flex items-center justify-end gap-2 px-6 py-3 border-b", theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-950 border-white/5')}>
          <button onClick={() => window.location.reload()} className={cn("p-2 rounded-lg transition-colors", theme === 'light' ? 'text-slate-500 hover:text-slate-800 hover:bg-gray-100' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
            <RefreshCw size={18} />
          </button>
          <button onClick={toggleTheme} className={cn("p-2 rounded-lg transition-colors", theme === 'light' ? 'text-slate-500 hover:text-slate-800 hover:bg-gray-100' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotifBell />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className={cn("border-t py-6 px-6 md:px-8", theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-950 border-white/5')}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-6 w-auto object-contain opacity-50" referrerPolicy="no-referrer" />
            <p className={cn("text-xs", theme === 'light' ? 'text-slate-400' : 'text-slate-600')}>
              © {new Date().getFullYear()} {BRANDING.appName}. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>

      {/* PWA Modals */}
      <InstallAppModal />
      <NotificacoesModal />
    </div>
  );
}
