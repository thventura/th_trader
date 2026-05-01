export interface Profile {
  id: string;
  email: string;
  name: string;
  banca_inicial: number;
  banca_atual: number;
  stop_level: number;
  risco_por_operacao: number;
  objetivo_mensal: number;
  aprovado_por_admin: boolean;
  role: 'admin' | 'user';
  tier: 'gratuito' | 'premium';
  broker_utilizado: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  vps_ativo?: boolean;
  copy_trade_ativo?: boolean;
  trial_expira_em?: string | null;
  acesso_planilha?: boolean;
  modulos_liberados?: string[] | null;
  vorna_identifier?: string;
  vorna_senha?: string;
}

export interface Operacao {
  id: string;
  user_id: string;
  imagem_url?: string;
  tipo_mercado: 'forex' | 'criptomoedas';
  corretora: string;
  par_ativos: string;
  estrategia: string;
  direcao: 'compra' | 'venda';
  resultado_operacao: 'vitoria' | 'derrota';
  valor_investido: number;
  payout: number;
  valor_retorno: number;
  resultado: number;
  nivel_confianca: number;
  horario_operacao: string;
  observacoes?: string;
}

export interface SessaoMindset {
  id: string;
  user_id: string;
  data: string;
  horas_sono: number;
  nivel_estresse: number;
  nivel_energia: number;
  estado_emocional: string;
  pronto_para_operar: boolean;
  recomendacao_ia: string;
  reflexao_pessoal?: string;
}

export interface Aula {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string;
  video_url: string;
  thumbnail_url: string;
  nivel: 'iniciante' | 'intermediario' | 'avancado';
  ordem: number;
  concluida?: boolean;
  categoria?: string;
  duracao?: string;
  tipo?: 'grafico' | 'ferramenta' | 'livro' | 'video';
}

export interface Modulo {
  id: string;
  titulo: string;
  descricao: string;
  capa_url: string;
  ordem: number;
  progresso: number;
  em_breve?: boolean;
}

export interface Comentario {
  id: string;
  aula_id: string;
  aula_titulo: string;
  modulo_titulo: string;
  usuario: string;
  foto_url?: string;
  texto: string;
  data: string;
  status: 'pendente' | 'aprovado';
  resposta_admin?: string;
}

export interface Questao {
  id: string;
  texto: string;
  imagem_url?: string;
  opcoes: [string, string, string, string];
  resposta_correta: number;
  pontos: number;
}

export interface ConfigProva {
  questoes: Questao[];
  nota_minima: number;
  whatsapp_certificado: string;
  ativa: boolean;
}

// ── VornaBroker API ──

export interface VornaCarteira {
  tipo: 'REAL' | 'USDT' | 'DEMO';
  saldo: number;
  bonus: number;
  rollover: number;
  rollover_total: number;
}

export interface VornaUsuario {
  nome: string;
  sobrenome: string;
  apelido: string | null;
  email: string;
  email_confirmado: boolean;
  verificado: boolean;
  idioma: string;
  fuso_horario: string;
  som: boolean;
  autenticacao_2fa: boolean;
  vip: boolean;
  carteiras: VornaCarteira[];
}

export interface VornaPerfilCompleto {
  nome: string;
  email: string;
  foto: string;
  sexo: string;
  verificado: boolean;
  email_verificado: boolean;
  rollover: number;
  rollover_inicial: number;
  saldo: number;
  saldo_demo: number;
  bonus: number;
}

export interface VornaSessao {
  conectado: boolean;
  usuario: VornaUsuario | null;
  perfil: VornaPerfilCompleto | null;
  ssid?: string;
  ultima_atualizacao: string;
  expira_em?: string;
  afiliadoAprovado?: boolean;
}

export type VornaEstadoConexao = 'desconectado' | 'conectando' | 'conectado' | 'erro';

// ── Operação compartilhada (usado por Operacoes.tsx e automação VornaBroker) ──

export interface Op {
  id: string;
  data: string;
  hora: string;
  corretora: string;
  ativo: string;
  mercado: 'forex' | 'cripto';
  estrategia: string;
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  investido: number;
  payout: number;
  lucro: number;
  timeframe: string;
  confianca: number;
  explicacao?: string;
}

