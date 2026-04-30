import type {
    Vela,
    FluxoCatalogado,
    CatalogacaoFluxos,
    AnaliseFluxoVelas,
} from '../types';

// ── Constantes ──

const EMA_RAPIDA_PERIODO = 9;
const EMA_LENTA_PERIODO = 21;
const LIMIAR_DOJI = 0.1; // corpo < 10% do range = doji
const LIMIAR_CORRECAO_MINIMA = 0.3; // corpo da correção >= 30% do corpo médio

// ── Classificação de Vela ──

export function classificarVela(vela: Vela): 'alta' | 'baixa' | 'doji' {
    const corpo = Math.abs(vela.fechamento - vela.abertura);
    const range = vela.maxima - vela.minima;
    if (range > 0 && corpo / range < LIMIAR_DOJI) return 'doji';
    return vela.fechamento >= vela.abertura ? 'alta' : 'baixa';
}

// ── Cálculo de EMA ──

export function calcularEMA(valores: number[], periodo: number): number[] {
    if (valores.length < periodo) return [];

    const multiplicador = 2 / (periodo + 1);
    const emas: number[] = [];

    // SMA inicial
    const primeiroSMA =
        valores.slice(0, periodo).reduce((s, v) => s + v, 0) / periodo;
    emas.push(primeiroSMA);

    for (let i = periodo; i < valores.length; i++) {
        const emaAnterior = emas[emas.length - 1];
        const novaEMA = (valores[i] - emaAnterior) * multiplicador + emaAnterior;
        emas.push(novaEMA);
    }

    return emas;
}

// ── Tendência pelas EMAs ──

export function identificarTendencia(
    emas9: number[],
    emas21: number[],
    precoAtual?: number
): 'alta' | 'baixa' | 'lateral' {
    if (emas9.length < 1 || emas21.length < 1) return 'lateral';

    const ema9Atual = emas9[emas9.length - 1];
    const ema21Atual = emas21[emas21.length - 1];

    // Se o preço foi informado, verificar posição do preço em relação a AMBAS as EMAs
    // Compra: preço acima da EMA 9 E acima da EMA 21
    // Venda: preço abaixo da EMA 9 E abaixo da EMA 21
    if (precoAtual != null) {
        if (precoAtual > ema9Atual && precoAtual > ema21Atual) return 'alta';
        if (precoAtual < ema9Atual && precoAtual < ema21Atual) return 'baixa';
        return 'lateral';
    }

    // Fallback sem preço (usado pela catalogação histórica)
    if (ema9Atual > ema21Atual) return 'alta';
    if (ema9Atual < ema21Atual) return 'baixa';
    return 'lateral';
}

// ── Catalogação de Fluxos ──

/**
 * Conta velas consecutivas na direção da tendência ANTES de um index (correção).
 * Percorre de trás pra frente a partir de `indexAntes` enquanto a vela for na direcao dada.
 */
function contarVelasFluxoAntes(
    velas: Vela[],
    indexAntes: number,
    direcao: 'alta' | 'baixa'
): number {
    let count = 0;
    for (let k = indexAntes; k >= 0; k--) {
        const c = classificarVela(velas[k]);
        if (c !== direcao) break;
        count++;
    }
    return count;
}

/**
 * Verifica se a vela de correção tem tamanho significativo (não é ruído).
 * Compara o corpo da vela com a média dos corpos das últimas 10 velas.
 */
function correcaoValida(velaCorrecao: Vela, velasAnteriores: Vela[]): boolean {
    const corpoCorrecao = Math.abs(velaCorrecao.fechamento - velaCorrecao.abertura);
    const ultimas = velasAnteriores.slice(-10);
    if (ultimas.length < 3) return true;
    const corpoMedio = ultimas.reduce((s, v) =>
        s + Math.abs(v.fechamento - v.abertura), 0) / ultimas.length;
    if (corpoMedio === 0) return true;
    return corpoCorrecao >= corpoMedio * LIMIAR_CORRECAO_MINIMA;
}

/**
 * Percorre o histórico de velas e detecta todos os padrões de fluxo.
 * Nova lógica: conta velas do fluxo ANTES da correção para classificar tipo:
 *   - 2-3 velas no fluxo → gatilho na 2ª vela de retomada
 *   - 4+ velas no fluxo  → gatilho na 3ª vela de retomada
 */
