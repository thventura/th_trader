import React from 'react';
import {
  Play,
  CheckCircle,
  Trophy,
  Clock,
  BarChart3,
  Monitor,
  Book,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
  MessageSquare,
  Send,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Modulo, Aula, Comentario } from '../types';
import { supabase } from '../lib/supabase';
import {
  getModulos as fetchModulos,
  getAulas as fetchAulas,
  getComentarios,
  addComentario,
  getProfile,
  upsertModulo,
  deleteModulo,
  upsertAula,
  deleteAula,
  getAulaProgresso,
  toggleAulaProgresso,
} from '../lib/supabaseService';

const modulosIniciais: Modulo[] = [
  {
    id: '1',
    titulo: 'Módulo 1: Introdução ao Trading',
    descricao: 'Aprenda os conceitos básicos do mercado financeiro.',
    capa_url: 'https://i.imgur.com/4XTuPyT.png',
    ordem: 1,
    progresso: 0,
  },
  {
    id: '2',
    titulo: 'Módulo 2: Estratégias Avançadas',
    descricao: 'Técnicas avançadas para maximizar seus lucros.',
    capa_url: 'https://i.imgur.com/entJh35.png',
    ordem: 2,
    progresso: 0,
  },
  {
    id: '3',
    titulo: 'Módulo 3: Psicologia do Trader',
    descricao: 'Controle emocional e decisões racionais.',
    capa_url: 'https://i.imgur.com/n79IBL5.png',
    ordem: 3,
    progresso: 0,
  },
  {
    id: '4',
    titulo: 'Módulo 4: Gerenciamento de Risco',
    descricao: 'Proteja seu capital com gestão profissional.',
    capa_url: 'https://i.imgur.com/FNFW6VS.png',
    ordem: 4,
    progresso: 0,
  },
];

const aulasIniciais: Aula[] = [
  // ── Módulo 1: Introdução ao Trading ──
  { id: '1', modulo_id: '1', titulo: 'O que é o Mercado Financeiro?', descricao: 'Uma visão geral de como o dinheiro se move no mundo.', video_url: 'https://www.youtube.com/embed/VbtlMPFWRwQ', thumbnail_url: '', nivel: 'iniciante', ordem: 1, concluida: false, categoria: 'Conceitos Base', duracao: '15 min', tipo: 'livro' },
  { id: '2', modulo_id: '1', titulo: 'Introdução ao Price Action', descricao: 'A base de toda análise técnica.', video_url: 'https://www.youtube.com/embed/tJodhwgkBxE', thumbnail_url: '', nivel: 'iniciante', ordem: 2, concluida: false, categoria: 'Conceitos Base', duracao: '15 min', tipo: 'grafico' },
  { id: '3', modulo_id: '1', titulo: 'Ferramentas para Traders Iniciantes', descricao: 'Configurando seu ambiente de trabalho.', video_url: 'https://www.youtube.com/embed/Ve588NdvdRE', thumbnail_url: '', nivel: 'iniciante', ordem: 3, concluida: false, categoria: 'Ferramentas', duracao: '15 min', tipo: 'ferramenta' },
  // ── Módulo 2: Estratégias Avançadas ──
  { id: '4', modulo_id: '2', titulo: 'Estratégias de Trading Avançadas', descricao: 'Técnicas de scalping e day trade.', video_url: 'https://www.youtube.com/embed/-QoebwpSoNI', thumbnail_url: '', nivel: 'avancado', ordem: 1, concluida: false, categoria: 'Estratégia', duracao: '20 min', tipo: 'video' },
  { id: '5', modulo_id: '2', titulo: 'Análise Técnica em Profundidade', descricao: 'Estudo de indicadores e volume.', video_url: 'https://www.youtube.com/embed/ISmJ1wxGE24', thumbnail_url: '', nivel: 'avancado', ordem: 2, concluida: false, categoria: 'Análise', duracao: '25 min', tipo: 'grafico' },
  { id: '10', modulo_id: '2', titulo: 'Padrões de Candlestick', descricao: 'Reconhecimento e interpretação de padrões gráficos.', video_url: 'https://www.youtube.com/embed/LbrcM5O9D88', thumbnail_url: '', nivel: 'avancado', ordem: 3, concluida: false, categoria: 'Análise', duracao: '20 min', tipo: 'grafico' },
  { id: '11', modulo_id: '2', titulo: 'Suportes e Resistências', descricao: 'Identificando zonas-chave de preço no gráfico.', video_url: 'https://www.youtube.com/embed/LR0-ldXNSyk', thumbnail_url: '', nivel: 'avancado', ordem: 4, concluida: false, categoria: 'Estratégia', duracao: '18 min', tipo: 'grafico' },
  { id: '12', modulo_id: '2', titulo: 'Entrada e Saída com Precisão', descricao: 'Como maximizar resultados em cada operação.', video_url: 'https://www.youtube.com/embed/G_ZzfVE2tvQ', thumbnail_url: '', nivel: 'avancado', ordem: 5, concluida: false, categoria: 'Estratégia', duracao: '22 min', tipo: 'video' },
  // ── Módulo 3: Psicologia do Trader ──
  { id: '6', modulo_id: '3', titulo: 'A Mentalidade do Trader de Sucesso', descricao: 'Como pensam os 1% que lucram consistentemente.', video_url: 'https://www.youtube.com/embed/54noLDrXn7M', thumbnail_url: '', nivel: 'intermediario', ordem: 1, concluida: false, categoria: 'Mindset', duracao: '30 min', tipo: 'livro' },
  { id: '7', modulo_id: '3', titulo: 'Como Controlar a Ansiedade', descricao: 'Técnicas de respiração e foco para operar com calma.', video_url: 'https://www.youtube.com/embed/DF1BQS8LfWI', thumbnail_url: '', nivel: 'intermediario', ordem: 2, concluida: false, categoria: 'Mindset', duracao: '20 min', tipo: 'video' },
  // ── Módulo 4: Gerenciamento de Risco ──
  { id: '8', modulo_id: '4', titulo: 'O que é Gerenciamento de Risco?', descricao: 'A regra número 1 para sobreviver no mercado.', video_url: 'https://www.youtube.com/embed/6sO2SV86RPE', thumbnail_url: '', nivel: 'iniciante', ordem: 1, concluida: false, categoria: 'Risco', duracao: '10 min', tipo: 'ferramenta' },
  { id: '9', modulo_id: '4', titulo: 'Calculando Riscos nas Operações', descricao: 'Matemática aplicada ao trading para proteger sua banca.', video_url: 'https://www.youtube.com/embed/6sO2SV86RPE', thumbnail_url: '', nivel: 'intermediario', ordem: 2, concluida: false, categoria: 'Risco', duracao: '15 min', tipo: 'grafico' },
];