// ── Automação VornaBroker ──

// FORK: ao adicionar/remover estratégias em src/config/branding.ts, atualize este tipo também.
export type EstrategiaAnalise = 'Quadrantes' | 'Quadrantes5min' | 'FluxoVelas' | 'LogicaDoPreco' | 'ImpulsoCorrecaoEngolfo' | 'CavaloTroia';
export type Gerenciamento = 'Fixo' | 'Martingale' | 'Soros' | 'P6';
export type StatusAutomacao = 'aguardando' | 'em_operacao' | 'pausado' | 'finalizado';
export type ModoFluxo = '2-3' | '3+' | 'automatico';

export interface ConfigAutomacao {
  estrategia: EstrategiaAnalise;
  gerenciamento: Gerenciamento;
  quantidade_operacoes: number;
  valor_stop: number;
  divisao_stop: number;
  valor_por_operacao: number;
  ativo: string;
  mercado: 'forex' | 'cripto';
  timeframe: 'M1' | 'M2' | 'M5' | 'M15' | 'M30' | 'M60';
  payout: number;
  multiplicador_martingale: number;
  multiplicador_soros: number;
  max_martingale: number;
  // Campos específicos de FluxoVelas (opcionais para não quebrar Quadrantes)
  modo_fluxo?: ModoFluxo;
  janela_horas?: 1 | 2 | 3 | 4;
  meta?: number;            // meta de lucro em R$
  modo_continuo?: boolean;  // operar sem limite de operações
  // Campos específicos de LogicaDoPreco
  conceitos_ativos_lp?: ConceitoLP[];
  // Filtros extras Quadrantes
  usar_filtro_volume?: boolean;
  usar_filtro_dupla_exposicao?: boolean;
  // Tipo de instrumento da corretora
  instrumento_tipo?: 'blitz' | 'binary' | 'digital';
  // Duração da expiração em segundos (60=M1, 120=M2, 300=M5, 900=M15, 1800=M30)
  duracao_expiracao?: number;
  // P6: número de sessões alvo por dia (cada TAKE = 1 sessão)
  sessoes_alvo_dia?: number;
}

export const AUTOMACAO_PLATAFORMA_KEY = 'trademaster_config_automacao_plataforma';

export interface ConfigAutomacaoPlataforma {
  estrategias_ativas: EstrategiaAnalise[];
  gerenciamentos_ativos: Gerenciamento[];
  nomes_estrategias?: Partial<Record<EstrategiaAnalise, string>>;
  descricoes_estrategias?: Partial<Record<EstrategiaAnalise, string>>;
}

export const CONFIG_AUTOMACAO_PLATAFORMA_DEFAULT: ConfigAutomacaoPlataforma = {
  estrategias_ativas: ['Quadrantes', 'Quadrantes5min', 'FluxoVelas', 'LogicaDoPreco', 'ImpulsoCorrecaoEngolfo', 'CavaloTroia'],
  gerenciamentos_ativos: ['Fixo', 'Martingale', 'Soros', 'P6'],
};

export interface EstadoAutomacao {
  status: StatusAutomacao;
  config: ConfigAutomacao | null;
  operacoes_executadas: number;
  operacoes_total: number;
  lucro_acumulado: number;
  perda_acumulada: number;
  saldo_referencia: number;
  ultima_verificacao: string;
  ultimo_motivo?: string;
  inicio: string | null;
}

export interface OperacaoAberta {
  id: string;
  ativo: string;
  direcao: 'compra' | 'venda';
  valor: number;
  hora_envio: string;
  status: 'enviada' | 'aguardando_resultado';
  preco_entrada?: number;
}

// ── Velas e Quadrantes ──

export interface Vela {
  timestamp: number;
  abertura: number;
  maxima: number;
  minima: number;
  fechamento: number;
  volume: number;
  cor: 'alta' | 'baixa'; // doji é detectado dinamicamente pelo motor
}

// ── Fluxo de Velas ──

export interface FluxoCatalogado {
  tipo: '2-3' | '3+';
  direcao: 'alta' | 'baixa';
  timestamp_inicio: number;
  timestamp_fim: number;
  num_velas_retomada: number;
}