export function detectarFluxos(
    velas: Vela[],
    emas9: number[],
    emas21: number[]
): FluxoCatalogado[] {
    const fluxos: FluxoCatalogado[] = [];
    if (velas.length < EMA_LENTA_PERIODO + 3) return fluxos;

    // Ajuste de offset: EMAs têm tamanho menor que velas
    const offsetEMA9 = velas.length - emas9.length;
    const offsetEMA21 = velas.length - emas21.length;

    let i = Math.max(offsetEMA9, offsetEMA21) + 2;

    while (i < velas.length) {
        const idxEma9 = i - offsetEMA9;
        const idxEma21 = i - offsetEMA21;

        if (idxEma9 < 1 || idxEma21 < 1) { i++; continue; }

        const ema9s = emas9.slice(0, idxEma9 + 1);
        const ema21s = emas21.slice(0, idxEma21 + 1);
        const tendencia = identificarTendencia(ema9s, ema21s);

        if (tendencia === 'lateral') { i++; continue; }

        const classVela = classificarVela(velas[i]);

        // Detectar correção (vela contra a tendência)
        const ehCorrecao =
            (tendencia === 'baixa' && classVela === 'alta') ||
            (tendencia === 'alta' && classVela === 'baixa');

        if (!ehCorrecao) { i++; continue; }

        // Filtrar correções insignificantes (ruído de mercado)
        if (!correcaoValida(velas[i], velas.slice(0, i))) { i++; continue; }

        // Contar velas do fluxo ANTES da correção
        const numVelasFluxo = contarVelasFluxoAntes(velas, i - 1, tendencia);

        // Fluxo insuficiente (menos de 2 velas) — pular
        if (numVelasFluxo < 2) { i++; continue; }

        // Determinar tipo e velas de retomada necessárias baseado no fluxo
        const tipo: '2-3' | '3+' = numVelasFluxo <= 2 ? '2-3' : '3+';
        const velasRetomadaNecessarias = tipo === '2-3' ? 2 : 3;

        // Após correção, procurar retomada
        const direcaoRetomada = tendencia;
        let velasRetomada = 0;
        let jRetomada = i + 1;

        while (jRetomada < velas.length) {
            const classRetomada = classificarVela(velas[jRetomada]);
            if (classRetomada === 'doji') break;
            if (classRetomada !== direcaoRetomada) break;
            velasRetomada++;

            // Gatilho quando atinge as velas de retomada necessárias
            if (velasRetomada === velasRetomadaNecessarias) {
                fluxos.push({
                    tipo,
                    direcao: direcaoRetomada,
                    timestamp_inicio: velas[i].timestamp,
                    timestamp_fim: velas[jRetomada].timestamp,
                    num_velas_retomada: velasRetomada,
                });
                break;
            }

            jRetomada++;
        }

        // Avança o ponteiro
        if (velasRetomada > 0) {
            i = jRetomada;
        }
        i++;
    }

    return fluxos;
}

// ── Catalogação por Janela de Horas ──

