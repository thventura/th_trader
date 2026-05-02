import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PremiumGate from './components/PremiumGate';
import ManutencaoScreen from './components/ManutencaoScreen';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import { supabase } from './lib/supabase';
import { getProfile, type ProfileRow } from './lib/supabaseService';
import { ManutencaoConfig } from './types';

//Comentário apenas repetir deploy

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Operacoes = React.lazy(() => import('./pages/Operacoes'));
const Mindset = React.lazy(() => import('./pages/Mindset'));
const Aulas = React.lazy(() => import('./pages/Aulas'));
const Perfil = React.lazy(() => import('./pages/Perfil'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Login = React.lazy(() => import('./pages/Login'));
const AccessDenied = React.lazy(() => import('./pages/AccessDenied'));
const TrialExpirado = React.lazy(() => import('./pages/WaitingApproval'));
const Corretora = React.lazy(() => import('./pages/Corretora'));
const GestaoRisco = React.lazy(() => import('./pages/GestaoRisco'));
const Prova = React.lazy(() => import('./pages/Prova'));
const Desafio = React.lazy(() => import('./pages/Desafio'));
const Comunidades = React.lazy(() => import('./pages/Comunidades'));
const Planilha = React.lazy(() => import('./pages/Planilha'));
const Landing = React.lazy(() => import('./pages/Landing'));
const BemVindo = React.lazy(() => import('./pages/BemVindo'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const Obrigado = React.lazy(() => import('./pages/Obrigado'));
// Loading fallback component
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
    <div className="w-12 h-12 border-4 border-apex-trader-primary/20 border-t-apex-trader-primary rounded-full animate-spin" />
    <p className="text-slate-400 text-sm font-medium animate-pulse">Carregando...</p>
  </div>
);

// Helper to build user state from session data + optional profile
function buildUserState(session: any, profile: ProfileRow | null) {
  const email = session.user.email || '';

  if (profile) {
    return {
      id: profile.id,
      email: profile.email || email,
      role: profile.role,
      tier: (profile.tier || 'gratuito') as 'gratuito' | 'premium',
      aprovado_por_admin: profile.aprovado_por_admin,
      created_at: profile.created_at,
      trial_expira_em: profile.trial_expira_em || null,
      acesso_planilha: profile.acesso_planilha ?? false,
      modulos_liberados: profile.modulos_liberados ?? null,
    };
  }

  // Fallback when profile can't be loaded (RLS error, new user, etc.)
  // Always default to least-privilege: role=user, not approved
  return {
    id: session.user.id,
    email: email,
    role: 'user',
    tier: 'gratuito' as const,
    aprovado_por_admin: false,
    created_at: session.user.created_at,
    trial_expira_em: null as string | null,
    acesso_planilha: false,
    modulos_liberados: null as string[] | null,
  };
}

// Supabase Auth Hook
const useAuth = () => {
  const [user, setUser] = React.useState<{ role: string; tier: 'gratuito' | 'premium'; aprovado_por_admin: boolean; email?: string; id?: string; created_at?: string; trial_expira_em?: string | null; acesso_planilha?: boolean; modulos_liberados?: string[] | null } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    const resolveUser = async (session: any, source: string) => {
      console.log(`[AUTH] resolveUser from: ${source}`);

      if (!session?.user) {
        console.log('[AUTH] No session/user found');
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      console.log(`[AUTH] Session found for: ${session.user.email}`);
      // Try to get profile, but don't let it block login
      const profile = await getProfile(session.user.id);
      console.log(`[AUTH] Profile result:`, profile ? `role=${profile.role}, approved=${profile.aprovado_por_admin}` : 'null (using fallback)');

      if (mounted) {
        const userState = buildUserState(session, profile);
        console.log(`[AUTH] Setting user state: role=${userState.role}, approved=${userState.aprovado_por_admin}`);
        setUser(userState);
        setLoading(false);
        initialLoadDone = true;
      }
    };

    // 1. Load from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      resolveUser(session, 'getSession');
    }).catch((err) => {
      console.error('[AUTH] getSession error:', err);
      if (mounted) setLoading(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH] Event: ${event}`);
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }

      // Only process SIGNED_IN if initial load is already done
      // This prevents the race condition between getSession and onAuthStateChange
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (initialLoadDone) {
          resolveUser(session, `event:${event}`);
        } else {
          console.log(`[AUTH] Skipping ${event} - initial load in progress`);
        }
      }
    });

    // 3. Safety timeout - if nothing resolves in 4 seconds, force render
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[AUTH] Safety timeout! Forcing render.');
        setLoading(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    isAuthenticated: !!user,
    user,
    loading,
    logout
  };
};

export default function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const [manutencaoConfig, setManutencaoConfig] = React.useState<ManutencaoConfig | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('configuracoes_manutencao').select('*').eq('id', 'global').single();
        if (data) setManutencaoConfig(data as ManutencaoConfig);
      } catch {}
    })();
  }, []);

  const estaEmManutencao = React.useCallback((secao: string): boolean => {
    if (!manutencaoConfig?.ativo) return false;
    if (!manutencaoConfig.secoes.includes(secao)) return false;
    if (manutencaoConfig.termino_em && new Date() >= new Date(manutencaoConfig.termino_em)) return false;
    if (user?.role === 'admin') return false;
    return true;
  }, [manutencaoConfig, user?.role]);

  // Auto-solicita permissão de notificação quando o usuário loga (se não foi negada)
  React.useEffect(() => {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;
    import('./lib/push').then(({ subscribeToPush }) => subscribeToPush()).catch(() => {});
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <Router>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/obrigado" element={<Obrigado />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </React.Suspense>
        </Router>
      </ThemeProvider>
    );
  }

  // Se o trial expirou
  const trialExpirado = user?.role !== 'admin' && !!user?.trial_expira_em && new Date(user.trial_expira_em) < new Date();
  if (trialExpirado) {
    return (
      <ThemeProvider>
        <Router>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="*" element={<TrialExpirado mode="expirado" />} />
            </Routes>
          </React.Suspense>
        </Router>
      </ThemeProvider>
    );
  }

  // Se o usuário está autenticado, mas NÃO foi aprovado e NÃO é admin
  if (user && !user.aprovado_por_admin && user.role !== 'admin') {
    return (
      <ThemeProvider>
        <Router>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/obrigado" element={<Obrigado />} />
              <Route path="/login" element={<Navigate to="/access-denied" replace />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="*" element={<Navigate to="/access-denied" replace />} />
            </Routes>
          </React.Suspense>
        </Router>
      </ThemeProvider>
    );
  }

  // Se o usuário está autenticado e FOI aprovado (ou é admin)
  return (
    <ThemeProvider>
      <DataProvider userId={user!.id!}>
        <Router>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/quiz" element={<Quiz />} />
              {/* Evita o loop de login: se já tá logado, mandar pro dashboard */}
              <Route path="/login" element={<Navigate to={user?.tier === 'gratuito' ? '/planilha' : '/'} replace />} />
              <Route path="/access-denied" element={<Navigate to={user?.tier === 'gratuito' ? '/planilha' : '/'} replace />} />
              {/* Páginas gratuitas — sem PremiumGate */}
              <Route path="/planilha" element={
                user?.acesso_planilha || user?.role === 'admin'
                  ? <Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}>{estaEmManutencao('planilha') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Planilha />}</Layout>
                  : <Navigate to={user?.tier === 'gratuito' ? '/bem-vindo' : '/'} replace />
              } />
              <Route path="/comunidades" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><Comunidades /></Layout>} />
              <Route path="/perfil" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><Perfil /></Layout>} />
              {/* Páginas premium — com PremiumGate */}
              <Route path="/bem-vindo" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}><BemVindo /></PremiumGate></Layout>} />
              <Route path="/" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('dashboard') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Dashboard />}</PremiumGate></Layout>} />
              <Route path="/corretora" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('corretora') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Corretora />}</PremiumGate></Layout>} />
              <Route path="/operacoes" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('operacoes') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Operacoes />}</PremiumGate></Layout>} />
              <Route path="/gestao-risco" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('gestao') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <GestaoRisco />}</PremiumGate></Layout>} />
              <Route path="/mindset" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('mindset') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Mindset />}</PremiumGate></Layout>} />
              <Route path="/aulas" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('aulas') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Aulas userRole={user?.role || 'user'} modulosLiberados={user?.modulos_liberados} />}</PremiumGate></Layout>} />
              <Route path="/prova" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('prova') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Prova />}</PremiumGate></Layout>} />
              <Route path="/desafio" element={<Layout userRole={user?.role || 'user'} userTier={user?.tier || 'gratuito'} userCreatedAt={user?.created_at}><PremiumGate tier={user?.tier || 'gratuito'}>{estaEmManutencao('desafio') ? <ManutencaoScreen config={manutencaoConfig!} onExpire={() => setManutencaoConfig(c => c ? { ...c, ativo: false } : c)} /> : <Desafio />}</PremiumGate></Layout>} />
              <Route path="/admin" element={
                user?.role === 'admin'
                  ? <Layout userRole={user.role} userTier={user.tier} userCreatedAt={user.created_at}><Admin /></Layout>
                  : <Navigate to="/" replace />
              } />
              <Route path="*" element={<Navigate to={user?.tier === 'gratuito' ? '/planilha' : '/'} replace />} />
            </Routes>
          </React.Suspense>
        </Router>
      </DataProvider>
    </ThemeProvider>
  );
}
