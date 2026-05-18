import type { Vela } from '../types';

export interface AnaliseCandleRepeat {
  operar: boolean;
  direcao_operacao: 'compra' | 'venda' | null;
  sinal_id: string | null;
  ultima_vela_cor: 'alta' | 'baixa' | 'doji' | null;
  motivo_bloqueio: string | null;
  explicacao: string;
}

const LIMIAR_DOJI_CORPO = 0.20;

function classificarVela(vela: Vela): 'alta' | 'baixa' | 'doji' {
  const corpo = Math.abs(vela.fechamento - vela.abertura);
  const range = vela.maxima - vela.minima;
  if (range === 0) return 'doji';
  if (corpo / range < LIMIAR_DOJI_CORPO) return 'doji';
  return vela.fechamento >= vela.abertura ? 'alta' : 'baixa';
}

// antecipar=true: usa a vela em formação (gate pré-fechamento M1 aos 57-59s)
// antecipar=false (padrão): usa a última vela fechada
export function analisarCandleRepeat(velas: Vela[], antecipar = false): AnaliseCandleRepeat {
  const nenhum: AnaliseCandleRepeat = {
    operar: false,
    direcao_operacao: null,
    sinal_id: null,
    ultima_vela_cor: null,
    motivo_bloqueio: null,
    explicacao: 'Aguardando dados...',
  };

  const minVelas = antecipar ? 1 : 2;
  if (velas.length < minVelas) {
    return { ...nenhum, explicacao: 'Aguardando velas suficientes.' };
  }

  const idxSinal = antecipar ? velas.length - 1 : velas.length - 2;
  const ultimaVela = velas[idxSinal];
  const corVela = classificarVela(ultimaVela);

  if (corVela === 'doji') {
    return {
      ...nenhum,
      ultima_vela_cor: 'doji',
      motivo_bloqueio: 'Candle doji — sem direção clara',
      explicacao: 'Bloqueado: Candle doji (corpo muito pequeno)',
    };
  }

  const direcao: 'compra' | 'venda' = corVela === 'alta' ? 'compra' : 'venda';
  const sinal_id = `cr-${ultimaVela.timestamp}-${direcao}`;
  const corLabel = corVela === 'alta' ? 'verde' : 'vermelho';
  const direcaoLabel = direcao === 'compra' ? 'CALL' : 'PUT';

  return {
    operar: true,
    direcao_operacao: direcao,
    sinal_id,
    ultima_vela_cor: corVela,
    motivo_bloqueio: null,
    explicacao: `Candle ${corLabel} fechado → ${direcaoLabel}`,
  };
}