export function catalogarFluxos(
    fluxos: FluxoCatalogado[],
    velas: Vela[],
    janela_horas: number
): CatalogacaoFluxos {
    const ultimaVela = velas[velas.length - 1];
    const agora = ultimaVela ? ultimaVela.timestamp : Math.floor(Date.now() / 1000);
    const inicio_janela = agora - janela_horas * 3600;

    const fluxosNaJanela = fluxos.filter(
        f => f.timestamp_inicio >= inicio_janela
    );

    const fluxos_23_alta = fluxosNaJanela.filter(f => f.tipo === '2-3' && f.direcao === 'alta').length;
    const fluxos_23_baixa = fluxosNaJanela.filter(f => f.tipo === '2-3' && f.direcao === 'baixa').length;
    const fluxos_3mais_alta = fluxosNaJanela.filter(f => f.tipo === '3+' && f.direcao === 'alta').length;
    const fluxos_3mais_baixa = fluxosNaJanela.filter(f => f.tipo === '3+' && f.direcao === 'baixa').length;

    // Velas na janela
    const velasNaJanela = velas.filter(v => v.timestamp >= inicio_janela);
    const total_alta = velasNaJanela.filter(v => classificarVela(v) === 'alta').length;
    const total_baixa = velasNaJanela.filter(v => classificarVela(v) === 'baixa').length;
    const total_doji = velasNaJanela.filter(v => classificarVela(v) === 'doji').length;

    // Tipo dominante
    const total23 = fluxos_23_alta + fluxos_23_baixa;
    const total3mais = fluxos_3mais_alta + fluxos_3mais_baixa;
    let tipo_dominante: '2-3' | '3+' | null = null;
    if (total23 > total3mais) tipo_dominante = '2-3';
    else if (total3mais > total23) tipo_dominante = '3+';

    // Direção dominante (soma todos os fluxos por direção)
    const totalFluxosAlta = fluxos_23_alta + fluxos_3mais_alta;
    const totalFluxosBaixa = fluxos_23_baixa + fluxos_3mais_baixa;
    let direcao_dominante: 'alta' | 'baixa' | null = null;
    if (totalFluxosAlta > totalFluxosBaixa) direcao_dominante = 'alta';
    else if (totalFluxosBaixa > totalFluxosAlta) direcao_dominante = 'baixa';

    return {
        fluxos_23_alta,
        fluxos_23_baixa,
        fluxos_3mais_alta,
        fluxos_3mais_baixa,
        total_alta,
        total_baixa,
        total_doji,
        tipo_dominante,
        direcao_dominante,
    };
}

// ── Motor Principal: Análise de Fluxo de Velas ──

/**
 * Analisa o estado atual e verifica se há sinal para operar.
 *
 * REGRAS DE ENTRADA:
 *   - Fluxo de 2-3 velas → espera 1ª retomada FECHAR → entra no NASCIMENTO da 2ª
 *   - Fluxo de 4+ velas → espera 2ª retomada FECHAR → entra no NASCIMENTO da 3ª
 *
 * IMPORTANTE: Só analisa velas FECHADAS (ignora a vela em formação).
 * Cada padrão (fluxo→correção→retomada) tem um sinal_id único para evitar re-execução.
 */
