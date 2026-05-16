import type { Vela } from '../types';

export interface AnaliseContinuacaoVelas {
  operar: boolean;
  direcao_operacao: 'compra' | 'venda' | null;
  confianca: number;
  sinal_id: string | null;
  ultima_vela_cor: 'alta' | 'baixa' | 'doji' | null;
  sma_9: number | null;
  preco_atual: number | null;
  preco_acima_sma: boolean | null;
  sma_inclinacao: 'subindo' | 'descendo' | 'neutra' | null;
  motivo_bloqueio: string | null;
  explicacao: string;
}

const SMA_PERIODO = 9;
const LIMIAR_DOJI_CORPO = 0.20;       // corpo < 20% do range total = doji
const LIMIAR_FORCA_MINIMA = 0.50;     // fechamento deve estar acima/abaixo de 50% da vela
const LIMIAR_INCLINACAO_NEUTRA = 0.000005; // SMA muda menos que 0.0005% → considerada reta

function calcularSMA(fechamentos: number[], periodo: number): number[] {
    if (fechamentos.length < periodo) return [];
    const smas: number[] = [];
    for (let i = periodo - 1; i < fechamentos.length; i++) {
        const soma = fechamentos.slice(i - periodo + 1, i + 1).reduce((a, b) => a + b, 0);
        smas.push(soma / periodo);
    }
    return smas;
}

function classificarVela(vela: Vela): 'alta' | 'baixa' | 'doji' {
    const corpo = Math.abs(vela.fechamento - vela.abertura);
    const range = vela.maxima - vela.minima;
    if (range === 0) return 'doji';
    if (corpo / range < LIMIAR_DOJI_CORPO) return 'doji';
    return vela.fechamento >= vela.abertura ? 'alta' : 'baixa';
}

function velaTemForca(vela: Vela, direcao: 'alta' | 'baixa'): boolean {
    const range = vela.maxima - vela.minima;
    if (range === 0) return false;
    const meio = vela.minima + range * LIMIAR_FORCA_MINIMA;
    if (direcao === 'alta') return vela.fechamento > meio;
    return vela.fechamento < meio;
}

function smaEstaLateral(smas: number[]): boolean {
    const janela = Math.min(5, smas.length);
    if (janela < 2) return true;
    const ultimas = smas.slice(-janela);
    const variacao = Math.abs(ultimas[janela - 1] - ultimas[0]) / (Math.abs(ultimas[0]) || 1);
    return variacao < LIMIAR_INCLINACAO_NEUTRA;
}

function calcularInclinacaoSMA(smas: number[]): 'subindo' | 'descendo' | 'neutra' {
    if (smas.length < 3) return 'neutra';
    if (smaEstaLateral(smas)) return 'neutra';
    const diff = smas[smas.length - 1] - smas[smas.length - 2];
    if (diff > 0) return 'subindo';
    if (diff < 0) return 'descendo';
    return 'neutra';
}