export interface CatalogacaoFluxos {
  fluxos_23_alta: number;
  fluxos_23_baixa: number;
  fluxos_3mais_alta: number;
  fluxos_3mais_baixa: number;
  total_alta: number;
  total_baixa: number;
  total_doji: number;
  tipo_dominante: '2-3' | '3+' | null;
  direcao_dominante: 'alta' | 'baixa' | null;
}

export interface AnaliseFluxoVelas {
  tendencia: 'alta' | 'baixa' | 'lateral';
  ema_rapida: number;       // último valor EMA 9
  ema_lenta: number;        // último valor EMA 21
  em_correcao: boolean;
  num_velas_fluxo: number;  // quantas velas consecutivas formaram o fluxo antes da correção
  velas_retomada: number;   // quantas velas de retomada FECHADAS após a correção
  direcao_operacao: 'compra' | 'venda' | null;
  operar: boolean;
  modo_ativo: '2-3' | '3+'; // modo derivado automaticamente do num_velas_fluxo
  confianca: number;
  sinal_id: string | null;  // ID único do padrão (timestamp da correção) para evitar re-execução
  catalogacao: CatalogacaoFluxos;
}

export interface ResultadoFluxoVelas {
  id: string;
  timestamp: string;
  ativo: string;
  timeframe: string;
  modo: '2-3' | '3+';
  direcao: 'compra' | 'venda';
  resultado: 'vitoria' | 'derrota';
  lucro: number;
  janela_horas: number;
}

export interface EstadoFluxoVelas {
  analise: AnaliseFluxoVelas | null;
  historico_resultados: ResultadoFluxoVelas[];
}

export interface Quadrante {
  numero: number;
  inicio_minuto: number;
  fim_minuto: number;
  velas: Vela[];
  analise: AnaliseQuadrante | null;
  resultado?: 'vitoria' | 'derrota' | null;
}

export interface AnaliseQuadrante {
  total_alta: number;
  total_baixa: number;
  cor_predominante: 'alta' | 'baixa' | 'empate';
  ultima_vela_cor: 'alta' | 'baixa';
  direcao_operacao: 'compra' | 'venda';
  confianca: number;
  operar: boolean;
  // Volume e Filtros extras
  volume_medio?: number;
  volume_sma_20?: number;
  volume_confirmacao?: boolean;
  dupla_exposicao_detectada?: boolean;
  explicacao?: string;
}

export interface AnaliseQuadrante5min {
  ultima_vela_cor: 'alta' | 'baixa';
  direcao_operacao: 'compra' | 'venda';
  total_alta: number;
  total_baixa: number;
  confianca: number;
  operar: boolean;
  explicacao?: string;
}

export interface Quadrante5min {
  numero: number;        // 1-12
  inicio_minuto: number; // 0, 5, 10, ..., 55
  fim_minuto: number;    // 4, 9, 14, ..., 59
  velas: Vela[];
  analise: AnaliseQuadrante5min | null;
  resultado?: 'vitoria' | 'derrota' | null;
  gale_nivel?: 0 | 1 | 2;
}

export interface EstadoWebSocket {
  conectado: boolean;
  symbol: string;
  ultimaVela: Vela | null;
  erro: string | null;
}

// ── Lógica do Preço Avançado ──

export type CicloMercado =
  | 'tendencial_alta'
  | 'tendencial_baixa'
  | 'correcao_tendencia'
  | 'correcao_lateral'
  | 'consolidado'
  | 'acumulado';

export interface VelaClassificadaLP {
  vela: Vela;
  tipo: 'comando' | 'forca' | 'forca_continuacao' | 'doji' | 'normal' | 'final_taxa';
  corpo: number;
  pavioSuperior: number;
  pavioInferior: number;
  range: number;
  cor: 'alta' | 'baixa';
  percentual50: number;
}

export type ConceitoLP =
  | 'comando'
  | 'desinstalacao'
  | 'exaustao'
  | 'lote'
  | 'vela_forca'
  | 'vela_forca_continuacao'
  | 'dupla_posicao'
  | 'tripla_posicao'
  | 'nova_alta'
  | 'nova_baixa'
  | 'nova_posicao'
  | 'pressao'
  | 'pressao_tendencial'
  | 'primeiro_registro'
  | 'projecao'
  | 'limite'
  | 'transferencia_dominio';

