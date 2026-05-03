import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loginVorna,
  obterDadosUsuario,
  desconectarVorna,
  obterSessaoVorna,
  salvarConfigAutomacao,
  limparConfigAutomacao,
  verificarSaldoVorna,
  verificarOperacoesAbertas,
  obterSaldoRapido,
  obterResultadoOperacao,
  criarOperacaoQuadrante,
  criarOperacaoQuadrante5min,
  criarOperacaoFluxoVelas,
  adicionarOperacaoSync,
  executarOperacaoVorna,
  verificarSessaoValida,
  reconectarVorna,
  comReconexao,
  hashIdToUUID,
  VornaErro,
  salvarEstadoAutomacao,
  obterEstadoAutomacao,
  limparEstadoAutomacao,
  obterAtivosDisponiveis,
  getSdk,
  type ActiveInfo
} from './vorna';
import { upsertOperacoesBatch, getProfile, updateProfile } from './supabaseService';
import { servicoVelas } from './websocket-velas';
import { analisarFluxoVelas, ehCandleFechado } from './motor-fluxo-velas';
import { analisarLogicaPreco } from './motor-logica-preco';
import { analisarImpulsoCorrecaoEngolfo } from './motor-impulso-correcao-engolfo';
import {
  obterQuadranteAtual,
  analisarQuadrante,
  calcularValorOperacao,
  calcularP6Entradas,
  proximoHorarioExecucao,
  ehMomentoDeExecutar,
  formatarCountdown,
} from './motor-quadrantes';
import {
  obterQuadranteAtual5min,
  analisarQuadrante5min,
  proximoHorarioExecucao5min,
  ehMomentoDeExecutarBinary5min,
  ehMomentoDeGale5min,
  obterInicioMinuto5min,
  obterFimMinuto5min,
} from './motor-quadrantes-5min';
import {
  analisarCavaloTroia,
  ehMomentoDeExecutarCavaloTroia,
  proximoHorarioExecucaoCavaloTroia,
} from './motor-cavalo-troia';
import type {
  VornaSessao,
  VornaEstadoConexao,
  ConfigAutomacao,
  EstadoAutomacao,
  Vela,
  EstadoWebSocket,
  Quadrante,
  Quadrante5min,
  EstadoFluxoVelas,
  AnaliseLogicaPreco,
  OperacaoLPDetalhada,
  AnaliseImpulsoCorrecaoEngolfo,
  Profile,
} from '../types';
import type { OperacaoAberta } from './vorna';
import type { ProfileRow } from './supabaseService';
import { BRANDING } from '../config/branding';

async function vpsRequest(path: string, method: 'GET' | 'POST', body?: object) {
  const [basePath, qs] = path.split('?');
  const flat = '/api/vps' + basePath.replace(/\//g, '-');
  const url = qs ? `${flat}?${qs}` : flat;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `VPS error ${res.status}`);
  }
  return res.json();
}

const ESTADO_AUTOMACAO_INICIAL: EstadoAutomacao = {
  status: 'aguardando',
  config: null,
  operacoes_executadas: 0,
  operacoes_total: 0,
  lucro_acumulado: 0,
  perda_acumulada: 0,
  saldo_referencia: 0,
  ultima_verificacao: '',
  inicio: null,
};

export interface UseVornaRetorno {
  sessao: VornaSessao | null;
  estado: VornaEstadoConexao;
  erro: string | null;
  requer2fa: boolean;
  conectar: (identifier: string, senha: string) => Promise<void>;
  desconectar: () => void;
  atualizarDados: () => Promise<void>;
  automacao: EstadoAutomacao;
  operacoesAbertas: OperacaoAberta[];
  iniciarAutomacao: (config: ConfigAutomacao) => void;
  pausarAutomacao: () => void;
  retomarAutomacao: () => void;
  finalizarAutomacao: () => void;
  resetarAutomacao: () => void;
  // Quadrantes
  estadoWS: EstadoWebSocket;
  quadranteAtual: Quadrante | null;
  countdownTexto: string;
  segundosRestantes: number;
  cicloMartingale: number;
  valorOperacaoAtual: number;
  sessoesConcluidasHoje: number;
  historicoQuadrantes: Quadrante[];
  // Quadrantes 5min
  quadrante5minAtual: Quadrante5min | null;
  historicoQuadrantes5min: Quadrante5min[];
  galeNivel5min: number;
  // FluxoVelas
  estadoFluxoVelas: EstadoFluxoVelas;
  // Lógica do Preço
  analiseLogicaPreco: AnaliseLogicaPreco | null;
  historicoLP: OperacaoLPDetalhada[];
  // Impulso-Correção-Engolfo
  analiseICE: AnaliseImpulsoCorrecaoEngolfo | null;
  // Seleção Global
  ativoSelecionado: string;
  setAtivoSelecionado: (a: string) => void;
  timeframeSelecionado: string;
  setTimeframeSelecionado: (t: string) => void;
  // Ativos disponíveis via SDK
  ativosSDK: ActiveInfo[];
  // Modo VPS
  modoVPS: boolean;
  vpsStatus: 'desconhecido' | 'online' | 'offline';
}