export function analisarFluxoVelas(
    velas: Vela[],
    janela_horas: number,
    incluirVelaAberta: boolean = false
): AnaliseFluxoVelas {
    // Precisamos de pelo menos 30 velas para calcular EMA 21 + margem
    if (velas.length < EMA_LENTA_PERIODO + 10) {
        return estadoVazio(velas);
    }

    // ── Alinhamento: preço e EMAs devem usar o MESMO conjunto de velas ──
    // incluirVelaAberta = true  (tick 57-59s): vela em formação é considerada "fechada"
    //   → EMAs + preço calculados sobre TODAS as velas
    // incluirVelaAberta = false (painel):
    //   → EMAs + preço calculados SEM a última vela (em formação)
    const velasParaAnalise = incluirVelaAberta ? velas : velas.slice(0, -1);

    if (velasParaAnalise.length < EMA_LENTA_PERIODO + 5) {
        return estadoVazio(velas);
    }

    const fechamentos = velasParaAnalise.map(v => v.fechamento);
    const emas9 = calcularEMA(fechamentos, EMA_RAPIDA_PERIODO);
    const emas21 = calcularEMA(fechamentos, EMA_LENTA_PERIODO);

    if (emas9.length < 2 || emas21.length < 2) {
        return estadoVazio(velas);
    }

    // Preço = fechamento da última vela do conjunto alinhado
    const precoAtual = velasParaAnalise[velasParaAnalise.length - 1].fechamento;
    const tendencia = identificarTendencia(emas9, emas21, precoAtual);
    const ema_rapida = emas9[emas9.length - 1];
    const ema_lenta = emas21[emas21.length - 1];

    // Catalogação completa de fluxos (usa velasParaAnalise para consistência)
    const fluxos = detectarFluxos(velasParaAnalise, emas9, emas21);
    const catalogacao = catalogarFluxos(fluxos, velasParaAnalise, janela_horas);

    const semSinal: AnaliseFluxoVelas = {
        tendencia,
        ema_rapida,
        ema_lenta,
        em_correcao: false,
        num_velas_fluxo: 0,
        velas_retomada: 0,
        direcao_operacao: null,
        operar: false,
        modo_ativo: '2-3',
        confianca: calcularConfianca(catalogacao, tendencia),
        sinal_id: null,
        catalogacao,
    };

    if (tendencia === 'lateral') {
        return { ...semSinal, confianca: 0 };
    }

    // ── Analisar velas do conjunto alinhado ──
    const direcaoTendencia = tendencia;
    const direcaoContraria = tendencia === 'alta' ? 'baixa' : 'alta';

    // Detecção de padrão: nunca incluir vela em formação na contagem de retomada
    // incluirVelaAberta=true:  velasParaAnalise tem forming no final → pular ela
    // incluirVelaAberta=false: tudo fechado → usar todas
    const limiteBusca = incluirVelaAberta
        ? velasParaAnalise.length - 2
        : velasParaAnalise.length - 1;

    // Offsets para acessar EMAs por index de vela (relativo a velasParaAnalise)
    const offsetEMA9 = velasParaAnalise.length - emas9.length;
    const offsetEMA21 = velasParaAnalise.length - emas21.length;

    // ── Percorrer de trás pra frente: retomada → correção → fluxo ──

    let indexFimCorrecao = -1;
    let indexInicioCorrecao = -1;
    let velasRetomada = 0;
    let correcaoInvalidada = false;

    let pos = limiteBusca;

    // Passo 1: Contar velas de retomada FECHADAS (na direção da tendência)
    while (pos >= Math.max(0, velasParaAnalise.length - 20)) {
        const c = classificarVela(velasParaAnalise[pos]);
        if (c === direcaoTendencia) {
            velasRetomada++;
            pos--;
        } else {
            break;
        }
    }

    // Passo 2: Identificar bloco de correção (1 ou mais velas contrárias/doji)
    if (pos >= 0) {
        const cPos = classificarVela(velasParaAnalise[pos]);
        if (cPos === direcaoContraria || cPos === 'doji') {
            indexFimCorrecao = pos;

            let k = pos;
            while (k >= Math.max(0, velasParaAnalise.length - 20)) {
                const ck = classificarVela(velasParaAnalise[k]);
                if (ck === direcaoContraria || ck === 'doji') {
                    indexInicioCorrecao = k;

                    // Verificar se vela de correção ultrapassou AMBAS as EMAs
                    const idxE9 = k - offsetEMA9;
                    const idxE21 = k - offsetEMA21;
                    if (idxE9 >= 0 && idxE21 >= 0) {
                        const ema9Vela = emas9[idxE9];
                        const ema21Vela = emas21[idxE21];
                        const fechVela = velasParaAnalise[k].fechamento;

                        if (direcaoTendencia === 'baixa' && fechVela > ema9Vela && fechVela > ema21Vela) {
                            correcaoInvalidada = true;
                            break;
                        }
                        if (direcaoTendencia === 'alta' && fechVela < ema9Vela && fechVela < ema21Vela) {
                            correcaoInvalidada = true;
                            break;
                        }
                    }

                    k--;
                } else {
                    break;
                }
            }
        }
    }

    // Sem correção encontrada ou correção invalidou (preço ultrapassou EMAs)
    if (indexFimCorrecao === -1 || correcaoInvalidada) {
        return semSinal;
    }

    // Verificar se pelo menos uma vela da correção tem tamanho significativo
    let correcaoSignificativa = false;
    for (let ci = indexInicioCorrecao; ci <= indexFimCorrecao; ci++) {
        if (correcaoValida(velasParaAnalise[ci], velasParaAnalise.slice(0, ci))) {
            correcaoSignificativa = true;
            break;
        }
    }
    if (!correcaoSignificativa) {
        return semSinal;
    }

    const em_correcao = velasRetomada === 0;

    // Passo 3: Contar velas do fluxo ANTES da correção
    const numVelasFluxo = contarVelasFluxoAntes(velasParaAnalise, indexInicioCorrecao - 1, direcaoTendencia);

    // Derivar modo automaticamente
    const modoDerivado: '2-3' | '3+' = numVelasFluxo <= 2 ? '2-3' : '3+';
    // Para "2-3": entra no nascimento da 2ª retomada = após 1 fechada
    // Para "3+":  entra no nascimento da 3ª retomada = após 2 fechadas
    const retomadaFechadasNecessarias = modoDerivado === '2-3' ? 1 : 2;

    // ID único do padrão: baseado no timestamp do início da correção
    const sinal_id = `correcao-${velasParaAnalise[indexInicioCorrecao].timestamp}`;

    // Verificar sinal de entrada
    let operar = false;
    let direcao_operacao: 'compra' | 'venda' | null = null;

    // Sinal dispara quando:
    // 1. Fluxo teve pelo menos 2 velas
    // 2. Número EXATO de velas de retomada FECHADAS atingido
    //    (exato = não opera se já passaram mais velas, precisa nova correção)
    if (numVelasFluxo >= 2 && velasRetomada === retomadaFechadasNecessarias) {
        operar = true;
        direcao_operacao = tendencia === 'alta' ? 'compra' : 'venda';
    }

    return {
        tendencia,
        ema_rapida,
        ema_lenta,
        em_correcao,
        num_velas_fluxo: numVelasFluxo,
        velas_retomada: velasRetomada,
        direcao_operacao,
        operar,
        modo_ativo: modoDerivado,
        confianca: calcularConfianca(catalogacao, tendencia),
        sinal_id: operar ? sinal_id : null,
        catalogacao,
    };
}

