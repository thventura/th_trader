import React from 'react';
import { User, Target, Trophy, Star, CheckCircle2, Mail, Phone, Camera, Bell, BellOff } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { updateProfile, getGlobalRanking, getAulas, calculateUserStats } from '../lib/supabaseService';
import { useData } from '../contexts/DataContext';

export default function Perfil() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { profile, operacoesRaw, userId } = useData();

  const [nome, setNome] = React.useState('Trader Master');
  const [email, setEmail] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [foto, setFoto] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | 'unsupported'>('default');
  const [notifLoading, setNotifLoading] = React.useState(false);

  React.useEffect(() => {
    if (!('Notification' in window)) { setNotifPermission('unsupported'); return; }
    setNotifPermission(Notification.permission);
  }, []);

  const handleAtivarNotificacoes = async () => {
    setNotifLoading(true);
    try {
      const { subscribeToPush } = await import('../lib/push');
      await subscribeToPush();
      setNotifPermission(Notification.permission);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleDesativarNotificacoes = async () => {
    setNotifLoading(true);
    try {
      const { unsubscribeFromPush } = await import('../lib/push');
      await unsubscribeFromPush();
      setNotifPermission(Notification.permission);
    } finally {
      setNotifLoading(false);
    }
  };

  // Dynamic stats
  const [stats, setStats] = React.useState({ xp: 0, level: 1, aulasConcluidas: 0, rank: 0, vitorias: 0 });
  const [totalAulas, setTotalAulas] = React.useState(0);

  // Preencher campos do perfil a partir do DataContext
  React.useEffect(() => {
    if (!profile) { setLoading(false); return; }
    setNome(profile.nome || 'Trader Master');
    setEmail(profile.email || '');
    setWhatsapp(profile.whatsapp || '');
    setFoto(profile.foto_url || '');
  }, [profile]);

  // Carregar ranking e aulas (já cacheados no supabaseService)
  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [ranking, allAulas] = await Promise.all([
          getGlobalRanking(),
          getAulas()
        ]);

        const vitorias = operacoesRaw.filter(o => o.resultado === 'vitoria').length;
        const { xp, level, aulasConcluidas } = await calculateUserStats(userId, operacoesRaw.length, vitorias);
        const userRank = ranking.findIndex(r => r.id === userId) + 1;

        setStats({ xp, level, aulasConcluidas, rank: userRank || 0, vitorias });
        setTotalAulas(allAulas.length);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      }
      setLoading(false);
    })();
  }, [userId, operacoesRaw]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      await updateProfile(userId, {
        nome,
        email,
        whatsapp,
        foto_url: foto || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">Carregando perfil...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-1">Perfil do Aluno</h2>
        <p className="text-slate-400">Acompanhe sua evolução e gerencie seus dados.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-apex-trader-primary" />
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {foto ? (
                <img src={foto} alt="Foto de perfil" className="w-full h-full rounded-full object-cover border-4 border-apex-trader-primary/20" />
              ) : (
                <div className="w-full h-full bg-apex-trader-primary/20 rounded-full flex items-center justify-center text-apex-trader-primary border-4 border-apex-trader-primary/10">
                  <User size={48} />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white mb-1" />
                <span className="text-white text-[10px] font-bold">Alterar foto</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-slate-950">
                Lvl {stats.level}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoChange}
            />
            <h3 className="text-xl font-bold">{nome || 'Trader'}</h3>
            <p className="text-slate-500 text-sm mb-6">{email || 'Sem e-mail cadastrado'}</p>

            {/* XP Progress */}
            <div className="space-y-2 mb-6 text-left">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-500">Experiência (XP)</span>
                <span className="text-apex-trader-primary">{stats.xp} / 1000</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-apex-trader-primary rounded-full transition-all duration-1000" style={{ width: `${(stats.xp / 1000) * 100}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Aulas</p>
                <p className="text-sm font-bold">{stats.aulasConcluidas}/{totalAulas}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Rank</p>
                <p className="text-sm font-bold text-amber-500">#{stats.rank || '—'}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Conquistas Recentes</h4>
            <div className="space-y-3">
              {stats.vitorias > 0 ? (
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Primeiro Win</p>
                    <p className="text-[10px] text-slate-500">Registrou sua primeira vitória</p>
                  </div>
                </div>
              ) : null}
              {stats.aulasConcluidas >= 3 ? ( // Exemplo: 3 aulas para o módulo 1
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                  <div className="p-2 bg-apex-trader-primary/10 text-apex-trader-primary rounded-lg">
                    <Star size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Estudioso</p>
                    <p className="text-[10px] text-slate-500">Completou o Módulo 1</p>
                  </div>
                </div>
              ) : null}
              {stats.vitorias === 0 && stats.aulasConcluidas < 3 && (
                <p className="text-[10px] text-slate-600 italic text-center py-4">
                  Nenhuma conquista ainda. Comece a operar ou estudar!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Data */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-apex-trader-primary" />
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-400">Nome Completo</span>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="mt-1 block w-full bg-slate-800 border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                  <Mail size={14} />
                  E-mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1 block w-full bg-slate-800 border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                  <Phone size={14} />
                  WhatsApp
                </span>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">+55</span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="block w-full bg-slate-800 border-white/10 rounded-xl pl-14 pr-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Card de Notificações */}
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Bell size={18} className="text-apex-trader-primary" />
              Notificações de Operação
            </h3>
            {notifPermission === 'unsupported' && (
              <p className="text-slate-400 text-sm">Seu navegador não suporta notificações push.</p>
            )}
            {notifPermission === 'granted' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 text-sm font-medium">Notificações ativadas</p>
                  <p className="text-slate-400 text-xs mt-0.5">Você receberá alertas de vitória e derrota após cada operação.</p>
                </div>
                <button
                  onClick={handleDesativarNotificacoes}
                  disabled={notifLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors disabled:opacity-50"
                >
                  <BellOff size={15} />
                  {notifLoading ? 'Aguarde...' : 'Desativar'}
                </button>
              </div>
            )}
            {(notifPermission === 'default' || notifPermission === 'denied') && (
              <div className="flex items-center justify-between">
                <div>
                  {notifPermission === 'denied' ? (
                    <>
                      <p className="text-red-400 text-sm font-medium">Notificações bloqueadas</p>
                      <p className="text-slate-400 text-xs mt-0.5">Desbloqueie nas configurações do navegador (ícone de cadeado na barra de endereço).</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-300 text-sm font-medium">Notificações desativadas</p>
                      <p className="text-slate-400 text-xs mt-0.5">Ative para receber alertas de vitória e derrota após cada operação.</p>
                    </>
                  )}
                </div>
                {notifPermission !== 'denied' && (
                  <button
                    onClick={handleAtivarNotificacoes}
                    disabled={notifLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-apex-trader-primary hover:bg-[#2bc900] text-black font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    <Bell size={15} />
                    {notifLoading ? 'Aguarde...' : 'Ativar'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-4">
            {saved && (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                <CheckCircle2 size={16} />
                Dados salvos com sucesso!
              </div>
            )}
            <button
              onClick={handleSave}
              className="bg-apex-trader-primary hover:bg-[#2bc900] text-black font-bold px-10 py-4 rounded-xl shadow-lg shadow-apex-trader-primary/20 transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