export function useVorna(supabaseUserId?: string, profile?: Profile | ProfileRow | null): UseVornaRetorno {
  const modoVPS = !!profile?.vps_ativo;
  const [sessao, setSessao] = useState<VornaSessao | null>(() => obterSessaoVorna());
  const [estado, setEstado] = useState<VornaEstadoConexao>(() =>
    obterSessaoVorna()?.conectado ? 'conectado' : 'desconectado'
  );
  const [erro, setErro] = useState<string | null>(null);
  const [requer2fa, setRequer2fa] = useState(false);
  const [ativosSDK, setAtivosSDK] = useState<ActiveInfo[]>([]);
  const [manualAprovado, setManualAprovado] = useState(false);
  const [vpsStatus, setVpsStatus] = useState<'desconhecido' | 'online' | 'offline'>('desconhecido');

  // Automacao (restaura estado persistido se existir)
  const [automacao, setAutomacao] = useState<EstadoAutomacao>(() => {
    const persistido = obterEstadoAutomacao();
    if (persistido && (persistido.automacao.status === 'em_operacao' || persistido.automacao.status === 'pausado')) {
      return persistido.automacao;
    }
    return ESTADO_AUTOMACAO_INICIAL;
  });
  const [operacoesAbertas, setOperacoesAbertas] = useState<OperacaoAberta[]>(() => {
    const persistido = obterEstadoAutomacao();
    return persistido?.operacoesAbertas || [];
  });
  const saldoAnteriorRef = useRef<number>(0);
  const pollingRef = useRef<number | null>(null);

  // Quadrantes
  const [estadoWS, setEstadoWS] = useState<EstadoWebSocket>({
    conectado: false,
    symbol: '',
    ultimaVela: null,
    erro: null,
  });
  const [quadranteAtual, setQuadranteAtual] = useState<Quadrante | null>(null);
  const [countdownTexto, setCountdownTexto] = useState('--:--');
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [cicloMartingale, setCicloMartingale] = useState(() => {
    const persistido = obterEstadoAutomacao();
    return persistido?.cicloMartingale ?? 0;
  });
  const [valorOperacaoAtual, setValorOperacaoAtual] = useState(() => {
    const persistido = obterEstadoAutomacao();
    return persistido?.valorOperacaoAtual ?? 0;
  });
  // P6: sessões concluídas no dia (persiste com chave de data para resetar à meia-noite)
  const [sessoesConcluidasHoje, setSessoesConcluidasHoje] = useState(() => {
    const key = `trademaster_p6_sessoes_${new Date().toDateString()}`;
    return parseInt(localStorage.getItem(key) ?? '0', 10);
  });
  const saldoP6Ref = useRef(0);

  const [historicoQuadrantes, setHistoricoQuadrantes] = useState<Quadrante[]>([]);

  // Cavalo de Troia
  const ultimaJanelaCavaloTroiaRef = useRef<string>('');

  // Quadrantes 5min
  const [quadrante5minAtual, setQuadrante5minAtual] = useState<Quadrante5min | null>(null);
  const [historicoQuadrantes5min, setHistoricoQuadrantes5min] = useState<Quadrante5min[]>([]);
  const ultimoExecutado5min = useRef<string>('');
  const gale5minRef = useRef<{
    ativo: boolean;
    nivel: number;
    direcao: 'compra' | 'venda' | null;
    minutoAlvo: number;
    disparado: boolean;
  }>({ ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false });
  const ultimaAnalise5minRef = useRef<{ analise: import('../types').AnaliseQuadrante5min; quadrante: number } | null>(null);
  const entryMinute5minRef = useRef<number>(-1);

  // Estado Global de Seleção (Sincronizado)
  const [ativoSelecionado, setAtivoSelecionado] = useState<string>(() => {
    const salva = localStorage.getItem('trademaster_ativo_global');
    return salva || 'EUR/USD';
  });
  const [timeframeSelecionado, setTimeframeSelecionado] = useState<string>(() => {
    const salva = localStorage.getItem('trademaster_timeframe_global');
    return salva || '1';
  });

  // FluxoVelas
  const [estadoFluxoVelas, setEstadoFluxoVelas] = useState<EstadoFluxoVelas>({
    analise: null,
    historico_resultados: [],
  });
  const ultimoCandleFluxoRef = useRef<number>(0);
  const ultimoMinutoOperadoRef = useRef<string>('');
  const executandoFluxoRef = useRef<boolean>(false);
  const ultimoMinutoExecRef = useRef<number>(0);
  const velasAtuaisRef = useRef<Vela[]>([]);

  // Lógica do Preço
  const [analiseLP, setAnaliseLP] = useState<AnaliseLogicaPreco | null>(null);
  const [historicoLP, setHistoricoLP] = useState<OperacaoLPDetalhada[]>([]);
  const ultimoSinalLPRef = useRef<string>('');
  const operacaoLPEmAndamentoRef = useRef<boolean>(false);
  const ultimaExecucaoLPRef = useRef<number>(0);

  // Impulso-Correção-Engolfo
  const [analiseICE, setAnaliseICE] = useState<AnaliseImpulsoCorrecaoEngolfo | null>(null);
  const ultimoSinalICERef = useRef<string>('');
  const operacaoICEEmAndamentoRef = useRef<boolean>(false);

  // Sincroniza localStorage quando muda
  useEffect(() => {
    localStorage.setItem('trademaster_ativo_global', ativoSelecionado);
  }, [ativoSelecionado]);

  useEffect(() => {
    localStorage.setItem('trademaster_timeframe_global', timeframeSelecionado);
  }, [timeframeSelecionado]);

  // Persistir estado completo da automação para sobreviver a refresh
  useEffect(() => {
    if (automacao.status === 'aguardando') return;
    salvarEstadoAutomacao({
      automacao,
      saldoAnterior: saldoAnteriorRef.current,
      resultadoAnterior: resultadoAnteriorRef.current,
      valorAnterior: valorAnteriorRef.current,
      cicloMartingale,
      valorOperacaoAtual,
      operacoesAbertas,
      timestamp: new Date().toISOString(),
    });
  }, [automacao, cicloMartingale, valorOperacaoAtual, operacoesAbertas]);

  // Persistir sessões P6 do dia (chave com data garante reset automático à meia-noite)
  useEffect(() => {
    const key = `trademaster_p6_sessoes_${new Date().toDateString()}`;
    localStorage.setItem(key, String(sessoesConcluidasHoje));
  }, [sessoesConcluidasHoje]);

  // Restaurar refs do estado persistido (executa uma vez no mount)
  useEffect(() => {
    const persistido = obterEstadoAutomacao();
    if (persistido && (persistido.automacao.status === 'em_operacao' || persistido.automacao.status === 'pausado')) {
      saldoAnteriorRef.current = persistido.saldoAnterior;
      resultadoAnteriorRef.current = persistido.resultadoAnterior;
      valorAnteriorRef.current = persistido.valorAnterior;
    }
  }, []);

  // Manter ref de operacoesAbertas sempre atual para leitura em closures (tick, etc.)
  useEffect(() => { operacoesAbertasRef.current = operacoesAbertas; }, [operacoesAbertas]);

  // Inicialização: reconectar SDK imediatamente no mount (sem esperar 120s)
  useEffect(() => {
    const iniciarSDK = async () => {
      try {
        const sessaoSalva = obterSessaoVorna();
        if (!sessaoSalva?.conectado) return;
        if (getSdk()) return; // SDK já inicializado (ex: HMR)

        const ok = await reconectarVorna();
        if (!ok) return;

        setSessao(obterSessaoVorna());
        try {
          const ativos = await obterAtivosDisponiveis();
          setAtivosSDK(ativos);
        } catch {}

        // Upgrade: NXOS → SDK para as velas
        const savedAtivo = localStorage.getItem('trademaster_ativo_global') || 'EUR/USD';
        const savedTf = localStorage.getItem('trademaster_timeframe_global') || '1';
        servicoVelas.conectar(savedAtivo, savedTf);
      } catch (err) {
        console.error('[Vorna] Erro ao inicializar SDK:', err);
      }
    };
    iniciarSDK();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Monitorar Visibilidade (Background Mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && automacao.status === 'em_operacao' && !modoVPS) {
        console.warn('[useVorna] App em segundo plano. No mobile, as operações podem ser pausadas pelo sistema.');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Robô ${BRANDING.platformName} Ativo`, {
            body: 'Mantenha o app aberto para execução contínua das operações.',
            tag: 'trademaster-bg'
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [automacao.status, modoVPS]);

  // Reconectar WebSocket se automação foi restaurada após refresh
  useEffect(() => {
    const persistido = obterEstadoAutomacao();
    if (persistido && automacao.status === 'em_operacao' && automacao.config) {
      const intervalMap: Record<string, string> = { M1: '1', M5: '5', M15: '15', M30: '30', M60: '60' };
      const interval = intervalMap[automacao.config.timeframe] || '1';
      servicoVelas.conectar(automacao.config.ativo, interval);
    }
  }, []);

  // Conecta WebSocket automaticamente quando muda o ativo/timeframe EM REPOUSO (sem automação)
  useEffect(() => {
    if (automacao.status === 'aguardando' || automacao.status === 'finalizado') {
      servicoVelas.conectar(ativoSelecionado, timeframeSelecionado);
    }
  }, [ativoSelecionado, timeframeSelecionado, automacao.status]);

  const timerRef = useRef<number | null>(null);
  const ultimoQuadranteExecutado = useRef<string>('');
  const resultadoAnteriorRef = useRef<'vitoria' | 'derrota' | null>(null);
  const valorAnteriorRef = useRef<number>(0);
  const processandoResultadoRef = useRef(false);
  const ultimaOpProcessadaIdRef = useRef<string | null>(null);
  const operacoesAbertasRef = useRef(operacoesAbertas);
  const vpsOnlineRef = useRef(false);

  // Refs espelho para estado volátil (evita recrear interval do FluxoVelas)
  const lucroAcumuladoRef = useRef(automacao.lucro_acumulado);
  const perdaAcumuladaRef = useRef(automacao.perda_acumulada);
  const operacoesExecutadasRef = useRef(automacao.operacoes_executadas);
  const operacoesTotalRef = useRef(automacao.operacoes_total);
  const cicloMartingaleRef = useRef(cicloMartingale);
  const modoContinuoRef = useRef(automacao.config?.modo_continuo ?? false);

  // Sincronizar refs espelho com estado (evita recrear intervals)
  useEffect(() => {
    lucroAcumuladoRef.current = automacao.lucro_acumulado;
    perdaAcumuladaRef.current = automacao.perda_acumulada;
    operacoesExecutadasRef.current = automacao.operacoes_executadas;
    operacoesTotalRef.current = automacao.operacoes_total;
    modoContinuoRef.current = automacao.config?.modo_continuo ?? false;
  }, [automacao.lucro_acumulado, automacao.perda_acumulada, automacao.operacoes_executadas, automacao.operacoes_total, automacao.config?.modo_continuo]);

  useEffect(() => {
    cicloMartingaleRef.current = cicloMartingale;
  }, [cicloMartingale]);

  // Escuta eventos de atualização/desconexão
  useEffect(() => {
    const aoAtualizar = () => setSessao(obterSessaoVorna());
    const aoDesconectar = () => {
      setSessao(null);
      setEstado('desconectado');
      setErro(null);
      setAutomacao(ESTADO_AUTOMACAO_INICIAL);
      setOperacoesAbertas([]);
      limparEstadoAutomacao();
    };

    window.addEventListener('trademaster:vorna-atualizado', aoAtualizar);
    window.addEventListener('trademaster:vorna-desconectado', aoDesconectar);
    return () => {
      window.removeEventListener('trademaster:vorna-atualizado', aoAtualizar);
      window.removeEventListener('trademaster:vorna-desconectado', aoDesconectar);
    };
  }, []);

  // Escuta estado do WebSocket
  useEffect(() => {
    const aoMudarEstado = () => setEstadoWS(servicoVelas.getEstado());
    window.addEventListener('trademaster:ws-estado', aoMudarEstado);
    return () => window.removeEventListener('trademaster:ws-estado', aoMudarEstado);
  }, []);

  // Escuta atualizações de velas
  useEffect(() => {
    const remover = servicoVelas.adicionarListener((_novasVelas) => {
      setEstadoWS(servicoVelas.getEstado());
    });
    return remover;
  }, []);

  // ── Motor FluxoVelas: executa a cada candle fechado ──
  const utimoVelaSegundosRef = useRef<number>(0);

  useEffect(() => {
    const remover = servicoVelas.adicionarListener((velas) => {
      if (velas.length === 0) return;
      velasAtuaisRef.current = velas;

      const config = automacao.config;
      if (config?.estrategia === 'FluxoVelas') {
        const agoraSegundos = Math.floor(Date.now() / 1000);
        if (agoraSegundos > utimoVelaSegundosRef.current) {
          utimoVelaSegundosRef.current = agoraSegundos;
          setTimeout(() => {
            const analise = analisarFluxoVelas(velas, config.janela_horas || 1);
            setEstadoFluxoVelas(prev => ({ ...prev, analise }));
          }, 0);
        }
      }

      if (config?.estrategia === 'LogicaDoPreco') {
        const agoraSegundos = Math.floor(Date.now() / 1000);
        if (agoraSegundos > utimoVelaSegundosRef.current) {
          utimoVelaSegundosRef.current = agoraSegundos;
          setTimeout(() => {
            const analise = analisarLogicaPreco(velas, config.conceitos_ativos_lp);
            setAnaliseLP(analise);
          }, 0);
        }
      }

      if (config?.estrategia === 'ImpulsoCorrecaoEngolfo') {
        const agoraSegundos = Math.floor(Date.now() / 1000);
        if (agoraSegundos > utimoVelaSegundosRef.current) {
          utimoVelaSegundosRef.current = agoraSegundos;
          setTimeout(() => {
            const analise = analisarImpulsoCorrecaoEngolfo(velas);
            setAnaliseICE(analise);
          }, 0);
        }
      }

      if (config?.estrategia === 'Quadrantes5min') {
        const agora = new Date();
        const minutos = agora.getMinutes();
        const numQ5 = obterQuadranteAtual5min(minutos);
        const velas5 = servicoVelas.obterVelasDoQuadrante5min(numQ5, agora);
        const analise5 = velas5.length > 0 ? analisarQuadrante5min(velas5) : null;
        setQuadrante5minAtual({
          numero: numQ5,
          inicio_minuto: obterInicioMinuto5min(numQ5),
          fim_minuto: obterFimMinuto5min(numQ5),
          velas: velas5,
          analise: analise5,
        });
      }
    });

    return remover;
  }, [automacao.config?.estrategia, automacao.config?.janela_horas, automacao.config?.conceitos_ativos_lp]);


  // ── Tick de Execução FluxoVelas ──
  useEffect(() => {
    if (automacao.status !== 'em_operacao') return;
    const config = automacao.config;
    if (!config || config.estrategia !== 'FluxoVelas') return;
    if (modoVPS && vpsOnlineRef.current) return;

    const intervalId = window.setInterval(() => {
      const velas = velasAtuaisRef.current;
      if (velas.length === 0) return;

      const agora = new Date();
      const segundos = agora.getSeconds();

      const ehM1 = config.timeframe === 'M1';
      const gatilhoM1 = ehM1 && segundos >= 57;
      const gatilhoPadrao = !ehM1 && segundos <= 2;

      if (!gatilhoM1 && !gatilhoPadrao) return;

      const analise = analisarFluxoVelas(velas, config.janela_horas || 1, true);

      if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) {
        if (segundos === 58) console.log(`[FluxoVelas] Tick 58s alcançado, porém sem sinal de operação.`);
        return;
      }

      if (ultimoMinutoOperadoRef.current === analise.sinal_id) return;
      ultimoMinutoOperadoRef.current = analise.sinal_id;

      if (operacoesAbertasRef.current.length > 0) {
        const opF = operacoesAbertasRef.current[0];
        if (Date.now() - new Date(opF?.hora_envio ?? 0).getTime() > ((opF?.duracao ?? 60) + 90) * 1000) {
          console.warn('[FluxoVelas] Operação fantasma detectada. Limpando.');
          setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));
        }
        return;
      }

      console.log(`[FluxoVelas] >>> GATILHO TICK AOS ${segundos}s! <<<`);

      const atingiuMeta = config.meta != null && automacao.lucro_acumulado >= config.meta;
      const atingiuStop = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
      const atingiuLimite = config.gerenciamento !== 'P6' && !config.modo_continuo && automacao.operacoes_executadas >= automacao.operacoes_total;

      if (atingiuMeta || atingiuStop || atingiuLimite) {
        console.warn(`[FluxoVelas] 🛑 Automação interrompida: Meta=${atingiuMeta}, Stop=${atingiuStop}`);
        return;
      }

      const { valor, novo_ciclo } = calcularValorOperacao({
        estrategia: config.gerenciamento,
        valor_base: config.valor_por_operacao,
        resultado_anterior: resultadoAnteriorRef.current,
        valor_anterior: valorAnteriorRef.current || config.valor_por_operacao,
        multiplicador_martingale: config.multiplicador_martingale,
        multiplicador_soros: config.multiplicador_soros,
        payout: config.payout,
        ciclo_martingale: cicloMartingaleRef.current,
        max_martingale: config.max_martingale,
        banca_atual: config.gerenciamento === 'P6' ? (saldoP6Ref.current || saldoAnteriorRef.current || 0) : undefined,
      });

      setCicloMartingale(novo_ciclo);
      setValorOperacaoAtual(valor);
      valorAnteriorRef.current = valor;

      comReconexao(() => executarOperacaoVorna(config.ativo, analise.direcao_operacao, valor, 60, config.instrumento_tipo))
        .then(async id => {
          console.log(`[FluxoVelas] Ordem enviada! ID: ${id}`);
          setOperacoesAbertas(prev => [...prev, {
            id, ativo: config.ativo, direcao: analise.direcao_operacao!, valor, hora_envio: new Date().toISOString(), duracao: 60, status: 'enviada',
          }]);

          setEstadoFluxoVelas(prev => ({
            ...prev,
            historico_resultados: [{ id, timestamp: new Date().toISOString(), ativo: config.ativo, timeframe: config.timeframe, modo: analise.modo_ativo, direcao: analise.direcao_operacao!, resultado: 'vitoria', lucro: 0, janela_horas: config.janela_horas || 1 }, ...prev.historico_resultados].slice(0, 50)
          }));

          try {
            const saldoAposEnvio = await obterSaldoRapido();
            // Blitz options: a entrada é debitada imediatamente ao abrir.
            // Para calcular o delta correto, precisamos do saldo PRÉ-entrada (antes do débito).
            saldoAnteriorRef.current = saldoAposEnvio + valor;
          } catch {
            saldoAnteriorRef.current -= valor;
          }
          setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
        })
        .catch(err => {
          console.error('[FluxoVelas] Erro no envio:', err);
          ultimoMinutoOperadoRef.current = '';
        });
    }, 250);

    return () => clearInterval(intervalId);
  }, [automacao.status, automacao.config, automacao.lucro_acumulado, automacao.perda_acumulada, automacao.operacoes_executadas, automacao.operacoes_total, modoVPS]);

  // ── Tick de Execução LogicaDoPreco ──
  useEffect(() => {
    if (automacao.status !== 'em_operacao') return;
    const config = automacao.config;
    if (!config || config.estrategia !== 'LogicaDoPreco') return;
    if (modoVPS && vpsOnlineRef.current) return;

    const intervalId = window.setInterval(() => {
      const velas = velasAtuaisRef.current;
      if (velas.length === 0) return;

      if (operacaoLPEmAndamentoRef.current) return;
      if (Date.now() - ultimaExecucaoLPRef.current < 300000) return;

      const analise = analisarLogicaPreco(velas, config.conceitos_ativos_lp);

      if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) return;

      if (ultimoSinalLPRef.current === analise.sinal_id) return;
      ultimoSinalLPRef.current = analise.sinal_id;

      const agora = new Date();
      console.log(`[LogicaDoPreco] >>> PADRÃO DETECTADO às ${agora.toLocaleTimeString()}! <<<`);

      const atingiuMeta = config.meta != null && automacao.lucro_acumulado >= config.meta;
      const atingiuStop = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
      const atingiuLimite = config.gerenciamento !== 'P6' && !config.modo_continuo && automacao.operacoes_executadas >= automacao.operacoes_total;

      if (atingiuMeta || atingiuStop || atingiuLimite) return;

      const { valor, novo_ciclo } = calcularValorOperacao({
        estrategia: config.gerenciamento,
        valor_base: config.valor_por_operacao,
        resultado_anterior: resultadoAnteriorRef.current,
        valor_anterior: valorAnteriorRef.current || config.valor_por_operacao,
        multiplicador_martingale: config.multiplicador_martingale,
        multiplicador_soros: config.multiplicador_soros,
        payout: config.payout,
        ciclo_martingale: cicloMartingaleRef.current,
        max_martingale: config.max_martingale,
        banca_atual: config.gerenciamento === 'P6' ? (saldoP6Ref.current || saldoAnteriorRef.current || 0) : undefined,
      });

      setCicloMartingale(novo_ciclo);
      setValorOperacaoAtual(valor);
      valorAnteriorRef.current = valor;

      operacaoLPEmAndamentoRef.current = true;
      ultimaExecucaoLPRef.current = Date.now();

      const agoraCalc = new Date();
      const totalSegundosNoHora = agoraCalc.getMinutes() * 60 + agoraCalc.getSeconds();
      const duracaoCandle: Record<string, number> = { M1: 60, M5: 300, M15: 900, M30: 1800, M60: 3600 };
      const candleDuracao = duracaoCandle[config.timeframe] || 60;
      const segundosDesdeInicio = totalSegundosNoHora % candleDuracao;
      const duracao = Math.max(5, candleDuracao - segundosDesdeInicio);

      comReconexao(() => executarOperacaoVorna(config.ativo, analise.direcao_operacao!, valor, duracao, config.instrumento_tipo))
        .then(async id => {
          console.log(`[LogicaDoPreco] Ordem enviada! ID: ${id}`);
          setOperacoesAbertas(prev => [...prev, {
            id, ativo: config.ativo, direcao: analise.direcao_operacao!, valor, hora_envio: new Date().toISOString(), duracao, status: 'enviada',
          }]);

          setHistoricoLP(prev => [{
            id,
            timestamp: new Date().toISOString(),
            ativo: config.ativo,
            direcao: analise.direcao_operacao!,
            valor,
            resumo: analise.resumo,
            confianca: analise.confianca,
            ciclo: analise.cicloAtual,
            dominio: analise.dominioAtual,
            conceitos: analise.sinais.map(s => s.conceito),
            sinais: analise.sinais.map(s => ({ conceito: s.conceito, descricao: s.descricao, confianca: s.confianca })),
          }, ...prev].slice(0, 20));

          try {
            const saldoAposEnvio = await obterSaldoRapido();
            saldoAnteriorRef.current = saldoAposEnvio + valor;
          } catch {
            saldoAnteriorRef.current -= valor;
          }
          setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
        })
        .catch(err => {
          console.error('[LogicaDoPreco] Erro no envio:', err);
          operacaoLPEmAndamentoRef.current = false;
          ultimoSinalLPRef.current = '';
        });
    }, 250);

    return () => clearInterval(intervalId);
  }, [automacao.status, automacao.config, automacao.lucro_acumulado, automacao.perda_acumulada, automacao.operacoes_executadas, automacao.operacoes_total, modoVPS]);

  // ── Tick de Execução ImpulsoCorrecaoEngolfo ──
  useEffect(() => {
    if (automacao.status !== 'em_operacao') return;
    const config = automacao.config;
    if (!config || config.estrategia !== 'ImpulsoCorrecaoEngolfo') return;
    if (modoVPS && vpsOnlineRef.current) return;

    const intervalId = window.setInterval(() => {
      const velas = velasAtuaisRef.current;
      if (velas.length === 0) return;

      if (operacaoICEEmAndamentoRef.current) return;

      const analise = analisarImpulsoCorrecaoEngolfo(velas);

      if (!analise.operar || !analise.direcao_operacao || !analise.sinal_id) return;

      if (ultimoSinalICERef.current === analise.sinal_id) return;
      ultimoSinalICERef.current = analise.sinal_id;

      if (operacoesAbertasRef.current.length > 0) {
        const opF = operacoesAbertasRef.current[0];
        if (Date.now() - new Date(opF?.hora_envio ?? 0).getTime() > ((opF?.duracao ?? 60) + 90) * 1000) {
          console.warn('[ICE] Operação fantasma detectada. Limpando.');
          setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));
        }
        return;
      }

      const atingiuMeta = config.meta != null && automacao.lucro_acumulado >= config.meta;
      const atingiuStop = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
      const atingiuLimite = config.gerenciamento !== 'P6' && !config.modo_continuo && automacao.operacoes_executadas >= automacao.operacoes_total;

      if (atingiuMeta || atingiuStop || atingiuLimite) return;

      const { valor, novo_ciclo } = calcularValorOperacao({
        estrategia: config.gerenciamento,
        valor_base: config.valor_por_operacao,
        resultado_anterior: resultadoAnteriorRef.current,
        valor_anterior: valorAnteriorRef.current || config.valor_por_operacao,
        multiplicador_martingale: config.multiplicador_martingale,
        multiplicador_soros: config.multiplicador_soros,
        payout: config.payout,
        ciclo_martingale: cicloMartingaleRef.current,
        max_martingale: config.max_martingale,
        banca_atual: config.gerenciamento === 'P6' ? (saldoP6Ref.current || saldoAnteriorRef.current || 0) : undefined,
      });

      setCicloMartingale(novo_ciclo);
      setValorOperacaoAtual(valor);
      valorAnteriorRef.current = valor;

      operacaoICEEmAndamentoRef.current = true;

      const agora = new Date();
      const totalSegundosNoHora = agora.getMinutes() * 60 + agora.getSeconds();
      const duracaoCandle: Record<string, number> = { M1: 60, M5: 300, M15: 900, M30: 1800, M60: 3600 };
      const candleDuracao = duracaoCandle[config.timeframe] || 60;
      const segundosDesdeInicio = totalSegundosNoHora % candleDuracao;
      const duracao = Math.max(5, candleDuracao - segundosDesdeInicio);
      
      const todasVelas = servicoVelas.obterTodasVelas();
      const precoEntrada = todasVelas[todasVelas.length - 1]?.fechamento;
      const horaEnvioReal = new Date().toISOString();

      console.log(`[ICE] >>> PADRÃO DETECTADO: ${analise.resumo}`);

      comReconexao(() => executarOperacaoVorna(config.ativo, analise.direcao_operacao!, valor, duracao, config.instrumento_tipo))
        .then(async id => {
          console.log(`[ICE] Ordem enviada! ID: ${id}`);
          setOperacoesAbertas(prev => [...prev, {
            id, ativo: config.ativo, direcao: analise.direcao_operacao!, valor, hora_envio: horaEnvioReal, duracao, status: 'enviada', preco_entrada: precoEntrada
          }]);
          try {
            const saldoAposEnvio = await obterSaldoRapido();
            saldoAnteriorRef.current = saldoAposEnvio + valor;
          } catch {
            saldoAnteriorRef.current -= valor;
          }
          setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
        })
        .catch(err => {
          console.error('[ICE] Erro no envio:', err);
          operacaoICEEmAndamentoRef.current = false;
          ultimoSinalICERef.current = '';
        });
    }, 250);

    return () => clearInterval(intervalId);
  }, [automacao.status, automacao.config, automacao.lucro_acumulado, automacao.perda_acumulada, automacao.operacoes_executadas, automacao.operacoes_total, modoVPS]);

  // Timer principal: 1 segundo (ativo durante automação)
  useEffect(() => {
    if (automacao.status !== 'em_operacao') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const config = automacao.config;
    if (!config) return;

    const tick = () => {
      const agora = new Date();
      const minutos = agora.getMinutes();

      if (config.estrategia === 'CavaloTroia') {
        // ── Cavalo de Troia ──
        const proxCT = proximoHorarioExecucaoCavaloTroia();
        setSegundosRestantes(proxCT.segundosRestantes);
        setCountdownTexto(formatarCountdown(proxCT.segundosRestantes));

        if (modoVPS && vpsOnlineRef.current) return;
        if (operacoesAbertasRef.current.length > 0) {
          const opF = operacoesAbertasRef.current[0];
          if (Date.now() - new Date(opF?.hora_envio ?? 0).getTime() > ((opF?.duracao ?? 60) + 90) * 1000) {
            console.warn('[CavaloTroia] Operação fantasma detectada. Limpando.');
            setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));
          }
          return;
        }

        if (ehMomentoDeExecutarCavaloTroia()) {
          const atingiuMetaCT = config.meta != null && automacao.lucro_acumulado >= config.meta;
          const atingiuStopCT = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
          const atingiuLimiteCT = config.gerenciamento !== 'P6' && !config.modo_continuo && automacao.operacoes_executadas >= automacao.operacoes_total;
          if (atingiuMetaCT || atingiuStopCT || atingiuLimiteCT) {
            console.warn(`[CavaloTroia] 🛑 Condição de encerramento no pré-execução: Meta=${atingiuMetaCT}, Stop=${atingiuStopCT}, Limite=${atingiuLimiteCT}`);
            return;
          }

          const todasVelas = servicoVelas.obterTodasVelas();
          const analise = analisarCavaloTroia(todasVelas);

          if (!analise.operar || !analise.direcao_operacao) {
            console.log(`[CavaloTroia] Sem sinal: ${analise.resumo}`);
            return;
          }

          if (ultimaJanelaCavaloTroiaRef.current === analise.sinal_id) return;
          ultimaJanelaCavaloTroiaRef.current = analise.sinal_id;

          const { valor, novo_ciclo } = calcularValorOperacao({
            estrategia: config.gerenciamento,
            valor_base: config.valor_por_operacao,
            resultado_anterior: resultadoAnteriorRef.current,
            valor_anterior: valorAnteriorRef.current || config.valor_por_operacao,
            multiplicador_martingale: config.multiplicador_martingale,
            multiplicador_soros: config.multiplicador_soros,
            payout: config.payout,
            ciclo_martingale: cicloMartingaleRef.current,
            max_martingale: config.max_martingale,
          });

          const duracao = 120; // 2 minutos
          setCicloMartingale(novo_ciclo);
          setValorOperacaoAtual(valor);
          valorAnteriorRef.current = valor;

          console.log(`[CavaloTroia] Janela ${analise.janela_atual} — ${analise.direcao_operacao.toUpperCase()} — R$ ${valor}`);

          const horaEnvio = new Date().toISOString();

          comReconexao(() => executarOperacaoVorna(config.ativo, analise.direcao_operacao!, valor, duracao, config.instrumento_tipo))
            .then(async id => {
              setOperacoesAbertas(prev => [...prev, { id, ativo: config.ativo, direcao: analise.direcao_operacao!, valor, hora_envio: horaEnvio, duracao, status: 'enviada' }]);
              try {
                const s = await obterSaldoRapido();
                saldoAnteriorRef.current = s + valor;
              } catch { saldoAnteriorRef.current -= valor; }
              setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
            })
            .catch(err => {
              console.error('[CavaloTroia] Erro ao executar:', err);
              ultimaJanelaCavaloTroiaRef.current = '';
            });
        }
        return;
      }

      if (config.estrategia === 'Quadrantes5min') {
        // ── Quadrantes 5min ──
        const prox5 = proximoHorarioExecucao5min();
        setSegundosRestantes(prox5.segundosRestantes);
        setCountdownTexto(formatarCountdown(prox5.segundosRestantes));

        const numQ5 = obterQuadranteAtual5min(minutos);
        const velas5 = servicoVelas.obterVelasDoQuadrante5min(numQ5, agora);
        const analise5 = velas5.length > 0 ? analisarQuadrante5min(velas5) : null;
        setQuadrante5minAtual({
          numero: numQ5,
          inicio_minuto: obterInicioMinuto5min(numQ5),
          fim_minuto: obterFimMinuto5min(numQ5),
          velas: velas5,
          analise: analise5,
        });

        if (modoVPS && vpsOnlineRef.current) return;
        // Limpar operação fantasma: se passou mais de (duracao + 60)s sem resultado, desbloqueia
        if (operacoesAbertasRef.current.length > 0) {
          const opFantasma = operacoesAbertasRef.current[0];
          const tempoLimite = ((opFantasma?.duracao ?? 60) + 60) * 1000;
          const tempoDecorrido = Date.now() - new Date(opFantasma?.hora_envio ?? 0).getTime();
          if (tempoDecorrido > tempoLimite) {
            console.warn(`[Q5min] Operação fantasma detectada (${Math.round(tempoDecorrido / 1000)}s sem resultado). Limpando.`);
            setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));
          } else {
            // O robô aguardará a resposta OFICIAL da corretora no polling otimizado de alta frequência.
            return;
          }
        }
        const gale = gale5minRef.current;
        const devEntrar = ehMomentoDeExecutarBinary5min();

        // Novo quadrante → abandonar ciclo anterior pendente (cada quadrante é independente)
        if (devEntrar && gale.ativo) {
          console.log(`[Q5min] Novo quadrante — ciclo anterior abandonado (G${gale.nivel})`);
          gale5minRef.current = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
        }

        // Gale: só dispara em minutos intermediários (NÃO no início de quadrante)
        const galeFinal = gale5minRef.current;
        if (!devEntrar && galeFinal.ativo && !galeFinal.disparado && galeFinal.minutoAlvo >= 0) {
          if (ehMomentoDeGale5min(galeFinal.minutoAlvo)) {
            const atingiuMetaGale = config.meta != null && automacao.lucro_acumulado >= config.meta;
            const atingiuStopGale = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
            if (atingiuMetaGale || atingiuStopGale) {
              console.warn(`[Q5min] 🛑 Meta ou stop atingido no pré-gale: Meta=${atingiuMetaGale}, Stop=${atingiuStopGale}`);
              return;
            }

            const direcaoGale = gale.direcao!;
            const mult = config.multiplicador_martingale || 2;
            const valor = Math.round(config.valor_por_operacao * Math.pow(mult, gale.nivel) * 100) / 100;
            const novo_ciclo = gale.nivel;
            gale5minRef.current.disparado = true;
            entryMinute5minRef.current = galeFinal.minutoAlvo;
            setCicloMartingale(novo_ciclo);
            setValorOperacaoAtual(valor);
            valorAnteriorRef.current = valor;
            console.log(`[Q5min] GALE G${gale.nivel} — ${direcaoGale.toUpperCase()} — R$ ${valor}`);
            const duracaoGale = config.duracao_expiracao || 60;
            const todasVelas = servicoVelas.obterTodasVelas();
            const precoEntrada = todasVelas[todasVelas.length - 1]?.fechamento;
            const horaEnvioReal = new Date().toISOString();
            
            comReconexao(() => executarOperacaoVorna(config.ativo, direcaoGale, valor, duracaoGale, config.instrumento_tipo))
              .then(async id => {
                setOperacoesAbertas(prev => [...prev, { id, ativo: config.ativo, direcao: direcaoGale, valor, hora_envio: horaEnvioReal, duracao: duracaoGale, status: 'enviada', preco_entrada: precoEntrada }]);
                try {
                  const s = await obterSaldoRapido();
                  saldoAnteriorRef.current = s + valor;
                } catch { saldoAnteriorRef.current -= valor; }
                setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
              })
              .catch(err => {
                console.error('[Q5min] Erro no gale:', err);
                gale5minRef.current.disparado = false;
              });
          }
          return;
        }

        // Entrada: sempre disponível no início de cada quadrante
        if (devEntrar) console.log(`[Q5min][DEBUG] devEntrar=true min=${minutos} seg=${agora.getSeconds()} gale.ativo=${gale5minRef.current.ativo} lastChave=${ultimoExecutado5min.current}`);
        if (devEntrar && !gale5minRef.current.ativo) {
          const quadranteExec = obterQuadranteAtual5min(minutos);
          const chave = `${agora.getHours()}_${quadranteExec}_5m`;
          if (ultimoExecutado5min.current === chave) return;

          const atingiuMetaQ5 = config.meta != null && automacao.lucro_acumulado >= config.meta;
          const atingiuStopQ5 = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
          if (atingiuMetaQ5 || atingiuStopQ5) {
            console.warn(`[Q5min] 🛑 Meta ou stop atingido no pré-entrada: Meta=${atingiuMetaQ5}, Stop=${atingiuStopQ5}`);
            return;
          }

          // Analisar o quadrante atual (seg 58-59: quase fechado — direção já definida)
          const velasExec = servicoVelas.obterVelasDoQuadrante5min(quadranteExec, agora);
          console.log(`[Q5min] pré-entrada Q${quadranteExec}→${quadranteExec === 12 ? 1 : quadranteExec + 1} — ${velasExec.length} vela(s) — ${agora.toTimeString().slice(0,8)}`);
          const analiseExec = velasExec.length > 0 ? analisarQuadrante5min(velasExec) : null;
          if (!analiseExec || !analiseExec.operar) { console.log('[Q5min] sem análise, pulando'); return; }

          ultimoExecutado5min.current = chave;
          entryMinute5minRef.current = minutos;

          const { valor, novo_ciclo } = calcularValorOperacao({
            estrategia: config.gerenciamento,
            valor_base: config.valor_por_operacao,
            resultado_anterior: resultadoAnteriorRef.current,
            valor_anterior: valorAnteriorRef.current || config.valor_por_operacao,
            multiplicador_martingale: config.multiplicador_martingale,
            multiplicador_soros: config.multiplicador_soros,
            payout: config.payout,
            ciclo_martingale: cicloMartingaleRef.current,
            max_martingale: config.max_martingale,
            banca_atual: config.gerenciamento === 'P6' ? (saldoP6Ref.current || saldoAnteriorRef.current || 0) : undefined,
          });

          const duracaoExec = config.duracao_expiracao || 60;
          gale5minRef.current = { ativo: false, nivel: 0, direcao: analiseExec.direcao_operacao, minutoAlvo: -1, disparado: false };
          ultimaAnalise5minRef.current = { analise: analiseExec, quadrante: quadranteExec };
          setCicloMartingale(novo_ciclo);
          setValorOperacaoAtual(valor);
          valorAnteriorRef.current = valor;
          console.log(`[Q5min] Q${quadranteExec} — ${analiseExec.direcao_operacao.toUpperCase()} — R$ ${valor}`);

          const todasVelas = servicoVelas.obterTodasVelas();
          const precoEntrada = todasVelas[todasVelas.length - 1]?.fechamento;
          const horaEnvioReal = new Date().toISOString();

          comReconexao(() => executarOperacaoVorna(config.ativo, analiseExec.direcao_operacao, valor, duracaoExec, config.instrumento_tipo))
            .then(async id => {
              setOperacoesAbertas(prev => [...prev, { id, ativo: config.ativo, direcao: analiseExec.direcao_operacao, valor, hora_envio: horaEnvioReal, duracao: duracaoExec, status: 'enviada', preco_entrada: precoEntrada }]);
              try {
                const s = await obterSaldoRapido();
                saldoAnteriorRef.current = s + valor;
              } catch { saldoAnteriorRef.current -= valor; }
              setHistoricoQuadrantes5min(prev => [...prev, {
                numero: quadranteExec,
                inicio_minuto: obterInicioMinuto5min(quadranteExec),
                fim_minuto: obterFimMinuto5min(quadranteExec),
                velas: velasExec,
                analise: analiseExec,
                resultado: null,
                gale_nivel: 0,
              }]);
              setAutomacao(prev => ({ ...prev, ultima_verificacao: new Date().toISOString() }));
            })
            .catch(err => {
            console.error('[Q5min] Erro ao executar:', err);
            ultimoExecutado5min.current = '';
          });
        }
        return;
      }

      // ── Quadrantes 10min (lógica original) ──
      const prox = proximoHorarioExecucao();
      setSegundosRestantes(prox.segundosRestantes);
      setCountdownTexto(formatarCountdown(prox.segundosRestantes));

      const numQuadrante = prox.quadrante;
      const velasQuadrante = servicoVelas.obterVelasDoQuadrante(numQuadrante, agora);
      const vHistorico = servicoVelas.obterTodasVelas();
      const analise = velasQuadrante.length > 0 ? analisarQuadrante(velasQuadrante, vHistorico) : null;

      setQuadranteAtual({
        numero: numQuadrante,
        inicio_minuto: (numQuadrante === 6 ? 50 : (numQuadrante - 1) * 10),
        fim_minuto: (numQuadrante === 6 ? 59 : (numQuadrante - 1) * 10 + 9),
        velas: velasQuadrante,
        analise,
      });

      if (modoVPS && vpsOnlineRef.current) return;

      if (ehMomentoDeExecutar()) {
        if (operacoesAbertasRef.current.length > 0) {
          const opF = operacoesAbertasRef.current[0];
          if (Date.now() - new Date(opF?.hora_envio ?? 0).getTime() > ((opF?.duracao ?? 60) + 90) * 1000) {
            console.warn('[Quadrante] Operação fantasma detectada. Limpando.');
            setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));
          }
          return;
        }

        const quadranteExec = Math.floor(minutos / 10) + 1;
        const chaveExecucao = `${agora.getHours()}_${quadranteExec}`;
        if (ultimoQuadranteExecutado.current === chaveExecucao) return;

        const atingiuMetaQ = config.meta != null && automacao.lucro_acumulado >= config.meta;
        const atingiuStopQ = config.gerenciamento !== 'P6' && automacao.perda_acumulada >= (config.valor_stop || Infinity);
        const atingiuLimiteQ = config.gerenciamento !== 'P6' && !config.modo_continuo && automacao.operacoes_executadas >= automacao.operacoes_total;
        if (atingiuMetaQ || atingiuStopQ || atingiuLimiteQ) {
          console.warn(`[Quadrante] 🛑 Condição de encerramento no pré-execução: Meta=${atingiuMetaQ}, Stop=${atingiuStopQ}, Limite=${atingiuLimiteQ}`);
          return;
        }

        ultimoQuadranteExecutado.current = chaveExecucao;

        const velasExec = servicoVelas.obterVelasDoQuadrante(quadranteExec, agora);
        const vHistoricoExec = servicoVelas.obterTodasVelas();
        const analiseExec = velasExec.length > 0 ? analisarQuadrante(velasExec, vHistoricoExec) : null;

        if (!analiseExec || !analiseExec.operar) {
          console.warn(`[Quadrante] Q${quadranteExec} — Sem sinal suficiente para análise.`);
          return;
        }

        let podeOperar = true;

        if (config.usar_filtro_volume && !analiseExec.volume_confirmacao) {
          podeOperar = false;
        }

        if (config.usar_filtro_dupla_exposicao && !analiseExec.dupla_exposicao_detectada) {
          podeOperar = false;
        }

        if (!podeOperar) {
          const motivoFiltro = `Filtro vetou operação em Q${quadranteExec}: ${analiseExec.explicacao}`;
          console.warn(`[Quadrante] ${motivoFiltro}`);
          setAutomacao(prev => ({ ...prev, ultima_verificacao: motivoFiltro }));
          return;
        }

        // Primeira operação (sem resultado anterior): usa valor base.
        // P6: usa saldo atual × percentagem do nível (não usa valor_por_operacao).
        // Demais: usa o valor pré-computado pelo handler de resultado armazenado em valorAnteriorRef.
        // Recalcular aqui causava bug no Soros: o handler já incrementa cicloMartingale para 1,
        // então a recalculação entendia ciclo>=1 e retornava mão fixa em vez do valor Soros.
        // P6: usa cicloMartingaleRef como índice do nível atual (já avançado pelo result handler)
        const valorP6 = config.gerenciamento === 'P6'
          ? calcularP6Entradas(saldoP6Ref.current || saldoAnteriorRef.current || 1, config.payout || 88)[Math.min(cicloMartingaleRef.current, 5)]
          : null;
        const valor = valorP6 !== null
          ? valorP6
          : (resultadoAnteriorRef.current === null
              ? config.valor_por_operacao
              : (valorAnteriorRef.current || config.valor_por_operacao));
        setValorOperacaoAtual(valor);

        console.log(`[Quadrante] Q${quadranteExec} — ${analiseExec.direcao_operacao.toUpperCase()} — R$ ${valor}`);

        const duracaoQ = config.duracao_expiracao || 60;
        const todasVelas = servicoVelas.obterTodasVelas();
        const precoEntrada = todasVelas[todasVelas.length - 1]?.fechamento;
        const horaEnvioReal = new Date().toISOString();

        comReconexao(() => executarOperacaoVorna(config.ativo, analiseExec.direcao_operacao, valor, duracaoQ, config.instrumento_tipo))
          .then(async id => {
            const opAberta: OperacaoAberta = {
              id,
              ativo: config.ativo,
              direcao: analiseExec.direcao_operacao,
              valor,
              hora_envio: horaEnvioReal,
              duracao: duracaoQ,
              status: 'enviada',
              preco_entrada: precoEntrada,
            };
            setOperacoesAbertas(prev => [...prev, opAberta]);

            try {
              // Aguarda dedução do investimento ser refletida pelo servidor (Blitz debita imediato mas pode ter latência)
              await new Promise(r => setTimeout(r, 400));
              const saldoAposEnvio = await obterSaldoRapido();
              saldoAnteriorRef.current = saldoAposEnvio + valor;
            } catch {
              saldoAnteriorRef.current -= valor;
            }

            setHistoricoQuadrantes(prev => [
              ...prev,
              {
                numero: quadranteExec,
                inicio_minuto: (quadranteExec - 1) * 10,
                fim_minuto: (quadranteExec - 1) * 10 + 9,
                velas: velasExec,
                analise: analiseExec,
                resultado: null,
              },
            ]);

            setAutomacao(prev => ({
              ...prev,
              ultima_verificacao: new Date().toISOString(),
            }));
          })
          .catch(err => {
            console.error('[Quadrante] Erro ao executar operação:', err);
            ultimoQuadranteExecutado.current = '';
          });
      }
    };

    tick();
    timerRef.current = window.setInterval(tick, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [automacao.status, automacao.config, modoVPS]);

  // Polling: verificar operações e processar resultado
  useEffect(() => {
    if (automacao.status !== 'em_operacao') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const verificar = async () => {
      if (processandoResultadoRef.current) return;
      try {
        if (operacoesAbertasRef.current.length === 0) return;
        const opId = operacoesAbertasRef.current[0]?.id;
        if (ultimaOpProcessadaIdRef.current === opId) return;
        processandoResultadoRef.current = true;

        // Aguardar tempo mínimo de expiração minus 2 segundos (Fast-Track Antecipado de 58s)
        const opAtual = operacoesAbertasRef.current[0];
        const enviada = opAtual.hora_envio ? new Date(opAtual.hora_envio).getTime() : 0;
        const duracaoOp = (opAtual.duracao ?? 60) * 1000;
        const tempoDecorrido = Date.now() - enviada;

        // Verificar 1s antes do fechamento da vela de resultado (candle alinhado ao múltiplo de 60s)
        const optionCandleStart = Math.ceil(enviada / 60000) * 60000;
        const checkAt = optionCandleStart + duracaoOp - 1000;
        if (Date.now() < checkAt) return;

        const valorUsado = opAtual.valor || valorOperacaoAtual || automacao.config?.valor_por_operacao || 0;
        let resultado: 'vitoria' | 'derrota' = 'derrota';
        let diferenca = -valorUsado;

        const todasVelas = servicoVelas.obterTodasVelas();
        const velaAtual = todasVelas[todasVelas.length - 1];

        // ── Fast-Result: cor da vela de resultado vs direção da operação ──
        // Blitz M1 liquida no fechamento da vela M1 — a cor é o resultado oficial.
        // Para CavaloTroia (M2), compõe a vela de 2min a partir das 2 últimas M1.
        const usaFastResult = velaAtual && (
          automacao.config?.estrategia === 'Quadrantes5min' ||
          automacao.config?.estrategia === 'CavaloTroia' ||
          automacao.config?.estrategia === 'Quadrantes'
        );

        if (usaFastResult) {
          let aberturaRef = velaAtual.abertura;
          let fechamentoRef = velaAtual.fechamento;
          if (automacao.config?.estrategia === 'CavaloTroia' && todasVelas.length >= 2) {
            aberturaRef = todasVelas[todasVelas.length - 2].abertura;
          }
          const subiu = fechamentoRef > aberturaRef;
          const desceu = fechamentoRef < aberturaRef;
          const direcao = opAtual.direcao;
          if ((direcao === 'compra' && subiu) || (direcao === 'venda' && desceu)) {
            resultado = 'vitoria';
            diferenca = valorUsado * ((automacao.config?.payout || 88) / 100);
          }
          console.log(`[Fast-Result] ${automacao.config?.estrategia} dir=${direcao} open=${aberturaRef} close=${fechamentoRef} -> ${resultado.toUpperCase()}`);

          // Verificação assíncrona via histórico real da corretora: corrige caso a liquidação
          // difira da cor da vela (spread/tick exato de expiração). Aguarda 3s para o SDK processar.
          setTimeout(async () => {
            try {
              const confirmacao = await obterResultadoOperacao(opId);
              if (confirmacao && confirmacao.resultado !== resultado) {
                console.warn(`[Broker-Correction] Op ${opId}: vela=${resultado.toUpperCase()} → corretora=${confirmacao.resultado.toUpperCase()} | PnL: ${confirmacao.pnl.toFixed(2)}`);
              }
            } catch { /* não crítico */ }
            obterSaldoRapido().then(s => { saldoAnteriorRef.current = s; }).catch(() => {});
          }, 3500);
        } else {
          // Estratégias não-Blitz: comparação de saldo (FluxoVelas, LogicaDoPreco, ICE)
          if (tempoDecorrido < duracaoOp + 1200) return;
          try {
            const { abertas } = await verificarOperacoesAbertas();
            if (abertas > 0) return;
            await new Promise(r => setTimeout(r, 3000));
          } catch {
            await new Promise(r => setTimeout(r, 5000));
          }
          const saldoAtual = await obterSaldoRapido();
          if (saldoAnteriorRef.current === 0) {
            saldoAnteriorRef.current = saldoAtual;
            return;
          }
          const diffSaldo = saldoAtual - saldoAnteriorRef.current;
          if (Math.abs(diffSaldo) > valorUsado * 3) {
            resultado = 'derrota';
            diferenca = -valorUsado;
          } else {
            diferenca = diffSaldo;
            resultado = diferenca > 0.01 ? 'vitoria' : 'derrota';
          }
          saldoAnteriorRef.current = saldoAtual;
          console.log(`[Saldo-Result] Op ${opId}: ${resultado.toUpperCase()} | delta: ${diffSaldo.toFixed(2)}`);
        }

        if (automacao.config) {
          resultadoAnteriorRef.current = resultado;

          // Agendar gale Q5min IMEDIATAMENTE antes de qualquer await (timing crítico)
          let galeLevelAtResult = 0;
          if (automacao.config.estrategia === 'Quadrantes5min') {
            galeLevelAtResult = gale5minRef.current.nivel; // captura nível da op que acabou, antes de agendar próximo
            const direcaoEntrada = opAtual.direcao || ultimaAnalise5minRef.current?.analise.direcao_operacao || 'compra';
            const maxGale = automacao.config.max_martingale ?? 2;
            if (resultado === 'derrota' && automacao.config.gerenciamento === 'Martingale' && galeLevelAtResult < maxGale) {
              gale5minRef.current = {
                ativo: true,
                nivel: galeLevelAtResult + 1,
                direcao: direcaoEntrada,
                minutoAlvo: (new Date().getMinutes() + 1) % 60,
                disparado: false,
              };
              console.log(`[Q5min] GALE G${galeLevelAtResult + 1} agendado minuto ${gale5minRef.current.minutoAlvo}`);
            } else {
              gale5minRef.current = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
            }
          }
          // Perda protegida pelo Gale: G0 ou G1 perdeu e gale foi agendado → não conta no stop/stats
          const ehGaleProtegido = automacao.config.estrategia === 'Quadrantes5min'
            && resultado === 'derrota'
            && gale5minRef.current.ativo;
          // Liberar operação imediatamente para o tick checar o gale
          ultimaOpProcessadaIdRef.current = opId;
          setOperacoesAbertas((prev: OperacaoAberta[]) => prev.slice(1));

          const valorUsado = opAtual.valor || valorOperacaoAtual || automacao.config.valor_por_operacao;
          valorAnteriorRef.current = valorUsado;

          // Atualiza saldo P6 com o resultado desta operação
          saldoP6Ref.current = Math.max(0.01, saldoP6Ref.current + diferenca);

          // P6: avança o nível de proteção diretamente — não chama calcularValorOperacao
          // para evitar double-increment (o tick já usa o nível atual corretamente)
          if (automacao.config.gerenciamento === 'P6') {
            const nivelAtual = cicloMartingaleRef.current;
            if (resultado === 'vitoria') {
              setCicloMartingale(0);
              setSessoesConcluidasHoje(prev => {
                const novas = prev + 1;
                const alvo = automacao.config!.sessoes_alvo_dia ?? 1;
                if (novas >= alvo) {
                  setAutomacao(p => ({ ...p, status: 'finalizado', ultima_verificacao: `Meta diária P6 atingida: ${novas}/${alvo} sessões.` }));
                }
                return novas;
              });
            } else {
              // LOSS: avança para próxima proteção; após 6ª perda reinicia
              setCicloMartingale(nivelAtual >= 5 ? 0 : nivelAtual + 1);
            }
          } else {
            const { valor: proximoValor, novo_ciclo } = calcularValorOperacao({
              estrategia: automacao.config.gerenciamento,
              valor_base: automacao.config.valor_por_operacao,
              resultado_anterior: resultado,
              valor_anterior: valorUsado,
              multiplicador_martingale: automacao.config.multiplicador_martingale,
              multiplicador_soros: automacao.config.multiplicador_soros,
              payout: automacao.config.payout,
              ciclo_martingale: cicloMartingaleRef.current,
              max_martingale: automacao.config.max_martingale,
            });
            setCicloMartingale(novo_ciclo);
            setValorOperacaoAtual(proximoValor);
            valorAnteriorRef.current = proximoValor;
          }

          console.log(`[Vorna] Resultado: ${resultado} | Diferença: ${diferenca.toFixed(2)}`);

          // Notificação
          const ativoNotif = automacao.config.ativo;
          const direcaoNotif = opAtual.direcao || '';
          const tituloNotif = ehGaleProtegido
            ? `Gale G${galeLevelAtResult + 1} Ativado`
            : resultado === 'vitoria' ? `Operação Fechada - WIN` : `Operação Fechada - LOSS`;
          const corpoNotif = ehGaleProtegido
            ? `${ativoNotif} | ${direcaoNotif === 'compra' ? 'COMPRA' : 'VENDA'} | Gale G${galeLevelAtResult + 1} em andamento`
            : resultado === 'vitoria'
              ? `${ativoNotif} | ${direcaoNotif === 'compra' ? 'COMPRA' : 'VENDA'} | +R$ ${diferenca.toFixed(2)} | Payout ${automacao.config.payout}%`
              : `${ativoNotif} | ${direcaoNotif === 'compra' ? 'COMPRA' : 'VENDA'} | -R$ ${valorUsado.toFixed(2)}`;
          try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              const reg = await navigator.serviceWorker.ready;
              reg.showNotification(tituloNotif, {
                body: corpoNotif,
                icon: '/icons/icon-192.png',
                vibrate: [200, 100, 200],
              } as NotificationOptions & { vibrate: number[] });
            } else if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(tituloNotif, { body: corpoNotif, icon: '/icons/icon-192.png' });
            }
          } catch (notifErr) {
            console.warn('[Vorna] Erro ao exibir notificação:', notifErr);
          }

          // Push remoto (fire-and-forget — não bloqueia o ciclo do gale)
          if (supabaseUserId) {
            fetch('/api/send-push-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: supabaseUserId, titulo: tituloNotif, mensagem: corpoNotif }),
            }).catch(pushErr => console.error('[Vorna Push] ERRO de rede:', pushErr));
          }

          const vornaOpRaw = opAtual.id;
          const vornaOpId = vornaOpRaw ? await hashIdToUUID(vornaOpRaw) : undefined;
          const vornaEmail = sessao?.usuario?.email || '';

          // Atualizar resultado no histórico (Quadrantes)
          const ultimoQ = historicoQuadrantes[historicoQuadrantes.length - 1];
          if (ultimoQ?.analise) {
            const op = criarOperacaoQuadrante({
              config: automacao.config,
              analise: ultimoQ.analise,
              valor_operacao: valorUsado,
              resultado,
              lucro: diferenca,
              quadrante: ultimoQ.numero,
              vornaOpId,
              vornaEmail,
            });
            adicionarOperacaoSync(op);

            if (supabaseUserId) {
              upsertOperacoesBatch([{
                id: op.id,
                user_id: supabaseUserId,
                data: op.data,
                hora: op.hora,
                corretora: op.corretora,
                ativo: op.ativo,
                mercado: op.mercado,
                estrategia: op.estrategia,
                direcao: op.direcao,
                resultado: op.resultado,
                investido: op.investido,
                payout: op.payout,
                lucro: op.lucro,
                timeframe: op.timeframe,
                confianca: op.confianca,
              }])
                .then(() => window.dispatchEvent(new CustomEvent('apex-trader:ops-updated')))
                .catch(err => console.error('[Vorna] Erro ao persistir op Quadrantes:', err));
            }

            setHistoricoQuadrantes(prev => {
              const copia = [...prev];
              if (copia.length > 0) copia[copia.length - 1] = { ...copia[copia.length - 1], resultado };
              return copia;
            });
          }

          // Atualizar resultado no histórico (Quadrantes 5min)
          if (automacao.config?.estrategia === 'Quadrantes5min') {
            const meta5min = ultimaAnalise5minRef.current;
            if (meta5min) {
              const op5 = criarOperacaoQuadrante5min({
                config: automacao.config,
                analise: meta5min.analise,
                valor_operacao: valorUsado,
                resultado,
                lucro: diferenca,
                quadrante: meta5min.quadrante,
                gale_nivel: galeLevelAtResult,
                vornaOpId,
                vornaEmail,
              });
              adicionarOperacaoSync(op5);
              if (supabaseUserId) {
                upsertOperacoesBatch([{
                  id: op5.id, user_id: supabaseUserId, data: op5.data, hora: op5.hora,
                  corretora: op5.corretora, ativo: op5.ativo, mercado: op5.mercado,
                  estrategia: op5.estrategia, direcao: op5.direcao, resultado: op5.resultado,
                  investido: op5.investido, payout: op5.payout, lucro: op5.lucro,
                  timeframe: op5.timeframe, confianca: op5.confianca,
                }])
                  .then(() => window.dispatchEvent(new CustomEvent('apex-trader:ops-updated')))
                  .catch(err => console.error('[Q5min] Erro ao persistir op:', err));
              }
            }
            setHistoricoQuadrantes5min(prev => {
              const copia = [...prev];
              if (copia.length > 0) copia[copia.length - 1] = { ...copia[copia.length - 1], resultado, gale_nivel: galeLevelAtResult as 0 | 1 | 2 };
              return copia;
            });
            // Gale já agendado no início do callback (antes de qualquer await)
          }

          // Atualizar resultado no histórico (LogicaDoPreco)
          if (automacao.config?.estrategia === 'LogicaDoPreco') {
            const opLP = criarOperacaoFluxoVelas({
              config: automacao.config,
              direcao: operacoesAbertas[0]?.direcao || 'compra',
              valor_operacao: valorUsado,
              resultado,
              lucro: diferenca,
              vornaOpId,
              vornaEmail,
            });
            opLP.estrategia = 'Lógica do Preço';
            adicionarOperacaoSync(opLP);

            if (supabaseUserId) {
              upsertOperacoesBatch([{
                id: opLP.id,
                user_id: supabaseUserId,
                data: opLP.data,
                hora: opLP.hora,
                corretora: opLP.corretora,
                ativo: opLP.ativo,
                mercado: opLP.mercado,
                estrategia: opLP.estrategia,
                direcao: opLP.direcao,
                resultado: opLP.resultado,
                investido: opLP.investido,
                payout: opLP.payout,
                lucro: opLP.lucro,
                timeframe: opLP.timeframe,
                confianca: opLP.confianca,
              }])
                .then(() => window.dispatchEvent(new CustomEvent('apex-trader:ops-updated')))
                .catch(err => console.error('[Vorna] Erro ao persistir op LogicaDoPreco:', err));
            }

            setHistoricoLP(prev => prev.map((item, idx) => {
              if (idx === 0 && !item.resultado) return { ...item, resultado, lucro: diferenca };
              return item;
            }));

            operacaoLPEmAndamentoRef.current = false;
          }

          if (automacao.config?.estrategia === 'ImpulsoCorrecaoEngolfo') {
            operacaoICEEmAndamentoRef.current = false;
          }

          // Atualizar resultado no histórico (FluxoVelas)
          if (automacao.config?.estrategia === 'FluxoVelas') {
            const opFluxo = criarOperacaoFluxoVelas({
              config: automacao.config,
              direcao: operacoesAbertas[0]?.direcao || 'compra',
              valor_operacao: valorUsado,
              resultado,
              lucro: diferenca,
              vornaOpId,
              vornaEmail,
            });
            adicionarOperacaoSync(opFluxo);

            if (supabaseUserId) {
              upsertOperacoesBatch([{
                id: opFluxo.id,
                user_id: supabaseUserId,
                data: opFluxo.data,
                hora: opFluxo.hora,
                corretora: opFluxo.corretora,
                ativo: opFluxo.ativo,
                mercado: opFluxo.mercado,
                estrategia: opFluxo.estrategia,
                direcao: opFluxo.direcao,
                resultado: opFluxo.resultado,
                investido: opFluxo.investido,
                payout: opFluxo.payout,
                lucro: opFluxo.lucro,
                timeframe: opFluxo.timeframe,
                confianca: opFluxo.confianca,
              }])
                .then(() => window.dispatchEvent(new CustomEvent('apex-trader:ops-updated')))
                .catch(err => console.error('[Vorna] Erro ao persistir op FluxoVelas:', err));
            }

            setEstadoFluxoVelas(prev => {
              const copia = { ...prev };
              const hist = [...copia.historico_resultados];
              if (hist.length > 0) hist[0] = { ...hist[0], resultado, lucro: diferenca };
              return { ...copia, historico_resultados: hist };
            });
          }

          // Calcular meta/stop com valores do closure para disparar notificação
          const novoLucroPreview = diferenca > 0
            ? automacao.lucro_acumulado + diferenca
            : automacao.lucro_acumulado;
          const novaPerdaPreview = (!ehGaleProtegido && diferenca < 0)
            ? automacao.perda_acumulada + Math.abs(diferenca)
            : automacao.perda_acumulada;
          const atingiuMetaNotif = automacao.config?.meta != null && novoLucroPreview >= automacao.config.meta;
          const atingiuStopNotif = automacao.config?.gerenciamento !== 'P6' && !ehGaleProtegido && novaPerdaPreview >= (automacao.config?.valor_stop || Infinity);

          if (atingiuMetaNotif || atingiuStopNotif) {
            const tituloFim = atingiuMetaNotif ? 'Meta Atingida!' : 'Stop Atingido';
            const corpoFim = atingiuMetaNotif
              ? `Lucro acumulado: +R$ ${novoLucroPreview.toFixed(2)} — Automação encerrada.`
              : `Perda acumulada: -R$ ${novaPerdaPreview.toFixed(2)} — Automação encerrada.`;
            try {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification(tituloFim, { body: corpoFim, icon: '/icons/icon-192.png', vibrate: [300, 100, 300, 100, 300] } as NotificationOptions & { vibrate: number[] });
              } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(tituloFim, { body: corpoFim, icon: '/icons/icon-192.png' });
              }
            } catch {}
            if (supabaseUserId) {
              fetch('/api/send-push-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: supabaseUserId, titulo: tituloFim, mensagem: corpoFim }),
              }).catch(() => {});
            }
          }

          setAutomacao(prev => {
            const novoExecutadas = prev.operacoes_executadas + 1;
            const novoLucro = diferenca > 0 ? prev.lucro_acumulado + diferenca : prev.lucro_acumulado;
            const novaPerda = (!ehGaleProtegido && diferenca < 0) ? prev.perda_acumulada + Math.abs(diferenca) : prev.perda_acumulada;
            const atingiuStop = prev.config?.gerenciamento !== 'P6' && !ehGaleProtegido && novaPerda >= (prev.config?.valor_stop || Infinity);
            const atingiuMeta = prev.config?.meta != null && novoLucro >= prev.config.meta;
            const ehQ5min = prev.config?.estrategia === 'Quadrantes5min';
            const atingiuLimite = prev.config?.gerenciamento !== 'P6' && !ehQ5min && !prev.config?.modo_continuo && novoExecutadas >= prev.operacoes_total;

            return {
              ...prev,
              operacoes_executadas: novoExecutadas,
              lucro_acumulado: novoLucro,
              perda_acumulada: novaPerda,
              ultima_verificacao: new Date().toISOString(),
              status: (atingiuStop || atingiuMeta || atingiuLimite) ? 'finalizado' : prev.status,
            };
          });

        }

        setSessao(obterSessaoVorna());
      } catch (err) {
        console.error('[Vorna] Erro no polling:', err);
      } finally {
        processandoResultadoRef.current = false;
      }
    };

    pollingRef.current = window.setInterval(verificar, 250);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [automacao.status, automacao.config, automacao.operacoes_executadas, automacao.operacoes_total, historicoQuadrantes, valorOperacaoAtual, supabaseUserId]);

  const conectar = useCallback(async (identifier: string, senha: string) => {
    setEstado('conectando');
    setErro(null);
    setRequer2fa(false);

    try {
      await loginVorna(identifier, senha);

      // ── Atualiza o email da VornaBroker no perfil (sem restrição de conta única) ──
      const vornaEmailLogin = identifier.trim().toLowerCase();
      if (supabaseUserId) {
        try {
          await updateProfile(supabaseUserId, { puma_email: vornaEmailLogin });
        } catch (profileErr) {
          console.warn('[Vorna] Erro ao atualizar email da conta:', profileErr);
        }
        // Salva credenciais para VPS operar de forma independente do browser
        try {
          await updateProfile(supabaseUserId, {
            vorna_identifier: vornaEmailLogin,
            vorna_senha: senha,
          });
        } catch (e) {
          console.warn('[Vorna] Erro ao salvar credenciais VPS:', e);
        }
      }

      setSessao(obterSessaoVorna());
      setEstado('conectado');

      try {
        await obterDadosUsuario();
        const ativos = await obterAtivosDisponiveis();
        setAtivosSDK(ativos);
        setSessao(obterSessaoVorna());
        // Upgrade: garante que as velas usam o SDK (não NXOS)
        const savedAtivo = localStorage.getItem('trademaster_ativo_global') || 'EUR/USD';
        const savedTf = localStorage.getItem('trademaster_timeframe_global') || '1';
        servicoVelas.conectar(savedAtivo, savedTf);
      } catch {
        // Não-fatal
      }
    } catch (err) {
      setEstado('erro');
      setErro(err instanceof VornaErro ? err.mensagem : 'Erro desconhecido ao conectar.');
    }
  }, [supabaseUserId]);

  const desconectar = useCallback(() => {
    servicoVelas.desconectar();
    desconectarVorna();
    setSessao(null);
    setEstado('desconectado');
    setErro(null);
    setRequer2fa(false);
    setAutomacao(ESTADO_AUTOMACAO_INICIAL);
    setOperacoesAbertas([]);
    setQuadranteAtual(null);
    setHistoricoQuadrantes([]);
    setCicloMartingale(0);
    setValorOperacaoAtual(0);
  }, []);

  const atualizandoRef = useRef(false);

  const atualizarDados = useCallback(async () => {
    if (!sessao?.conectado) return;
    if (atualizandoRef.current) return;
    atualizandoRef.current = true;

    try {
      await obterDadosUsuario();
      const ativos = await obterAtivosDisponiveis();
      setAtivosSDK(ativos);
      setSessao(obterSessaoVorna());
    } catch (err) {
      if (err instanceof VornaErro && (err.codigo === 401 || err.codigo === 403)) {
        desconectar();
        setErro('Sessão expirada ou desconectada. Por favor, conecte novamente.');
      }
    } finally {
      atualizandoRef.current = false;
    }
  }, [sessao?.conectado, desconectar]);

  // Polling para checar validade da sessão (a cada 120s)
  useEffect(() => {
    if (estado !== 'conectado' || !sessao?.conectado) return;

    let isSubscribed = true;
    const intervalId = window.setInterval(async () => {
      if (!isSubscribed) return;

      const valida = await verificarSessaoValida();
      if (!valida) {
        console.warn('[Vorna] Sessão expirada, tentando reconexão...');
        const ok = await reconectarVorna();
        if (ok) {
          setSessao(obterSessaoVorna());
          try {
            const ativos = await obterAtivosDisponiveis();
            setAtivosSDK(ativos);
          } catch {}
          const savedAtivo = localStorage.getItem('trademaster_ativo_global') || 'EUR/USD';
          const savedTf = localStorage.getItem('trademaster_timeframe_global') || '1';
          servicoVelas.conectar(savedAtivo, savedTf);
        } else {
          desconectar();
          setErro('Sessão expirou e não foi possível reconectar. Conecte novamente.');
        }
        return;
      }

      await atualizarDados();
    }, 120000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [estado, sessao?.conectado, atualizarDados, desconectar]);

  // Refresh proativo durante automação ativa (a cada 15min)
  useEffect(() => {
    if (automacao.status !== 'em_operacao') return;

    const intervalId = window.setInterval(async () => {
      const valida = await verificarSessaoValida();
      if (!valida) {
        const ok = await reconectarVorna();
        if (ok) {
          setSessao(obterSessaoVorna());
          try {
            const ativos = await obterAtivosDisponiveis();
            setAtivosSDK(ativos);
          } catch {}
          const savedAtivo = localStorage.getItem('trademaster_ativo_global') || 'EUR/USD';
          const savedTf = localStorage.getItem('trademaster_timeframe_global') || '1';
          servicoVelas.conectar(savedAtivo, savedTf);
        } else {
          setAutomacao(prev => ({ ...prev, status: 'pausado' }));
          setErro('Sessão expirou durante automação. Reconecte para retomar.');
        }
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [automacao.status]);

  // Verifica aprovação manual no Supabase para liberar automação sem afiliado
  useEffect(() => {
    if (!supabaseUserId) return;
    getProfile(supabaseUserId).then(profile => {
      setManualAprovado(profile?.vorna_aprovado_manual === true);
    }).catch(() => {});
  }, [supabaseUserId]);

  // Sync inicial: ao abrir o app em qualquer dispositivo, reflete o estado real da VPS
  useEffect(() => {
    if (!modoVPS || !supabaseUserId) return;
    (async () => {
      try {
        const data = await vpsRequest(`/bot/status?userId=${supabaseUserId}`, 'GET');
        if (data?.automacao) {
          setAutomacao(prev => ({ ...prev, ...data.automacao }));
        }
      } catch {}
    })();
  }, [modoVPS, supabaseUserId]);

  // Polling VPS: mantém UI sincronizada com a VPS a cada 10s (sem depender do status local)
  useEffect(() => {
    if (!modoVPS || !supabaseUserId) return;

    const id = window.setInterval(async () => {
      try {
        const data = await vpsRequest(`/bot/status?userId=${supabaseUserId}`, 'GET');
        if (data?.automacao) {
          setAutomacao(prev => ({ ...prev, ...data.automacao }));
        }
        vpsOnlineRef.current = true;
        setVpsStatus('online');
      } catch {
        vpsOnlineRef.current = false;
        setVpsStatus('offline');
      }
    }, 10000);

    return () => clearInterval(id);
  }, [modoVPS, supabaseUserId]);

  // Controles de automação
  const iniciarAutomacao = useCallback((config: ConfigAutomacao) => {
    if (sessao?.afiliadoAprovado === false && !manualAprovado) {
      setErro(`Automação disponível apenas para usuários cadastrados pelo link de afiliado ${BRANDING.appName}.`);
      return;
    }

    const executarLocal = () => {
      salvarConfigAutomacao(config);
      const saldoAtual = sessao?.perfil?.saldo || 0;
      saldoAnteriorRef.current = saldoAtual;
      saldoP6Ref.current = saldoAtual;
      resultadoAnteriorRef.current = null;
      valorAnteriorRef.current = config.valor_por_operacao;
      ultimoQuadranteExecutado.current = '';
      ultimoExecutado5min.current = '';
      gale5minRef.current = { ativo: false, nivel: 0, direcao: null, minutoAlvo: -1, disparado: false };
      entryMinute5minRef.current = -1;
      ultimoCandleFluxoRef.current = 0;
      setCicloMartingale(0);
      const valorInicialP6 = config.gerenciamento === 'P6'
        ? calcularP6Entradas(saldoAtual || 1, config.payout || 88)[0]
        : config.valor_por_operacao;
      setValorOperacaoAtual(valorInicialP6);
      setHistoricoQuadrantes([]);
      setEstadoFluxoVelas({ analise: null, historico_resultados: [] });
      setAnaliseLP(null);
      setHistoricoLP([]);
      ultimoSinalLPRef.current = '';
      operacaoLPEmAndamentoRef.current = false;
      ultimaExecucaoLPRef.current = 0;
      const intervalMap: Record<string, string> = { M1: '1', M5: '5', M15: '15', M30: '30', M60: '60' };
      servicoVelas.conectar(config.ativo, intervalMap[config.timeframe] || '1');
      setAutomacao({
        status: 'em_operacao',
        config,
        operacoes_executadas: 0,
        operacoes_total: config.gerenciamento === 'P6' || config.modo_continuo ? 999999 : config.quantidade_operacoes,
        lucro_acumulado: 0,
        perda_acumulada: 0,
        saldo_referencia: saldoAtual,
        ultima_verificacao: new Date().toISOString(),
        inicio: new Date().toISOString(),
      });
      setOperacoesAbertas([]);
    };

    // ── Modo VPS: delega ao servidor ─────────────────────────────────────────
    if (modoVPS && supabaseUserId && sessao?.ssid) {
      vpsRequest('/bot/start', 'POST', { userId: supabaseUserId, ssid: sessao.ssid, config })
        .then(() => {
          vpsOnlineRef.current = true;
          setVpsStatus('online');
          setAutomacao({
            status: 'em_operacao',
            config,
            operacoes_executadas: 0,
            operacoes_total: config.gerenciamento === 'P6' || config.modo_continuo ? 999999 : config.quantidade_operacoes,
            lucro_acumulado: 0,
            perda_acumulada: 0,
            saldo_referencia: sessao?.perfil?.saldo || 0,
            ultima_verificacao: new Date().toISOString(),
            inicio: new Date().toISOString(),
          });
        })
        .catch(async (err: Error) => {
          if (err.message?.includes('já está em operação')) {
            vpsOnlineRef.current = true;
            setVpsStatus('online');
            try {
              const data = await vpsRequest(`/bot/status?userId=${supabaseUserId}`, 'GET');
              if (data?.automacao) {
                setAutomacao((prev: EstadoAutomacao) => ({ ...prev, ...data.automacao }));
              }
            } catch {}
            return;
          }
          // VPS falhou — executa localmente como fallback
          console.warn('[VPS] Falha ao iniciar bot VPS, executando localmente:', err.message);
          vpsOnlineRef.current = false;
          setVpsStatus('offline');
          setErro('VPS indisponível — executando localmente');
          executarLocal();
        });
      return;
    }

    executarLocal();
  }, [sessao, modoVPS, supabaseUserId]);

  const pausarAutomacao = useCallback(() => {
    if (modoVPS && supabaseUserId) {
      vpsRequest('/bot/pause', 'POST', { userId: supabaseUserId }).catch(() => {});
    }
    setAutomacao(prev => ({ ...prev, status: 'pausado' }));
  }, [modoVPS, supabaseUserId]);

  const retomarAutomacao = useCallback(() => {
    if (modoVPS && supabaseUserId) {
      vpsRequest('/bot/resume', 'POST', { userId: supabaseUserId }).catch(() => {});
    }
    setAutomacao(prev => ({ ...prev, status: 'em_operacao' }));
  }, [modoVPS, supabaseUserId]);

  const finalizarAutomacao = useCallback(() => {
    if (modoVPS && supabaseUserId) {
      vpsRequest('/bot/stop', 'POST', { userId: supabaseUserId }).catch(() => {});
    }
    servicoVelas.desconectar();
    setAutomacao(prev => ({ ...prev, status: 'finalizado' }));
    limparConfigAutomacao();
    limparEstadoAutomacao();
    setOperacoesAbertas([]);
  }, [modoVPS, supabaseUserId]);

  const resetarAutomacao = useCallback(() => {
    servicoVelas.desconectar();
    setAutomacao(ESTADO_AUTOMACAO_INICIAL);
    limparConfigAutomacao();
    limparEstadoAutomacao();
    setOperacoesAbertas([]);
    setHistoricoQuadrantes([]);
    setEstadoFluxoVelas({ analise: null, historico_resultados: [] });
    setAnaliseLP(null);
    setHistoricoLP([]);
    ultimoSinalLPRef.current = '';
    operacaoLPEmAndamentoRef.current = false;
    ultimaExecucaoLPRef.current = 0;
    setAnaliseICE(null);
    ultimoSinalICERef.current = '';
    operacaoICEEmAndamentoRef.current = false;
    setCicloMartingale(0);
    setValorOperacaoAtual(0);
  }, []);

  const sessaoEfetiva = sessao && sessao.afiliadoAprovado === false && manualAprovado
    ? { ...sessao, afiliadoAprovado: true }
    : sessao;

  return {
    sessao: sessaoEfetiva,
    estado,
    erro,
    requer2fa,
    conectar,
    desconectar,
    atualizarDados,
    automacao,
    operacoesAbertas,
    iniciarAutomacao,
    pausarAutomacao,
    retomarAutomacao,
    finalizarAutomacao,
    resetarAutomacao,
    estadoWS,
    quadranteAtual,
    countdownTexto,
    segundosRestantes,
    cicloMartingale,
    valorOperacaoAtual,
    sessoesConcluidasHoje,
    historicoQuadrantes,
    quadrante5minAtual,
    historicoQuadrantes5min,
    galeNivel5min: gale5minRef.current.nivel,
    estadoFluxoVelas,
    analiseLogicaPreco: analiseLP,
    historicoLP,
    analiseICE,
    ativoSelecionado,
    setAtivoSelecionado,
    timeframeSelecionado,
    setTimeframeSelecionado,
    ativosSDK,
    modoVPS,
    vpsStatus,
  };
}
