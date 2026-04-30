import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, User } from 'lucide-react';
import { signIn, signUp } from '../lib/supabaseService';
import { BRANDING } from '../config/branding';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = React.useState(true);

  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        console.log('[LOGIN] signIn successful. Redirecting...');
      } else {
        await signUp(email, password);
        console.log('[LOGIN] signUp successful. Redirecting...');
      }
      // Force full page reload so useAuth re-initializes with the new session
      window.location.href = '/';
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      if (msg.includes('Invalid login')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('User already registered')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else if (msg.includes('Password should be')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper min-h-screen flex flex-col items-center justify-center pb-4 px-4 relative overflow-hidden bg-center bg-no-repeat bg-cover">
      <style>{`
        .login-wrapper {
          background-image: url('${BRANDING.loginBgMobileUrl}');
          background-color: #000;
        }
        @media (min-width: 768px) {
          .login-wrapper {
            background-image: url('${BRANDING.loginBgDesktopUrl}');
          }
        }
      `}</style>

      {/* pulsing neon overlay matching existing background pattern */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="pulsing-background-overlay" />
        <div className="neon-bg-overlay-dark" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        <img
          src={BRANDING.loginLogoUrl}
          alt={BRANDING.logoAlt}
          className="h-40 md:h-56 mb-8 object-contain drop-shadow-[0_0_35px_rgba(52,222,0,0.4)]"
        />

        <div className="w-full">
          {/* Neon Border Wrapper - Clean edge-only light */}
          <div className="neon-border-wrapper">
            <div className="login-card-container p-8">
              <form onSubmit={handleSubmit} className="space-y-4">

                {!isLogin && (
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">NOME COMPLETO</span>
                    <div className="mt-1 relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#34de00' }} />
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Identifique-se"
                        className="block w-full rounded-xl pl-12 pr-4 py-3 bg-[#f1f5f9] text-slate-900 placeholder-slate-400 border-none outline-none font-medium text-sm shadow-inner"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">E-MAIL</span>
                  <div className="mt-1 relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#34de00' }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="block w-full rounded-xl pl-12 pr-4 py-3 bg-[#f1f5f9] text-slate-900 placeholder-slate-400 border-none outline-none font-medium text-sm shadow-inner"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">SENHA</span>
                  <div className="mt-1 relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#34de00' }} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full rounded-xl pl-12 pr-4 py-3 bg-[#f1f5f9] text-slate-900 placeholder-slate-400 border-none outline-none font-medium text-sm shadow-inner"
                    />
                  </div>
                </label>

                {error && (
                  <div className="text-red-400 bg-red-400/10 rounded-xl px-4 py-3 text-xs border border-red-400/20 text-center font-bold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 group mt-2 text-sm tracking-widest disabled:opacity-60"
                  style={{
                    background: '#34de00',
                    color: '#000',
                    boxShadow: '0 8px 32px rgba(52,222,0,0.25)',
                  }}
                >
                  {loading ? 'PROCESSANDO...' : isLogin ? 'ENTRAR NA PLATAFORMA' : 'CRIAR MINHA CONTA'}
                  {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="text-center">
                  <button
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-xs font-bold text-apex-trader-primary hover:text-[#2bc900] transition-colors"
                  >
                    {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-[10px] mt-8 uppercase font-bold tracking-widest opacity-50">
          {BRANDING.appName} • Protocolo 3P
        </p>
      </div>
    </div>
  );
}