// ── Helpers Internos ──

function calcularConfianca(
    cat: CatalogacaoFluxos,
    tendencia: 'alta' | 'baixa' | 'lateral'
): number {
    if (tendencia === 'lateral') return 0;
    const totalFluxos = cat.fluxos_23_alta + cat.fluxos_23_baixa + cat.fluxos_3mais_alta + cat.fluxos_3mais_baixa;
    if (totalFluxos === 0) return 50;
    const fluxosFavoraveis =
        tendencia === 'alta'
            ? cat.fluxos_23_alta + cat.fluxos_3mais_alta
            : cat.fluxos_23_baixa + cat.fluxos_3mais_baixa;
    return Math.round((fluxosFavoraveis / totalFluxos) * 100);
}

function estadoVazio(velas: Vela[]): AnaliseFluxoVelas {
    const catalogo: CatalogacaoFluxos = {
        fluxos_23_alta: 0,
        fluxos_23_baixa: 0,
        fluxos_3mais_alta: 0,
        fluxos_3mais_baixa: 0,
        total_alta: velas.filter(v => v.cor === 'alta').length,
        total_baixa: velas.filter(v => v.cor === 'baixa').length,
        total_doji: velas.filter(v => classificarVela(v) === 'doji').length,
        tipo_dominante: null,
        direcao_dominante: null,
    };
    return {
        tendencia: 'lateral',
        ema_rapida: 0,
        ema_lenta: 0,
        em_correcao: false,
        num_velas_fluxo: 0,
        velas_retomada: 0,
        direcao_operacao: null,
        operar: false,
        modo_ativo: '2-3',
        confianca: 0,
        sinal_id: null,
        catalogacao: catalogo,
    };
}

// ── Timing: detecta candle fechado ──

/**
 * Retorna true quando um candle acabou de fechar (primeiros 2s do novo minuto).
 * Para FluxoVelas M1: executa nos segundos 0-2 de cada minuto.
 * Para outros timeframes: verifica se o timestamp da última vela mudou.
 */
export function ehCandleFechado(timeframe: string): boolean {
    const agora = new Date();
    const segundos = agora.getSeconds();

    // Janela de 0-1 segundos pós-fechamento a cada período (gatilho preciso)
    switch (timeframe) {
        case 'M1': return segundos >= 0 && segundos <= 1;
        case 'M5': return agora.getMinutes() % 5 === 0 && segundos <= 2;
        case 'M15': return agora.getMinutes() % 15 === 0 && segundos <= 2;
        case 'M30': return agora.getMinutes() % 30 === 0 && segundos <= 2;
        case 'M60': return agora.getMinutes() === 0 && segundos <= 2;
        default: return segundos <= 1;
    }
}