export interface SinalLP {
  conceito: ConceitoLP;
  direcao: 'compra' | 'venda';
  confianca: number;
  descricao: string;
  velaReferencia: number;
  timestamp: number;
}

export interface MarcacaoLP {
  preco: number;
  tipo: 'comando' | 'defesa' | 'lote' | 'vela_forca' | 'nova_posicao' | 'limite' | 'projecao';
  ativa: boolean;
  criadaEm: number;
  rompimentos: number;
}

export interface AnaliseLogicaPreco {
  sinais: SinalLP[];
  marcacoes: MarcacaoLP[];
  conceitosAtivos: ConceitoLP[];
  direcao_operacao: 'compra' | 'venda' | null;
  operar: boolean;
  confianca: number;
  sinal_id: string | null;
  dominioAtual: 'compra' | 'venda' | 'indefinido';
  cicloAtual: CicloMercado;
  resumo: string;
}

// ── Impulso-Correção-Engolfo ──

export interface AnaliseImpulsoCorrecaoEngolfo {
  impulsoDetectado: boolean;
  direcaoImpulso: 'alta' | 'baixa' | null;
  velasImpulso: number;       // 3-10 velas predominantes
  fundoPivo: number;          // nível de preço do pivô (mínima/máxima do impulso)

  correcaoDetectada: boolean;
  velasCorrecao: number;      // 2-5 velas contra o impulso

  engolfoDetectado: boolean;
  direcao_operacao: 'compra' | 'venda' | null;
  temEspacoAtePivo: boolean;  // distância ao pivô > threshold mínimo
  operar: boolean;
  confianca: number;
  sinal_id: string | null;
  resumo: string;
}

// ── Operação LP com snapshot da análise (para painel de explicação) ──

export interface OperacaoLPDetalhada {
  id: string;
  timestamp: string;
  ativo: string;
  direcao: 'compra' | 'venda';
  valor: number;
  resultado?: 'vitoria' | 'derrota';
  lucro?: number;
  // Snapshot da análise no momento da execução
  resumo: string;
  confianca: number;
  ciclo: CicloMercado;
  dominio: 'compra' | 'venda' | 'indefinido';
  conceitos: string[];
  sinais: { conceito: string; descricao: string; confianca: number }[];
}

export interface ManutencaoConfig {
  id: string;
  ativo: boolean;
  secoes: string[];
  mensagem: string;
  termino_em: string | null;
  atualizado_em: string;
}

// ── BingX API ──

export interface BingXCredenciais {
  apiKey: string;
  secretKey: string;
}

export interface BingXSaldo {
  ativo: string;
  saldoTotal: number;
  saldoDisponivel: number;
  margem: number;
  pnlNaoRealizado: number;
}

export interface BingXPosicao {
  symbol: string;
  positionSide: 'LONG' | 'SHORT';
  quantidade: number;
  precoEntrada: number;
  precoAtual: number;
  pnl: number;
  alavancagem: number;
  margem: number;
}

export interface BingXOrdem {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
  quantidade: number;
  preco: number;
  status: 'NEW' | 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'FAILED';
  criadoEm: number;
  pnl?: number;
}

export interface BingXAbrirOrdemParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}

export type EstrategiaBingX = 'manual' | 'tendencia' | 'scalping';
export type StatusSessaoBingX = 'aguardando' | 'ativo' | 'pausado' | 'finalizado';

export interface ConfigAutomacaoBingX {
  symbol: string;
  alavancagem: number;
  percentualBanca: number;
  stopLoss: number;
  takeProfit: number;
  estrategia: EstrategiaBingX;
  direcao: 'LONG' | 'SHORT' | 'ambos';
  metaLucro: number;
  limitePerdas: number;
}

export interface EstadoSessaoBingX {
  status: StatusSessaoBingX;
  ordens: BingXOrdem[];
  pnlSessao: number;
  iniciadoEm: string | null;
}
