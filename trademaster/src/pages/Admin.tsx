import React from 'react';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Filter,
  MoreVertical,
  TrendingUp,
  Clock,
  BookOpen,
  Calendar,
  Settings,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Mail,
  Lock,
  CalendarDays,
  UserPlus,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Send,
  FileText,
  X,
  Pencil,
  Loader2,
  History,
  Save,
  Zap,
  TrendingDown,
  BarChart,
  BarChart3,
   Flame,
   LayoutGrid,
   Activity,
   DollarSign,
   Wrench,
 } from 'lucide-react';
import { cn } from '../lib/utils';
import { servicoVelas } from '../lib/websocket-velas';
import { analisarQuadrante } from '../lib/motor-quadrantes';
import { obterAtivosDisponiveis, obterSessaoVorna } from '../lib/vorna';
import { Comentario, Questao, ConfigProva, EstrategiaAnalise, Gerenciamento, ConfigAutomacaoPlataforma, AUTOMACAO_PLATAFORMA_KEY, CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT, ManutencaoConfig } from '../types';
import MetricsFluxoVelasContent from './MetricsFluxoVelas';
import MetricsLogicaPrecoContent from './MetricsLogicaPreco';
import MetricsImpulsoCorrecaoEngolfoContent from './MetricsImpulsoCorrecaoEngolfo';
import MetricsQuadrantes5minContent from './MetricsQuadrantes5min';
import MetricsCavaloTroiaContent from './MetricsCavaloTroia';
import GaleTab from '../components/GaleTab';
import { supabase } from '../lib/supabase';
import {
  getComentarios, updateComentario, deleteComentario as delComentario,
  getConfigProva, saveConfigProva as saveCfgProva,
  getAvisos as fetchAvisos, createAviso, deleteAviso as delAviso,
  getAllProfiles, updateProfile, approveUser, rejectUser, upgradeTier,
  getTodasOperacoes, updateOperacao, addOperacao, upsertOperacoesBatch,
  deleteTodasOperacoesUsuario, updateCopyTradeAtivo,
  getModulos as fetchModulosAdmin,
  criarAlunoManual,
  type ProfileRow,
  type OperacaoRow,
} from '../lib/supabaseService';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Admin() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'enrollment' | 'settings' | 'comentarios' | 'prova' | 'notificacoes' | 'operacoes' | 'manipulacao' | 'metricas' | 'vps' | 'automacao' | 'manutencao'>('overview');
  const [vpsStatus, setVpsStatus] = React.useState<any[]>([]);

  // ── Manutenção ──
  const SECOES_MANUTENCAO = [
    { key: 'dashboard', label: 'Visão Geral (Dashboard)' },
    { key: 'operacoes', label: 'Operações' },
    { key: 'mindset', label: 'Mindset' },
    { key: 'aulas', label: 'Treinamentos' },
    { key: 'corretora', label: 'Corretora' },
    { key: 'gestao', label: 'Gestão de Risco' },
    { key: 'desafio', label: 'Desafio 3P' },
    { key: 'prova', label: 'Prova Final' },
    { key: 'planilha', label: 'Planilha' },
    { key: 'calculadora', label: 'Calculadora Forex' },
  ];
  const defaultManutencao: ManutencaoConfig = {
    id: 'global',
    ativo: false,
    secoes: [],
    mensagem: 'Estamos realizando melhorias. Voltamos em breve!',
    termino_em: null,
    atualizado_em: new Date().toISOString(),
  };
  const [manutencaoConfig, setManutencaoConfig] = React.useState<ManutencaoConfig>(defaultManutencao);
  const [manutencaoLoading, setManutencaoLoading] = React.useState(false);
  const [manutencaoSalvo, setManutencaoSalvo] = React.useState(false);
  const [terminoEmInput, setTerminoEmInput] = React.useState('');
  const [vpsLoadingId, setVpsLoadingId] = React.useState<string | null>(null);

  const carregarStatusVPS = React.useCallback(async () => {
    try {
      const res = await fetch('/api/vps-health');
      const data = await res.json();
      setVpsStatus(data.bots || []);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'vps') return;
    carregarStatusVPS();
    const id = setInterval(carregarStatusVPS, 15000);
    return () => clearInterval(id);
  }, [activeTab, carregarStatusVPS]);

  React.useEffect(() => {
    if (activeTab !== 'manutencao') return;
    supabase.from('configuracoes_manutencao').select('*').eq('id', 'global').single()
      .then(({ data }) => {
        if (data) {
          setManutencaoConfig(data as ManutencaoConfig);
          if (data.termino_em) {
            const d = new Date(data.termino_em);
            const offset = d.getTimezoneOffset() * 60000;
            setTerminoEmInput(new Date(d.getTime() - offset).toISOString().slice(0, 16));
          } else {
            setTerminoEmInput('');
          }
        }
      });
  }, [activeTab]);

  const salvarManutencao = async () => {
    setManutencaoLoading(true);
    try {
      const payload: Partial<ManutencaoConfig> = {
        ativo: manutencaoConfig.ativo,
        secoes: manutencaoConfig.secoes,
        mensagem: manutencaoConfig.mensagem,
        termino_em: terminoEmInput ? new Date(terminoEmInput).toISOString() : null,
        atualizado_em: new Date().toISOString(),
      };
      await supabase.from('configuracoes_manutencao').upsert({ id: 'global', ...payload });
      setManutencaoSalvo(true);
      setTimeout(() => setManutencaoSalvo(false), 2500);
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setManutencaoLoading(false);
    }
  };

  const toggleSecaoManutencao = (key: string) => {
    setManutencaoConfig(prev => ({
      ...prev,
      secoes: prev.secoes.includes(key)
        ? prev.secoes.filter(s => s !== key)
        : [...prev.secoes, key],
    }));
  };

  const toggleVpsAluno = async (profile: ProfileRow) => {
    setVpsLoadingId(profile.id);
    try {
      await updateProfile(profile.id, { vps_ativo: !profile.vps_ativo });
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, vps_ativo: !p.vps_ativo } : p));
    } catch (e: any) {
      alert('Erro ao atualizar VPS: ' + e.message);
    } finally {
      setVpsLoadingId(null);
    }
  };

  const pararBotVPS = async (userId: string) => {
    try {
      await fetch('/api/vps-bot-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await carregarStatusVPS();
    } catch (e: any) {
      alert('Erro ao parar bot: ' + e.message);
    }
  };
  const [estrategiaMetricas, setEstrategiaMetricas] = React.useState<EstrategiaAnalise>('Quadrantes');

  // Config de automação da plataforma (localStorage)
  const [configAutomacao, setConfigAutomacao] = React.useState<ConfigAutomacaoPlataforma>(() => {
    try {
      const saved = localStorage.getItem(AUTOMACAO_PLATAFORMA_KEY);
      return saved ? JSON.parse(saved) : { ...CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT };
    } catch {
      return { ...CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT };
    }
  });
  const [automacaoSalvo, setAutomacaoSalvo] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<ProfileRow | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('Todos');
  const [userFilter, setUserFilter] = React.useState<string | null>(null);

  // Real profiles from Supabase
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(true);

  const [comentarios, setComentarios] = React.useState<Comentario[]>([]);
  const [comentarioFilter, setComentarioFilter] = React.useState<'todos' | 'pendente' | 'aprovado'>('todos');

  // Comment replies — one textarea per comment id
  const [respostas, setRespostas] = React.useState<Record<string, string>>({});

  // Enrollment form state
  const [enrollEmail, setEnrollEmail] = React.useState('');
  const [enrollPassword, setEnrollPassword] = React.useState('');
  const [enrollRole, setEnrollRole] = React.useState<'admin' | 'user'>('user');
  const [enrollDias, setEnrollDias] = React.useState<string>('30');
  const [enrollDataInicio, setEnrollDataInicio] = React.useState(new Date().toISOString().split('T')[0]);
  const [enrollVorna, setEnrollVorna] = React.useState(false);
  const [enrollPlanilha, setEnrollPlanilha] = React.useState(false);
  const [enrollTodosModulos, setEnrollTodosModulos] = React.useState(true);
  const [enrollModulos, setEnrollModulos] = React.useState<string[]>([]);
  const [enrollLoading, setEnrollLoading] = React.useState(false);
  const [enrollErro, setEnrollErro] = React.useState('');
  const [enrollSucesso, setEnrollSucesso] = React.useState('');
  const [modulosDisponiveis, setModulosDisponiveis] = React.useState<{ id: string; titulo: string }[]>([]);

  // Prova state
  const emptyConfigProva: ConfigProva = { questoes: [], nota_minima: 70, whatsapp_certificado: '', ativa: false };
  const [configProva, setConfigProva] = React.useState<ConfigProva>(emptyConfigProva);
  const [configProvaId, setConfigProvaId] = React.useState<string | null>(null);
  const emptyQuestao = (): Questao => ({ id: '', texto: '', imagem_url: '', opcoes: ['', '', '', ''], resposta_correta: 0, pontos: 1 });
  const [showQuestaoForm, setShowQuestaoForm] = React.useState(false);
  const [questaoForm, setQuestaoForm] = React.useState<Questao>(emptyQuestao());

  // Notificacoes state
  interface Aviso {
    id: string;
    titulo: string;
    mensagem: string;
    destinatarios: number;
    created_at: string;
  }
  const [avisos, setAvisos] = React.useState<Aviso[]>([]);
  const [avisoTitulo, setAvisoTitulo] = React.useState('');
  const [avisoMensagem, setAvisoMensagem] = React.useState('');
  const [enviandoAviso, setEnviandoAviso] = React.useState(false);

  // Operações state
  const [todasOperacoes, setTodasOperacoes] = React.useState<(OperacaoRow & { profiles: { email: string | null, nome: string | null } })[]>([]);
  const [opsLoading, setOpsLoading] = React.useState(false);
  const [editingOp, setEditingOp] = React.useState<string | null>(null);
  const [editOpData, setEditOpData] = React.useState<Partial<OperacaoRow>>({});
  const [savingOp, setSavingOp] = React.useState(false);

  // Manipulação de Alunos (Gestão de Resultados)
  const [manipSelectedProfile, setManipSelectedProfile] = React.useState<ProfileRow | null>(null);
  const [manipManualMode, setManipManualMode] = React.useState(false);
  const [manipBancaAtual, setManipBancaAtual] = React.useState(0);
  const [manipWinRate, setManipWinRate] = React.useState(0);
  const [isSavingManip, setIsSavingManip] = React.useState(false);

  const [newManualOp, setNewManualOp] = React.useState({
    ativo: 'EUR/USD',
    direcao: 'compra' as 'compra' | 'venda',
    resultado: 'vitoria' as 'vitoria' | 'derrota',
    lucro: 10,
    investido: 10,
    payout: 80,
    mercado: 'forex' as 'forex' | 'cripto',
    estrategia: 'Manual'
  });
  const [isAddingOp, setIsAddingOp] = React.useState(false);

  // Batch Generator State
  const [batchGen, setBatchGen] = React.useState({
    vitorias: 10,
    derrotas: 5,
    valorEntrada: 100,
    payout: 80,
    ativo: 'BTC/USD',
    mercado: 'cripto' as 'forex' | 'cripto'
  });
  const [isGeneratingBatch, setIsGeneratingBatch] = React.useState(false);
  const [timeFilter, setTimeFilter] = React.useState<'hoje' | 'ontem' | '7d' | 'todos'>('hoje');
  
  // Backtest State
  const [backtestAtivosSelecionados, setBacktestAtivosSelecionados] = React.useState<string[]>(['EUR/USD', 'EUR/GBP', 'USD/JPY']);
  const [backtestAtivo, setBacktestAtivo] = React.useState('EUR/USD');
  const [backtestDataInicio, setBacktestDataInicio] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Padrão: 14 dias (2 semanas)
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
  const [backtestDataFim, setBacktestDataFim] = React.useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
  const [backtestVelas, setBacktestVelas] = React.useState<any[]>([]);
  const [backtestLoading, setBacktestLoading] = React.useState(false);
  const [refreshCounter, setRefreshCounter] = React.useState(0);
  const [comparativoReady, setComparativoReady] = React.useState(0);

  // Ativos disponíveis para seleção — carregados da Vorna, com fallback para lista padrão
  const ATIVOS_FALLBACK = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'GBP/JPY', 'GBP/CHF',
    'EUR/JPY', 'USD/CHF', 'NZD/USD', 'AUD/CAD', 'EUR/CHF', 'EUR/CAD', 'CHF/JPY', 'GBP/AUD',
    'CAD/JPY', 'CAD/CHF', 'GBP/CAD', 'AUD/JPY', 'EUR/NZD', 'NZD/CAD', 'NZD/CHF', 'AUD/NZD', 'EUR/AUD',
    'BTC/USD', 'BTC/USDT', 'ETH/USDT', 'ETH/USD', 'BNB/USDT', 'SOL/USDT', 'SOL/USD',
    'Ouro', 'Prata', 'Wall Street 30', 'USTech 100', 'US SPX 500',
  ];
  const [ativosPadrao, setAtivosPadrao] = React.useState<string[]>(ATIVOS_FALLBACK);

  // Ao montar, tenta carregar lista real de ativos da Vorna (se sessão disponível)
  React.useEffect(() => {
    const sessao = obterSessaoVorna();
    if (!sessao?.conectado || !sessao.ssid) return;
    obterAtivosDisponiveis().then(ativos => {
      const disponiveis = ativos
        .filter(a => a.instrumentType === 'blitz' && !a.isSuspended)
        .map(a => a.displayName);
      if (disponiveis.length > 0) setAtivosPadrao(disponiveis);
    }).catch(() => {});
  }, []);

  // Load all admin data from Supabase
  const loadProfiles = async () => {
    setProfilesLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch { }
    setProfilesLoading(false);
  };

  const loadOperacoes = async () => {
    setOpsLoading(true);
    try {
      const data = await getTodasOperacoes();
      setTodasOperacoes(data);
    } catch (err) {
      console.error('Erro ao carregar operações:', err);
    }
    setOpsLoading(false);
  };

  React.useEffect(() => {
    if (manipSelectedProfile) {
      setManipManualMode(manipSelectedProfile.performance_manual || false);
      setManipBancaAtual(manipSelectedProfile.banca_atual || 0);
      setManipWinRate(manipSelectedProfile.win_rate || 0);
    }
  }, [manipSelectedProfile]);

  React.useEffect(() => {
    loadProfiles();
    (async () => {
      try {
        const cmts = await getComentarios();
        setComentarios(cmts as Comentario[]);
        const map: Record<string, string> = {};
        (cmts as Comentario[]).forEach(c => { if (c.resposta_admin) map[c.id] = c.resposta_admin; });
        setRespostas(map);
      } catch { }
      try {
        const cfg: any = await getConfigProva();
        if (cfg) {
          setConfigProvaId(cfg.id || null);
          setConfigProva({ questoes: cfg.questoes || [], nota_minima: cfg.nota_minima, whatsapp_certificado: cfg.whatsapp_certificado || '', ativa: cfg.ativa });
        }
      } catch { }
      try {
        const av = await fetchAvisos();
        setAvisos(av as Aviso[]);
      } catch { }
      loadOperacoes();
    })();
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'enrollment') return;
    fetchModulosAdmin().then((mods: any[]) => {
      setModulosDisponiveis(mods.map((m: any) => ({ id: m.id, titulo: m.titulo })));
    }).catch(() => {});
  }, [activeTab]);

  // Efeito para carregar histórico do ativo PRINCIPAL (carrega 6 meses de uma vez)
  // NÃO depende de backtestDataInicio/Fim — datas são apenas filtros, não triggers de reload
  React.useEffect(() => {
    if (activeTab !== 'metricas') return;

    const abortController = new AbortController();
    setBacktestVelas([]);
    setBacktestLoading(true);

    // Carregar 6 meses de histórico fixo (de NOW até 180 dias atrás)
    const tsFim = Math.floor(Date.now() / 1000);
    const tsInicio = Math.floor((Date.now() - 180 * 86400000) / 1000);

    let lastProgressTime = 0;
    servicoVelas.carregarHistoricoLongo(backtestAtivo, tsInicio, tsFim, (count) => {
      if (abortController.signal.aborted) return;
      const now = Date.now();
      if (now - lastProgressTime >= 3000 && count > 100) {
        lastProgressTime = now;
        setBacktestVelas(servicoVelas.obterVelasDeAtivo(backtestAtivo));
      }
    }, abortController.signal).then(() => {
      if (abortController.signal.aborted) return;
      const velas = servicoVelas.obterVelasDeAtivo(backtestAtivo);
      if (velas.length > 0) setBacktestVelas(velas);
      setBacktestLoading(false);
    }).catch(() => {
      if (!abortController.signal.aborted) setBacktestLoading(false);
    });

    return () => {
      abortController.abort();
      servicoVelas.cancelarCarregamento(backtestAtivo);
    };
  }, [backtestAtivo, activeTab]);

  // Efeito SEPARADO para carregar ativos de comparação (aguarda ativo principal primeiro)
  React.useEffect(() => {
    if (activeTab !== 'metricas') return;

    const outrosAtivos = backtestAtivosSelecionados.filter(a => a !== backtestAtivo);
    if (outrosAtivos.length === 0) return;

    const abortController = new AbortController();
    const tsFim = Math.floor(Date.now() / 1000);
    const tsInicio = Math.floor((Date.now() - 180 * 86400000) / 1000);

    // Aguardar 3s para o ativo principal carregar antes de iniciar comparativos
    const timer = setTimeout(() => {
      if (abortController.signal.aborted) return;
      const loadOthers = outrosAtivos.map(ativo => {
        return servicoVelas.carregarHistoricoLongo(ativo, tsInicio, tsFim, undefined, abortController.signal);
      });

      Promise.race([
        Promise.all(loadOthers),
        new Promise(resolve => setTimeout(resolve, 60000))
      ]).then(() => {
        if (!abortController.signal.aborted) {
          setComparativoReady(prev => prev + 1);
        }
      });
    }, 3000);

    return () => {
      abortController.abort();
      clearTimeout(timer);
      outrosAtivos.forEach(a => servicoVelas.cancelarCarregamento(a));
    };
  }, [backtestAtivo, activeTab, backtestAtivosSelecionados]);


  const handleSubmitAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avisoTitulo.trim() || !avisoMensagem.trim()) return;

    try {
      const novo = await createAviso({
        titulo: avisoTitulo,
        mensagem: avisoMensagem,
        destinatarios: profiles.length
      });
      setAvisos(prev => [novo as Aviso, ...prev]);
      setAvisoTitulo('');
      setAvisoMensagem('');
      // Dispara evento para o Layout.tsx próprio do admin também atualizar o sininho
      window.dispatchEvent(new Event('guias_notification_update'));
      alert('Aviso enviado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar aviso.');
    }
  };

  // Approve / Reject user handlers
  const handleApproveUser = async (userId: string) => {
    await approveUser(userId);
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, aprovado_por_admin: true } : p));
  };

  const handleRejectUser = async (userId: string) => {
    await rejectUser(userId);
    setProfiles(prev => prev.filter(p => p.id !== userId));
  };

  const comentariosFiltrados = comentarios.filter(c =>
    comentarioFilter === 'todos' ? true : c.status === comentarioFilter
  );

  const handleAprovar = async (id: string) => {
    try { await updateComentario(id, { status: 'aprovado' }); } catch { }
    setComentarios(prev => prev.map(c => c.id === id ? { ...c, status: 'aprovado' as const } : c));
  };

  const handleDeletar = async (id: string) => {
    try { await delComentario(id); } catch { }
    setComentarios(prev => prev.filter(c => c.id !== id));
  };

  const handleResponder = async (id: string) => {
    const texto = (respostas[id] || '').trim();
    if (!texto) return;
    try { await updateComentario(id, { resposta_admin: texto }); } catch { }
    setComentarios(prev => prev.map(c => c.id === id ? { ...c, resposta_admin: texto } : c));
  };

  const handleSaveConfigProva = async (cfg: ConfigProva) => {
    setConfigProva(cfg);
    try { await saveCfgProva({ ...cfg, id: configProvaId || undefined }); } catch (err) { console.error(err); }
  };

  const handleSaveQuestao = (q: Questao) => {
    let novasQuestoes: Questao[];
    if (q.id) {
      novasQuestoes = configProva.questoes.map(x => x.id === q.id ? q : x);
    } else {
      novasQuestoes = [...configProva.questoes, { ...q, id: Date.now().toString() }];
    }
    handleSaveConfigProva({ ...configProva, questoes: novasQuestoes });
    setShowQuestaoForm(false);
    setQuestaoForm(emptyQuestao());
  };

  const handleDeleteQuestao = (id: string) => {
    handleSaveConfigProva({ ...configProva, questoes: configProva.questoes.filter(q => q.id !== id) });
  };

  const pendingProfiles = profiles.filter(p => !p.aprovado_por_admin && p.role !== 'admin');
  const approvedProfiles = profiles.filter(p => p.aprovado_por_admin || p.role === 'admin');

  const filteredProfiles = profiles.filter(p => {
    const name = p.nome || p.email || '';
    const email = p.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'Todos') return matchesSearch;
    if (statusFilter === 'Pendente') return matchesSearch && !p.aprovado_por_admin && p.role !== 'admin';
    if (statusFilter === 'Aprovado') return matchesSearch && (p.aprovado_por_admin || p.role === 'admin');
    return matchesSearch;
  });

  const handleUpdateOp = async (opId: string) => {
    if (savingOp) return;
    setSavingOp(true);
    try {
      await updateOperacao(opId, editOpData);
      setTodasOperacoes(prev => prev.map(op => op.id === opId ? { ...op, ...editOpData } : op));
      setEditingOp(null);
      alert('Operação atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar operação.');
    } finally {
      setSavingOp(false);
    }
  };

  const handleSaveManip = async () => {
    if (!manipSelectedProfile || isSavingManip) return;
    setIsSavingManip(true);
    try {
      await updateProfile(manipSelectedProfile.id, {
        performance_manual: manipManualMode,
        banca_atual: manipBancaAtual,
        win_rate: manipWinRate
      } as any);
      setProfiles(prev => prev.map(p => p.id === manipSelectedProfile.id ? { 
        ...p, 
        performance_manual: manipManualMode,
        banca_atual: manipBancaAtual,
        win_rate: manipWinRate
      } : p));
      alert('Resultado manipulado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar manipulação.');
    } finally {
      setIsSavingManip(false);
    }
  };

  const handleAddManualOp = async () => {
    if (!manipSelectedProfile || isAddingOp) return;
    setIsAddingOp(true);
    try {
      const now = new Date();
      const opData = {
        user_id: manipSelectedProfile.id,
        data: now.toISOString().split('T')[0],
        hora: now.toLocaleTimeString('pt-BR', { hour12: false }),
        ativo: newManualOp.ativo,
        direcao: newManualOp.direcao,
        resultado: newManualOp.resultado,
        lucro: newManualOp.lucro,
        investido: newManualOp.investido,
        payout: newManualOp.payout,
        mercado: newManualOp.mercado,
        estrategia: newManualOp.estrategia,
        corretora: 'Manual (Admin)',
        timeframe: 'M1',
        confianca: 100
      };
      await addOperacao(opData);
      alert('Operação adicionada com sucesso!');
      loadOperacoes(); // Refresh list if on ops tab
    } catch (err: any) {
      console.error(err);
      const msg = err.message || err.details || JSON.stringify(err);
      alert('Erro ao adicionar operação: ' + msg);
    } finally {
      setIsAddingOp(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!manipSelectedProfile || isGeneratingBatch) return;
    if (!window.confirm(`Deseja gerar ${batchGen.vitorias + batchGen.derrotas} operações para este aluno?`)) return;
    
    setIsGeneratingBatch(true);
    try {
      const opsToInsert = [];
      const now = new Date();
      
      const lucroWin = parseFloat((batchGen.valorEntrada * (batchGen.payout / 100)).toFixed(2));
      const perdaLoss = -batchGen.valorEntrada;

      // Criar vitórias
      for (let i = 0; i < batchGen.vitorias; i++) {
        const d = new Date(now);
        d.setMinutes(now.getMinutes() - (i * 15)); // Espaçar operações
        opsToInsert.push({
          user_id: manipSelectedProfile.id,
          data: d.toISOString().split('T')[0],
          hora: d.toLocaleTimeString('pt-BR', { hour12: false }),
          ativo: batchGen.ativo,
          direcao: (Math.random() > 0.5 ? 'compra' : 'venda') as any,
          resultado: 'vitoria' as any,
          lucro: lucroWin,
          investido: batchGen.valorEntrada,
          payout: batchGen.payout,
          mercado: batchGen.mercado,
          estrategia: 'Injeção Automação',
          corretora: 'Manual (Admin)',
          timeframe: 'M1',
          confianca: 100
        });
      }

      // Criar derrotas
      for (let i = 0; i < batchGen.derrotas; i++) {
        const d = new Date(now);
        d.setMinutes(now.getMinutes() - (i * 15) - 7);
        opsToInsert.push({
          user_id: manipSelectedProfile.id,
          data: d.toISOString().split('T')[0],
          hora: d.toLocaleTimeString('pt-BR', { hour12: false }),
          ativo: batchGen.ativo,
          direcao: (Math.random() > 0.5 ? 'compra' : 'venda') as any,
          resultado: 'derrota' as any,
          lucro: perdaLoss,
          investido: batchGen.valorEntrada,
          payout: batchGen.payout,
          mercado: batchGen.mercado,
          estrategia: 'Injeção Automação',
          corretora: 'Manual (Admin)',
          timeframe: 'M1',
          confianca: 100
        });
      }

      // Usar a função de batch do Supabase
      await upsertOperacoesBatch(opsToInsert as any);
      
      // Calcular e atualizar banca/winrate opcionalmente
      const totalLucro = (batchGen.vitorias * lucroWin) + (batchGen.derrotas * perdaLoss);
      const totalOps = batchGen.vitorias + batchGen.derrotas;
      const winRateFinal = Math.round((batchGen.vitorias / totalOps) * 100);
      
      const novaBanca = (manipSelectedProfile.banca_atual || 0) + totalLucro;
      
      // Pergunta se quer atualizar o perfil também
      if (window.confirm(`Operações criadas! Deseja também atualizar a Banca para R$ ${novaBanca.toFixed(2)} e Win Rate para ${winRateFinal}% no perfil do aluno?`)) {
        setManipBancaAtual(parseFloat(novaBanca.toFixed(2)));
        setManipWinRate(winRateFinal);
        await updateProfile(manipSelectedProfile.id, {
          banca_atual: parseFloat(novaBanca.toFixed(2)),
          win_rate: winRateFinal
        } as any);
      }

      alert('Lote de operações gerado com sucesso!');
      loadOperacoes();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar lote: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Alunos', value: profiles.length.toString(), icon: Users, color: 'text-blue-500' },
          { label: 'Aprovados', value: approvedProfiles.length.toString(), icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Pendentes', value: pendingProfiles.length.toString(), icon: Clock, color: 'text-amber-500' },
          { label: 'Admins', value: profiles.filter(p => p.role === 'admin').length.toString(), icon: Shield, color: 'text-apex-trader-primary' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <stat.icon size={20} className={stat.color} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atual</span>
            </div>
            <p className="text-2xl font-bold">{profilesLoading ? '...' : stat.value}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Approvals Banner */}
      {pendingProfiles.length > 0 && (
        <div className="glass-card p-5 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-amber-500">Solicitações Pendentes ({pendingProfiles.length})</h3>
              <p className="text-xs text-slate-400">Novas contas aguardando aprovação do administrador</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingProfiles.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500">
                    {(p.nome || p.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.nome || 'Sem nome'}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveUser(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-all"
                    style={{ background: '#34de00' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
                  >
                    <CheckCircle size={13} /> Aprovar
                  </button>
                  <button
                    onClick={() => handleRejectUser(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <XCircle size={13} /> Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users size={20} className="text-apex-trader-primary" />
              Lista de Alunos
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-apex-trader-primary w-48"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-apex-trader-primary"
              >
                <option>Todos</option>
                <option>Aprovado</option>
                <option>Pendente</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/5 uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Aluno</th>
                  <th className="px-6 py-4 font-medium">Papel</th>
                  <th className="px-6 py-4 font-medium">Tier</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Cadastro</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profilesLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando...</td></tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum aluno encontrado.</td></tr>
                ) : filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className={cn(
                      "hover:bg-white/5 transition-colors cursor-pointer",
                      selectedProfile?.id === profile.id && "bg-white/5"
                    )}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-apex-trader-primary">
                          {(profile.nome || profile.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{profile.nome || 'Sem nome'}</p>
                          <p className="text-xs text-slate-500">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        profile.role === 'admin' ? "bg-apex-trader-primary/10 text-apex-trader-primary" : "bg-slate-500/10 text-slate-400"
                      )}>
                        {profile.role === 'admin' ? 'Admin' : 'Aluno'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const novoTier = (profile as any).tier === 'premium' ? 'gratuito' : 'premium';
                          await upgradeTier(profile.id, novoTier as 'gratuito' | 'premium');
                          setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, tier: novoTier } as any : p));
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity",
                          (profile as any).tier === 'premium'
                            ? "bg-apex-trader-primary/10 text-apex-trader-primary"
                            : "bg-orange-500/10 text-orange-400"
                        )}
                      >
                        {(profile as any).tier === 'premium' ? 'Premium' : 'Gratuito'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        profile.aprovado_por_admin || profile.role === 'admin'
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-amber-500/10 text-amber-500"
                      )}>
                        {profile.aprovado_por_admin || profile.role === 'admin' ? 'Aprovado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {(() => {
                        const expiraEm = (profile as any).trial_expira_em as string | null | undefined;
                        if (!expiraEm) return <span className="text-apex-trader-primary font-bold">Vitalício</span>;
                        const diasRestantes = Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 86400000);
                        const expirado = diasRestantes <= 0;
                        return (
                          <span className={cn("font-bold", expirado ? "text-red-400" : diasRestantes <= 7 ? "text-amber-400" : "text-slate-400")}>
                            {expirado ? 'Expirado' : `${diasRestantes}d`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!profile.aprovado_por_admin && profile.role !== 'admin' ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveUser(profile.id); }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-black"
                            style={{ background: '#34de00' }}
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectUser(profile.id); }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400"
                          >
                            Rejeitar
                          </button>
                        </div>
                      ) : (
                        <ChevronRight size={16} className="text-slate-600 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile Detail Sidebar */}
        <div className="glass-card p-6">
          {selectedProfile ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-apex-trader-primary/20 flex items-center justify-center text-xl font-bold text-apex-trader-primary">
                    {(selectedProfile.nome || selectedProfile.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{selectedProfile.nome || 'Sem nome'}</h4>
                    <p className="text-xs text-slate-500">{selectedProfile.email}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Papel</p>
                  <p className="text-sm font-bold">{selectedProfile.role === 'admin' ? 'Administrador' : 'Aluno'}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                  <p className={cn("text-sm font-bold", selectedProfile.aprovado_por_admin ? "text-emerald-500" : "text-amber-500")}>
                    {selectedProfile.aprovado_por_admin || selectedProfile.role === 'admin' ? 'Aprovado' : 'Pendente'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tier</p>
                    <p className={cn("text-sm font-bold", (selectedProfile as any).tier === 'premium' ? "text-apex-trader-primary" : "text-orange-400")}>
                      {(selectedProfile as any).tier === 'premium' ? 'Premium' : 'Gratuito'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const novoTier = (selectedProfile as any).tier === 'premium' ? 'gratuito' : 'premium';
                      await upgradeTier(selectedProfile.id, novoTier as 'gratuito' | 'premium');
                      const updated = { ...selectedProfile, tier: novoTier };
                      setSelectedProfile(updated as any);
                      setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updated as any : p));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                      (selectedProfile as any).tier === 'premium'
                        ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                        : "text-black hover:opacity-90"
                    )}
                    style={(selectedProfile as any).tier !== 'premium' ? { background: '#34de00' } : undefined}
                  >
                    {(selectedProfile as any).tier === 'premium' ? 'Rebaixar p/ Gratuito' : 'Promover p/ Premium'}
                  </button>
                </div>

                {/* Aprovação Manual de Automação Vorna */}
                <div className={cn(
                  "p-3 rounded-xl flex items-center justify-between border",
                  (selectedProfile as any).vorna_aprovado_manual
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "bg-white/5 border-white/5"
                )}>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Automação Vorna Manual</p>
                    <p className={cn("text-sm font-bold", (selectedProfile as any).vorna_aprovado_manual ? "text-cyan-400" : "text-slate-500")}>
                      {(selectedProfile as any).vorna_aprovado_manual ? 'Liberado' : 'Não liberado'}
                    </p>
                    {(selectedProfile as any).puma_email && (
                      <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{(selectedProfile as any).puma_email}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const novoValor = !(selectedProfile as any).vorna_aprovado_manual;
                      await updateProfile(selectedProfile.id, { vorna_aprovado_manual: novoValor });
                      const updated = { ...selectedProfile, vorna_aprovado_manual: novoValor };
                      setSelectedProfile(updated as any);
                      setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updated as any : p));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                      (selectedProfile as any).vorna_aprovado_manual
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                    )}
                  >
                    {(selectedProfile as any).vorna_aprovado_manual ? 'Revogar' : 'Liberar'}
                  </button>
                </div>

                {/* Copy Trade */}
                <div className={cn(
                  "p-3 rounded-xl flex items-center justify-between border",
                  (selectedProfile as any).copy_trade_ativo
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/5"
                )}>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Copy Trade</p>
                    <p className={cn("text-sm font-bold", (selectedProfile as any).copy_trade_ativo ? "text-emerald-400" : "text-slate-500")}>
                      {(selectedProfile as any).copy_trade_ativo ? 'Recebendo cópias' : 'Inativo'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Replica as operações do master automaticamente</p>
                  </div>
                  <button
                    onClick={async () => {
                      const novoValor = !(selectedProfile as any).copy_trade_ativo;
                      await updateCopyTradeAtivo(selectedProfile.id, novoValor);
                      const updated = { ...selectedProfile, copy_trade_ativo: novoValor };
                      setSelectedProfile(updated as any);
                      setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updated as any : p));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                      (selectedProfile as any).copy_trade_ativo
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    {(selectedProfile as any).copy_trade_ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                {/* Planilha */}
                <div className={cn(
                  "p-3 rounded-xl flex items-center justify-between border",
                  (selectedProfile as any).acesso_planilha
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-white/5 border-white/5"
                )}>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Planilha de Gestão</p>
                    <p className={cn("text-sm font-bold", (selectedProfile as any).acesso_planilha ? "text-blue-400" : "text-slate-500")}>
                      {(selectedProfile as any).acesso_planilha ? 'Liberada' : 'Bloqueada'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const novoValor = !(selectedProfile as any).acesso_planilha;
                      await updateProfile(selectedProfile.id, { acesso_planilha: novoValor } as any);
                      const updated = { ...selectedProfile, acesso_planilha: novoValor };
                      setSelectedProfile(updated as any);
                      setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updated as any : p));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                      (selectedProfile as any).acesso_planilha
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                    )}
                  >
                    {(selectedProfile as any).acesso_planilha ? 'Revogar' : 'Liberar'}
                  </button>
                </div>

                {/* Expiração do Acesso */}
                {(() => {
                  const expiraEm = (selectedProfile as any).trial_expira_em as string | null | undefined;
                  const expirado = expiraEm ? new Date(expiraEm) < new Date() : false;
                  const diasRestantes = expiraEm
                    ? Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div className={cn(
                      "p-3 rounded-xl border",
                      expirado
                        ? "bg-red-500/10 border-red-500/30"
                        : expiraEm && diasRestantes !== null && diasRestantes <= 7
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/5 border-white/5"
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Expiração do Acesso</p>
                          {expiraEm ? (
                            <>
                              <p className={cn("text-sm font-bold", expirado ? "text-red-400" : diasRestantes !== null && diasRestantes <= 7 ? "text-amber-400" : "text-white")}>
                                {expirado ? 'Acesso expirado' : `${diasRestantes}d restantes`}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                {expirado ? 'Expirou em ' : 'Expira em '}
                                {new Date(expiraEm).toLocaleDateString('pt-BR')}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-bold text-apex-trader-primary">Vitalício</p>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            const diasStr = window.prompt('Adicionar quantos dias ao acesso?', '30');
                            if (!diasStr) return;
                            const dias = parseInt(diasStr, 10);
                            if (isNaN(dias) || dias <= 0) return;
                            const base = expiraEm && !expirado ? new Date(expiraEm) : new Date();
                            base.setDate(base.getDate() + dias);
                            const novoExpira = base.toISOString();
                            await updateProfile(selectedProfile.id, { trial_expira_em: novoExpira } as any);
                            const updated = { ...selectedProfile, trial_expira_em: novoExpira };
                            setSelectedProfile(updated as any);
                            setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updated as any : p));
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-apex-trader-primary/10 text-apex-trader-primary hover:bg-apex-trader-primary/20 transition-colors shrink-0"
                        >
                          + Dias
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Zerar Operações */}
                <div className="p-3 rounded-xl flex items-center justify-between border bg-white/5 border-white/5">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Zerar Operações</p>
                    <p className="text-xs text-slate-600">Apaga todo o histórico de trades</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Apagar TODAS as operações de ${selectedProfile.nome || selectedProfile.email}? Esta ação não pode ser desfeita.`)) return;
                      try {
                        await deleteTodasOperacoesUsuario(selectedProfile.id);
                        alert('Operações apagadas com sucesso.');
                      } catch (e) {
                        alert('Erro ao apagar operações: ' + (e instanceof Error ? e.message : String(e)));
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    Zerar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Banca Atual</p>
                  <p className="text-sm font-bold">R$ {selectedProfile.banca_atual?.toLocaleString() || '0'}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Rate</p>
                  <p className="text-sm font-bold">{selectedProfile.win_rate || 0}%</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h5 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  Informações
                </h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Cadastro</span>
                    <span className="font-medium">{new Date(selectedProfile.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">WhatsApp</span>
                    <span className="font-medium">{selectedProfile.whatsapp || 'Não informado'}</span>
                  </div>
                  {!selectedProfile.aprovado_por_admin && selectedProfile.role !== 'admin' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleApproveUser(selectedProfile.id)}
                        className="flex-1 text-black text-xs font-bold py-2 rounded-lg transition-all"
                        style={{ background: '#34de00' }}
                      >
                        Aprovar Acesso
                      </button>
                      <button
                        onClick={() => handleRejectUser(selectedProfile.id)}
                        className="flex-1 bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-slate-400 text-xs font-bold py-2 rounded-lg transition-all"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setUserFilter(selectedProfile.id);
                      setSearchTerm('');
                      setActiveTab('operacoes');
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-apex-trader-primary/10 text-apex-trader-primary text-xs font-bold transition-all border border-apex-trader-primary/20"
                  >
                    <History size={16} />
                    Ver Histórico de Operações
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="text-slate-600" />
              </div>
              <h4 className="font-bold text-slate-400">Nenhum aluno selecionado</h4>
              <p className="text-xs text-slate-500 mt-2">Selecione um aluno na lista para ver detalhes completos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollErro('');
    setEnrollSucesso('');
    if (!enrollEmail || !enrollPassword) {
      setEnrollErro('Preencha e-mail e senha.');
      return;
    }
    if (enrollPassword.length < 6) {
      setEnrollErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    setEnrollLoading(true);
    try {
      const diasAcesso = enrollDias === 'unlimited' ? null : parseInt(enrollDias, 10);
      const modulosLiberados = enrollTodosModulos ? null : enrollModulos;
      await criarAlunoManual({
        email: enrollEmail,
        password: enrollPassword,
        role: enrollRole,
        diasAcesso,
        dataInicio: enrollDataInicio,
        vornaAprovado: enrollVorna,
        acessoPlanilha: enrollPlanilha,
        modulosLiberados,
      });
      const expiracaoTexto = diasAcesso === null
        ? 'vitalício'
        : `${diasAcesso} dias (expira em ${new Date(new Date(enrollDataInicio).getTime() + diasAcesso * 86400000).toLocaleDateString('pt-BR')})`;
      setEnrollSucesso(`Aluno ${enrollEmail} matriculado com sucesso! Acesso: ${expiracaoTexto}.`);
      setEnrollEmail('');
      setEnrollPassword('');
      setEnrollVorna(false);
      setEnrollPlanilha(false);
      setEnrollTodosModulos(true);
      setEnrollModulos([]);
      setEnrollDias('30');
      await loadProfiles();
    } catch (err: any) {
      setEnrollErro(err.message || 'Erro ao criar aluno.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const renderEnrollment = () => (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-apex-trader-primary/20 rounded-2xl flex items-center justify-center text-apex-trader-primary">
            <UserPlus size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Matricular Novo Aluno</h3>
            <p className="text-slate-400 text-sm">Preencha os dados abaixo para criar o acesso do novo aluno.</p>
          </div>
        </div>

        {enrollErro && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <XCircle size={16} className="shrink-0" />
            {enrollErro}
          </div>
        )}
        {enrollSucesso && (
          <div className="mb-6 p-4 bg-apex-trader-primary/10 border border-apex-trader-primary/20 rounded-xl text-apex-trader-primary text-sm flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            {enrollSucesso}
          </div>
        )}

        <form onSubmit={handleEnrollSubmit} className="space-y-8">
          {/* Dados de Acesso */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Dados de Acesso</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-2 mb-1">
                  <Mail size={14} /> E-mail do Aluno
                </span>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={e => setEnrollEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary text-sm"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-2 mb-1">
                  <Lock size={14} /> Senha Temporária
                </span>
                <input
                  type="password"
                  value={enrollPassword}
                  onChange={e => setEnrollPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary text-sm"
                  required
                />
              </label>
            </div>
            <label className="block w-48">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-2 mb-1">
                <Shield size={14} /> Papel no Sistema
              </span>
              <select
                value={enrollRole}
                onChange={e => setEnrollRole(e.target.value as 'admin' | 'user')}
                className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary text-sm"
              >
                <option value="user">Aluno Normal</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          </div>

          {/* Período de Acesso */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Período de Acesso</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-2 mb-1">
                  <CalendarDays size={14} /> Data de Início
                </span>
                <input
                  type="date"
                  value={enrollDataInicio}
                  onChange={e => setEnrollDataInicio(e.target.value)}
                  className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-2 mb-1">
                  <Clock size={14} /> Duração do Acesso
                </span>
                <select
                  value={enrollDias}
                  onChange={e => setEnrollDias(e.target.value)}
                  className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-apex-trader-primary text-sm"
                >
                  <option value="3">3 Dias (Teste Rápido)</option>
                  <option value="7">7 Dias (Teste)</option>
                  <option value="14">14 Dias</option>
                  <option value="30">30 Dias</option>
                  <option value="90">90 Dias (3 Meses)</option>
                  <option value="180">180 Dias (6 Meses)</option>
                  <option value="365">365 Dias (1 Ano)</option>
                  <option value="unlimited">Vitalício</option>
                </select>
              </label>
            </div>
            {enrollDias !== 'unlimited' && (
              <p className="text-xs text-slate-500">
                Acesso expira em:{' '}
                <span className="text-amber-400 font-medium">
                  {new Date(new Date(enrollDataInicio).getTime() + parseInt(enrollDias) * 86400000).toLocaleDateString('pt-BR')}
                </span>
              </p>
            )}
          </div>

          {/* Funcionalidades Liberadas */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Funcionalidades Liberadas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnrollVorna(v => !v)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  enrollVorna
                    ? "border-apex-trader-primary/50 bg-apex-trader-primary/10 text-apex-trader-primary"
                    : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
                )}
              >
                <Zap size={18} className="shrink-0" />
                <div>
                  <p className="text-sm font-bold">Automação Vorna</p>
                  <p className="text-xs opacity-70">Acesso ao robô de trading</p>
                </div>
                {enrollVorna && <CheckCircle size={16} className="ml-auto shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => setEnrollPlanilha(v => !v)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  enrollPlanilha
                    ? "border-apex-trader-primary/50 bg-apex-trader-primary/10 text-apex-trader-primary"
                    : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
                )}
              >
                <FileText size={18} className="shrink-0" />
                <div>
                  <p className="text-sm font-bold">Planilha de Gestão</p>
                  <p className="text-xs opacity-70">Ferramentas 2x1, 4x2 e Juros</p>
                </div>
                {enrollPlanilha && <CheckCircle size={16} className="ml-auto shrink-0" />}
              </button>
            </div>
          </div>

          {/* Módulos do Academy */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2">Módulos do Academy</h4>
            <button
              type="button"
              onClick={() => setEnrollTodosModulos(v => !v)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-all w-full text-left mb-3",
                enrollTodosModulos
                  ? "border-apex-trader-primary/50 bg-apex-trader-primary/10 text-apex-trader-primary"
                  : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
              )}
            >
              <BookOpen size={18} className="shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">Todos os Módulos</p>
                <p className="text-xs opacity-70">Libera acesso completo ao Academy</p>
              </div>
              {enrollTodosModulos && <CheckCircle size={16} className="shrink-0" />}
            </button>

            {!enrollTodosModulos && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modulosDisponiveis.map(mod => {
                  const selecionado = enrollModulos.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setEnrollModulos(prev =>
                        selecionado ? prev.filter(id => id !== mod.id) : [...prev, mod.id]
                      )}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        selecionado
                          ? "border-apex-trader-primary/50 bg-apex-trader-primary/10 text-apex-trader-primary"
                          : "border-white/5 bg-white/5 text-slate-400 hover:border-white/10"
                      )}
                    >
                      <BookOpen size={15} className="shrink-0" />
                      <span className="text-xs font-medium flex-1">{mod.titulo}</span>
                      {selecionado && <CheckCircle size={14} className="shrink-0" />}
                    </button>
                  );
                })}
                {modulosDisponiveis.length === 0 && (
                  <p className="text-xs text-slate-500 col-span-2">Nenhum módulo encontrado.</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={enrollLoading}
            className="w-full bg-apex-trader-primary hover:bg-[#2bc900] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl shadow-lg shadow-apex-trader-primary/20 transition-all flex items-center justify-center gap-2"
          >
            {enrollLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            {enrollLoading ? 'Criando acesso...' : 'Finalizar Matrícula'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Settings size={20} className="text-apex-trader-primary" />
          Configurações Gerais
        </h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="font-bold text-sm">Gestão de Pagamentos</p>
              <p className="text-xs text-slate-500">Configurar gateway e planos.</p>
            </div>
            <button className="text-apex-trader-primary text-xs font-bold hover:underline">Configurar</button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="font-bold text-sm">Ajustes de Conteúdo</p>
              <p className="text-xs text-slate-500">Gerenciar aulas e módulos.</p>
            </div>
            <button className="text-apex-trader-primary text-xs font-bold hover:underline">Gerenciar</button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="font-bold text-sm">Segurança do Sistema</p>
              <p className="text-xs text-slate-500">Logs de acesso e permissões.</p>
            </div>
            <button className="text-apex-trader-primary text-xs font-bold hover:underline">Ver Logs</button>
          </div>
        </div>
      </div>
      {/* Removed duplicated Notice Form, it now lives in Disparo de Avisos */}
    </div>
  );

  const renderComentarios = () => {
    const pendentes = comentarios.filter(c => c.status === 'pendente').length;
    return (
      <div className="space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: comentarios.length, color: 'text-white' },
            { label: 'Pendentes', value: pendentes, color: 'text-amber-500' },
            { label: 'Aprovados', value: comentarios.filter(c => c.status === 'aprovado').length, color: 'text-apex-trader-primary' },
          ].map((s, i) => (
            <div key={i} className="glass-card p-5 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(['todos', 'pendente', 'aprovado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setComentarioFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                comentarioFilter === f
                  ? "bg-apex-trader-primary text-black"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Aprovados'}
            </button>
          ))}
        </div>

        {/* List */}
        {comentariosFiltrados.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500 text-sm">
            Nenhum comentário encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {comentariosFiltrados.map(c => (
              <div key={c.id} className="glass-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {c.foto_url ? (
                      <img src={c.foto_url} alt={c.usuario} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-apex-trader-primary/20 text-apex-trader-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {c.usuario.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{c.usuario}</span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          c.status === 'aprovado'
                            ? "bg-apex-trader-primary/10 text-apex-trader-primary"
                            : "bg-amber-500/10 text-amber-500"
                        )}>
                          {c.status}
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto">
                          {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {c.modulo_titulo} › {c.aula_titulo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'pendente' && (
                      <button
                        onClick={() => handleAprovar(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-all"
                        style={{ background: '#34de00' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
                      >
                        <CheckCircle2 size={13} /> Aprovar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletar(c.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed pl-12">{c.texto}</p>

                {/* Admin reply area */}
                {c.resposta_admin && (
                  <div className="ml-12 pl-3 border-l-2 border-apex-trader-primary bg-apex-trader-primary/5 rounded-r-xl py-2 pr-3">
                    <p className="text-[10px] font-bold text-apex-trader-primary uppercase tracking-wider mb-1">Sua resposta</p>
                    <p className="text-sm text-slate-300">{c.resposta_admin}</p>
                  </div>
                )}
                <div className="ml-12 space-y-2">
                  <textarea
                    value={respostas[c.id] || ''}
                    onChange={e => setRespostas(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder={c.resposta_admin ? 'Editar resposta...' : 'Escrever resposta ao aluno...'}
                    rows={2}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-apex-trader-primary resize-none text-white placeholder-slate-600"
                  />
                  <button
                    onClick={() => handleResponder(c.id)}
                    disabled={!(respostas[c.id] || '').trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black transition-all disabled:opacity-40"
                    style={{ background: '#34de00' }}
                    onMouseEnter={e => { if ((respostas[c.id] || '').trim()) e.currentTarget.style.background = '#2bc900'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#34de00'; }}
                  >
                    <Send size={12} /> {c.resposta_admin ? 'Atualizar Resposta' : 'Responder'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProva = () => {
    const totalPontos = configProva.questoes.reduce((s, q) => s + q.pontos, 0);
    return (
      <div className="space-y-6">
        {/* Config card */}
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText size={18} className="text-apex-trader-primary" />
            Configurações da Prova
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp para Certificado</span>
              <input
                type="text"
                placeholder="5511999999999"
                value={configProva.whatsapp_certificado}
                onChange={e => setConfigProva(prev => ({ ...prev, whatsapp_certificado: e.target.value }))}
                className="mt-1 block w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <p className="text-[10px] text-slate-600 mt-1">Número com DDI (ex: 5511999999999)</p>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nota Mínima para Aprovação (%)</span>
              <input
                type="number" min="0" max="100"
                value={configProva.nota_minima}
                onChange={e => setConfigProva(prev => ({ ...prev, nota_minima: Number(e.target.value) }))}
                className="mt-1 block w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white"
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfigProva(prev => ({ ...prev, ativa: !prev.ativa }))}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  configProva.ativa ? "bg-apex-trader-primary" : "bg-slate-700"
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", configProva.ativa ? "left-6" : "left-1")} />
              </button>
              <span className="text-sm font-medium text-slate-300">
                Prova {configProva.ativa ? 'ativa (visível para alunos)' : 'inativa (oculta)'}
              </span>
            </div>
            <button
              onClick={() => handleSaveConfigProva(configProva)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
              style={{ background: '#34de00' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
              onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
            >
              Salvar Configurações
            </button>
          </div>
        </div>

        {/* Questions card */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-300">{configProva.questoes.length} questões · {totalPontos} pontos totais</h3>
            </div>
            <button
              onClick={() => { setQuestaoForm(emptyQuestao()); setShowQuestaoForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-xs font-bold transition-all"
              style={{ background: '#34de00' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2bc900')}
              onMouseLeave={e => (e.currentTarget.style.background = '#34de00')}
            >
              <Plus size={14} /> Nova Questão
            </button>
          </div>

          {/* Question form */}
          {showQuestaoForm && (
            <div className="p-5 border-b border-white/5 bg-apex-trader-primary/[0.03] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-apex-trader-primary">{questaoForm.id ? 'Editar Questão' : 'Nova Questão'}</h4>
                <button onClick={() => setShowQuestaoForm(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <textarea
                placeholder="Texto da pergunta..."
                value={questaoForm.texto}
                onChange={e => setQuestaoForm(prev => ({ ...prev, texto: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600 resize-none"
              />
              <input
                placeholder="URL da imagem (opcional)"
                value={questaoForm.imagem_url || ''}
                onChange={e => setQuestaoForm(prev => ({ ...prev, imagem_url: e.target.value }))}
                className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opções de resposta</p>
                {(['A', 'B', 'C', 'D'] as const).map((letra, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="resposta_correta"
                      checked={questaoForm.resposta_correta === i}
                      onChange={() => setQuestaoForm(prev => ({ ...prev, resposta_correta: i }))}
                      className="accent-apex-trader-primary w-4 h-4 shrink-0"
                    />
                    <span className="text-xs font-bold text-slate-500 w-4">{letra}</span>
                    <input
                      placeholder={`Opção ${letra}`}
                      value={questaoForm.opcoes[i]}
                      onChange={e => {
                        const opcoes = [...questaoForm.opcoes] as [string, string, string, string];
                        opcoes[i] = e.target.value;
                        setQuestaoForm(prev => ({ ...prev, opcoes }));
                      }}
                      className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white placeholder-slate-600"
                    />
                  </div>
                ))}
                <p className="text-[10px] text-slate-600">Marque o radio ao lado da opção correta</p>
              </div>
              <label className="block w-32">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pontos</span>
                <input
                  type="number" min="1"
                  value={questaoForm.pontos}
                  onChange={e => setQuestaoForm(prev => ({ ...prev, pontos: Number(e.target.value) }))}
                  className="mt-1 block w-full bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none border border-white/5 focus:border-apex-trader-primary/50 text-white"
                />
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowQuestaoForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all">Cancelar</button>
                <button
                  onClick={() => handleSaveQuestao(questaoForm)}
                  disabled={!questaoForm.texto.trim() || questaoForm.opcoes.some(o => !o.trim())}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
                  style={{ background: '#34de00' }}
                  onMouseEnter={e => { if (questaoForm.texto.trim()) e.currentTarget.style.background = '#2bc900'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#34de00'; }}
                >
                  {questaoForm.id ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}

          {configProva.questoes.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">Nenhuma questão cadastrada. Adicione questões acima.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {configProva.questoes.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-all">
                  <span className="text-xs font-bold text-slate-600 w-6 shrink-0 pt-0.5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 line-clamp-2">{q.texto}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{q.pontos} {q.pontos === 1 ? 'ponto' : 'pontos'} · Resposta correta: {['A', 'B', 'C', 'D'][q.resposta_correta]}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { setQuestaoForm(q); setShowQuestaoForm(true); }}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-apex-trader-primary hover:bg-apex-trader-primary/10 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestao(q.id)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const enviosHoje = avisos.filter(a => {
    const hoje = new Date().toISOString().split('T')[0];
    return a.created_at.startsWith(hoje);
  }).length;

  const handleEnviarAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avisoTitulo.trim() || !avisoMensagem.trim() || enviandoAviso) return;
    setEnviandoAviso(true);
    try {
      const saved = await createAviso({ titulo: avisoTitulo, mensagem: avisoMensagem, destinatarios: profiles.length });
      setAvisos(prev => [saved as Aviso, ...prev]);

      // Disparo do Push Real em Segundo Plano
      try {
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        const res = await fetch('/api/send-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminSession?.access_token || ''}`,
          },
          body: JSON.stringify({ titulo: avisoTitulo, mensagem: avisoMensagem })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error('Erro da API de Push:', res.status, data);
          if (res.status === 404) {
            alert('Aviso criado no banco! Mas o Push não funcionou porque você parece estar rodando no localhost (o dev server não lê a pasta /api da Vercel).');
          } else {
            alert(`Aviso salvo! Mas falha no Push (Erro ${res.status}): ${data.message || data.error || 'Verifique as chaves VAPID na Vercel.'}`);
          }
        } else {
          alert(`Aviso enviado com sucesso! ${data.message || ''}`);
        }
      } catch (netErr) {
        console.error('Erro de rede disparando push:', netErr);
        alert('Aviso salvo no banco! Mas não foi possível conectar à API de Push.');
      }

      window.dispatchEvent(new Event('guias_notification_update'));

    } catch (err) { console.error(err); } finally {
      setEnviandoAviso(false);
      setAvisoTitulo('');
      setAvisoMensagem('');
    }
  };

  const handleDeletarAviso = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este aviso? Ele sumirá para todos os alunos.')) return;
    try {
      await delAviso(id);
      setAvisos(prev => prev.filter(a => a.id !== id));
      window.dispatchEvent(new Event('guias_notification_update'));
      alert('Aviso apagado no banco de dados com sucesso.');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao apagar o aviso: ' + (err.message || 'Problema de permissão no Supabase'));
    }
  };

  const renderNotificacoes = () => {
    return (
      <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-trademaster-blue/15 flex items-center justify-center">
            <Users size={20} className="text-trademaster-blue" />
          </div>
          <div>
            <p className="text-2xl font-black">{profiles.length}</p>
            <p className="text-xs text-slate-500">Usuários ativos</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Send size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black">{avisos.length}</p>
            <p className="text-xs text-slate-500">Total de envios</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Clock size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-black">{enviosHoje}</p>
            <p className="text-xs text-slate-500">Envios hoje</p>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New notification form */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={20} className="text-trademaster-blue" />
            <h3 className="text-lg font-bold">Novo Aviso</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">Será enviado para {profiles.length} usuários</p>

          <form onSubmit={handleEnviarAviso} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-400 mb-1 block">Título do Aviso</span>
              <input
                type="text"
                value={avisoTitulo}
                onChange={(e) => setAvisoTitulo(e.target.value)}
                placeholder="Ex: Atualização do Sistema"
                className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-trademaster-blue text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-400 mb-1 block">Mensagem</span>
              <textarea
                rows={5}
                value={avisoMensagem}
                onChange={(e) => setAvisoMensagem(e.target.value.slice(0, 2000))}
                placeholder="Digite a mensagem completa do aviso..."
                className="w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-trademaster-blue text-sm resize-none"
              />
              <span className="text-xs text-slate-600 mt-1 block">{avisoMensagem.length}/2000 caracteres</span>
            </label>

            {/* Warning banner */}
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <p className="text-xs text-amber-400/80 leading-relaxed">
                Este aviso será enviado como <strong className="text-amber-300">notificação push</strong> no celular e aparecerá no <strong className="text-amber-300">sino de notificações</strong> do dashboard de cada usuário.
              </p>
            </div>

            <button
              type="submit"
              disabled={!avisoTitulo.trim() || !avisoMensagem.trim() || enviandoAviso}
              className="w-full bg-trademaster-blue hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl shadow-lg shadow-trademaster-blue/20 transition-all flex items-center justify-center gap-2"
            >
              {enviandoAviso ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Enviar para Todos
                </>
              )}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={20} className="text-slate-400" />
            <h3 className="text-lg font-bold">Histórico de Envios</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">{avisos.length} avisos registrados</p>

          {avisos.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum aviso enviado ainda</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {avisos.map((aviso) => (
                <div key={aviso.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl group">
                  <div className="w-8 h-8 rounded-lg bg-trademaster-blue/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={14} className="text-trademaster-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{aviso.titulo}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{aviso.mensagem}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-bold bg-trademaster-blue/15 text-trademaster-blue px-2 py-0.5 rounded-full">
                      ± {aviso.destinatarios}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(aviso.created_at).toLocaleDateString('pt-BR')} {new Date(aviso.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleDeletarAviso(aviso.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all shrink-0 mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };



  const renderOperacoes = () => {
    const filteredOps = todasOperacoes.filter(op => {
      const matchesUser = userFilter ? op.user_id === userFilter : true;
      const email = op.profiles?.email || '';
      const ativo = op.ativo || '';
      const matchesSearch = email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ativo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesUser && matchesSearch;
    });

    const filteredUserName = userFilter ? (todasOperacoes.find(o => o.user_id === userFilter)?.profiles?.nome || 'Usuário') : null;

    return (
      <div className="space-y-6">
        <div className="glass-card p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History size={20} className="text-trademaster-blue" />
              Gerenciamento de Operações {userFilter ? 'do Aluno' : 'Global'}
            </h3>
            {userFilter && (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                Filtrado por: <span className="text-trademaster-blue font-bold">{filteredUserName}</span>
                <button
                  onClick={() => setUserFilter(null)}
                  className="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 transition-all ml-1"
                >
                  Limpar filtro
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por e-mail ou ativo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue w-64"
              />
            </div>
            <button
              onClick={loadOperacoes}
              disabled={opsLoading}
              className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-50"
              title="Atualizar lista"
            >
              <Loader2 size={16} className={cn(opsLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/5 uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Aluno</th>
                  <th className="px-6 py-4 font-medium">Data/Ativo</th>
                  <th className="px-6 py-4 font-medium">Direção</th>
                  <th className="px-6 py-4 font-medium">Resultado</th>
                  <th className="px-6 py-4 font-medium">Lucro</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {opsLoading && todasOperacoes.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando operações...</td></tr>
                ) : filteredOps.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhuma operação encontrada.</td></tr>
                ) : filteredOps.map((op) => (
                  <tr key={op.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm text-white">{op.profiles?.nome || 'Sem nome'}</p>
                        <p className="text-xs text-slate-500">{op.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{op.ativo}</p>
                        <p className="text-[10px] text-slate-500">
                          {op.data ? new Date(op.data + 'T' + op.hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        op.direcao === 'compra' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {op.direcao}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {editingOp === op.id ? (
                        <select
                          value={editOpData.resultado}
                          onChange={(e) => setEditOpData(prev => ({ ...prev, resultado: e.target.value as any }))}
                          className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value="vitoria">Vitória</option>
                          <option value="derrota">Derrota</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          op.resultado === 'vitoria' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {op.resultado}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingOp === op.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editOpData.lucro}
                            onChange={(e) => setEditOpData(prev => ({ ...prev, lucro: Number(e.target.value) }))}
                            className="w-20 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                          />
                        </div>
                      ) : (
                        <span className={cn(
                          "text-sm font-bold",
                          op.lucro > 0 ? "text-emerald-500" : op.lucro < 0 ? "text-red-500" : "text-slate-400"
                        )}>
                          R$ {op.lucro?.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingOp === op.id ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleUpdateOp(op.id)}
                            disabled={savingOp}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-all"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingOp(null)}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingOp(op.id);
                            setEditOpData({ resultado: op.resultado, lucro: op.lucro });
                          }}
                          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderManipulacao = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Search and List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="glass-card p-4">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-apex-trader-primary"
            />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => setManipSelectedProfile(p)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border",
                  manipSelectedProfile?.id === p.id 
                    ? "bg-apex-trader-primary/10 border-apex-trader-primary/30 text-apex-trader-primary" 
                    : "bg-white/5 border-transparent hover:bg-white/10 text-slate-400"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                  {(p.nome || p.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-bold text-sm truncate">{p.nome || 'Sem nome'}</p>
                  <p className="text-[10px] opacity-70 truncate">{p.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forms column */}
      <div className="lg:col-span-2 space-y-6">
        {manipSelectedProfile ? (
          <>
            {/* Override Profile Stats */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6 text-apex-trader-primary">
                <Shield size={20} />
                <h3 className="text-lg font-bold">Gestão de Performance: {manipSelectedProfile.nome || manipSelectedProfile.email}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banca Atual (R$)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={manipBancaAtual}
                      onChange={e => setManipBancaAtual(Number(e.target.value))}
                      className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-apex-trader-primary text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taxa de Acerto (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manipWinRate}
                      onChange={e => setManipWinRate(Number(e.target.value))}
                      className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-apex-trader-primary text-white"
                    />
                  </label>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-apex-trader-primary/5 rounded-2xl border border-apex-trader-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">Ativar Modo Manual</span>
                      <button
                        onClick={() => setManipManualMode(!manipManualMode)}
                        className={cn(
                          "relative w-12 h-6 rounded-full transition-colors",
                          manipManualMode ? "bg-apex-trader-primary" : "bg-slate-700"
                        )}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", manipManualMode ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      Com o Modo Manual ativo, o Dashboard desse aluno **parará de calcular automaticamente** a banca e winrate com base nas operações reais. Ele passará a usar **fixamente** os valores acima.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveManip}
                disabled={isSavingManip}
                className="w-full flex items-center justify-center gap-2 py-3 bg-apex-trader-primary hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-apex-trader-primary/20"
              >
                {isSavingManip ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Configurações do Aluno
              </button>
            </div>

            {/* Add Operation Form */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6 text-trademaster-blue">
                <Plus size={20} />
                <h3 className="text-lg font-bold">Injetar Operação Manual</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ativo</span>
                  <input
                    type="text"
                    value={newManualOp.ativo}
                    onChange={e => setNewManualOp(prev => ({ ...prev, ativo: e.target.value }))}
                    className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estratégia</span>
                  <input
                    type="text"
                    value={newManualOp.estrategia}
                    onChange={e => setNewManualOp(prev => ({ ...prev, estrategia: e.target.value }))}
                    className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado</span>
                    <select
                      value={newManualOp.resultado}
                      onChange={e => setNewManualOp(prev => ({ ...prev, resultado: e.target.value as any }))}
                      className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                    >
                      <option value="vitoria">Win (Verde)</option>
                      <option value="derrota">Loss (Vermelho)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direção</span>
                    <select
                      value={newManualOp.direcao}
                      onChange={e => setNewManualOp(prev => ({ ...prev, direcao: e.target.value as any }))}
                      className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                    >
                      <option value="compra">Compra (Call)</option>
                      <option value="venda">Venda (Put)</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Investido (R$)</span>
                  <input
                    type="number"
                    value={newManualOp.investido}
                    onChange={e => setNewManualOp(prev => ({ ...prev, investido: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lucro Líquido (R$)</span>
                  <input
                    type="number"
                    value={newManualOp.lucro}
                    onChange={e => setNewManualOp(prev => ({ ...prev, lucro: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-800 border-white/5 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-trademaster-blue text-white"
                  />
                </label>
              </div>

              <button
                onClick={handleAddManualOp}
                disabled={isAddingOp}
                className="w-full flex items-center justify-center gap-2 py-3 bg-trademaster-blue/10 hover:bg-trademaster-blue/20 text-trademaster-blue font-bold rounded-xl transition-all border border-trademaster-blue/20"
              >
                {isAddingOp ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Injetar Operação Única
              </button>
            </div>

            {/* Batch History Generator */}
            <div className="glass-card p-6 border border-apex-trader-primary/20 bg-apex-trader-primary/[0.02]">
              <div className="flex items-center gap-2 mb-6 text-white">
                <Zap size={20} className="text-apex-trader-primary" />
                <h3 className="text-xl font-black italic uppercase">Gerador de Histórico em Lote</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vitórias</span>
                  <input
                    type="number"
                    value={batchGen.vitorias}
                    onChange={e => setBatchGen(prev => ({ ...prev, vitorias: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-4 py-3 text-sm font-bold text-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Derrotas</span>
                  <input
                    type="number"
                    value={batchGen.derrotas}
                    onChange={e => setBatchGen(prev => ({ ...prev, derrotas: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-4 py-3 text-sm font-bold text-red-500 outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investimento ($)</span>
                  <input
                    type="number"
                    value={batchGen.valorEntrada}
                    onChange={e => setBatchGen(prev => ({ ...prev, valorEntrada: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-apex-trader-primary/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout (%)</span>
                  <input
                    type="number"
                    value={batchGen.payout}
                    onChange={e => setBatchGen(prev => ({ ...prev, payout: Number(e.target.value) }))}
                    className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-4 py-3 text-sm font-bold text-apex-trader-primary outline-none focus:ring-1 focus:ring-apex-trader-primary/50"
                  />
                </label>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativo Base</span>
                    <input
                      type="text"
                      value={batchGen.ativo}
                      onChange={e => setBatchGen(prev => ({ ...prev, ativo: e.target.value }))}
                      className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mercado</span>
                    <select
                      value={batchGen.mercado}
                      onChange={e => setBatchGen(prev => ({ ...prev, mercado: e.target.value as any }))}
                      className="mt-1 block w-full bg-slate-900 border-white/5 border rounded-xl px-2 py-2.5 text-xs text-white outline-none"
                    >
                      <option value="forex">Forex</option>
                      <option value="cripto">Cripto</option>
                    </select>
                  </label>
                </div>
                
                <button
                  onClick={handleBatchGenerate}
                  disabled={isGeneratingBatch}
                  className="w-full md:w-auto px-8 py-4 bg-apex-trader-primary hover:bg-emerald-400 text-black font-black rounded-xl transition-all shadow-xl shadow-apex-trader-primary/20 flex items-center justify-center gap-3 uppercase tracking-wider text-sm"
                >
                  {isGeneratingBatch ? <Loader2 size={20} className="animate-spin" /> : <TrendingUp size={20} />}
                  Gerar Histórico Completo
                </button>
              </div>

              <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                <p className="text-xs text-slate-500">
                  Isso criará automaticamente <span className="text-white font-bold">{batchGen.vitorias + batchGen.derrotas}</span> operações separadas, resultando em um Win Rate esperado de <span className="text-apex-trader-primary font-bold">{Math.round((batchGen.vitorias / (batchGen.vitorias + batchGen.derrotas || 1)) * 100)}%</span>.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-card">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Shield size={32} className="text-slate-600" />
            </div>
            <h4 className="font-bold text-slate-400">Selecione um aluno</h4>
            <p className="text-xs text-slate-500 mt-2">Escolha na lista à esquerda o aluno que deseja gerenciar resultados.</p>
          </div>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Painel de Controle</h1>
              <p className="text-xs text-slate-500 font-medium">Gerencie alunos, conteúdo e operações.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', icon: TrendingUp, label: 'Geral' },
              { id: 'enrollment', icon: Users, label: 'Alunos' },
              { id: 'operacoes', icon: History, label: 'Operações' },
              { id: 'manipulacao', icon: Zap, label: 'Correção' },
              { id: 'comentarios', icon: MessageSquare, label: 'Comentários' },
              { id: 'prova', icon: FileText, label: 'Prova/Quiz' },
              { id: 'notificacoes', icon: Bell, label: 'Avisos' },
              { id: 'metricas', icon: BarChart3, label: 'Métricas' },
              { id: 'vps', icon: Zap, label: 'VPS' },
              { id: 'automacao', icon: Activity, label: 'Automação' },
              { id: 'manutencao', icon: Wrench, label: 'Manutenção' },
              { id: 'settings', icon: Settings, label: 'Ajustes' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-bold",
                  activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={16} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'enrollment' && renderEnrollment()}
            {activeTab === 'operacoes' && renderOperacoes()}
            {activeTab === 'manipulacao' && renderManipulacao()}
            {activeTab === 'comentarios' && renderComentarios()}
            {activeTab === 'prova' && renderProva()}
            {activeTab === 'notificacoes' && renderNotificacoes()}
            {activeTab === 'vps' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Gerenciar VPS</h2>
                    <p className="text-slate-400 text-sm mt-1">Ative o modo VPS para alunos. Bots ativos: {vpsStatus.length} / 5</p>
                  </div>
                  <button onClick={carregarStatusVPS} className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm">
                    Atualizar Status
                  </button>
                </div>

                {/* Bots ativos no servidor */}
                {vpsStatus.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      Bots rodando agora no servidor
                    </h3>
                    <div className="space-y-2">
                      {vpsStatus.map((bot: any) => (
                        <div key={bot.userId} className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-3">
                          <div>
                            <span className="text-white text-sm font-medium">{bot.userId}</span>
                            <span className={cn("ml-3 px-2 py-0.5 rounded text-xs", bot.status === 'em_operacao' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                              {bot.status}
                            </span>
                          </div>
                          <button onClick={() => pararBotVPS(bot.userId)} className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1 rounded-lg">
                            Parar bot
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de alunos com toggle VPS */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <h3 className="text-white font-semibold">Alunos — Acesso VPS</h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {profiles.filter(p => p.aprovado_por_admin).map(profile => {
                      const vpsAtivo = (profile as any).vps_ativo === true;
                      const botRodando = vpsStatus.some((b: any) => b.userId === profile.id);
                      return (
                        <div key={profile.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium">{profile.name || profile.email}</p>
                            <p className="text-slate-400 text-xs">{profile.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {botRodando && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Rodando
                              </span>
                            )}
                            <button
                              onClick={() => toggleVpsAluno(profile)}
                              disabled={vpsLoadingId === profile.id}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                vpsAtivo ? "bg-blue-500" : "bg-slate-600",
                                vpsLoadingId === profile.id && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", vpsAtivo ? "translate-x-6" : "translate-x-1")} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {profiles.filter(p => p.aprovado_por_admin).length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-6">Nenhum aluno aprovado encontrado.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'automacao' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white">Configuração de Automação</h2>
                  <p className="text-slate-400 text-sm mt-1">Defina quais estratégias e tipos de gerenciamento ficam disponíveis para os alunos na tela de automação.</p>
                </div>

                {/* Estratégias */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 space-y-5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Estratégias disponíveis</p>
                  {([
                    { value: 'Quadrantes' as EstrategiaAnalise, label: 'Quadrantes (10min)' },
                    { value: 'Quadrantes5min' as EstrategiaAnalise, label: 'Quadrantes (5min)' },
                    { value: 'FluxoVelas' as EstrategiaAnalise, label: 'Fluxo de Velas' },
                    { value: 'LogicaDoPreco' as EstrategiaAnalise, label: 'Lógica do Preço' },
                    { value: 'ImpulsoCorrecaoEngolfo' as EstrategiaAnalise, label: 'Impulso-Correção-Engolfo' },
                    { value: 'CavaloTroia' as EstrategiaAnalise, label: 'Cavalo de Troia (M2, 20min)' },
                  ] as { value: EstrategiaAnalise; label: string }[]).map(est => (
                    <div key={est.value} className="bg-slate-800/40 border border-white/5 rounded-lg p-4 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={configAutomacao.estrategias_ativas.includes(est.value)}
                          onChange={e => {
                            setConfigAutomacao(prev => ({
                              ...prev,
                              estrategias_ativas: e.target.checked
                                ? [...prev.estrategias_ativas, est.value]
                                : prev.estrategias_ativas.filter(s => s !== est.value),
                            }));
                            setAutomacaoSalvo(false);
                          }}
                          className="w-4 h-4 rounded accent-apex-trader-primary cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{est.label}</span>
                      </label>
                      <div className="pl-7 space-y-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Nome exibido para alunos</label>
                          <input
                            type="text"
                            value={configAutomacao.nomes_estrategias?.[est.value] ?? ''}
                            placeholder={est.label}
                            onChange={e => {
                              setConfigAutomacao(prev => ({
                                ...prev,
                                nomes_estrategias: { ...prev.nomes_estrategias, [est.value]: e.target.value },
                              }));
                              setAutomacaoSalvo(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-white/5 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-apex-trader-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Descrição interna (só você vê)</label>
                          <textarea
                            value={configAutomacao.descricoes_estrategias?.[est.value] ?? ''}
                            placeholder="Anote aqui o que é essa estratégia para sua referência..."
                            rows={2}
                            onChange={e => {
                              setConfigAutomacao(prev => ({
                                ...prev,
                                descricoes_estrategias: { ...prev.descricoes_estrategias, [est.value]: e.target.value },
                              }));
                              setAutomacaoSalvo(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-white/5 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-apex-trader-primary/50 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gerenciamentos */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Tipos de gerenciamento disponíveis</p>
                  {([
                    { value: 'Fixo' as Gerenciamento, label: 'Fixo' },
                    { value: 'Martingale' as Gerenciamento, label: 'Proteção' },
                    { value: 'Soros' as Gerenciamento, label: 'Soros' },
                  ] as { value: Gerenciamento; label: string }[]).map(ger => (
                    <label key={ger.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={configAutomacao.gerenciamentos_ativos.includes(ger.value)}
                        onChange={e => {
                          setConfigAutomacao(prev => ({
                            ...prev,
                            gerenciamentos_ativos: e.target.checked
                              ? [...prev.gerenciamentos_ativos, ger.value]
                              : prev.gerenciamentos_ativos.filter(g => g !== ger.value),
                          }));
                          setAutomacaoSalvo(false);
                        }}
                        className="w-4 h-4 rounded accent-apex-trader-primary cursor-pointer"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{ger.label}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem(AUTOMACAO_PLATAFORMA_KEY, JSON.stringify(configAutomacao));
                    setAutomacaoSalvo(true);
                    setTimeout(() => setAutomacaoSalvo(false), 3000);
                  }}
                  className="px-6 py-3 bg-apex-trader-primary text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {automacaoSalvo ? '✓ Configuração salva!' : 'Salvar configuração'}
                </button>
              </div>
            )}
            {activeTab === 'manutencao' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white">Modo Manutenção</h2>
                  <p className="text-slate-400 text-sm mt-1">Bloqueie seções específicas da plataforma com uma mensagem e contagem regressiva para os alunos.</p>
                </div>

                {/* Toggle ativo */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Ativar modo manutenção</p>
                    <p className="text-xs text-slate-500 mt-0.5">As seções selecionadas ficam bloqueadas para alunos.</p>
                  </div>
                  <button
                    onClick={() => setManutencaoConfig(prev => ({ ...prev, ativo: !prev.ativo }))}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors duration-200',
                      manutencaoConfig.ativo ? 'bg-amber-500' : 'bg-slate-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
                      manutencaoConfig.ativo ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {/* Seções */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Seções em manutenção</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SECOES_MANUTENCAO.map(secao => (
                      <label key={secao.key} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={manutencaoConfig.secoes.includes(secao.key)}
                          onChange={() => toggleSecaoManutencao(secao.key)}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{secao.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mensagem */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 space-y-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Mensagem para o aluno</p>
                  <textarea
                    value={manutencaoConfig.mensagem}
                    onChange={e => setManutencaoConfig(prev => ({ ...prev, mensagem: e.target.value }))}
                    rows={3}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="Mensagem que o aluno verá na tela de manutenção..."
                  />
                </div>

                {/* Data/hora término */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 space-y-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Término previsto (contagem regressiva)</p>
                  <p className="text-xs text-slate-500">Quando esse horário chegar, o acesso é liberado automaticamente.</p>
                  <input
                    type="datetime-local"
                    value={terminoEmInput}
                    onChange={e => setTerminoEmInput(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                  {terminoEmInput && (
                    <button
                      onClick={() => setTerminoEmInput('')}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Remover contagem regressiva
                    </button>
                  )}
                </div>

                {/* Status atual */}
                {manutencaoConfig.ativo && manutencaoConfig.secoes.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Status atual (salvo)</p>
                    <p className="text-sm text-slate-300">
                      Seções bloqueadas: <span className="text-white font-semibold">{manutencaoConfig.secoes.join(', ')}</span>
                    </p>
                    {manutencaoConfig.termino_em && (
                      <p className="text-sm text-slate-300">
                        Termina em: <span className="text-white font-semibold">{new Date(manutencaoConfig.termino_em).toLocaleString('pt-BR')}</span>
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={salvarManutencao}
                  disabled={manutencaoLoading}
                  className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {manutencaoLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {manutencaoSalvo ? '✓ Configuração salva!' : 'Salvar configuração'}
                </button>
              </div>
            )}
            {activeTab === 'metricas' && (
              <div className="space-y-6">
                {/* Seletor de Estratégia */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl w-fit">
                  {([
                    { id: 'Quadrantes' as EstrategiaAnalise, label: 'Quadrantes', icon: LayoutGrid },
                    { id: 'FluxoVelas' as EstrategiaAnalise, label: 'Fluxo de Velas', icon: Activity },
                    { id: 'LogicaDoPreco' as EstrategiaAnalise, label: 'Lógica do Preço', icon: TrendingUp },
                    { id: 'ImpulsoCorrecaoEngolfo' as EstrategiaAnalise, label: 'Impulso-Correção-Engolfo', icon: TrendingUp },
                    { id: 'Quadrantes5min' as EstrategiaAnalise, label: 'Quadrantes 5min', icon: LayoutGrid },
                    { id: 'CavaloTroia' as EstrategiaAnalise, label: 'Cavalo de Troia', icon: Activity },
                  ]).map(est => (
                    <button
                      key={est.id}
                      onClick={() => setEstrategiaMetricas(est.id)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-bold",
                        estrategiaMetricas === est.id
                          ? "bg-apex-trader-primary text-black shadow-lg"
                          : "text-slate-500 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <est.icon size={16} />
                      {est.label}
                    </button>
                  ))}
                </div>

                {estrategiaMetricas === 'Quadrantes' && (
                  <MetricsQuadrantesContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                    todasOperacoesReais={todasOperacoes}
                    refreshCounter={refreshCounter}
                    comparativoReady={comparativoReady}
                  />
                )}

                {estrategiaMetricas === 'FluxoVelas' && (
                  <MetricsFluxoVelasContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                  />
                )}

                {estrategiaMetricas === 'LogicaDoPreco' && (
                  <MetricsLogicaPrecoContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                  />
                )}

                {estrategiaMetricas === 'ImpulsoCorrecaoEngolfo' && (
                  <MetricsImpulsoCorrecaoEngolfoContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                  />
                )}

                {estrategiaMetricas === 'Quadrantes5min' && (
                  <MetricsQuadrantes5minContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                  />
                )}

                {estrategiaMetricas === 'CavaloTroia' && (
                  <MetricsCavaloTroiaContent
                    backtestAtivo={backtestAtivo} setBacktestAtivo={setBacktestAtivo}
                    backtestAtivosSelecionados={backtestAtivosSelecionados} setBacktestAtivosSelecionados={setBacktestAtivosSelecionados}
                    backtestDataInicio={backtestDataInicio} setBacktestDataInicio={setBacktestDataInicio}
                    backtestDataFim={backtestDataFim} setBacktestDataFim={setBacktestDataFim}
                    backtestVelas={backtestVelas}
                    backtestLoading={backtestLoading}
                    servicoVelas={servicoVelas}
                    ativosPadrao={ativosPadrao}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MetricsQuadrantesContent = ({
  backtestAtivo, setBacktestAtivo,
  backtestAtivosSelecionados, setBacktestAtivosSelecionados,
  backtestDataInicio, setBacktestDataInicio,
  backtestDataFim, setBacktestDataFim,
  backtestVelas,
  backtestLoading,
  servicoVelas,
  ativosPadrao,
  todasOperacoesReais,
  refreshCounter,
  comparativoReady
}: any) => {
  const [subTab, setSubTab] = React.useState<'lista' | 'estatisticas' | 'losses' | 'comparativo' | 'lucro' | 'real' | 'drawdown' | 'mensal' | 'gale'>('lista');
  const [horaInicio, setHoraInicio] = React.useState('00:00');
  const [horaFim, setHoraFim] = React.useState('23:59');
  const [valorEntrada, setValorEntrada] = React.useState(20);
  const [payout, setPayout] = React.useState(87);
  const [somenteDuplas, setSomenteDuplas] = React.useState(false);
  const [somenteVolume, setSomenteVolume] = React.useState(false);
  const [raioXFiltrarDuplas, setRaioXFiltrarDuplas] = React.useState(false);
  const [raioXFiltrarVolume, setRaioXFiltrarVolume] = React.useState(false);
  const [diasSelecionados, setDiasSelecionados] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [mesSelecionado, setMesSelecionado] = React.useState<string | null>(null);

  const mesesAbreviados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const ultimos5Meses = React.useMemo(() => {
    const meses: { label: string; inicio: string; fim: string; key: string }[] = [];
    const hoje = new Date();
    for (let i = 1; i <= 5; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth();
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const mesStr = (mes + 1).toString().padStart(2, '0');
      const key = `${ano}-${mesStr}`;
      meses.push({
        label: `${mesesAbreviados[mes]}/${ano}`,
        inicio: `${ano}-${mesStr}-01`,
        fim: `${ano}-${mesStr}-${ultimoDia.toString().padStart(2, '0')}`,
        key,
      });
    }
    return meses.reverse();
  }, []);
  const [quadrantesSelecionados, setQuadrantesSelecionados] = React.useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [padroesSelecionados, setPadroesSelecionados] = React.useState<string[]>(['5x5', '6x4', '7x3', '8x2', '9x1', '10x0']);
  const [bancaInicial, setBancaInicial] = React.useState(1000);

  // === EVOLUÇÃO MENSAL ===
  const [dadosMensais, setDadosMensais] = React.useState<{
    key: string; label: string; total: number; wins: number; winRate: number; lucro: number; roi: number; status: 'pendente' | 'carregando' | 'concluido' | 'sem_dados';
  }[]>([]);
  const [carregandoMensal, setCarregandoMensal] = React.useState(false);

  // Função para calcular resumo de backtest a partir de velas brutas
  const calcularResumoQuadrantes = React.useCallback((velasRaw: any[], todasVelas: any[]) => {
    if (!velasRaw || velasRaw.length < 10) return { total: 0, wins: 0, lucro: 0 };

    const timestampIndexMap = new Map<number, number>();
    todasVelas.forEach((v: any, i: number) => { if (v) timestampIndexMap.set(v.timestamp, i); });

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const totalMinI = hI * 60 + mI;
    const totalMinF = hF * 60 + mF;
    const cruzaMeiaNoite = totalMinI > totalMinF;

    let totalOps = 0, winsOps = 0;

    const velasPorChave: Record<string, any[]> = {};
    velasRaw.forEach((v: any) => {
      const d = new Date(v.timestamp * 1000);
      if (!diasSelecionados.includes(d.getDay())) return;
      const chave = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getHours().toString().padStart(2, '0')}`;
      if (!velasPorChave[chave]) velasPorChave[chave] = [];
      velasPorChave[chave].push({ ...v, _hour: d.getHours(), _min: d.getMinutes() });
    });

    Object.keys(velasPorChave).forEach(chave => {
      const velasDaHora = velasPorChave[chave];
      const horaNum = velasDaHora[0]._hour;
      const totalMin = horaNum * 60;
      if (cruzaMeiaNoite) { if (totalMin < totalMinI && totalMin > totalMinF) return; }
      else { if (totalMin < totalMinI || totalMin > totalMinF) return; }

      for (let q = 1; q <= 6; q++) {
        if (!quadrantesSelecionados.includes(q)) continue;
        const minInicio = (q - 1) * 10;
        const velasDoQuadranteRaw = velasDaHora.filter(v => v._min >= minInicio && v._min <= minInicio + 9);
        const velasPorMinuto = new Map<number, any>();
        velasDoQuadranteRaw.forEach(v => { velasPorMinuto.set(v._min, v); });
        const velasDoQuadrante = Array.from(velasPorMinuto.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
        if (velasDoQuadrante.length === 0) continue;

        const tsFirst = velasDoQuadrante[0].timestamp;
        const indexPrimeiraVela = timestampIndexMap.get(tsFirst) ?? -1;
        const velasHistorico = indexPrimeiraVela >= 20 ? todasVelas.slice(indexPrimeiraVela - 20, indexPrimeiraVela) : [];
        const analise = analisarQuadrante(velasDoQuadrante, velasHistorico);
        const maior = Math.max(analise.total_alta, analise.total_baixa);
        const menor = Math.min(analise.total_alta, analise.total_baixa);
        const keyStats = `${maior}x${menor}`;
        if (!padroesSelecionados.includes(keyStats)) continue;

        // Filtros dupla e volume
        if (somenteDuplas || somenteVolume) {
          let qtdDuplas = 0, sequenciaIgual = 1;
          velasDoQuadrante.forEach((v, idx) => {
            if (idx > 0) {
              const prev = velasDoQuadrante[idx-1];
              const diff = Math.abs(v.fechamento - prev.fechamento);
              const threshold = v.fechamento * 0.0001;
              if (diff < threshold && v.cor === prev.cor) { sequenciaIgual++; if (sequenciaIgual === 2) qtdDuplas++; }
              else sequenciaIgual = 1;
            }
          });
          if (somenteDuplas && qtdDuplas > 0) continue;
          if (somenteVolume && !analise.volume_confirmacao) continue;
        }

        const ultimaVelaQ = velasDoQuadrante[velasDoQuadrante.length - 1];
        const idxUltima = timestampIndexMap.get(ultimaVelaQ.timestamp);
        let proximaVela: any = null;
        if (idxUltima !== undefined && idxUltima + 1 < todasVelas.length) {
          const candidata = todasVelas[idxUltima + 1];
          if (candidata && (candidata.timestamp - ultimaVelaQ.timestamp) <= 120) proximaVela = candidata;
        }

        if (proximaVela) {
          const venceu = (analise.direcao_operacao === 'compra' && proximaVela.cor === 'alta') ||
                        (analise.direcao_operacao === 'venda' && proximaVela.cor === 'baixa');
          totalOps++;
          if (venceu) winsOps++;
        }
      }
    });

    const ganho = valorEntrada * (payout / 100);
    const lucro = (winsOps * ganho) - ((totalOps - winsOps) * valorEntrada);
    return { total: totalOps, wins: winsOps, lucro };
  }, [horaInicio, horaFim, diasSelecionados, quadrantesSelecionados, padroesSelecionados, somenteDuplas, somenteVolume, valorEntrada, payout]);

  // Calcular evolução mensal usando dados já carregados em memória (instantâneo)
  const carregarEvolucaoMensal = React.useCallback(() => {
    if (!backtestVelas || backtestVelas.length < 10) return;

    setCarregandoMensal(true);
    const resultados: typeof dadosMensais = ultimos5Meses.map(m => {
      // Filtrar velas deste mês a partir dos dados já em memória
      const velasDoMes = backtestVelas.filter((v: any) => {
        if (!v || !v.timestamp) return false;
        const d = new Date(v.timestamp * 1000);
        const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        return localStr >= m.inicio && localStr <= m.fim;
      });

      if (velasDoMes.length < 10) {
        return { key: m.key, label: m.label, total: 0, wins: 0, winRate: 0, lucro: 0, roi: 0, status: 'sem_dados' as const };
      }

      const resumo = calcularResumoQuadrantes(velasDoMes, velasDoMes);
      const winRate = resumo.total > 0 ? (resumo.wins / resumo.total) * 100 : 0;
      const roi = bancaInicial > 0 ? (resumo.lucro / bancaInicial) * 100 : 0;
      return { key: m.key, label: m.label, ...resumo, winRate, roi, status: 'concluido' as const };
    });

    setDadosMensais(resultados);
    setCarregandoMensal(false);
  }, [ultimos5Meses, backtestVelas, calcularResumoQuadrantes, bancaInicial]);

  const ativosDisponiveis = ativosPadrao || [
    'EUR/USD', 'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/CAD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
    'BTC/USD', 'ETH/USD', 'ETH/USDT', 'SOL/USD', 'SOL/USDT', 'Ouro', 'Wall Street 30'
  ];

  // 1. Filtragem de velas (Memoizada separadamente para velocidade)
  const velasFiltradas = React.useMemo(() => {
    if (!backtestVelas || backtestVelas.length < 10 || !backtestDataInicio || !backtestDataFim) return [];
    const agoraUnix = Math.floor(Date.now() / 1000) + 300;
    const inicioStr = backtestDataInicio;
    const fimStr = backtestDataFim;

    return backtestVelas.filter((v: any) => {
      if (!v || !v.timestamp || v.timestamp > agoraUnix) return false;
      const d = new Date(v.timestamp * 1000);
      if (!diasSelecionados.includes(d.getDay())) return false;
      const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      return localStr >= inicioStr && localStr <= fimStr;
    });
  }, [backtestVelas, backtestDataInicio, backtestDataFim, diasSelecionados]);

  // 2. Cálculo das Métricas do Ativo Ativo
  const backtestData = React.useMemo(() => {
    try {
      if (velasFiltradas.length === 0) {
        return {
          lista: [], stats: {}, statsQuadrante: {}, statsFaixa: {}, statsHoraIndividual: {}, statsPadrãoQ: {},
          statsDia: {}, statsSemana: {}, statsSemanasPassadas: [], statsInteligencia: { melhoresQPorHora: [], goldenHours: [] },
          audit: { duplaPosicao: { total: 0, wins: 0, totalLosses: 0, lossesComDupla: 0, totalWins: 0, winsComDupla: 0 }, doji: { total: 0, wins: 0, totalLosses: 0, lossesComDoji: 0, winsComDoji: 0, totalWins: 0 }, avgAmpWin: 0, avgAmpLoss: 0, seqLossMax: 0, sugestoes: [], totalFiltrado: 0 }
        };
      }

      const listaResultados: any[] = [];
      const statsAgrupadas: Record<string, { total: number, wins: number }> = {
        '5x5': { total: 0, wins: 0 }, '6x4': { total: 0, wins: 0 }, '7x3': { total: 0, wins: 0 },
        '8x2': { total: 0, wins: 0 }, '9x1': { total: 0, wins: 0 }, '10x0': { total: 0, wins: 0 },
      };

      const statsPorQuadrante: Record<string, { total: number, wins: number }> = {
        'Q1': { total: 0, wins: 0 }, 'Q2': { total: 0, wins: 0 }, 'Q3': { total: 0, wins: 0 },
        'Q4': { total: 0, wins: 0 }, 'Q5': { total: 0, wins: 0 }, 'Q6': { total: 0, wins: 0 },
      };

      const statsPadrãoPorQuadrante: Record<string, { tendencia: { t: number, w: number }, reversao: { t: number, w: number } }> = {};
      for (let q = 1; q <= 6; q++) {
        statsPadrãoPorQuadrante[`Q${q}`] = { 
          tendencia: { t: 0, w: 0 }, 
          reversao: { t: 0, w: 0 } 
        };
      }

      const statsPorFaixa: Record<string, { total: number, wins: number }> = {
        'Madrugada (00-06)': { total: 0, wins: 0 }, 'Manhã (06-12)': { total: 0, wins: 0 },
        'Tarde (12-18)': { total: 0, wins: 0 }, 'Noite (18-00)': { total: 0, wins: 0 },
      };

      const statsPorHoraIndividual: Record<number, { total: number, wins: number }> = {};
      for (let i = 0; i < 24; i++) statsPorHoraIndividual[i] = { total: 0, wins: 0 };

      const statsPorDiaDaSemana: Record<number, { total: number, wins: number }> = {};
      for (let i = 0; i < 7; i++) statsPorDiaDaSemana[i] = { total: 0, wins: 0 };

      const statsPorDia: Record<string, { 
        total: number, wins: number, lucro: number, 
        q: Record<string, { total: number, wins: number }>,
        h: Record<number, { total: number, wins: number }> 
      }> = {};
      const statsMelhorConfigs: any[] = [];
      const statsQuadrantePorHora: Record<string, Record<string, { total: number, wins: number }>> = {};
      const statsPadraoPorHora: Record<string, Record<string, { total: number, wins: number }>> = {};
      const statsPorSemana: Record<string, { total: number, wins: number, lucro: number, dias: Set<string> }> = {};

      const statsDuplaPosicao = { total: 0, wins: 0, totalLosses: 0, lossesComDupla: 0, totalWins: 0, winsComDupla: 0 };
      const statsDoji = { total: 0, wins: 0, totalLosses: 0, lossesComDoji: 0, winsComDoji: 0, totalWins: 0 };
      const amplitudesWins: number[] = [];
      const amplitudesLosses: number[] = [];
      let seqLossAtual = 0;
      let seqLossMax = 0;

      // === ÍNDICES DE PERFORMANCE: Map para lookup O(1) ===
      const timestampIndexMap = new Map<number, number>();
      backtestVelas.forEach((v: any, i: number) => { if (v) timestampIndexMap.set(v.timestamp, i); });
      const timestampVelaMap = new Map<number, any>();
      backtestVelas.forEach((v: any) => { if (v) timestampVelaMap.set(v.timestamp, v); });

      // === PARSING DE HORÁRIO FORA DO LOOP ===
      const [hI, mI] = horaInicio.split(':').map(Number);
      const [hF, mF] = horaFim.split(':').map(Number);
      const totalMinI = hI * 60 + mI;
      const totalMinF = hF * 60 + mF;
      const cruzaMeiaNoite = totalMinI > totalMinF; // ex: 22:00 > 02:00

      // === CONTADOR DE GAPS ===
      let gapsDeDados = 0;
      let totalQuadrantesAnalisados = 0;

      // Agrupar velas por dia e hora com Date cacheado
      const velasPorChave: Record<string, any[]> = {};
      velasFiltradas.forEach((v: any) => {
        const d = new Date(v.timestamp * 1000);
        const chave = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getHours().toString().padStart(2, '0')}`;
        if (!velasPorChave[chave]) velasPorChave[chave] = [];
        velasPorChave[chave].push({ ...v, _hour: d.getHours(), _min: d.getMinutes(), _date: d });
      });

      Object.keys(velasPorChave).forEach(chave => {
        const velasDaHora = velasPorChave[chave];
        const dExemplo = velasDaHora[0]._date;
        const horaNum = velasDaHora[0]._hour;

        // Filtro de horário com suporte a cruzamento de meia-noite (ex: 22:00-02:00)
        const totalMin = horaNum * 60;
        if (cruzaMeiaNoite) {
          // Meia-noite: aceita >= horaInicio OU <= horaFim
          if (totalMin < totalMinI && totalMin > totalMinF) return;
        } else {
          // Normal: aceita dentro do intervalo
          if (totalMin < totalMinI || totalMin > totalMinF) return;
        }

        for (let q = 1; q <= 6; q++) {
          // Filtro por Quadrante selecionado
          if (!quadrantesSelecionados.includes(q)) continue;

          const minInicio = (q - 1) * 10;
          const minFim = minInicio + 9;

          const velasDoQuadranteRaw = velasDaHora.filter(v => v._min >= minInicio && v._min <= minFim);
          // Deduplicar: manter apenas a ÚLTIMA vela de cada minuto (vela M1 completa)
          const velasPorMinuto = new Map<number, any>();
          velasDoQuadranteRaw.forEach(v => { velasPorMinuto.set(v._min, v); });
          const velasDoQuadrante = Array.from(velasPorMinuto.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);

          // Processar TODOS os quadrantes — mesmo com poucas velas (rastrear gaps)
          totalQuadrantesAnalisados++;
          if (velasDoQuadrante.length < 10) gapsDeDados++;
          if (velasDoQuadrante.length === 0) continue;

            // Volume Analysis: lookup O(1) via Map
            const tsFirst = velasDoQuadrante[0].timestamp;
            const indexPrimeiraVela = timestampIndexMap.get(tsFirst) ?? -1;
            const velasHistorico = indexPrimeiraVela >= 20
              ? backtestVelas.slice(indexPrimeiraVela - 20, indexPrimeiraVela)
              : [];

            const analise = analisarQuadrante(velasDoQuadrante, velasHistorico);
            const maior = Math.max(analise.total_alta, analise.total_baixa);
            const menor = Math.min(analise.total_alta, analise.total_baixa);
            const keyStats = `${maior}x${menor}`;
            // Filtro por Padrão selecionado
            if (!padroesSelecionados.includes(keyStats)) continue;
            const padrao = analise.cor_predominante !== 'empate' ? 'tendencia' : 'reversao';

            // Auditoria Avançada: Amplitude, Dupla, Tripla Posição e Dojis
            let amplitudeTotal = 0;
            let qtdDuplas = 0;
            let temTripla = false;
            let temDoji = false;
            let sequenciaIgual = 1;

            velasDoQuadrante.forEach((v, idx) => {
              amplitudeTotal += Math.abs(v.maxima - v.minima);
              const corpo = Math.abs(v.abertura - v.fechamento);
              const amplitudeVela = Math.abs(v.maxima - v.minima);
              if (corpo < (amplitudeVela * 0.1)) temDoji = true;

              if (idx > 0) {
                const prev = velasDoQuadrante[idx-1];
                const diff = Math.abs(v.fechamento - prev.fechamento);
                const threshold = v.fechamento * 0.0001;
                if (diff < threshold && v.cor === prev.cor) {
                  sequenciaIgual++;
                  if (sequenciaIgual === 2) qtdDuplas++;
                  if (sequenciaIgual >= 3) temTripla = true;
                } else {
                  sequenciaIgual = 1;
                }
              }
            });
            const detectouDupla = qtdDuplas > 0;
            const volumeConfirmado = !!analise.volume_confirmacao;

            // Filtros de Simulação (Invertido: se ativado, EXCLUI as duplas)
            if (somenteDuplas && detectouDupla) continue;
            if (somenteVolume && !volumeConfirmado) continue;

            const ampMedia = amplitudeTotal / velasDoQuadrante.length;

            // Busca da próxima vela por índice — robusto para qualquer espaçamento de timestamps
            const ultimaVelaQ = velasDoQuadrante[velasDoQuadrante.length - 1];
            const idxUltima = timestampIndexMap.get(ultimaVelaQ.timestamp);
            let proximaVela: any = null;
            if (idxUltima !== undefined && idxUltima + 1 < backtestVelas.length) {
              const candidata = backtestVelas[idxUltima + 1];
              if (candidata && (candidata.timestamp - ultimaVelaQ.timestamp) <= 120) {
                proximaVela = candidata;
              }
            }

            if (proximaVela) {
              const venceu = (analise.direcao_operacao === 'compra' && proximaVela.cor === 'alta') ||
                            (analise.direcao_operacao === 'venda' && proximaVela.cor === 'baixa');

              listaResultados.push({
                hora: `${dExemplo.toLocaleDateString().slice(0, 5)} ${horaNum.toString().padStart(2, '0')}:${minInicio.toString().padStart(2, '0')}`,
                quadrante: `Q${q}`,
                estrategia: analise.cor_predominante !== 'empate' ? 'Sete Velas' : 'Clássico',
                padrao: analise.direcao_operacao === 'compra' ? 'Tendência' : 'Reversão',
                velas: `${analise.total_alta}H / ${analise.total_baixa}B`,
                resultado: venceu ? 'vitoria' : 'derrota',
                timestamp: proximaVela.timestamp,
                config: keyStats,
                detectouDupla,
                volumeConfirmado,
                explicacao: analise.explicacao,
                volume_medio: analise.volume_medio,
                volume_sma_20: analise.volume_sma_20,
                qtdDuplas,
                temTripla,
                temDoji,
                ampMedia,
                anatomia: {
                  forcaTrend: Math.abs(analise.total_alta - analise.total_baixa),
                  ampTotal: amplitudeTotal,
                  velas: velasDoQuadrante.map(v => ({ cor: v.cor, amp: Math.abs(v.maxima - v.minima) }))
                }
              });

              if (statsAgrupadas[keyStats]) { statsAgrupadas[keyStats].total++; if (venceu) statsAgrupadas[keyStats].wins++; }
              const qKey = `Q${q}`;
              if (statsPorQuadrante[qKey]) { statsPorQuadrante[qKey].total++; if (venceu) statsPorQuadrante[qKey].wins++; }
              
              const dDia = dExemplo;
              const diaKey = `${dDia.getFullYear()}-${(dDia.getMonth()+1).toString().padStart(2, '0')}-${dDia.getDate().toString().padStart(2, '0')}`;
              const diaSemana = dDia.getDay(); // 0-6

              if (!statsPorDia[diaKey]) {
                statsPorDia[diaKey] = { total: 0, wins: 0, lucro: 0, q: {}, h: {} };
                for (let i=1; i<=6; i++) statsPorDia[diaKey].q[`Q${i}`] = { total: 0, wins: 0 };
                for (let i=0; i<24; i++) statsPorDia[diaKey].h[i] = { total: 0, wins: 0 };
              }
              statsPorDia[diaKey].total++;
              let lucroTrade = 0;
              if (venceu) {
                statsPorDia[diaKey].wins++;
                lucroTrade = (Number(valorEntrada) * (Number(payout) / 100));
              } else {
                lucroTrade = -Number(valorEntrada);
              }
              statsPorDia[diaKey].lucro += lucroTrade;

              statsPorDia[diaKey].q[qKey].total++;
              if (venceu) statsPorDia[diaKey].q[qKey].wins++;

              statsPorDia[diaKey].h[horaNum].total++;
              if (venceu) statsPorDia[diaKey].h[horaNum].wins++;

              statsPorDiaDaSemana[diaSemana].total++;
              if (venceu) statsPorDiaDaSemana[diaSemana].wins++;

              // Agrupamento Semanal
              const dSemana = new Date(proximaVela.timestamp * 1000);
              const firstDayOfYear = new Date(dSemana.getFullYear(), 0, 1);
              const pastDaysOfYear = (dSemana.getTime() - firstDayOfYear.getTime()) / 86400000;
              const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
              const weekKey = `${dSemana.getFullYear()}-W${weekNumber}`;

              if (!statsPorSemana[weekKey]) {
                statsPorSemana[weekKey] = { total: 0, wins: 0, lucro: 0, dias: new Set() };
              }
              statsPorSemana[weekKey].total++;
              statsPorSemana[weekKey].lucro += lucroTrade;
              statsPorSemana[weekKey].dias.add(diaKey);
              if (venceu) statsPorSemana[weekKey].wins++;

              if (!statsQuadrantePorHora[horaNum]) statsQuadrantePorHora[horaNum] = {};
              if (!statsQuadrantePorHora[horaNum][qKey]) statsQuadrantePorHora[horaNum][qKey] = { total: 0, wins: 0 };
              statsQuadrantePorHora[horaNum][qKey].total++;
              if (venceu) statsQuadrantePorHora[horaNum][qKey].wins++;

              if (!statsPadraoPorHora[horaNum]) statsPadraoPorHora[horaNum] = {};
              if (!statsPadraoPorHora[horaNum][keyStats]) statsPadraoPorHora[horaNum][keyStats] = { total: 0, wins: 0 };
              statsPadraoPorHora[horaNum][keyStats].total++;
              if (venceu) statsPadraoPorHora[horaNum][keyStats].wins++;

              // Auditoria de Padrões (Wins e Losses)
              if (detectouDupla) {
                statsDuplaPosicao.total++;
                if (venceu) statsDuplaPosicao.winsComDupla++;
                else statsDuplaPosicao.lossesComDupla++;
              }
              if (temDoji) {
                statsDoji.total++;
                if (venceu) statsDoji.winsComDoji++;
                else statsDoji.lossesComDoji++;
              }

              if (venceu) {
                amplitudesWins.push(ampMedia);
                seqLossAtual = 0;
                statsDuplaPosicao.totalWins++;
                statsDoji.totalWins++;
              } else {
                amplitudesLosses.push(ampMedia);
                statsDuplaPosicao.totalLosses++;
                statsDoji.totalLosses++;
                seqLossAtual++;
                if (seqLossAtual > seqLossMax) seqLossMax = seqLossAtual;
              }

              // Estatística de Padrão dentro do Quadrante
              if (padrao === 'tendencia') {
                statsPadrãoPorQuadrante[qKey].tendencia.t++;
                if (venceu) statsPadrãoPorQuadrante[qKey].tendencia.w++;
              } else {
                statsPadrãoPorQuadrante[qKey].reversao.t++;
                if (venceu) statsPadrãoPorQuadrante[qKey].reversao.w++;
              }

              const faixa = horaNum < 6 ? 'Madrugada (00-06)' : horaNum < 12 ? 'Manhã (06-12)' : horaNum < 18 ? 'Tarde (12-18)' : 'Noite (18-00)';
            statsPorFaixa[faixa].total++; if (venceu) statsPorFaixa[faixa].wins++;
            statsPorHoraIndividual[horaNum].total++; if (venceu) statsPorHoraIndividual[horaNum].wins++;
          }
        }
    });

    console.log('[Backtest Compute] Resultados:', listaResultados.length, '| Gaps:', gapsDeDados, '/', totalQuadrantesAnalisados, '| Chaves velasPorChave:', Object.keys(velasPorChave).length);
    return {
        lista: listaResultados.sort((a,b) => b.timestamp - a.timestamp),
        stats: statsAgrupadas,
        statsQuadrante: statsPorQuadrante,
        statsFaixa: statsPorFaixa,
        statsHoraIndividual: statsPorHoraIndividual,
        statsPadrãoQ: statsPadrãoPorQuadrante,
        // CÁLCULO DE DRAWDOWN (CHRONOLOGICAL)
        drawdown: (() => {
          let balanceSimulado = 0;
          let peakSimulado = 0;
          let maxDrawdown = 0;
          let dataMaxDrawdown = '';
          const chartDrawdown: any[] = [];
          [...listaResultados].sort((a,b) => a.timestamp - b.timestamp).forEach(res => {
            const lucro = res.resultado === 'vitoria' ? (Number(valorEntrada) * (Number(payout)/100)) : -Number(valorEntrada);
            balanceSimulado += lucro;
            if (balanceSimulado > peakSimulado) peakSimulado = balanceSimulado;
            const currentDD = peakSimulado - balanceSimulado;
            if (currentDD > maxDrawdown) {
              maxDrawdown = currentDD;
              dataMaxDrawdown = res.hora;
            }
            chartDrawdown.push({ hora: res.hora, saldo: balanceSimulado, drawdown: -currentDD });
          });
          return { max: maxDrawdown, data: dataMaxDrawdown, chart: chartDrawdown };
        })(),
        statsDia: Object.entries(statsPorDia).reduce((acc, [data, s]) => {
          const melhorHoraEntry = Object.entries(s.h).reduce((p, c) => (c[1].wins / (c[1].total || 1)) > (p[1].wins / (p[1].total || 1)) ? c : p, ['0', {total:0, wins:0}] as [string, any]);
          const melhorQEntry = Object.entries(s.q).reduce((p, c) => (c[1].wins / (c[1].total || 1)) > (p[1].wins / (p[1].total || 1)) ? c : p, ['Q1', {total:0, wins:0}] as [string, any]);
          acc[data] = {
            ...s,
            melhorHora: melhorHoraEntry[1].total > 0 ? Number(melhorHoraEntry[0]) : null,
            melhorQ: melhorQEntry[1].total > 0 ? melhorQEntry[0] : null,
            melhorRate: melhorHoraEntry[1].total > 0 ? (melhorHoraEntry[1].wins / melhorHoraEntry[1].total) * 100 : 0
          };
          return acc;
        }, {} as any),
        statsSemana: statsPorDiaDaSemana,
        statsSemanasPassadas: Object.entries(statsPorSemana).map(([week, s]) => ({
          week, total: s.total, wins: s.wins, rate: (s.wins / s.total) * 100, lucro: s.lucro, diasOperados: s.dias.size
        })).sort((a,b) => b.week.localeCompare(a.week)),
        statsInteligencia: {
          melhoresQPorHora: Object.entries(statsQuadrantePorHora).map(([hora, qs]) => {
            const melhorQ = Object.entries(qs).reduce((p, c) => (c[1].wins / (c[1].total || 1)) > (p[1].wins / (p[1].total || 1)) ? c : p, ['Q1', {total:0, wins:0}] as [string, any]);
            const melhorP = statsPadraoPorHora[hora] 
              ? Object.entries(statsPadraoPorHora[hora]).reduce((p, c) => (c[1].wins / (c[1].total || 1)) > (p[1].wins / (p[1].total || 1)) ? c : p, ['', {total:0, wins:0}] as [string, any])
              : null;
            return { hora: Number(hora), q: melhorQ[0], rate: melhorQ[1].total > 0 ? (melhorQ[1].wins / melhorQ[1].total) * 100 : 0, total: melhorQ[1].total, melhorPadrao: melhorP && melhorP[1].total > 0 ? melhorP[0] : '-' };
          }).filter(h => h.total > 0).sort((a, b) => b.rate - a.rate).slice(0, 5),
          goldenHours: Object.entries(statsQuadrantePorHora).map(([hora, qs]) => {
            const bestQ = Object.entries(qs).reduce((p, c) => (c[1].wins / (c[1].total || 1)) > (p[1].wins / (p[1].total || 1)) ? c : p, ['Q1', {total:0, wins:0}] as [string, any]);
            return { hora: Number(hora), q: bestQ[0], rate: bestQ[1].total > 0 ? (bestQ[1].wins / bestQ[1].total) * 100 : 0, total: bestQ[1].total };
          }).filter(h => h.total >= 2 && h.rate >= 60).sort((a, b) => b.rate - a.rate)
        },
        audit: {
          duplaPosicao: statsDuplaPosicao, doji: statsDoji,
          avgAmpWin: amplitudesWins.length > 0 ? amplitudesWins.reduce((a,b) => a+b, 0) / amplitudesWins.length : 0,
          avgAmpLoss: amplitudesLosses.length > 0 ? amplitudesLosses.reduce((a,b) => a+b, 0) / amplitudesLosses.length : 0,
          seqLossMax,
          totalFiltrado: listaResultados.filter(r => r.resultado === 'derrota' && (r.detectouDupla || r.temDoji || r.ampMedia < (amplitudesWins.length > 0 ? amplitudesWins.reduce((a,b) => a+b, 0) / amplitudesWins.length : 0))).length,
          totalDojis: listaResultados.filter(r => r.resultado === 'derrota' && r.temDoji).length,
          // Transparência de Dados: Gaps e Cobertura
          gapsDeDados,
          totalQuadrantesAnalisados,
          coberturaDias: (() => {
            const diasNoRange: string[] = [];
            const inicio = new Date(backtestDataInicio + 'T00:00:00');
            const fim = new Date(backtestDataFim + 'T23:59:59');
            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
              diasNoRange.push(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
            }
            const diasComDados = new Set(Object.keys(statsPorDia));
            return diasNoRange.map(dia => ({ dia, temDados: diasComDados.has(dia) }));
          })(),
          sugestoes: [
            ...Object.entries(statsAgrupadas).filter(([_, s]) => (s.wins / s.total) > 0.8 && s.total > 3).map(([k, _]) => `Focar na configuração ${k} (Aprovada)`),
            ...Object.entries(statsPorQuadrante).filter(([_, s]) => (s.wins / s.total) < 0.5 && s.total > 2).map(([k, _]) => `Evitar entradas no ${k}`),
            statsDuplaPosicao.lossesComDupla > (statsDuplaPosicao.winsComDupla * 1.5) ? "Urgente: Ativar Filtro de Dupla Posição" : null,
          ].filter(Boolean)
        },
        statsReais: {
          total: todasOperacoesReais.filter((op: any) => op.data >= backtestDataInicio && op.data <= backtestDataFim).length,
          wins: todasOperacoesReais.filter((op: any) => op.data >= backtestDataInicio && op.data <= backtestDataFim && op.resultado === 'vitoria').length,
          lucro: todasOperacoesReais.filter((op: any) => op.data >= backtestDataInicio && op.data <= backtestDataFim).reduce((acc: number, op: any) => acc + (op.lucro || 0), 0),
          ativos: []
        }
      };
    } catch (e) {
      console.error("Erro Crítico no Backtest:", e, "| velasFiltradas:", velasFiltradas.length, "| backtestVelas:", backtestVelas.length);
      return null;
    }
  }, [velasFiltradas, backtestVelas, valorEntrada, payout, somenteDuplas, somenteVolume, horaInicio, horaFim, todasOperacoesReais, quadrantesSelecionados, padroesSelecionados]);

  // 3. Destructuring do backtestData
  const { 
    lista: backtestResultados, stats: backtestStats, statsQuadrante: backtestStatsQ, 
    statsFaixa: backtestStatsF, statsHoraIndividual: backtestStatsH, statsPadrãoQ: backtestStatsPQ,
    drawdown, statsDia, statsSemana, statsSemanasPassadas, statsInteligencia, audit, statsReais
  } = backtestData || { 
    lista: [], stats: {}, statsQuadrante: {}, statsFaixa: {}, statsHoraIndividual: {}, statsPadrãoQ: {},
    drawdown: { max: 0, data: '', chart: [] }, statsDia: {}, statsSemana: {}, statsSemanasPassadas: [], statsInteligencia: { melhoresQPorHora: [], goldenHours: [] }, audit: { sugestoes: [] }, statsReais: { total: 0, wins: 0, lucro: 0, ativos: [] }
  };

  // 4. Comparativo Multi-Ativos (APENAS quando a aba está aberta) — Otimizado com Map O(1)
  const comparativoAtivos = React.useMemo(() => {
    if (subTab !== 'comparativo') return [];
    return backtestAtivosSelecionados.map(ativo => {
      const velasAtivo = servicoVelas.obterVelasDeAtivo(ativo);
      const tsMapAtivo = new Map<number, any>();
      velasAtivo.forEach((v: any) => { if (v) tsMapAtivo.set(v.timestamp, v); });

      const filtered = velasAtivo.filter((v: any) => {
        const d = new Date(v.timestamp * 1000);
        const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        return localStr >= backtestDataInicio && localStr <= backtestDataFim;
      });

      let totalTrades = 0, winTrades = 0;
      const mapAtivoHora: Record<string, any[]> = {};
      filtered.forEach((v: any) => {
         const d = new Date(v.timestamp * 1000);
         const ck = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}_${d.getHours()}`;
         if(!mapAtivoHora[ck]) mapAtivoHora[ck] = [];
         mapAtivoHora[ck].push({ ...v, _min: d.getMinutes() });
      });

      Object.keys(mapAtivoHora).forEach(ck => {
        const vH = mapAtivoHora[ck];
        for(let q=1; q<=6; q++){
          const minI = (q-1)*10;
          const vQ = vH.filter(v => v._min >= minI && v._min < minI+10);

          if(vQ.length > 0) {
             const an = analisarQuadrante(vQ, velasAtivo);
             // Busca próxima vela via Map O(1)
             const ultimaVQ = vQ[vQ.length - 1];
             const nextV = tsMapAtivo.get(ultimaVQ.timestamp + 60) || null;

             if(nextV) {
               const win = (an.direcao_operacao === 'compra' && nextV.cor === 'alta') || (an.direcao_operacao === 'venda' && nextV.cor === 'baixa');
               totalTrades++; if(win) winTrades++;
             }
          }
        }
      });
      return {
        ativo, total: totalTrades, wins: winTrades, rate: totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0,
        bestHour: '-', profit: (winTrades * (Number(valorEntrada) * (Number(payout)/100))) - ((totalTrades - winTrades) * Number(valorEntrada))
      };
    });
  }, [subTab, backtestAtivosSelecionados, backtestDataInicio, backtestDataFim, valorEntrada, payout, servicoVelas, comparativoReady]);

  const vitorias = backtestResultados.filter(r => r.resultado === 'vitoria').length;
  const total = backtestResultados.length;
  const winRate = total > 0 ? (vitorias / total) * 100 : 0;

  // Raio-X: simulação independente dos filtros do topo
  const raioXFiltradosCount = backtestResultados.filter((r: any) =>
    r.resultado === 'derrota' &&
    ((raioXFiltrarDuplas && r.detectouDupla) || (raioXFiltrarVolume && !r.volumeConfirmado))
  ).length;
  const raioXPotencial = total > 0 ? (vitorias / Math.max(1, total - raioXFiltradosCount)) * 100 : 0;

  // Encontrar Oportunidade de Ouro (Hora com melhor winrate)
  const horaOuro = Object.entries(backtestStatsH).reduce((prev: any, curr: any) => {
    const rateCurr = curr[1].total > 0 ? (curr[1].wins / curr[1].total) : 0;
    const ratePrev = prev.rate || 0;
    if (rateCurr > ratePrev) return { hora: curr[0], rate: rateCurr, total: curr[1].total };
    return prev;
  }, { hora: '-', rate: 0, total: 0 });

  // 5. Simulador Financeiro — Evolução da banca operação a operação
  const simulacaoFinanceira = React.useMemo(() => {
    if (backtestResultados.length === 0) return { pontos: [], bancaFinal: bancaInicial, roi: 0, maiorRebaixamento: 0, riscoRuina: false, maiorSequenciaLoss: 0 };

    // Ordenar por timestamp (cronológico)
    const opsOrdenadas = [...backtestResultados].sort((a, b) => {
      const tsA = a.hora ? new Date(a.hora.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')).getTime() : 0;
      const tsB = b.hora ? new Date(b.hora.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')).getTime() : 0;
      return tsA - tsB;
    });

    let saldo = bancaInicial;
    let saldoPico = bancaInicial;
    let maiorRebaixamento = 0;
    let riscoRuina = false;
    let seqLoss = 0;
    let maiorSeqLoss = 0;
    const ganhoOp = valorEntrada * (payout / 100);
    const perdaOp = valorEntrada;

    const pontos: { idx: number; saldo: number; resultado: string; hora: string }[] = [
      { idx: 0, saldo: bancaInicial, resultado: 'inicio', hora: 'Início' }
    ];

    opsOrdenadas.forEach((op, i) => {
      if (op.resultado === 'vitoria') {
        saldo += ganhoOp;
        seqLoss = 0;
      } else {
        saldo -= perdaOp;
        seqLoss++;
        if (seqLoss > maiorSeqLoss) maiorSeqLoss = seqLoss;
      }
      if (saldo <= 0) { saldo = 0; riscoRuina = true; }
      if (saldo > saldoPico) saldoPico = saldo;
      const dd = saldoPico - saldo;
      if (dd > maiorRebaixamento) maiorRebaixamento = dd;
      pontos.push({ idx: i + 1, saldo, resultado: op.resultado, hora: op.hora || '' });
    });

    const roi = bancaInicial > 0 ? ((saldo - bancaInicial) / bancaInicial) * 100 : 0;
    return { pontos, bancaFinal: saldo, roi, maiorRebaixamento, riscoRuina, maiorSequenciaLoss: maiorSeqLoss };
  }, [backtestResultados, bancaInicial, valorEntrada, payout]);

  return (
    <div className="space-y-6">
      {/* Seletores e Gráfico de Assertividade */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white/[0.02] p-6 rounded-3xl border border-white/5">
        <div className="flex flex-col gap-4 w-full lg:w-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Ativo para Análise</label>
              <select
                value={backtestAtivo}
                onChange={(e) => setBacktestAtivo(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all min-w-[180px]"
              >
                {ativosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Data Inicial</label>
              <input
                type="date"
                value={backtestDataInicio}
                onChange={(e) => { setBacktestDataInicio(e.target.value); setMesSelecionado(null); }}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Data Final</label>
              <input
                type="date"
                value={backtestDataFim}
                onChange={(e) => { setBacktestDataFim(e.target.value); setMesSelecionado(null); }}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-apex-trader-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Período Rápido</label>
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
              {ultimos5Meses.map(m => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMesSelecionado(m.key);
                    setBacktestDataInicio(m.inicio);
                    setBacktestDataFim(m.fim);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    mesSelecionado === m.key
                      ? "bg-apex-trader-primary text-black shadow-lg"
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Assertividade</p>
            <p className={cn("text-xl font-black", winRate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>
              {winRate.toFixed(1)}%
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Win / Loss</p>
            <p className="text-xl font-black text-white">
              <span className="text-apex-trader-primary">{vitorias}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-red-500">{total - vitorias}</span>
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-black text-white">{total}</p>
          </div>
        </div>
      </div>

      {/* Controles de Simulação Financeira e Tempo */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Início</span>
            <input 
              type="time" 
              value={horaInicio} 
              onChange={(e) => setHoraInicio(e.target.value)}
              className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fim</span>
            <input 
              type="time" 
              value={horaFim} 
              onChange={(e) => setHoraFim(e.target.value)}
              className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary"
            />
          </div>
        </div>

        <div className="w-px h-8 bg-white/5 mx-2 hidden md:block" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entrada (R$)</span>
            <input 
              type="number" 
              value={valorEntrada} 
              onChange={(e) => setValorEntrada(Number(e.target.value))}
              className="w-20 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Payout (%)</span>
            <input 
              type="number" 
              value={payout} 
              onChange={(e) => setPayout(Number(e.target.value))}
              className="w-16 bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-apex-trader-primary"
            />
          </div>
        </div>
        
        <div className="ml-auto text-right flex flex-col md:flex-row items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-all group">
            <input 
              type="checkbox" 
              checked={somenteVolume} 
              onChange={() => setSomenteVolume(!somenteVolume)}
              className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500 bg-slate-800"
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-blue-500 uppercase leading-none mb-0.5">Somente com Volume/Vola</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase group-hover:text-blue-500/50 transition-colors">Confirmar atividade</span>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-all group">
            <input 
              type="checkbox" 
              checked={somenteDuplas} 
              onChange={() => setSomenteDuplas(!somenteDuplas)}
              className="w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500 bg-slate-800"
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-amber-500 uppercase leading-none mb-0.5">Filtrar Duplas Posições</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase group-hover:text-amber-500/50 transition-colors">Remover velas gêmeas</span>
            </div>
          </label>
          <div className="md:flex flex-col hidden">
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Análise de Sessão</span>
            <span className="text-[10px] text-slate-500 font-bold">Baseado no período selecionado</span>
          </div>
        </div>
      </div>

      {/* Filtro por Dia da Semana */}
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Dias da Semana:</span>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((nome, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDiasSelecionados(prev =>
                prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
              );
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
              diasSelecionados.includes(idx)
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-slate-400"
            )}
          >
            {nome}
          </button>
        ))}
        <button
          onClick={() => setDiasSelecionados([1, 2, 3, 4, 5])}
          className="ml-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
        >
          Só úteis
        </button>
        <button
          onClick={() => setDiasSelecionados([0, 1, 2, 3, 4, 5, 6])}
          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-all"
        >
          Todos
        </button>
      </div>

      {/* Filtro por Quadrante */}
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Quadrantes:</span>
        {[1, 2, 3, 4, 5, 6].map(q => (
          <button
            key={q}
            onClick={() => {
              setQuadrantesSelecionados(prev =>
                prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q].sort()
              );
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
              quadrantesSelecionados.includes(q)
                ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-slate-400"
            )}
          >
            Q{q}
          </button>
        ))}
        <button
          onClick={() => setQuadrantesSelecionados([1, 2, 3, 4, 5, 6])}
          className="ml-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-all"
        >
          Todos
        </button>
      </div>

      {/* Filtro por Padrão */}
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Padrões:</span>
        {['5x5', '6x4', '7x3', '8x2', '9x1', '10x0'].map(p => (
          <button
            key={p}
            onClick={() => {
              setPadroesSelecionados(prev =>
                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
              );
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
              padroesSelecionados.includes(p)
                ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-slate-400"
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setPadroesSelecionados(['5x5', '6x4', '7x3', '8x2', '9x1', '10x0'])}
          className="ml-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-all"
        >
          Todos
        </button>
      </div>

      {/* Navegação entre abas de dados */}
      <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setSubTab('lista')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'lista' ? "bg-apex-trader-primary text-black shadow-lg shadow-apex-trader-primary/20" : "text-slate-500 hover:text-white"
          )}
        >
          Lista de Quadrantes
        </button>
        <button
          onClick={() => setSubTab('estatisticas')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'estatisticas' ? "bg-apex-trader-primary text-black shadow-lg shadow-apex-trader-primary/20" : "text-slate-500 hover:text-white"
          )}
        >
          Estatísticas por Padrão
        </button>
        <button
          onClick={() => setSubTab('losses')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'losses' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          Galeria de Perdas
        </button>
        <button
          onClick={() => setSubTab('comparativo')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'comparativo' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          Multi-Ativos
        </button>
        <button
          onClick={() => setSubTab('drawdown')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'drawdown' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          Drawdown Máximo
        </button>
        <button
          onClick={() => setSubTab('real')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'real' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          Métricas da Conta (Real)
        </button>
        <button
          onClick={() => setSubTab('lucro')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'lucro' ? "bg-apex-trader-primary text-black shadow-lg shadow-apex-trader-primary/20" : "text-slate-500 hover:text-white"
          )}
        >
          Simulador Financeiro
        </button>
        <button
          onClick={() => setSubTab('mensal')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'mensal' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          Evolução Mensal
        </button>
        <button
          onClick={() => setSubTab('gale')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            subTab === 'gale' ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-amber-500/60 hover:text-amber-400"
          )}
        >
          ⚡ Proteção
        </button>
      </div>

      {/* Conteúdo dinâmico (Carregando ou Dados) */}
      {backtestLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
          <div className="w-12 h-12 border-4 border-apex-trader-primary/20 border-t-apex-trader-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando com a Corretora...</p>
        </div>
      ) : subTab === 'lista' ? (
        <div className="glass-card overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] border-b border-white/5 uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Hora</th>
                  <th className="px-6 py-4">Quadrante</th>
                  <th className="px-6 py-4">Estratégia</th>
                  <th className="px-6 py-4 text-center">Formação (H/B)</th>
                  <th className="px-6 py-4 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-bold">
                {backtestResultados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-slate-600 uppercase text-[10px] tracking-widest italic font-bold">Nenhum quadrante encontrado para este período</p>
                      {!backtestLoading && backtestVelas.length > 0 && velasFiltradas.length === 0 && (() => {
                        const dInicio = new Date(backtestDataInicio + 'T12:00:00');
                        const dFim = new Date(backtestDataFim + 'T12:00:00');
                        const ehFimDeSemana = dInicio.getDay() === 0 || dInicio.getDay() === 6 || dFim.getDay() === 0 || dFim.getDay() === 6;
                        const ehForex = ['EUR/USD', 'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/CAD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'].includes(backtestAtivo);
                        const mesmaData = backtestDataInicio === backtestDataFim;
                        return (
                          <div className="mt-3 space-y-1">
                            {ehForex && ehFimDeSemana && <p className="text-yellow-500/70 text-[10px]">O mercado Forex fica fechado aos sábados e domingos</p>}
                            {mesmaData && <p className="text-slate-500 text-[10px]">Período de apenas 1 dia selecionado — tente ampliar o range</p>}
                            <p className="text-slate-600 text-[10px]">{backtestVelas.length} velas carregadas, {velasFiltradas.length} após filtro</p>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ) : backtestResultados.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-xs">{item.hora}</span>
                        {item.detectouDupla && (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-tighter",
                            item.temTripla ? "text-purple-500" : "text-red-500"
                          )}>
                            ● {item.temTripla ? 'Tripla Posição' : `Dupla Posição (${item.qtdDuplas}x)`}
                          </span>
                        )}
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter mt-0.5",
                          item.volumeConfirmado ? "text-blue-500" : "text-slate-600"
                        )}>
                          ● {item.volumeConfirmado ? 'Volume Confirmado' : 'Volume Baixo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[10px]">{item.quadrante}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] uppercase font-black",
                        item.estrategia === 'Sete Velas' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                      )}>
                        {item.estrategia}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] text-slate-400 font-mono italic">{item.velas}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                        item.resultado === 'vitoria' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {item.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'comparativo' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <LayoutGrid size={16} className="text-blue-500" />
              Seleção Multi-Ativos (Backtest)
            </h3>
            <div className="flex flex-wrap gap-2">
              {ativosDisponiveis.map(ativo => (
                <button
                  key={ativo}
                  onClick={() => {
                    if (backtestAtivosSelecionados.includes(ativo)) {
                      if (backtestAtivosSelecionados.length > 1) {
                        setBacktestAtivosSelecionados(backtestAtivosSelecionados.filter((a: string) => a !== ativo));
                      }
                    } else {
                      setBacktestAtivosSelecionados([...backtestAtivosSelecionados, ativo]);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                    backtestAtivosSelecionados.includes(ativo) 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {ativo}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Win Rate</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Ops Totais</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Melhor Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Lucro Simulado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparativoAtivos.map((row: any) => (
                  <tr key={row.ativo} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-white">{row.ativo}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={cn("text-sm font-black", row.rate >= 60 ? "text-emerald-500" : "text-amber-500")}>
                          {row.rate.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                          <div className={cn("h-full", row.rate >= 60 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${row.rate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-300">{row.total}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">{row.bestHour}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn("text-sm font-black", row.profit >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {row.profit >= 0 ? '+' : ''}R$ {row.profit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setBacktestAtivo(row.ativo); setSubTab('lista'); }}
                        className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-apex-trader-primary hover:text-black transition-all"
                      >
                        <TrendingUp size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'drawdown' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 border-2 border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500 rounded-lg text-black">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Drawdown Máximo do Período</p>
                  <h4 className="text-3xl font-black text-white">R$ {drawdown?.max.toFixed(2) || '0.00'}</h4>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                O "Drawdown" representa o maior "buraco" ou queda acumulada que sua banca sofreu desde o pico mais alto antes de se recuperar. 
                Neste período, você chegou a ficar <span className="text-orange-500">R$ {drawdown?.max.toFixed(2)}</span> abaixo do seu melhor momento.
                <br/><span className="text-[9px] text-slate-500 italic mt-1 block">Relação Risco: Compara seu capital exposto contra a queda máxima registrada.</span>
              </p>
            </div>
            <div className="glass-card p-6 border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Momento de Maior Risco</p>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  <Clock size={24} className="text-slate-400" />
                </div>
                <div>
                  <h5 className="text-sm font-black text-white uppercase">{drawdown?.data || 'N/A'}</h5>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Data/Hora da queda máxima</p>
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Win Rate</p>
                  <p className="text-lg font-black text-apex-trader-primary">{winRate.toFixed(1)}%</p>
                </div>
                <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Relação Risco</p>
                  <p className="text-lg font-black text-white">1:{(drawdown?.max / (valorEntrada || 1)).toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-white/10 bg-black/40 h-[400px]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Gráfico de Evolução vs Drawdown</h4>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={drawdown?.chart}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34de00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34de00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hora" hide />
                <YAxis hide />
                <ReTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#34de00" 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  name="Saldo Acumulado"
                />
                <Area 
                  type="monotone" 
                  dataKey="drawdown" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorDD)" 
                  name="Drawdown"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-4">
              <span className="text-[9px] font-bold text-slate-600 uppercase">Início do Período</span>
              <span className="text-[9px] font-bold text-slate-600 uppercase">Hoje</span>
            </div>
          </div>
        </div>
      ) : subTab === 'real' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Lucro Real Acumulado</p>
              <h4 className={cn("text-3xl font-black", statsReais.lucro >= 0 ? "text-emerald-500" : "text-red-500")}>
                R$ {statsReais.lucro.toFixed(2)}
              </h4>
              <p className="text-xs text-slate-500 mt-2 font-bold uppercase">No período selecionado</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operações Realizadas</p>
              <h4 className="text-3xl font-black text-white">{statsReais.total}</h4>
              <p className="text-xs text-slate-500 mt-2 font-bold uppercase">Executadas pelos alunos</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assertividade Real</p>
              <h4 className="text-3xl font-black text-apex-trader-primary">
                {statsReais.total > 0 ? ((statsReais.wins / statsReais.total) * 100).toFixed(1) : '0'}%
              </h4>
              <p className="text-xs text-slate-500 mt-2 font-bold uppercase">{statsReais.wins} Vitórias / {statsReais.total - statsReais.wins} Derrotas</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={16} className="text-emerald-500" />
              Performance Real por Ativo
            </h3>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Volume Real</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Win Rate</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {statsReais.ativos.map((row: any) => (
                    <tr key={row.name} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-white">{row.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-slate-400">{row.t} ops</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-emerald-500">
                          {((row.w / row.t) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("text-sm font-black", row.l >= 0 ? "text-emerald-500" : "text-red-500")}>
                          R$ {row.l.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {statsReais.ativos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">
                        Nenhuma operação real encontrada no período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : subTab === 'losses' ? (
        <div className="glass-card overflow-hidden border border-red-500/20 bg-red-500/[0.01]">
          <div className="p-6 border-b border-red-500/10">
            <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Shield size={14} />
              Galeria de Perdas - Auditoria de Duplas Posições
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Analise cada LOSS para identificar se houve o padrão de Velas Gêmeas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] border-b border-white/5 uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Quadrante</th>
                  <th className="px-6 py-4">Config</th>
                  <th className="px-6 py-4 text-center">Dupla Posição</th>
                  <th className="px-6 py-4 text-center">Amplitude (Tamanho)</th>
                  <th className="px-6 py-4 text-right">Ação Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-bold">
                {backtestResultados.filter(r => r.resultado === 'derrota').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-600 uppercase text-[10px] tracking-widest italic font-bold">Nenhum Loss encontrado no período</td>
                  </tr>
                ) : backtestResultados.filter(r => r.resultado === 'derrota').map((item, idx) => (
                  <tr key={idx} className="hover:bg-red-500/[0.03] transition-colors">
                    <td className="px-6 py-4 text-white text-xs">{item.hora}</td>
                    <td className="px-6 py-4 text-slate-500 text-[10px]">{item.quadrante}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] uppercase font-black text-slate-400">{item.config}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.detectouDupla ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase border animate-pulse",
                            item.temTripla ? "bg-purple-500/20 text-purple-400 border-purple-500/20" : "bg-red-500/20 text-red-400 border-red-500/20"
                          )}>
                            {item.temTripla ? 'TRIPLA DETECTADA' : 'DUPLA DETECTADA'}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">{item.qtdDuplas}x no quadrante</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-700 font-bold uppercase">NÃO</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[10px] font-mono",
                        item.ampMedia < audit?.avgAmpWin ? "text-amber-500" : "text-slate-400"
                      )}>
                        {item.ampMedia.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[9px] font-black text-slate-500 italic uppercase">
                        {item.detectouDupla ? "Evitar Dupla Posição" : item.ampMedia < audit?.avgAmpWin ? "Filtrar Volatilidade" : "Loss Técnico"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'comparativo' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comparativo Central */}
            <div className="glass-card p-6 border border-blue-500/20 bg-blue-500/[0.01]">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart size={14} />
                Eficácia da Dupla Posição (Win Rate)
              </h4>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black text-white">Com Dupla Posição</span>
                    <span className="text-sm font-black text-red-400">
                      {(audit?.duplaPosicao.winsComDupla / (audit?.duplaPosicao.total || 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(audit?.duplaPosicao.winsComDupla / (audit?.duplaPosicao.total || 1) * 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 uppercase font-bold">{audit?.duplaPosicao.winsComDupla} Wins vs {audit?.duplaPosicao.lossesComDupla} Losses</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black text-white">Sem Dupla Posição</span>
                    <span className="text-sm font-black text-apex-trader-primary">
                      {(((vitorias - audit?.duplaPosicao.winsComDupla) / (total - audit?.duplaPosicao.total || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-apex-trader-primary" style={{ width: `${(((vitorias - audit?.duplaPosicao.winsComDupla) / (total - audit?.duplaPosicao.total || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] text-blue-300 font-bold uppercase leading-tight italic">
                   "Este gráfico prova: quando você evita a dupla posição, sua assertividade real sobe para {(((vitorias - audit?.duplaPosicao.winsComDupla) / (total - audit?.duplaPosicao.total || 1)) * 100).toFixed(1)}%."
                </p>
              </div>
            </div>

            {/* 1. RELATÓRIO DA SEMANA PASSADA (O que o usuário pediu) */}
            <div className="glass-card p-6 border border-purple-500/10 bg-purple-500/[0.01] overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar size={14} className="text-purple-400" />
                Resumo de Performance (Período)
              </h4>
              <div className="space-y-4 relative">
                {statsSemanasPassadas.slice(0, 1).map((s: any, i: number) => (
                  <div key={i} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[8px] text-slate-500 font-black uppercase">Resultado Total</p>
                        <p className={cn("text-lg font-black", s.lucro >= 0 ? "text-apex-trader-primary" : "text-red-500")}>
                          {s.lucro >= 0 ? '+' : ''}R$ {s.lucro.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[8px] text-slate-500 font-black uppercase">Taxa de Acerto</p>
                        <p className="text-lg font-black text-white">{s.rate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase">{s.total} Trades Realizados</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase">{s.diasOperados} Dias Ativos</span>
                    </div>
                  </div>
                ))}
                {!statsSemanasPassadas.length && (
                  <p className="text-[10px] text-slate-600 font-bold uppercase italic text-center py-10 tracking-widest">Aguardando fechamento da semana...</p>
                )}
              </div>
            </div>

            {/* 2. CONSELHO DO ESTRATEGISTA (IA - Plano para a próxima semana) */}
            <div className="glass-card p-6 border border-emerald-500/10 bg-emerald-500/[0.02] overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap size={14} />
                Plano de Trade para a Próxima Semana
              </h4>
              <div className="space-y-3 relative">
                {statsInteligencia?.goldenHours.slice(0, 4).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white">{h.hora}h às {(h.hora+1)%24}h</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Golden Hour</span>
                        <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">{h.q}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">{h.rate.toFixed(0)}% Histórico</span>
                      <p className="text-[8px] text-emerald-600/80 uppercase font-black">Alta Confiança</p>
                    </div>
                  </div>
                ))}
                
                {/* SUGESTÕES DA IA */}
                <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
                   {audit?.sugestoes.slice(0, 3).map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                         <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-tight">{s}</p>
                      </div>
                   ))}
                </div>

                {statsInteligencia?.goldenHours.length === 0 && audit?.sugestoes.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase italic tracking-widest leading-relaxed">
                      Analisando dados das últimas semanas para gerar seu plano de trade ideal...
                    </p>
                  </div>
                )}
                
                {statsInteligencia?.goldenHours.length > 0 && (
                  <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-4 text-center leading-relaxed">
                    Sugestão: Foque nestes horários de ouro. Eles mantiveram {">"}60% de acerto nas últimas semanas operadas.
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sazonalidade Semanal */}
            <div className="glass-card p-6 border border-apex-trader-primary/20 bg-apex-trader-primary/[0.01]">
              <h4 className="text-[10px] font-black text-apex-trader-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar size={14} />
                Consistência por Dia da Semana
              </h4>
              <div className="space-y-4">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map((dia, i) => {
                  const s = statsSemana?.[i] || { total: 0, wins: 0 };
                  const rate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
                  return (
                    <div key={dia}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-black text-slate-400">{dia}</span>
                        <span className={cn("text-xs font-black", rate >= 60 ? "text-apex-trader-primary" : "text-slate-500")}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", rate >= 60 ? "bg-apex-trader-primary" : "bg-slate-700")} 
                          style={{ width: `${rate}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calibragem de Quadrantes */}
            <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/[0.01]">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Flame size={14} />
                Mapa de Calibragem (Melhores Quadrantes)
              </h4>
              <div className="space-y-3">
                {statsInteligencia?.melhoresQPorHora.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/5 shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white/80">{item.hora}h às {(item.hora+1)%24}h</span>
                      <p className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1">
                        <Flame size={10} /> {item.q}
                      </p>
                      <span className="text-[8px] text-slate-500 font-black uppercase">Padrão VIP: {item.melhorPadrao}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-apex-trader-primary">{item.rate.toFixed(1)}%</span>
                      <p className="text-[8px] text-slate-500 uppercase font-black">{item.total} Trades</p>
                    </div>
                  </div>
                ))}
                {!statsInteligencia?.melhoresQPorHora.length && (
                  <p className="text-[10px] text-slate-600 font-bold uppercase italic text-center py-10 tracking-widest">Processando melhor configuração...</p>
                )}
              </div>
            </div>

            {/* Performance Consolidada por Dia */}
            <div className="glass-card p-6 border border-white/10 bg-white/[0.01]">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <LayoutGrid size={14} />
                Resultados por Dia
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(statsDia || {}).sort((a,b) => b[0].localeCompare(a[0])).map(([data, s]: [string, any]) => (
                  <div key={data} className="flex flex-col p-3 rounded-xl bg-black/40 border border-white/5 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400">{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{s.wins}W - {s.total - s.wins}L</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-xs font-black", s.lucro >= 0 ? "text-apex-trader-primary" : "text-red-500")}>
                          {s.lucro >= 0 ? '+' : ''}R$ {s.lucro.toFixed(2)}
                        </span>
                        <p className="text-[8px] text-slate-500 uppercase font-black">{(s.wins/(s.total||1)*100).toFixed(0)}% Taxa</p>
                      </div>
                    </div>
                    {s.melhorHora !== null && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1 bg-apex-trader-primary/10 px-2 py-0.5 rounded text-[8px] font-black text-apex-trader-primary">
                          <Clock size={8} /> {s.melhorHora}h
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-[8px] font-black text-amber-500">
                          <Flame size={8} /> {s.melhorQ}
                        </div>
                        <span className="text-[8px] text-slate-600 font-bold uppercase italic ml-auto">{s.melhorRate.toFixed(0)}% Assert.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Falsos Positivos (Original) */}
          <div className="glass-card overflow-hidden border border-white/10 mt-6">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
               <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Trades que deram WIN mesmo com Dupla Posição (Sorte ou Exceção)</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {backtestResultados.filter(r => r.resultado === 'vitoria' && r.detectouDupla).map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                       <td className="px-6 py-3 text-[10px] text-slate-400 font-bold">{item.hora}</td>
                       <td className="px-6 py-3 text-[10px] text-slate-500 font-black uppercase">{item.quadrante}</td>
                       <td className="px-6 py-3 text-[10px] text-emerald-500 font-black italic">WIN COM DUPLA</td>
                       <td className="px-6 py-3 text-right">
                         <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] text-slate-500 font-black">{item.config}</span>
                       </td>
                    </tr>
                  ))}
                  {backtestResultados.filter(r => r.resultado === 'vitoria' && r.detectouDupla).length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-[10px] text-slate-600 uppercase font-black italic tracking-widest">Nenhuma operação vitoriosa com esse padrão</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : subTab === 'lucro' ? (
        <div className="space-y-6">
          {/* Simulador Financeiro com Banca */}
          <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/[0.02]">
            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign size={14} /> Simulador Financeiro — Evolução da Banca
            </h4>
            <div className="flex items-end gap-4 mb-6">
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Banca Inicial (R$)</label>
                <input type="number" value={bancaInicial} onChange={e => setBancaInicial(Number(e.target.value) || 0)}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold w-36 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Entrada Fixa (R$)</label>
                <p className="text-sm font-black text-white px-3 py-2">R$ {valorEntrada.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Payout</label>
                <p className="text-sm font-black text-white px-3 py-2">{payout}%</p>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Operações</label>
                <p className="text-sm font-black text-white px-3 py-2">{total}</p>
              </div>
            </div>

            {/* Cards do Simulador */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Banca Final</p>
                <p className={cn("text-2xl font-black mt-1", simulacaoFinanceira.bancaFinal >= bancaInicial ? "text-emerald-400" : "text-red-400")}>
                  R$ {simulacaoFinanceira.bancaFinal.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ROI</p>
                <p className={cn("text-2xl font-black mt-1", simulacaoFinanceira.roi >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {simulacaoFinanceira.roi >= 0 ? '+' : ''}{simulacaoFinanceira.roi.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-orange-500/10">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Maior Rebaixamento</p>
                <p className="text-2xl font-black text-orange-400 mt-1">R$ {simulacaoFinanceira.maiorRebaixamento.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Risco de Ruína</p>
                <p className={cn("text-2xl font-black mt-1", simulacaoFinanceira.riscoRuina ? "text-red-500" : "text-emerald-400")}>
                  {simulacaoFinanceira.riscoRuina ? 'SIM' : 'NÃO'}
                </p>
                <p className="text-[8px] text-slate-600 font-bold mt-1">Maior seq. loss: {simulacaoFinanceira.maiorSequenciaLoss}</p>
              </div>
            </div>

            {/* Gráfico de Evolução da Banca */}
            <div className="h-[200px] flex items-end gap-[2px] px-2 relative">
              {simulacaoFinanceira.pontos.length > 1 && (() => {
                const pts = simulacaoFinanceira.pontos;
                const maxSaldo = Math.max(...pts.map(p => p.saldo), bancaInicial);
                const minSaldo = Math.min(...pts.map(p => p.saldo), 0);
                const range = maxSaldo - minSaldo || 1;
                const bancaInicialY = ((bancaInicial - minSaldo) / range) * 100;
                // Sample points if too many
                const step = pts.length > 200 ? Math.ceil(pts.length / 200) : 1;
                const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
                return (
                  <>
                    {/* Linha da banca inicial */}
                    <div className="absolute left-0 right-0 border-t border-dashed border-amber-500/30" style={{ bottom: `${bancaInicialY}%` }}>
                      <span className="absolute -top-3 left-1 text-[7px] font-bold text-amber-500/50">R$ {bancaInicial}</span>
                    </div>
                    {sampled.map((p, i) => {
                      const h = ((p.saldo - minSaldo) / range) * 100;
                      const isAbove = p.saldo >= bancaInicial;
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end h-full group relative" title={`Op ${p.idx}: R$ ${p.saldo.toFixed(2)}`}>
                          <div
                            className={cn("w-full rounded-t-sm min-h-[2px] transition-all", isAbove ? "bg-emerald-500/70 group-hover:bg-emerald-400" : "bg-red-500/70 group-hover:bg-red-400")}
                            style={{ height: `${Math.max(h, 1)}%` }}
                          />
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            {simulacaoFinanceira.pontos.length > 1 && (
              <div className="flex justify-between mt-2">
                <span className="text-[8px] text-slate-600 font-bold">Op 1</span>
                <span className="text-[8px] text-slate-600 font-bold">Op {simulacaoFinanceira.pontos.length - 1}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Resumo da Sessão */}
            <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/[0.01]">
               <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Zap size={14} /> Resultado da Sessão Projetada
               </h4>
               <div className="space-y-4">
                 <div>
                    <p className="text-[9px] text-slate-500 font-black uppercase">Lucro Líquido</p>
                    <p className={cn(
                      "text-3xl font-black",
                      (vitorias * (valorEntrada * (payout/100)) - (total - vitorias) * valorEntrada) > 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      R$ {(vitorias * (valorEntrada * (payout/100)) - (total - vitorias) * valorEntrada).toFixed(2)}
                    </p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Taxa Real</p>
                      <p className="text-sm font-black text-white">{winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Projeção (+Filtros)</p>
                      <p className="text-sm font-black text-emerald-400">
                        {((vitorias / (total - (audit?.totalFiltrado || 0) || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Anatomia do Trade: Win vs Loss */}
            <div className="lg:col-span-2 glass-card p-6 border border-white/5">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <BookOpen size={14} className="text-blue-400" /> Anatomia Trade: Por que um deu Win e outro Loss?
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Exemplo de Win com Dupla Posição */}
                 <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Padrão em WIN (Caso Real)</p>
                    {backtestResultados.find(r => r.resultado === 'vitoria' && r.detectouDupla) ? (
                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">Força da Tendência</span>
                            <span className="text-xs font-black text-white">{(backtestResultados.find(r => r.resultado === 'vitoria' && r.detectouDupla) as any).anatomia.forcaTrend} Velas</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">Amplitude Total</span>
                            <span className="text-xs font-black text-white">{(backtestResultados.find(r => r.resultado === 'vitoria' && r.detectouDupla) as any).anatomia.ampTotal.toFixed(2)}</span>
                         </div>
                         <div className="pt-2 border-t border-white/5">
                            <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-1">
                              {(backtestResultados.find(r => r.resultado === 'vitoria' && r.detectouDupla) as any).anatomia.forcaTrend > 4 
                                ? "O Win aconteceu devido à alta dominância de tendência, que anulou o efeito da dupla posição."
                                : "Apesar da dupla posição, a volatilidade saudável permitiu que a estratégia seguisse o fluxo."}
                            </p>
                         </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 italic">Sem Win com Dupla Posição no período.</p>
                    )}
                 </div>

                 {/* Exemplo de Loss com Dupla Posição */}
                 <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Padrão em LOSS (Caso Real)</p>
                    {backtestResultados.find(r => r.resultado === 'derrota' && r.detectouDupla) ? (
                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">Força da Tendência</span>
                            <span className="text-xs font-black text-white">{(backtestResultados.find(r => r.resultado === 'derrota' && r.detectouDupla) as any).anatomia.forcaTrend} Velas</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">Amplitude Total</span>
                            <span className="text-xs font-black text-white">{(backtestResultados.find(r => r.resultado === 'derrota' && r.detectouDupla) as any).anatomia.ampTotal.toFixed(2)}</span>
                         </div>
                         <div className="pt-2 border-t border-white/5">
                            <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-1">
                              {(backtestResultados.find(r => r.resultado === 'derrota' && r.detectouDupla) as any).anatomia.forcaTrend < 3
                               ? "O Loss foi causado pelo mercado lateralizado (baixa tendência), tornando a dupla posição um sinal de reversão fatal."
                               : "Mesmo com tendência, a dupla posição serviu como um 'teto' de preço, causando a derrota técnica."}
                            </p>
                         </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 italic">Sem Loss com Dupla Posição no período.</p>
                    )}
                 </div>
               </div>
            </div>
          </div>

          {/* Histórico da Sessão Selecionada */}
          <div className="glass-card overflow-hidden border border-white/5">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
               <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Logs da Horário: {horaInicio} às {horaFim}</h5>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{total} Operações no Período</span>
            </div>
            <div className="overflow-x-auto">
              {backtestResultados.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[8px] text-slate-500 font-black uppercase tracking-widest bg-black/20">
                      <th className="px-6 py-3">Horário</th>
                      <th className="px-6 py-3">Resultado</th>
                      <th className="px-6 py-3">Lucro Simulado</th>
                      <th className="px-6 py-3 text-right">Anatomia do Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {backtestResultados.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-3">
                          <p className="text-xs font-bold text-white leading-none">{item.hora.split(' ')[1]}</p>
                          <p className="text-[8px] text-slate-500 mt-1 uppercase font-black">{item.quadrante} • {item.config}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                            item.resultado === 'vitoria' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {item.resultado}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "text-xs font-black font-mono",
                            item.resultado === 'vitoria' ? "text-emerald-500" : "text-red-500"
                          )}>
                            {item.resultado === 'vitoria' ? '+' : '-'} R$ {(item.resultado === 'vitoria' ? (valorEntrada * (payout/100)) : valorEntrada).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                           <div className="flex flex-col gap-1 items-end">
                              <div className="flex gap-1">
                                  {(item as any).anatomia.velas.map((v: any, i: number) => (
                                     <div 
                                       key={i} 
                                       className={cn("w-1 h-3 rounded-full", v.cor === 'alta' ? "bg-emerald-500" : "bg-red-500")}
                                       style={{ height: `${Math.min(10, v.amp * 1000)}px` }}
                                     />
                                  ))}
                              </div>
                              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">
                                 Trend: {(item as any).anatomia.forcaTrend} • Amp: {(item as any).anatomia.ampTotal.toFixed(2)} • Vol: {item.volume_medio?.toFixed(0)}/{item.volume_sma_20?.toFixed(0)}
                              </span>
                              <p className="text-[8px] text-slate-500 font-medium italic mt-1 max-w-[200px] line-clamp-2">{item.explicacao}</p>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <History size={40} className="text-slate-800 mb-4" />
                  <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sem logs nesta sessão</h6>
                  <p className="text-[8px] text-slate-600 mt-2 font-bold uppercase">Ajuste os filtros de horário para ver os detalhes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : subTab === 'drawdown' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 border border-orange-500/20 bg-orange-500/[0.02]">
              <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield size={14} /> Maximum Drawdown (R$)
              </h4>
              <div className="flex flex-col">
                 <p className="text-4xl font-black text-white">R$ {drawdown.max.toFixed(2)}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">Ocorrido em: {drawdown.data || 'N/A'}</p>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <p className="text-[10px] text-orange-300 font-bold uppercase leading-tight italic">
                  "Este valor representa a maior queda do seu capital entre um pico e um fundo durante o período selecionado."
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card p-6 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart size={14} /> Evolução Dinâmica do Saldo
              </h4>
              <div className="h-[200px] flex items-end gap-1 px-2">
                {drawdown.chart.slice(-60).map((p: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center group/item relative h-full justify-end">
                    <div className="absolute -top-12 bg-black/90 text-[9px] text-white p-2 rounded-lg border border-white/10 opacity-0 group-hover/item:opacity-100 transition-all scale-95 group-hover/item:scale-100 whitespace-nowrap z-20 pointer-events-none shadow-2xl">
                      <div className="font-black text-apex-trader-primary mb-1">{p.hora}</div>
                      <div className="flex flex-col gap-0.5">
                        <span>Saldo: R$ {p.saldo.toFixed(2)}</span>
                        <span className="text-red-400">DD: R$ {Math.abs(p.drawdown).toFixed(2)}</span>
                      </div>
                    </div>
                    <div 
                      className="w-full bg-apex-trader-primary/30 rounded-t-sm group-hover/item:bg-apex-trader-primary transition-all duration-300"
                      style={{ height: `${Math.max(5, (p.saldo / (Math.max(...drawdown.chart.map((x:any)=>x.saldo)) || 1)) * 100)}%` }}
                    />
                    <div 
                      className="w-full bg-red-500/30 rounded-b-sm group-hover/item:bg-red-500 transition-all duration-300"
                      style={{ height: `${Math.abs(p.drawdown) / (drawdown.max || 1) * 40}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[9px] text-slate-600 font-black uppercase tracking-widest px-2">
                <span>Início Selecionado</span>
                <span className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-apex-trader-primary" /> Saldo
                   <div className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Rebaixamento (Risk)
                </span>
                <span>Últimos Trades</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 group-hover:text-red-400 transition-colors">Worst Sequence</p>
                 <p className="text-3xl font-black text-white">{audit.seqLossMax}</p>
                 <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${Math.min(100, audit.seqLossMax * 10)}%` }} />
                 </div>
              </div>
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 group-hover:text-apex-trader-primary transition-colors">Safety Factor</p>
                 <p className="text-3xl font-black text-white">{winRate >= 60 ? 'ALTO' : 'ALTO RISCO'}</p>
                 <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                    <div className={cn("h-full", winRate >= 60 ? "bg-apex-trader-primary" : "bg-red-500")} style={{ width: `${winRate}%` }} />
                 </div>
              </div>
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Trades p/ Recuperação</p>
                 <p className="text-3xl font-black text-white">
                    {Math.ceil(drawdown.max / (Number(valorEntrada) * (Number(payout)/100)))}
                 </p>
                 <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 italic">Considerando 100% de winrate</p>
              </div>
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 group-hover:text-amber-400 transition-colors">Exposição Média</p>
                 <p className="text-3xl font-black text-white">R$ {valorEntrada}</p>
                 <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 italic">Valor fixo por entrada</p>
              </div>
          </div>

          {/* === AUDITORIA DE DADOS: Transparência e Cobertura === */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transparência de Dados</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Quadrantes</p>
                <p className="text-2xl font-black text-white">{audit?.totalQuadrantesAnalisados || 0}</p>
                <p className="text-[9px] text-slate-600 font-bold mt-1">Analisados no período</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/10">
                <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-1">Gaps de Dados</p>
                <p className="text-2xl font-black text-amber-400">{audit?.gapsDeDados || 0}</p>
                <p className="text-[9px] text-slate-600 font-bold mt-1">Quadrantes com &lt;10 velas (processados mesmo assim)</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/10">
                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Cobertura</p>
                <p className="text-2xl font-black text-emerald-400">
                  {audit?.coberturaDias ? `${audit.coberturaDias.filter((d: any) => d.temDados).length}/${audit.coberturaDias.length}` : '0/0'}
                </p>
                <p className="text-[9px] text-slate-600 font-bold mt-1">Dias com dados / Total de dias no range</p>
              </div>
            </div>

            {/* Mapa visual de cobertura de dias */}
            {audit?.coberturaDias && audit.coberturaDias.length > 0 && (
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Auditoria Completa — Cobertura por Dia</p>
                <div className="flex flex-wrap gap-1.5">
                  {audit.coberturaDias.map((d: any) => {
                    const dateObj = new Date(d.dia + 'T12:00:00');
                    const nomeDia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dateObj.getDay()];
                    return (
                      <div
                        key={d.dia}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all",
                          d.temDados
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}
                        title={d.temDados ? 'Dados disponíveis' : 'Sem dados'}
                      >
                        {d.dia.slice(5)} ({nomeDia})
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : subTab === 'mensal' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header + Botão Carregar */}
          <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-purple-500/10">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <CalendarDays size={16} className="text-purple-400" /> Evolução Mensal — Últimos 5 Meses
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                Analisa a estratégia Quadrantes mês a mês usando seus filtros atuais ({backtestAtivo} • {horaInicio}-{horaFim} • R$ {valorEntrada} • {payout}%)
              </p>
            </div>
            <button
              onClick={carregarEvolucaoMensal}
              disabled={backtestLoading}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                backtestLoading
                  ? "bg-purple-500/20 text-purple-300 cursor-wait"
                  : "bg-purple-500 text-white hover:bg-purple-400 shadow-lg shadow-purple-500/20"
              )}
            >
              <>
                <Activity size={14} />
                {dadosMensais.length > 0 ? 'Recalcular' : 'Calcular Evolução'}
              </>
            </button>
          </div>

          {dadosMensais.length > 0 && (
            <>
              {/* Cards por Mês */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {dadosMensais.map((m) => (
                  <div
                    key={m.key}
                    className={cn(
                      "p-5 rounded-2xl border transition-all",
                      m.status === 'carregando' ? "bg-purple-500/5 border-purple-500/20 animate-pulse" :
                      m.status === 'sem_dados' ? "bg-white/[0.02] border-white/5 opacity-50" :
                      m.status === 'concluido' && m.lucro >= 0 ? "bg-emerald-500/5 border-emerald-500/20" :
                      m.status === 'concluido' && m.lucro < 0 ? "bg-red-500/5 border-red-500/20" :
                      "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{m.label}</p>
                    {m.status === 'pendente' && (
                      <p className="text-xs text-slate-600 italic">Aguardando...</p>
                    )}
                    {m.status === 'carregando' && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        <p className="text-xs text-purple-400 font-bold">Carregando...</p>
                      </div>
                    )}
                    {m.status === 'sem_dados' && (
                      <p className="text-xs text-slate-600 italic">Sem dados disponíveis</p>
                    )}
                    {m.status === 'concluido' && (
                      <div className="space-y-2">
                        <div>
                          <p className={cn("text-2xl font-black", m.winRate >= 60 ? "text-emerald-400" : m.winRate >= 50 ? "text-amber-400" : "text-red-400")}>
                            {m.winRate.toFixed(1)}%
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold">{m.wins}W / {m.total - m.wins}L ({m.total} ops)</p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className={cn("text-sm font-black", m.lucro >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {m.lucro >= 0 ? '+' : ''}R$ {m.lucro.toFixed(2)}
                          </p>
                          <p className={cn("text-[9px] font-bold", m.roi >= 0 ? "text-emerald-500/60" : "text-red-500/60")}>
                            ROI: {m.roi >= 0 ? '+' : ''}{m.roi.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumo Consolidado */}
              {dadosMensais.some(m => m.status === 'concluido') && (() => {
                const concluidos = dadosMensais.filter(m => m.status === 'concluido');
                const totalGeral = concluidos.reduce((a, m) => a + m.total, 0);
                const winsGeral = concluidos.reduce((a, m) => a + m.wins, 0);
                const lucroGeral = concluidos.reduce((a, m) => a + m.lucro, 0);
                const winRateGeral = totalGeral > 0 ? (winsGeral / totalGeral) * 100 : 0;
                const roiGeral = bancaInicial > 0 ? (lucroGeral / bancaInicial) * 100 : 0;
                const mesesPositivos = concluidos.filter(m => m.lucro > 0).length;
                const mesesNegativos = concluidos.filter(m => m.lucro <= 0).length;
                const melhorMes = concluidos.reduce((best, m) => m.winRate > best.winRate ? m : best, concluidos[0]);
                const piorMes = concluidos.reduce((worst, m) => m.winRate < worst.winRate ? m : worst, concluidos[0]);

                return (
                  <>
                    {/* Resumo Geral */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Win Rate Geral</p>
                        <p className={cn("text-2xl font-black mt-1", winRateGeral >= 60 ? "text-emerald-400" : "text-amber-400")}>{winRateGeral.toFixed(1)}%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total de Ops</p>
                        <p className="text-2xl font-black text-white mt-1">{totalGeral}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Lucro Total</p>
                        <p className={cn("text-2xl font-black mt-1", lucroGeral >= 0 ? "text-emerald-400" : "text-red-400")}>
                          R$ {lucroGeral.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ROI Total</p>
                        <p className={cn("text-2xl font-black mt-1", roiGeral >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {roiGeral >= 0 ? '+' : ''}{roiGeral.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Meses Positivos</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">{mesesPositivos}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Meses Negativos</p>
                        <p className="text-2xl font-black text-red-400 mt-1">{mesesNegativos}</p>
                      </div>
                    </div>

                    {/* Gráfico de Barras — Win Rate por Mês */}
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart size={14} className="text-purple-400" /> Assertividade por Mês
                      </h4>
                      <div className="h-[200px] flex items-end gap-6 px-4">
                        {dadosMensais.map((m) => {
                          const maxRate = 100;
                          const h = m.status === 'concluido' ? (m.winRate / maxRate) * 100 : 0;
                          return (
                            <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                              {m.status === 'concluido' && (
                                <span className={cn("text-xs font-black", m.winRate >= 60 ? "text-emerald-400" : m.winRate >= 50 ? "text-amber-400" : "text-red-400")}>
                                  {m.winRate.toFixed(1)}%
                                </span>
                              )}
                              <div
                                className={cn(
                                  "w-full rounded-t-lg transition-all duration-700 min-h-[4px]",
                                  m.status !== 'concluido' ? "bg-white/5" :
                                  m.winRate >= 60 ? "bg-emerald-500/70" : m.winRate >= 50 ? "bg-amber-500/70" : "bg-red-500/70"
                                )}
                                style={{ height: `${Math.max(h, 2)}%` }}
                              />
                              <span className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gráfico de Lucro Acumulado */}
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-400" /> Lucro Acumulado Mês a Mês
                      </h4>
                      <div className="h-[200px] flex items-end gap-6 px-4 relative">
                        {(() => {
                          let acumulado = 0;
                          const pontosAcumulados = dadosMensais.map(m => {
                            if (m.status === 'concluido') acumulado += m.lucro;
                            return { ...m, acumulado };
                          });
                          const maxAcum = Math.max(...pontosAcumulados.map(p => Math.abs(p.acumulado)), 1);
                          const temNegativo = pontosAcumulados.some(p => p.acumulado < 0);
                          const maxPositivo = Math.max(...pontosAcumulados.map(p => p.acumulado), 0);
                          const minNegativo = Math.min(...pontosAcumulados.map(p => p.acumulado), 0);
                          const range = (maxPositivo - minNegativo) || 1;
                          const zeroLine = temNegativo ? (maxPositivo / range) * 100 : 0;

                          return pontosAcumulados.map((p) => {
                            const isPositivo = p.acumulado >= 0;
                            const hPercent = Math.abs(p.acumulado) / range * 100;
                            return (
                              <div key={p.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end relative group">
                                <div className="absolute -top-10 bg-black/90 text-[9px] text-white p-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-20 pointer-events-none">
                                  <span className="font-black text-purple-400">{p.label}</span>
                                  <br />
                                  Acumulado: <span className={cn("font-black", isPositivo ? "text-emerald-400" : "text-red-400")}>R$ {p.acumulado.toFixed(2)}</span>
                                </div>
                                {p.status === 'concluido' && (
                                  <>
                                    <span className={cn("text-[10px] font-black", isPositivo ? "text-emerald-400" : "text-red-400")}>
                                      {isPositivo ? '+' : ''}R$ {p.acumulado.toFixed(0)}
                                    </span>
                                    <div
                                      className={cn(
                                        "w-full rounded-lg transition-all duration-700",
                                        isPositivo ? "bg-emerald-500/50" : "bg-red-500/50"
                                      )}
                                      style={{ height: `${Math.max(hPercent, 3)}%` }}
                                    />
                                  </>
                                )}
                                <span className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">{p.label}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Tabela Detalhada */}
                    <div className="glass-card overflow-hidden border border-white/5">
                      <div className="p-4 bg-white/5 border-b border-white/5">
                        <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Detalhamento Mensal</h5>
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[8px] text-slate-500 font-black uppercase tracking-widest bg-black/20">
                            <th className="px-6 py-3">Mês</th>
                            <th className="px-6 py-3 text-center">Operações</th>
                            <th className="px-6 py-3 text-center">Wins</th>
                            <th className="px-6 py-3 text-center">Losses</th>
                            <th className="px-6 py-3 text-center">Win Rate</th>
                            <th className="px-6 py-3 text-right">Lucro</th>
                            <th className="px-6 py-3 text-right">ROI</th>
                            <th className="px-6 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {dadosMensais.map((m) => (
                            <tr key={m.key} className="hover:bg-white/[0.01]">
                              <td className="px-6 py-3 text-sm font-black text-white">{m.label}</td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-slate-400">{m.status === 'concluido' ? m.total : '-'}</td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-emerald-400">{m.status === 'concluido' ? m.wins : '-'}</td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-red-400">{m.status === 'concluido' ? m.total - m.wins : '-'}</td>
                              <td className="px-6 py-3 text-center">
                                {m.status === 'concluido' ? (
                                  <span className={cn("text-sm font-black", m.winRate >= 60 ? "text-emerald-400" : m.winRate >= 50 ? "text-amber-400" : "text-red-400")}>
                                    {m.winRate.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                {m.status === 'concluido' ? (
                                  <span className={cn("text-sm font-black", m.lucro >= 0 ? "text-emerald-400" : "text-red-400")}>
                                    {m.lucro >= 0 ? '+' : ''}R$ {m.lucro.toFixed(2)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                {m.status === 'concluido' ? (
                                  <span className={cn("text-sm font-black", m.roi >= 0 ? "text-emerald-400" : "text-red-400")}>
                                    {m.roi >= 0 ? '+' : ''}{m.roi.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-3 text-center">
                                {m.status === 'pendente' && <span className="text-[9px] text-slate-600 font-bold">Pendente</span>}
                                {m.status === 'carregando' && <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto" />}
                                {m.status === 'concluido' && <CheckCircle size={14} className="text-emerald-400 mx-auto" />}
                                {m.status === 'sem_dados' && <XCircle size={14} className="text-red-400 mx-auto" />}
                              </td>
                            </tr>
                          ))}
                          {concluidos.length > 0 && (
                            <tr className="bg-white/[0.02] font-black">
                              <td className="px-6 py-3 text-sm text-purple-400">TOTAL (5 Meses)</td>
                              <td className="px-6 py-3 text-center text-sm text-white">{totalGeral}</td>
                              <td className="px-6 py-3 text-center text-sm text-emerald-400">{winsGeral}</td>
                              <td className="px-6 py-3 text-center text-sm text-red-400">{totalGeral - winsGeral}</td>
                              <td className="px-6 py-3 text-center">
                                <span className={cn("text-sm", winRateGeral >= 60 ? "text-emerald-400" : "text-amber-400")}>{winRateGeral.toFixed(1)}%</span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className={cn("text-sm", lucroGeral >= 0 ? "text-emerald-400" : "text-red-400")}>
                                  {lucroGeral >= 0 ? '+' : ''}R$ {lucroGeral.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className={cn("text-sm", roiGeral >= 0 ? "text-emerald-400" : "text-red-400")}>
                                  {roiGeral >= 0 ? '+' : ''}{roiGeral.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className="text-[9px] text-purple-400 font-black uppercase">{concluidos.length}/5</span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Melhor Mês</p>
                        <p className="text-lg font-black text-white">{melhorMes.label}</p>
                        <p className="text-sm font-bold text-emerald-400">{melhorMes.winRate.toFixed(1)}% — R$ {melhorMes.lucro.toFixed(2)}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Pior Mês</p>
                        <p className="text-lg font-black text-white">{piorMes.label}</p>
                        <p className="text-sm font-bold text-red-400">{piorMes.winRate.toFixed(1)}% — R$ {piorMes.lucro.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Veredicto */}
                    <div className={cn(
                      "p-6 rounded-3xl border text-center",
                      winRateGeral >= 60 ? "bg-emerald-500/5 border-emerald-500/20" :
                      winRateGeral >= 50 ? "bg-amber-500/5 border-amber-500/20" :
                      "bg-red-500/5 border-red-500/20"
                    )}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Veredicto da Estratégia (5 Meses)</p>
                      <p className={cn(
                        "text-3xl font-black",
                        winRateGeral >= 60 ? "text-emerald-400" : winRateGeral >= 50 ? "text-amber-400" : "text-red-400"
                      )}>
                        {winRateGeral >= 60 ? 'ESTRATÉGIA APROVADA' : winRateGeral >= 50 ? 'ESTRATÉGIA EM ANÁLISE' : 'ESTRATÉGIA REPROVADA'}
                      </p>
                      <p className="text-xs text-slate-500 font-bold mt-2">
                        {winRateGeral >= 60
                          ? `Assertividade de ${winRateGeral.toFixed(1)}% em ${totalGeral} operações com ${mesesPositivos} meses positivos. Estratégia consistente a longo prazo.`
                          : winRateGeral >= 50
                          ? `Assertividade de ${winRateGeral.toFixed(1)}% — próxima do breakeven. Ajuste filtros para melhorar a performance.`
                          : `Assertividade de ${winRateGeral.toFixed(1)}% abaixo do mínimo necessário. Revise filtros e horários.`}
                      </p>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Estado inicial — sem dados */}
          {dadosMensais.length === 0 && !carregandoMensal && (
            <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
              <CalendarDays size={48} className="text-slate-800 mb-4" />
              <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhuma análise mensal realizada</h6>
              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase max-w-md text-center">
                Clique em "Iniciar Análise" para carregar os dados dos últimos 5 meses e verificar se sua estratégia é assertiva a longo prazo.
              </p>
            </div>
          )}
        </div>
      ) : subTab === 'gale' ? (
        <div className="animate-in fade-in duration-500">
          <GaleTab
            resultados={backtestResultados}
            valorEntradaInicial={valorEntrada}
            payoutInicial={payout}
          />
        </div>
      ) : subTab === 'real' ? (
        <div className="animate-in fade-in duration-500">
           {/* UI para Métricas Reais vindas da corretora */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-8 border border-emerald-500/20 bg-emerald-500/[0.01]">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Lucro Real (Período)</p>
                 <p className={cn("text-4xl font-black", (statsReais?.lucro || 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                   R$ {(statsReais?.lucro || 0).toFixed(2)}
                 </p>
              </div>
              <div className="glass-card p-8 border border-white/5">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Assertividade Real</p>
                 <p className="text-4xl font-black text-white">
                    {(statsReais?.total || 0) > 0 ? (((statsReais?.wins || 0) / (statsReais?.total || 1)) * 100).toFixed(1) : '0.0'}%
                 </p>
              </div>
              <div className="glass-card p-8 border border-white/5">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Trades Confirmados</p>
                 <p className="text-4xl font-black text-white">{statsReais?.total || 0}</p>
              </div>
           </div>

           <div className="mt-8 glass-card border border-white/5 overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5">
                 <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Performance por Ativo (Real)</h5>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-black/20">
                          <th className="px-6 py-4">Ativo</th>
                          <th className="px-6 py-4 text-center">Trades</th>
                          <th className="px-6 py-4 text-center">Wins</th>
                          <th className="px-6 py-4 text-right">Resultado</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {todasOperacoesReais.filter((op: any) => op.data >= backtestDataInicio && op.data <= backtestDataFim).length > 0 ? (
                          Object.entries(todasOperacoesReais.filter((op: any) => op.data >= backtestDataInicio && op.data <= backtestDataFim).reduce((acc: any, op: any) => {
                             if(!acc[op.ativo]) acc[op.ativo] = { t: 0, w: 0, l: 0 };
                             acc[op.ativo].t++;
                             if(op.resultado === 'vitoria') acc[op.ativo].w++;
                             acc[op.ativo].l += (op.lucro || 0);
                             return acc;
                          }, {}) as any).map(([name, s]: [any, any]) => (
                             <tr key={name} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 text-sm font-black text-white">{name}</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-slate-400">{s.t}</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-apex-trader-primary">{s.w}</td>
                                <td className={cn("px-6 py-4 text-right text-sm font-black", s.l >= 0 ? "text-emerald-500" : "text-red-500")}>
                                   R$ {s.l.toFixed(2)}
                                </td>
                             </tr>
                          ))
                       ) : (
                          <tr>
                             <td colSpan={4} className="px-6 py-12 text-center text-[10px] text-slate-600 font-black uppercase italic tracking-widest">Nenhuma operação real encontrada para este período</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Estatística por Configuração de Velas */}
          <div className="glass-card p-6 border border-white/5 bg-white/[0.01]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-apex-trader-primary" />
              Assertividade por Configuração
            </h4>
            <div className="space-y-4">
              {Object.entries(backtestStats).map(([config, data]: [string, any]) => {
                const rate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
                return (
                  <div key={config} className="group cursor-default">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white group-hover:text-apex-trader-primary transition-colors">{config}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{data.wins}W - {data.total - data.wins}L</span>
                      </div>
                      <span className={cn("text-sm font-black italic", rate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>
                        {rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", rate >= 60 ? "bg-apex-trader-primary shadow-[0_0_10px_rgba(52,222,0,0.3)]" : "bg-amber-500")}
                        style={{ width: `${rate}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estatística por Posição do Quadrante */}
          <div className="glass-card p-6 border border-white/5 bg-white/[0.01]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              Desempenho por Quadrante
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(backtestStatsQ).map(([q, data]: [string, any]) => {
                const rate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
                const patternData = backtestStatsPQ[q];
                const rateT = patternData.tendencia.t > 0 ? (patternData.tendencia.w / patternData.tendencia.t) * 100 : 0;
                const rateR = patternData.reversao.t > 0 ? (patternData.reversao.w / patternData.reversao.t) * 100 : 0;
                const melhorPadrao = rateT >= rateR ? { nome: 'TENDÊNCIA', rate: rateT } : { nome: 'REVERSÃO', rate: rateR };

                return (
                  <div key={q} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-500">{q}</span>
                        <span className={cn("text-xs font-black", rate >= 60 ? "text-apex-trader-primary" : "text-amber-500")}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-white mb-2">{data.total} <span className="text-[8px] text-slate-600 font-black">ENTRADAS</span></p>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                        <div className={cn("h-full", rate >= 60 ? "bg-apex-trader-primary" : "bg-amber-500")} style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                    
                    <div className="bg-white/[0.03] p-2 rounded-lg border border-white/5">
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Melhor Padrão</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-apex-trader-primary italic">{melhorPadrao.nome}</span>
                        <span className="text-[10px] font-black text-white">{melhorPadrao.rate.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raio-X de Perdas (Auditoria Inteligente) */}
          <div className="glass-card p-6 border border-white/5 bg-white/[0.01]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={14} className="text-red-500" />
              Raio-X do Loss (Por que estamos perdendo?)
            </h4>

            {/* Simulação de Assertividade Projetada */}
            <div className="mb-4 p-4 rounded-2xl bg-apex-trader-primary/5 border border-apex-trader-primary/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} /></div>
               <p className="text-[10px] font-black text-apex-trader-primary uppercase tracking-widest mb-1">Potencial de Assertividade</p>
               <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-black text-white">
                   {(raioXFiltradosCount > 0 ? raioXPotencial : (vitorias / (total - (audit?.totalFiltrado || 0) || 1)) * 100).toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-black text-emerald-400">
                    +{((raioXFiltradosCount > 0 ? raioXPotencial : (vitorias / (total - (audit?.totalFiltrado || 0) || 1)) * 100) - winRate).toFixed(1)}% DE LUCRO
                 </span>
               </div>
               <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold leading-tight">
                 Taxa projetada se você tivesse evitado os{' '}
                 <span className="text-white">{raioXFiltradosCount > 0 ? raioXFiltradosCount : audit?.totalFiltrado} Trades</span>{' '}
                 marcados na auditoria abaixo.
               </p>
            </div>

            {/* Filtros independentes do Raio-X */}
            <div className="mb-6 flex flex-wrap gap-2">
              <p className="w-full text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Simular com filtros:</p>
              <button
                onClick={() => setRaioXFiltrarVolume((v: boolean) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${raioXFiltrarVolume ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500 hover:border-blue-500/30 hover:text-blue-500'}`}
              >
                <span className={`w-2 h-2 rounded-full ${raioXFiltrarVolume ? 'bg-blue-500' : 'bg-slate-600'}`} />
                Somente Volume/Vola
              </button>
              <button
                onClick={() => setRaioXFiltrarDuplas((v: boolean) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${raioXFiltrarDuplas ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-500'}`}
              >
                <span className={`w-2 h-2 rounded-full ${raioXFiltrarDuplas ? 'bg-amber-500' : 'bg-slate-600'}`} />
                Filtrar Duplas Posições
              </button>
            </div>

            <div className="space-y-6">
              {/* Causa 1: Duplas Posições */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">Velas "Gêmeas" (Dupla Posição)</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Impacto no Prejuízo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-red-400 block">
                      {(audit?.duplaPosicao.lossesComDupla / (audit?.duplaPosicao.totalLosses || 1) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">{audit?.duplaPosicao.lossesComDupla} de {audit?.duplaPosicao.totalLosses} LOSSES</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${(audit?.duplaPosicao.lossesComDupla / (audit?.duplaPosicao.totalLosses || 1) * 100)}%` }} 
                  />
                </div>
                <p className="text-[9px] text-slate-600 mt-2 leading-tight">
                  <span className="text-red-500/80 mr-1">●</span>
                  Ao tirar essas duplas posições, seu Win Rate sobe drasticamente.
                </p>
              </div>

              {/* Causa 3: Dojis */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">Mercado Indeciso (Dojis)</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Tentativas em Neutro</span>
                  </div>
                  <span className="text-sm font-black text-purple-400">
                    {audit?.totalDojis} LOSSES
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-1000"
                    style={{ width: `${(audit?.totalDojis / (audit?.duplaPosicao.totalLosses || 1) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Causa 2: Baixa Volatilidade */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">Mercado "Parado" vs "Movimentado"</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Filtro de Amplitude</span>
                  </div>
                  <span className="text-xs font-black text-amber-500">
                    {audit?.avgAmpWin > audit?.avgAmpLoss ? "RISCO ALTO" : "RISCO MÉDIO"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-[8px] text-slate-500 font-black uppercase">Win Avg (Size)</p>
                    <p className="text-xs font-black text-emerald-500">{audit?.avgAmpWin.toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                    <p className="text-[8px] text-slate-500 font-black uppercase">Loss Avg (Size)</p>
                    <p className="text-xs font-black text-red-500">{audit?.avgAmpLoss.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-[9px] text-slate-600 mt-2 leading-tight">
                  Sua taxa de vitória {(audit?.avgAmpWin > audit?.avgAmpLoss ? "cai" : "sobe")} quando as velas são pequenas. Dê preferência a mercados com movimentos claros.
                </p>
              </div>

              {/* Conclusão Sequencial */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ciclo de Perda Máxima</p>
                  <p className="text-[9px] text-slate-500">Maior sequência de erros no período.</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-blue-400">{audit?.seqLossMax}</p>
                  <p className="text-[8px] font-black text-white uppercase tracking-widest">Seguidos</p>
                </div>
              </div>

              {/* LISTAGEM DE AUDITORIA INTEGRADA (O que o usuário pediu) */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                  Auditoria de Todos os Losses
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[8px]">TOTAL: {audit?.duplaPosicao.totalLosses}</span>
                </h5>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar pr-2 space-y-2">
                  {backtestResultados.filter(r => r.resultado === 'derrota').map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between hover:border-red-500/20 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-white font-bold">{item.hora}</span>
                        <span className="text-[8px] text-slate-500 font-black uppercase">{item.quadrante} • {item.config}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.detectouDupla ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                            item.temTripla ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {item.temTripla ? 'Tripla' : 'Dupla'}
                          </span>
                        ) : item.temDoji ? (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[8px] font-black uppercase tracking-tighter">Doji</span>
                        ) : (
                          <span className="text-[8px] text-slate-700 font-black uppercase tracking-tighter">Sem Padrão</span>
                        )}
                        <div className="w-12 text-right">
                          <span className={cn(
                            "text-[9px] font-mono font-bold",
                            item.ampMedia < audit?.avgAmpWin ? "text-amber-500" : "text-slate-500"
                          )}>
                            {item.ampMedia.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {backtestResultados.filter(r => r.resultado === 'derrota').length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[10px] text-slate-600 italic font-bold uppercase tracking-widest">Nenhum erro registrado</p>
                    </div>
                  )}
                </div>
                <p className="text-[8px] text-slate-600 mt-4 leading-relaxed font-medium uppercase text-center italic">
                   Esta lista ajuda a confirmar se o padrão de <span className="text-white">Price Action</span> foi a causa de cada erro.
                </p>
              </div>
            </div>
          </div>

          {/* Consistência Interdiária */}
          <div className="lg:col-span-3 glass-card p-6 border border-white/5 bg-white/[0.01]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={14} className="text-apex-trader-primary" />
              Consistência Interdiária (Histórico por Dia)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="border-b border-white/5 font-black text-slate-500 uppercase tracking-tighter">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 px-4 text-center">Melhor Hora</th>
                    <th className="pb-3 px-4 text-center">Q1</th>
                    <th className="pb-3 px-4 text-center">Q2</th>
                    <th className="pb-3 px-4 text-center">Q3</th>
                    <th className="pb-3 px-4 text-center">Q4</th>
                    <th className="pb-3 px-4 text-center">Q5</th>
                    <th className="pb-3 px-4 text-center">Q6</th>
                    <th className="pb-3 pl-4 text-right">WIN RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {Object.entries(statsDia || {}).sort((a,b) => b[0].localeCompare(a[0])).map(([dia, data]: [string, any]) => {
                    const rowRate = (data.wins / (data.total || 1)) * 100;
                    return (
                      <tr key={dia} className="hover:bg-white/[0.01]">
                        <td className="py-3 pr-4 font-black text-white">{new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                        <td className="py-3 px-4 text-center font-black text-apex-trader-primary">
                          {data.melhorHora !== null ? `${data.melhorHora}h` : '-'}
                        </td>
                        {[1, 2, 3, 4, 5, 6].map(qNum => {
                          const qData = data.q[`Q${qNum}`];
                          const rate = qData.total > 0 ? (qData.wins / qData.total) * 100 : 0;
                          return (
                            <td key={qNum} className="py-3 px-4 text-center">
                                <span className={cn(
                                  "font-bold",
                                  qData.total === 0 ? "text-slate-700" : rate >= 70 ? "text-apex-trader-primary" : rate >= 50 ? "text-amber-500" : "text-red-500"
                                )}>
                                  {qData.total > 0 ? `${rate.toFixed(0)}%` : '-'}
                                </span>
                                <div className="text-[8px] text-slate-600 font-bold tracking-tighter">{qData.wins}W/{qData.total}T</div>
                            </td>
                          );
                        })}
                        <td className="py-3 pl-4 text-right font-bold text-slate-400">{data.total}</td>
                        <td className="py-3 pl-4 text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg font-black text-[10px]",
                            rowRate >= 70 ? "bg-emerald-500/20 text-emerald-400" : rowRate >= 50 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {rowRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            {/* Oportunidade de Ouro */}
            <div className="glass-card p-6 border-2 border-apex-trader-primary/20 bg-apex-trader-primary/[0.03] relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-apex-trader-primary/10 rounded-full blur-3xl group-hover:bg-apex-trader-primary/20 transition-all" />
              <h4 className="text-[10px] font-black text-apex-trader-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap size={14} className="animate-pulse" />
                Oportunidade de Ouro
              </h4>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-white italic">{horaOuro.hora}h</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">Melhor horário para operar hoje</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-apex-trader-primary">{(horaOuro.rate * 100).toFixed(0)}%</p>
                  <p className="text-[9px] text-slate-600 font-black uppercase">{horaOuro.total} Quadrantes</p>
                </div>
              </div>
            </div>

            {/* Estatística por Faixa Horária */}
            <div className="glass-card p-6 border border-white/5 bg-white/[0.01]">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Taxa por Período</h4>
                <div className="space-y-4">
                  {Object.entries(backtestStatsF).map(([faixa, data]: [string, any]) => {
                    const rate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
                    return (
                      <div key={faixa} className="flex items-center gap-4">
                        <div className="w-24 text-[9px] font-black text-slate-500 uppercase leading-tight">{faixa}</div>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-apex-trader-primary" style={{ width: `${rate}%` }} />
                        </div>
                        <div className="w-10 text-right text-[10px] font-black text-white">{rate.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