const emptyAulaForm = { titulo: '', descricao: '', video_url: '', categoria: '', duracao: '', nivel: 'iniciante' as Aula['nivel'], tipo: 'video' as Aula['tipo'] };

interface AulasProps {
  userRole?: string;
  modulosLiberados?: string[] | null;
}

export default function Aulas({ userRole, modulosLiberados }: AulasProps) {
  const isAdmin = userRole === 'admin';

  const [modulos, setModulos] = React.useState<Modulo[]>(modulosIniciais);
  const [aulas, setAulas] = React.useState<Aula[]>(aulasIniciais);

  const [selectedModulo, setSelectedModulo] = React.useState<Modulo | null>(null);
  const [selectedAula, setSelectedAula] = React.useState<Aula | null>(null);

  const [showAulaForm, setShowAulaForm] = React.useState(false);
  const [editingAula, setEditingAula] = React.useState<Aula | null>(null);
  const [aulaForm, setAulaForm] = React.useState(emptyAulaForm);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  // Module management (admin only)
  const [editandoModulo, setEditandoModulo] = React.useState(false);
  const [showAddModulo, setShowAddModulo] = React.useState(false);
  const [formModulo, setFormModulo] = React.useState({ titulo: '', descricao: '', capa_url: '', em_breve: false });
  const [formNovoModulo, setFormNovoModulo] = React.useState({ titulo: '', descricao: '', capa_url: '', em_breve: false });
  const [moduloDeleteConfirm, setModuloDeleteConfirm] = React.useState<string | null>(null);

  const [comentarios, setComentarios] = React.useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = React.useState('');
  const [nomeUsuario, setNomeUsuario] = React.useState('Trader');
  const [fotoUsuario, setFotoUsuario] = React.useState('');
  const [userId, setUserId] = React.useState<string | null>(null);

  const [progressSet, setProgressSet] = React.useState<Set<string>>(new Set());
  const [moduloBloqueado, setModuloBloqueado] = React.useState<string | null>(null);

  const moduloTemAcesso = (moduloId: string) =>
    isAdmin || !modulosLiberados || modulosLiberados.includes(moduloId);

  const [loadingMods, setLoadingMods] = React.useState(true);
  const [loadingLessons, setLoadingLessons] = React.useState(false);
  const [loadingComments, setLoadingComments] = React.useState(false);

  // 1. Initial load: profile + modules + all aulas + progress
  React.useEffect(() => {
    (async () => {
      setLoadingMods(true);
      const { data: { session } } = await supabase.auth.getSession();
      let uid: string | null = null;
      if (session?.user) {
        uid = session.user.id;
        setUserId(uid);
        try {
          const profile = await getProfile(uid);
          if (profile) {
            setNomeUsuario(profile.nome || 'Trader');
            setFotoUsuario(profile.foto_url || '');
          }
        } catch { }
        try {
          const progresso = await getAulaProgresso(uid);
          const concluidas = new Set<string>(
            (progresso as { aula_id: string; concluida: boolean }[])
              .filter(p => p.concluida)
              .map(p => p.aula_id)
          );
          setProgressSet(concluidas);
          // Carregar todas as aulas e aplicar progresso para cálculos da Tela 1
          const todasAulas = await fetchAulas();
          setAulas((todasAulas as Aula[]).map(a => ({ ...a, concluida: concluidas.has(a.id) })));
        } catch { }
      }
      try {
        const mods = await fetchModulos();
        setModulos(mods as Modulo[]);
      } catch (err) {
        console.error('Erro ao carregar módulos:', err);
      } finally {
        setLoadingMods(false);
      }
    })();
  }, []);

  // 2. Fetch lessons when a module is selected, merging progress
  React.useEffect(() => {
    if (!selectedModulo) return;
    (async () => {
      setLoadingLessons(true);
      try {
        const lessons = await fetchAulas();
        setAulas((lessons as Aula[]).map(a => ({ ...a, concluida: progressSet.has(a.id) })));
      } catch (err) {
        console.error('Erro ao carregar aulas:', err);
      } finally {
        setLoadingLessons(false);
      }
    })();
  }, [selectedModulo]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Fetch comments only when a lesson is selected
  React.useEffect(() => {
    if (!selectedAula) return;
    (async () => {
      setLoadingComments(true);
      try {
        const cmts = await getComentarios();
        setComentarios(cmts as Comentario[]);
      } catch (err) {
        console.error('Erro ao carregar comentários:', err);
      } finally {
        setLoadingComments(false);
      }
    })();
  }, [selectedAula]);

  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    
    // RegEx para capturar ID de diversos formatos do YouTube
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    
    // Fallback: se for apenas o ID de 11 caracteres
    if (!match && url.length === 11) return url;
    
    return match ? match[1] : '';
  };

  const getYoutubeThumbnail = (videoUrl: string) => {
    const videoId = extractYoutubeId(videoUrl);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return '';
  };

  // Adds params that minimise YouTube branding inside the embedded player
  const getEmbedUrl = (videoUrl: string) => {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&color=white&playsinline=1`;
  };

  const handleToggleConcluida = async (aula: Aula) => {
    if (!userId) return;
    const novaConcluida = !aula.concluida;
    try {
      await toggleAulaProgresso(userId, aula.id, novaConcluida);
      setProgressSet(prev => {
        const next = new Set(prev);
        novaConcluida ? next.add(aula.id) : next.delete(aula.id);
        return next;
      });
      setAulas(prev => prev.map(a => a.id === aula.id ? { ...a, concluida: novaConcluida } : a));
      if (selectedAula?.id === aula.id) setSelectedAula({ ...aula, concluida: novaConcluida });
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    }
  };

  const handlePostarComentario = async (aula: Aula) => {
    if (!novoComentario.trim() || !userId) return;
    const moduloDoAula = modulos.find(m => m.id === aula.modulo_id);
    try {
      const saved = await addComentario({
        user_id: userId,
        aula_id: aula.id,
        aula_titulo: aula.titulo,
        modulo_titulo: moduloDoAula?.titulo || '',
        usuario: nomeUsuario,
        foto_url: fotoUsuario,
        texto: novoComentario.trim(),
        data: new Date().toISOString(),
      });
      setComentarios(prev => [saved as Comentario, ...prev]);
      setNovoComentario('');
    } catch (err) {
      console.error('Erro ao postar comentário:', err);
    }
  };

  const getLessonIcon = (tipo?: string, concluida?: boolean) => {
    if (concluida) return <CheckCircle size={16} className="text-apex-trader-primary" />;
    switch (tipo) {
      case 'grafico': return <BarChart3 size={16} className="text-slate-400" />;
      case 'ferramenta': return <Settings size={16} className="text-slate-400" />;
      case 'livro': return <Book size={16} className="text-slate-400" />;
      default: return <Monitor size={16} className="text-slate-400" />;
    }
  };

  const handleSaveAula = async () => {
    if (!selectedModulo) return;
    try {
      const aulaData = editingAula 
        ? { ...editingAula, ...aulaForm }
        : {
            id: crypto.randomUUID(), // Usar UUID do navegador se for novo
            modulo_id: selectedModulo.id,
            ...aulaForm,
            thumbnail_url: '',
            ordem: aulas.filter(a => a.modulo_id === selectedModulo.id).length + 1,
            concluida: false,
          };

      // Sanitizar dados para o banco: remover campos que não existem na tabela (concluida)
      const { concluida: _c, ...dbData } = aulaData as any;
      await upsertAula(dbData);
      
      if (editingAula) {
        setAulas(prev => prev.map(a => a.id === editingAula.id ? (aulaData as Aula) : a));
      } else {
        setAulas(prev => [...prev, aulaData as Aula]);
      }
      setShowAulaForm(false);
      setEditingAula(null);
      setAulaForm(emptyAulaForm);
    } catch (err: any) {
      console.error('Erro ao salvar aula:', err);
      alert(`Erro ao salvar aula: ${err.message || 'Erro no banco de dados'}`);
    }
  };

  const handleEditAula = (aula: Aula) => {
    setEditingAula(aula);
    setAulaForm({ titulo: aula.titulo, descricao: aula.descricao, video_url: aula.video_url, categoria: aula.categoria || '', duracao: aula.duracao || '', nivel: aula.nivel, tipo: aula.tipo || 'video' });
    setShowAulaForm(true);
  };

  const handleDeleteAula = async (id: string) => {
    try {
      await deleteAula(id);
      setAulas(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao excluir aula:', err);
      alert('Erro ao excluir aula do banco de dados.');
    }
  };

  const handleCreateModulo = async () => {
    try {
      // Don't force a UUID, let Supabase handle the ID if it's an identity column
      // but we need an ID for the local state if it's not returned immediately
      const payload: any = {
        ...formNovoModulo,
        ordem: modulos.length + 1,
        progresso: 0,
      };
      
      const saved = await upsertModulo(payload);
      
      if (saved) {
        setModulos(prev => [...prev, saved as Modulo]);
      }
      
      setShowAddModulo(false);
      setFormNovoModulo({ titulo: '', descricao: '', capa_url: '', em_breve: false });
    } catch (err: any) {
      console.error('Erro ao criar módulo:', err);
      alert(`Erro ao criar módulo: ${err.message || err.details || 'Erro no banco de dados. Verifique se a coluna "em_breve" existe na tabela "modulos".'}`);
    }
  };

  const handleDeleteModulo = async (id: string) => {
    try {
      await deleteModulo(id);
      setModulos(prev => prev.filter(m => m.id !== id));
      setModuloDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao excluir módulo:', err);
      alert('Erro ao excluir módulo do banco de dados.');
    }
  };

  // ── Tela 3: Player de aula ──
  if (selectedAula) {
    const aulasDoModuloPlayer = aulas
      .filter(a => a.modulo_id === selectedAula.modulo_id)
      .sort((a, b) => a.ordem - b.ordem);

    const comentariosDaAula = comentarios.filter(
      c => c.aula_id === selectedAula.id && (isAdmin || c.status === 'aprovado')
    );

    const meuComentarioPendente = comentarios.find(
      c => c.aula_id === selectedAula.id && c.status === 'pendente' &&
        c.usuario === nomeUsuario
    );

    // If module is "Coming Soon", only admin can open it
    if (selectedModulo?.em_breve && !isAdmin) {
      setSelectedAula(null);
      setSelectedModulo(null);
      return null;
    }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back */}
        <button
          onClick={() => setSelectedAula(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group"
        >
          <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-apex-trader-primary/20 group-hover:text-apex-trader-primary transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-sm font-bold">Voltar para o Módulo</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* ── Main area ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Player */}
            <div className="glass-card overflow-hidden">
              <div
                className="aspect-video bg-black select-none"
                onContextMenu={e => e.preventDefault()}
              >
                <iframe
                  src={getEmbedUrl(selectedAula.video_url)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedAula.titulo}
                />
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-apex-trader-primary text-black text-[10px] font-bold rounded uppercase">Aula {selectedAula.ordem}</span>
                  {selectedAula.categoria && <span className="text-slate-400 text-xs">{selectedAula.categoria}</span>}
                  {selectedAula.duracao && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
                      <Clock size={11} />{selectedAula.duracao}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedAula.titulo}</h2>
                <p className="text-slate-400 text-sm">{selectedAula.descricao}</p>
                <div className="pt-2">
                  {selectedAula.concluida ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-apex-trader-primary/10 text-apex-trader-primary border border-apex-trader-primary/20">
                        <CheckCircle size={16} fill="currentColor" /> Aula Concluída
                      </div>
                      <button
                        onClick={() => handleToggleConcluida(selectedAula)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                      >
                        Desmarcar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleConcluida(selectedAula)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black text-sm font-bold transition-all"
                      style={{ background: '#34de00', boxShadow: '0 2px 12px rgba(52,222,0,0.25)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
                    >
                      <CheckCircle size={16} /> Marcar como Concluída
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="glass-card p-6 space-y-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MessageSquare size={16} className="text-apex-trader-primary" />
                Comentários
                {comentariosDaAula.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-apex-trader-primary/10 text-apex-trader-primary rounded-full">{comentariosDaAula.length}</span>
                )}
              </h3>

              {/* Post form */}
              {meuComentarioPendente ? (
                <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                  <Clock size={15} className="shrink-0" />
                  Seu comentário está aguardando aprovação do administrador.
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={novoComentario}
                    onChange={e => setNovoComentario(e.target.value)}
                    placeholder="Compartilhe sua dúvida, feedback ou o que aprendeu nesta aula..."
                    rows={3}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-apex-trader-primary resize-none text-white placeholder-slate-600"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handlePostarComentario(selectedAula)}
                      disabled={!novoComentario.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black text-sm font-bold transition-all disabled:opacity-40"
                      style={{ background: '#34de00' }}
                      onMouseEnter={e => { if (novoComentario.trim()) e.currentTarget.style.background = '#2bc900'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#34de00'; }}
                    >
                      <Send size={14} /> Enviar Comentário
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {loadingComments ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-apex-trader-primary/20 border-t-apex-trader-primary rounded-full animate-spin" />
                </div>
              ) : comentariosDaAula.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum comentário aprovado ainda. Seja o primeiro!</p>
              ) : (
                <div className="space-y-3">
                  {comentariosDaAula.map(c => (
                    <div key={c.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {c.foto_url ? (
                            <img src={c.foto_url} alt={c.usuario} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-apex-trader-primary/20 text-apex-trader-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {c.usuario.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-bold">{c.usuario}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && c.status === 'pendente' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full uppercase">Pendente</span>
                          )}
                          <span className="text-[10px] text-slate-600">
                            {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed pl-10">{c.texto}</p>
                      {c.resposta_admin && (
                        <div className="ml-10 mt-2 pl-3 border-l-2 border-apex-trader-primary bg-apex-trader-primary/5 rounded-r-xl py-2.5 pr-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <ShieldCheck size={13} className="text-apex-trader-primary" />
                            <span className="text-[11px] font-bold text-apex-trader-primary uppercase tracking-wider">Resposta do Instrutor</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{c.resposta_admin}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar: lesson list ── */}
          <aside className="lg:w-72 shrink-0">
            <div className="glass-card overflow-hidden sticky top-4">
              <div className="p-4 border-b border-white/5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aulas do Módulo</p>
                <p className="text-sm font-bold mt-0.5">{aulasDoModuloPlayer.length} aulas</p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto divide-y divide-white/5">
                {aulasDoModuloPlayer.map(aula => {
                  const isActive = aula.id === selectedAula.id;
                  const thumb = getYoutubeThumbnail(aula.video_url);
                  return (
                    <div
                      key={aula.id}
                      onClick={() => setSelectedAula(aula)}
                      className={cn(
                        "flex gap-3 p-3 cursor-pointer transition-all",
                        isActive
                          ? "bg-apex-trader-primary/5 border-l-2 border-apex-trader-primary"
                          : "hover:bg-white/5 border-l-2 border-transparent"
                      )}
                    >
                      <div className="w-20 h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-800 relative">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={aula.titulo}
                            className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : null}
                        {isActive && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Play size={16} fill="white" className="text-white" />
                          </div>
                        )}
                        {aula.concluida && !isActive && (
                          <div className="absolute bottom-1 right-1">
                            <CheckCircle2 size={14} className="text-apex-trader-primary drop-shadow" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-bold line-clamp-2 leading-snug", isActive ? "text-apex-trader-primary" : "text-slate-200")}>
                          {aula.titulo}
                        </p>
                        {aula.duracao && (
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock size={9} />{aula.duracao}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── Tela 2: Detalhe do módulo ──
  if (selectedModulo) {
    const aulasDoModulo = aulas.filter(a => a.modulo_id === selectedModulo.id).sort((a, b) => a.ordem - b.ordem);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedModulo(null); setShowAulaForm(false); setEditingAula(null); setEditandoModulo(false); }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group"
          >
            <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-apex-trader-primary/20 group-hover:text-apex-trader-primary transition-all">
              <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-bold">Voltar para Módulos</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => { setFormModulo({ titulo: selectedModulo.titulo, descricao: selectedModulo.descricao, capa_url: selectedModulo.capa_url }); setEditandoModulo(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-slate-400 hover:text-apex-trader-primary hover:bg-apex-trader-primary/10 transition-all"
            >
              <Pencil size={13} /> Editar Módulo
            </button>
          )}
        </div>

        {/* Module edit inline form */}
        {editandoModulo && isAdmin && (
          <div className="glass-card p-6 border border-apex-trader-primary/20" style={{ background: 'rgba(52,222,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-apex-trader-primary">Editar Módulo</h4>
              <button onClick={() => setEditandoModulo(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid gap-3">
              <input
                placeholder="Título do módulo"
                value={formModulo.titulo}
                onChange={e => setFormModulo({ ...formModulo, titulo: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <input
                placeholder="Descrição"
                value={formModulo.descricao}
                onChange={e => setFormModulo({ ...formModulo, descricao: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <input
                placeholder="URL da capa (imagem)"
                value={formModulo.capa_url}
                onChange={e => setFormModulo({ ...formModulo, capa_url: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <label className="flex items-center gap-2 cursor-pointer group/toggle p-1">
                <input 
                  type="checkbox" 
                  checked={formModulo.em_breve} 
                  onChange={e => setFormModulo({ ...formModulo, em_breve: e.target.checked })}
                  className="w-4 h-4 accent-apex-trader-primary"
                />
                <span className="text-xs font-bold text-slate-400 group-hover/toggle:text-white transition-colors">Marcar como "Em Breve" (Apenas visualização)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditandoModulo(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all">Cancelar</button>
              <button
                onClick={async () => {
                  try {
                    const moduloAtualizado = { ...selectedModulo, ...formModulo };
                    await upsertModulo(moduloAtualizado);
                    setModulos(prev => prev.map(m => m.id === selectedModulo.id ? (moduloAtualizado as Modulo) : m));
                    setSelectedModulo(moduloAtualizado as Modulo);
                    setEditandoModulo(false);
                  } catch (err: any) {
                    console.error('Erro ao salvar módulo:', err);
                    alert(`Erro ao salvar módulo: ${err.message || 'Erro no banco de dados'}`);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                style={{ background: '#34de00' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
              >
                Salvar Módulo
              </button>
            </div>
          </div>
        )}

        {/* Module Banner */}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden">
          <img src={selectedModulo.capa_url} alt={selectedModulo.titulo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-8 flex flex-col justify-center">
            <span className="text-xs font-bold text-apex-trader-primary uppercase tracking-widest mb-2">Módulo {selectedModulo.ordem}</span>
            <h2 className="text-2xl font-bold text-white mb-1">{selectedModulo.titulo}</h2>
            <p className="text-slate-300 text-sm">{selectedModulo.descricao}</p>
          </div>
        </div>

        {/* Lessons */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-300">{aulasDoModulo.length} aulas neste módulo</span>
            {isAdmin && (
              <button
                onClick={() => { setShowAulaForm(true); setEditingAula(null); setAulaForm(emptyAulaForm); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-xs font-bold transition-all"
                style={{ background: '#34de00', boxShadow: '0 2px 12px rgba(52,222,0,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
              >
                <Plus size={14} /> Nova Aula
              </button>
            )}
          </div>

          {/* Form add/edit */}
          {showAulaForm && isAdmin && (
            <div className="p-5 border-b border-white/5" style={{ background: 'rgba(52,222,0,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-apex-trader-primary">{editingAula ? 'Editar Aula' : 'Nova Aula'}</h4>
                <button onClick={() => { setShowAulaForm(false); setEditingAula(null); }} className="text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Título da aula"
                  value={aulaForm.titulo}
                  onChange={e => setAulaForm({ ...aulaForm, titulo: e.target.value })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600 col-span-full"
                />
                <input
                  placeholder="Descrição"
                  value={aulaForm.descricao}
                  onChange={e => setAulaForm({ ...aulaForm, descricao: e.target.value })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600 col-span-full"
                />
                <input
                  placeholder="URL do vídeo (embed)"
                  value={aulaForm.video_url}
                  onChange={e => setAulaForm({ ...aulaForm, video_url: e.target.value })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600 col-span-full"
                />
                <input
                  placeholder="Categoria"
                  value={aulaForm.categoria}
                  onChange={e => setAulaForm({ ...aulaForm, categoria: e.target.value })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
                />
                <input
                  placeholder="Duração (ex: 15 min)"
                  value={aulaForm.duracao}
                  onChange={e => setAulaForm({ ...aulaForm, duracao: e.target.value })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
                />
                <select
                  value={aulaForm.nivel}
                  onChange={e => setAulaForm({ ...aulaForm, nivel: e.target.value as Aula['nivel'] })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
                <select
                  value={aulaForm.tipo}
                  onChange={e => setAulaForm({ ...aulaForm, tipo: e.target.value as Aula['tipo'] })}
                  className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white"
                >
                  <option value="video">Vídeo</option>
                  <option value="grafico">Gráfico</option>
                  <option value="livro">Leitura</option>
                  <option value="ferramenta">Ferramenta</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setShowAulaForm(false); setEditingAula(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAula}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                  style={{ background: '#34de00' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
                >
                  {editingAula ? 'Salvar Alterações' : 'Adicionar Aula'}
                </button>
              </div>
            </div>
          )}

          {loadingLessons ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-apex-trader-primary/20 border-t-apex-trader-primary rounded-full animate-spin" />
              <p className="text-slate-500 text-sm font-medium">Carregando aulas...</p>
            </div>
          ) : aulasDoModulo.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              Nenhuma aula cadastrada neste módulo.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {aulasDoModulo.map((aula) => (
                <div
                  key={aula.id}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group/aula"
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => setSelectedAula(aula)}
                  >
                    <div className={cn(
                      "p-2 rounded-xl shrink-0",
                      aula.concluida ? "bg-apex-trader-primary/10" : "bg-white/5"
                    )}>
                      {getLessonIcon(aula.tipo, aula.concluida)}
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover/aula:text-white transition-colors">{aula.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{aula.categoria}</span>
                        {aula.duracao && <>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} />{aula.duracao}</span>
                        </>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {aula.concluida && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-apex-trader-primary/10 text-apex-trader-primary uppercase">Concluído</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleConcluida(aula); }}
                      title={aula.concluida ? 'Desmarcar como concluída' : 'Marcar como concluída'}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        aula.concluida
                          ? "bg-apex-trader-primary/10 text-apex-trader-primary hover:bg-apex-trader-primary/20"
                          : "bg-white/5 text-slate-600 hover:text-apex-trader-primary hover:bg-apex-trader-primary/10"
                      )}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <div
                      className="p-2 bg-white/5 rounded-xl text-slate-500 group-hover/aula:text-apex-trader-primary group-hover/aula:bg-apex-trader-primary/10 transition-all cursor-pointer"
                      onClick={() => setSelectedAula(aula)}
                    >
                      <Play size={14} fill="currentColor" />
                    </div>
                    {isAdmin && (
                      <>
                        {deleteConfirm === aula.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteAula(aula.id)} className="text-[10px] font-bold px-2 py-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">Confirmar</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[10px] font-bold px-2 py-1 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition-all">Cancelar</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleEditAula(aula)} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-apex-trader-primary hover:bg-apex-trader-primary/10 transition-all">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteConfirm(aula.id)} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Tela 1: Grade de módulos ──
  return (
    <div className="space-y-8">
      {/* Course Cover */}
      <div className="relative w-full h-[420px] md:h-[700px] rounded-[2rem] overflow-hidden glass-card border-none shadow-2xl">
        <img
          src="https://i.imgur.com/rC760mh.jpeg"
          alt="Capa do Curso"
          className="w-full h-full object-cover hidden md:block"
          referrerPolicy="no-referrer"
        />
        <img
          src="https://i.imgur.com/w6QilE7.png"
          alt="Capa do Curso Mobile"
          className="w-full h-full object-cover block md:hidden"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* General Progress */}
      {(() => {
        const totalAulas = aulas.length;
        const aulasConcluidas = aulas.filter(a => a.concluida).length;
        const percentualGeral = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;
        return (
          <div className="glass-card p-6 md:p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Trophy size={100} />
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Progresso Geral do Curso</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-white">{percentualGeral}%</span>
                  <span className="text-slate-400 font-medium text-sm">Concluído</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm font-bold">
                <div className="flex flex-col items-end">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">Aulas Concluídas</span>
                  <span className="text-white">{aulasConcluidas} / {totalAulas}</span>
                </div>
              </div>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${percentualGeral}%`, background: 'linear-gradient(90deg, #34de00, #2bc900)', boxShadow: '0 0 16px rgba(52,222,0,0.4)' }}
              />
            </div>
          </div>
        );
      })()}

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Módulos de Treinamento</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddModulo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-xs font-bold transition-all"
              style={{ background: '#34de00', boxShadow: '0 2px 12px rgba(52,222,0,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
              onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
            >
              <Plus size={14} /> Adicionar Módulo
            </button>
          )}
        </div>

        {showAddModulo && isAdmin && (
          <div className="glass-card p-6 mb-8 border border-apex-trader-primary/20" style={{ background: 'rgba(52,222,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-apex-trader-primary uppercase tracking-widest">Novo Módulo</h4>
              <button onClick={() => setShowAddModulo(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                placeholder="Título do módulo"
                value={formNovoModulo.titulo}
                onChange={e => setFormNovoModulo({ ...formNovoModulo, titulo: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <input
                placeholder="Descrição resumida"
                value={formNovoModulo.descricao}
                onChange={e => setFormNovoModulo({ ...formNovoModulo, descricao: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <input
                placeholder="URL da imagem de capa"
                value={formNovoModulo.capa_url}
                onChange={e => setFormNovoModulo({ ...formNovoModulo, capa_url: e.target.value })}
                className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <label className="flex items-center gap-2 cursor-pointer group/toggle p-1">
                <input 
                  type="checkbox" 
                  checked={formNovoModulo.em_breve} 
                  onChange={e => setFormNovoModulo({ ...formNovoModulo, em_breve: e.target.checked })}
                  className="w-4 h-4 accent-apex-trader-primary"
                />
                <span className="text-xs font-bold text-slate-400 group-hover/toggle:text-white transition-colors">Marcar como "Em Breve"</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => setShowAddModulo(false)} 
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateModulo}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                style={{ background: '#34de00' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
              >
                Criar Módulo
              </button>
            </div>
          </div>
        )}

        {/* Modal de módulo bloqueado */}
        {moduloBloqueado && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setModuloBloqueado(null)}
          >
            <div
              className="glass-card max-w-sm w-full p-8 text-center space-y-5"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="inline-flex p-4 bg-amber-500/10 rounded-2xl text-amber-400 mb-1">
                <Lock size={36} />
              </div>
              <h3 className="text-xl font-bold">Conteúdo Bloqueado</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Para acessar as aulas do <strong className="text-white">{moduloBloqueado}</strong>, você precisa fazer parte da assinatura do <strong className="text-apex-trader-primary">Guia's Academy</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Entre em contato com o administrador para liberar o acesso a este módulo.
              </p>
              <button
                onClick={() => setModuloBloqueado(null)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {loadingMods ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card aspect-[4/5] animate-pulse bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modulos.map((modulo) => {
              const bloqueado = !moduloTemAcesso(modulo.id);
              const aulasMod = aulas.filter(a => a.modulo_id === modulo.id);
              const concluidasMod = aulasMod.filter(a => a.concluida).length;
              const progressoMod = aulasMod.length > 0 ? Math.round((concluidasMod / aulasMod.length) * 100) : 0;
              return (
                <div
                  key={modulo.id}
                  onClick={() => {
                    if (modulo.em_breve && !isAdmin) return;
                    if (bloqueado) { setModuloBloqueado(modulo.titulo); return; }
                    setSelectedModulo(modulo);
                  }}
                  className={cn(
                    "glass-card overflow-hidden cursor-pointer group hover:border-apex-trader-primary/30 hover:bg-white/[0.03] transition-all duration-300",
                    modulo.em_breve && !isAdmin && "opacity-70 cursor-not-allowed grayscale",
                    bloqueado && "opacity-75"
                  )}
                >
                  {/* Image — portrait 4:5 to match 1080×1320 uploads */}
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img
                      src={modulo.capa_url}
                      alt={modulo.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white rounded-lg uppercase tracking-widest border border-white/10">
                        Mod. {modulo.ordem}
                      </span>
                      {modulo.em_breve && (
                        <span className="px-2.5 py-1 bg-apex-trader-primary/90 backdrop-blur-md text-[10px] font-black text-black rounded-lg uppercase tracking-widest border border-white/10 shadow-lg">
                          Em Breve
                        </span>
                      )}
                      {bloqueado && (
                        <span className="px-2.5 py-1 bg-amber-500/80 backdrop-blur-md text-[10px] font-black text-black rounded-lg uppercase tracking-widest border border-white/10 shadow-lg flex items-center gap-1">
                          <Lock size={9} /> Bloqueado
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg",
                        modulo.em_breve && !isAdmin ? "bg-slate-600 text-slate-400" : bloqueado ? "bg-amber-500/80 text-black" : "text-black"
                      )} style={!modulo.em_breve && !bloqueado ? { background: '#34de00' } : undefined}>
                        {modulo.em_breve && !isAdmin ? <Clock size={16} /> : bloqueado ? <Lock size={16} /> : <Play size={16} fill="currentColor" />}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="absolute top-3 right-3 flex gap-2">
                        {moduloDeleteConfirm === modulo.id ? (
                          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteModulo(modulo.id); }}
                              className="text-[8px] font-black px-1.5 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"
                            >Sim</button>
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setModuloDeleteConfirm(null); }}
                              className="text-[8px] font-black px-1.5 py-1 bg-white/10 text-slate-300 rounded hover:bg-white/20"
                            >Não</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setModuloDeleteConfirm(modulo.id); }}
                            className="p-2 bg-black/60 backdrop-blur-md text-slate-400 hover:text-red-400 rounded-lg border border-white/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-base font-bold text-white group-hover:text-trademaster-blue transition-colors leading-snug mb-1.5 line-clamp-2">
                      {modulo.titulo}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">{modulo.descricao}</p>
                    {bloqueado ? (
                      <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                        <Lock size={11} /> Requer assinatura do Academy
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-600">Progresso</span>
                          <span className="text-trademaster-blue">{progressoMod}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-trademaster-blue rounded-full" style={{ width: `${progressoMod}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