// antecipar=true: usa a vela em formação como sinal (para gate pré-fechamento em M1)
// antecipar=false (padrão): usa a última vela fechada
export function analisarContinuacaoVelas(velas: Vela[], antecipar = false): AnaliseContinuacaoVelas {
    const nenhum: AnaliseContinuacaoVelas = {
        operar: false,
        direcao_operacao: null,
        confianca: 0,
        sinal_id: null,
        ultima_vela_cor: null,
        sma_9: null,
        preco_atual: null,
        preco_acima_sma: null,
        sma_inclinacao: null,
        motivo_bloqueio: null,
        explicacao: 'Aguardando dados...',
    };

    const minVelas = antecipar ? SMA_PERIODO + 1 : SMA_PERIODO + 2;
    if (velas.length < minVelas) {
        return { ...nenhum, explicacao: 'Aguardando velas suficientes para calcular SMA 9.' };
    }

    // Índice do candle de sinal
    const idxSinal = antecipar ? velas.length - 1 : velas.length - 2;
    const ultimaVela = velas[idxSinal];

    // SMA calculada sobre os candles até o de sinal (inclusive)
    const fechamentos = velas.slice(0, idxSinal + 1).map(v => v.fechamento);
    const smas = calcularSMA(fechamentos, SMA_PERIODO);

    if (smas.length < 3) {
        return { ...nenhum, explicacao: 'SMA 9 insuficiente.' };
    }

    const smaAtual = smas[smas.length - 1];
    const corVela = classificarVela(ultimaVela);
    // Usa o fechamento da vela de sinal para comparar com a SMA
    const precoAtual = ultimaVela.fechamento;
    const precoAcimaSma = precoAtual > smaAtual;
    const inclinacao = calcularInclinacaoSMA(smas);

    const base: Omit<AnaliseContinuacaoVelas, 'operar' | 'direcao_operacao' | 'confianca' | 'sinal_id' | 'motivo_bloqueio' | 'explicacao'> = {
        ultima_vela_cor: corVela,
        sma_9: smaAtual,
        preco_atual: precoAtual,
        preco_acima_sma: precoAcimaSma,
        sma_inclinacao: inclinacao,
    };

    const bloquear = (motivo: string): AnaliseContinuacaoVelas => ({
        ...nenhum,
        ...base,
        motivo_bloqueio: motivo,
        explicacao: `Bloqueado: ${motivo}`,
    });

    // ── Filtros de bloqueio ──

    if (corVela === 'doji') {
        return bloquear('Candle doji (corpo muito pequeno)');
    }

    if (smaEstaLateral(smas)) {
        return bloquear('SMA 9 está lateral/neutra');
    }

    // ── Validação de força da vela ──
    if (!velaTemForca(ultimaVela, corVela as 'alta' | 'baixa')) {
        return bloquear('Candle sem força (fechamento abaixo de 50% da vela)');
    }

    // ── Lógica principal: continuação + filtro SMA 9 ──

    let direcao: 'compra' | 'venda' | null = null;
    let motivo_bloqueio: string | null = null;

    if (corVela === 'alta') {
        if (precoAcimaSma) {
            direcao = 'compra';
        } else {
            motivo_bloqueio = 'Candle verde mas preço abaixo da SMA 9 (contra tendência)';
        }
    } else {
        // corVela === 'baixa'
        if (!precoAcimaSma) {
            direcao = 'venda';
        } else {
            motivo_bloqueio = 'Candle vermelho mas preço acima da SMA 9 (contra tendência)';
        }
    }

    if (!direcao || motivo_bloqueio) {
        return bloquear(motivo_bloqueio ?? 'Condição não atendida');
    }

    // ── Calcular confiança ──
    // Base: 60. Bônus por inclinação alinhada: +20. Bônus por distância da SMA: até +20.
    let confianca = 60;

    const inclinacaoAlinhada =
        (direcao === 'compra' && inclinacao === 'subindo') ||
        (direcao === 'venda' && inclinacao === 'descendo');
    if (inclinacaoAlinhada) confianca += 20;

    confianca = Math.min(100, confianca);

    // ID único: timestamp da última vela fechada + direção
    const sinal_id = `cv-${ultimaVela.timestamp}-${direcao}`;

    const direcaoLabel = direcao === 'compra' ? 'CALL (COMPRA)' : 'PUT (VENDA)';
    const inclinacaoLabel = inclinacao === 'subindo' ? 'subindo' : inclinacao === 'descendo' ? 'descendo' : 'neutra';
    const explicacao = `Candle ${corVela === 'alta' ? 'verde' : 'vermelho'} fechado. Preço ${precoAcimaSma ? 'acima' : 'abaixo'} da SMA 9 (${smaAtual.toFixed(5)}). SMA ${inclinacaoLabel}. Sinal: ${direcaoLabel} com ${confianca}% de confiança.`;

    return {
        operar: true,
        direcao_operacao: direcao,
        confianca,
        sinal_id,
        motivo_bloqueio: null,
        explicacao,
        ...base,
    };
}