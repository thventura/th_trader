import React from 'react';
import { Lock, Mail, ArrowRight, User, KeyRound, CheckCircle2 } from 'lucide-react';
import { signIn, signUp, resetPasswordForEmail, updatePassword } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';
import { BRANDING } from '../config/branding';

type Modo = 'login' | 'register' | 'forgot' | 'reset';

export default function Login() {
  const [modo, setModo] = React.useState<Modo>('login');

  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Detecta token de recuperação de senha na URL hash (ex: #type=recovery&access_token=...)
  // A checagem síncrona na hash resolve a corrida de timing com o onAuthStateChange.
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setModo('reset');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setModo('reset');
        setError('');
        setSuccess('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPasswordForEmail(email);
      setSuccess('Se este e-mail estiver cadastrado, você receberá o link de recuperação em breve. Verifique também sua caixa de spam.');
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      window.location.href = '/';
    } catch (err: any) {
      setError('Não foi possível salvar a nova senha. Tente novamente.');
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

      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="pulsing-background-overlay" />
        <div className="neon-bg-overlay-dark" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        <img
          src={BRANDING.loginLogoUrl}
          alt={BRANDING.logoAlt}
          className="h-40 md:h-56 mb-8 object-contain drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]"
        />

        <div className="w-full">
          <div className="neon-border-wrapper">
            <div className="login-card-container p-8">

              {/* ── Login / Register ── */}
              {(modo === 'login' || modo === 'register') && (
                <form onSubmit={handleLoginRegister} className="space-y-4">
                  {modo === 'register' && (
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">NOME COMPLETO</span>
                      <div className="mt-1 relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
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
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
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
                    <div className="flex items-center justify-between ml-1 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">SENHA</span>
                      {modo === 'login' && (
                        <button
                          type="button"
                          onClick={() => trocarModo('forgot')}
                          className="text-[10px] font-bold text-apex-trader-primary hover:text-[#2563eb] transition-colors uppercase tracking-[0.1em]"
                        >
                          Esqueci a senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
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
                    style={{ background: '#3b82f6', color: '#000', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
                  >
                    {loading ? 'PROCESSANDO...' : modo === 'login' ? 'ENTRAR NA PLATAFORMA' : 'CRIAR MINHA CONTA'}
                    {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                  </button>
                </form>
              )}

              {/* ── Esqueci a senha ── */}
              {modo === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="text-center mb-2">
                    <KeyRound size={32} className="mx-auto mb-3 text-apex-trader-primary" />
                    <p className="text-sm font-bold text-white">Recuperar senha</p>
                    <p className="text-xs text-slate-400 mt-1">Digite seu e-mail e enviaremos um link para criar uma nova senha.</p>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">E-MAIL</span>
                    <div className="mt-1 relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
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

                  {error && (
                    <div className="text-red-400 bg-red-400/10 rounded-xl px-4 py-3 text-xs border border-red-400/20 text-center font-bold">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="text-emerald-400 bg-emerald-400/10 rounded-xl px-4 py-3 text-xs border border-emerald-400/20 text-center font-bold flex items-start gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      {success}
                    </div>
                  )}

                  {!success && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 group mt-2 text-sm tracking-widest disabled:opacity-60"
                      style={{ background: '#3b82f6', color: '#000', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
                    >
                      {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE RECUPERAÇÃO'}
                      {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                    </button>
                  )}
                </form>
              )}

              {/* ── Nova senha ── */}
              {modo === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="text-center mb-2">
                    <Lock size={32} className="mx-auto mb-3 text-apex-trader-primary" />
                    <p className="text-sm font-bold text-white">Criar nova senha</p>
                    <p className="text-xs text-slate-400 mt-1">Digite e confirme sua nova senha abaixo.</p>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">NOVA SENHA</span>
                    <div className="mt-1 relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="block w-full rounded-xl pl-12 pr-4 py-3 bg-[#f1f5f9] text-slate-900 placeholder-slate-400 border-none outline-none font-medium text-sm shadow-inner"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">CONFIRMAR SENHA</span>
                    <div className="mt-1 relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#3b82f6' }} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
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
                    style={{ background: '#3b82f6', color: '#000', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
                  >
                    {loading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
                    {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                  </button>
                </form>
              )}

              {/* ── Rodapé de navegação ── */}
              <div className="mt-6 pt-6 border-t border-white/5 text-center space-y-2">
                {(modo === 'login' || modo === 'register') && (
                  <button
                    onClick={() => trocarModo(modo === 'login' ? 'register' : 'login')}
                    className="text-xs font-bold text-apex-trader-primary hover:text-[#2563eb] transition-colors block w-full"
                  >
                    {modo === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
                  </button>
                )}
                {(modo === 'forgot' || modo === 'reset') && (
                  <button
                    onClick={() => trocarModo('login')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors block w-full"
                  >
                    ← Voltar ao login
                  </button>
                )}
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
