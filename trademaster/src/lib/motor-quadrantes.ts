import type { Vela, AnaliseQuadrante, Gerenciamento } from '../types';

// ── Quadrantes ──
// Cada hora tem 6 quadrantes de 10 minutos (10 velas M1 cada)
// Q1: 00-09, Q2: 10-19, Q3: 20-29, Q4: 30-39, Q5: 40-49, Q6: 50-59
// Execução: X:09:59, X:19:59, X:29:59, X:39:59, X:49:59, X:59:59

export function obterQuadranteAtual(minuto: number): number {
  return Math.floor(minuto / 10) + 1;
}

export function obterInicioMinutoQuadrante(quadrante: number): number {
  return (quadrante - 1) * 10;
}

export function obterFimMinutoQuadrante(quadrante: number): number {
  return (quadrante - 1) * 10 + 9;
}

// ── Análise de Velas ──

export function analisarQuadrante(velas: Vela[], velasHistorico: Vela[] = []): AnaliseQuadrante {
  const total_alta = velas.filter(v => v.cor === 'alta').length;
  const total_baixa = velas.filter(v => v.cor === 'baixa').length;

  // Precisa de 7+ velas da mesma cor para operar
  // 6-4 ou menos = NÃO opera (empate)
  let cor_predominante: 'alta' | 'baixa' | 'empate';
  if (total_alta >= 7) {
    cor_predominante = 'alta';
  } else if (total_baixa >= 7) {
    cor_predominante = 'baixa';
  } else {
    cor_predominante = 'empate';
  }

  const ultimaVela = velas.length > 0 ? velas[velas.length - 1] : null;
  const ultima_vela_cor = ultimaVela?.cor || 'alta';

  // Operar agora SEMPRE acontece a cada quadrante (já que não depende mais de força predominante exclusiva)
  const operar = true;

  let direcao_operacao: 'compra' | 'venda';

  if (cor_predominante !== 'empate') {
    // TEM força predominante (7 ou mais velas da mesma cor).
    // O usuário relatou seguir a força: se alta, compra; se baixa, venda.
    direcao_operacao = cor_predominante === 'alta' ? 'compra' : 'venda';
  } else {
    // NÃO TEM força predominante (6 ou menos de cada cor).
    // A direção será a REVERSÃO da última vela.
    // Se a última vela foi baixa (vermelha), operamos COMPRA (CALL).
    // Se a última vela foi alta (verde), operamos VENDA (PUT).
    direcao_operacao = ultima_vela_cor === 'baixa' ? 'compra' : 'venda';
  }

  // ── Análise de Volume / Volatilidade (Fallback se volume for 0) ──
  const volumeTotal = velas.reduce((acc, v) => acc + (v.volume || 0), 0);
  const volume_medio = velas.length > 0 ? volumeTotal / velas.length : 0;
  
  // No Forex/CFD, o volume real costuma vir zerado. Usamos amplitude (volatilidade) como proxy.
  const amplitudeTotal = velas.reduce((acc, v) => acc + Math.abs(v.maxima - v.minima), 0);
  const amp_media = velas.length > 0 ? amplitudeTotal / velas.length : 0;

  const ultimas20 = velasHistorico.slice(-20);
  const volume_sma_20 = ultimas20.length > 0 
    ? ultimas20.reduce((acc, v) => acc + (v.volume || 0), 0) / ultimas20.length 
    : volume_medio;
  const amp_sma_20 = ultimas20.length > 0
    ? ultimas20.reduce((acc, v) => acc + Math.abs(v.maxima - v.minima), 0) / ultimas20.length
    : amp_media;

  // Suavização (SMA 9)
  const ultimas9 = velasHistorico.slice(-9);
  const volume_sma_9 = ultimas9.length > 0 
    ? ultimas9.reduce((acc, v) => acc + (v.volume || 0), 0) / ultimas9.length 
    : volume_medio;
  const amp_sma_9 = ultimas9.length > 0
    ? ultimas9.reduce((acc, v) => acc + Math.abs(v.maxima - v.minima), 0) / ultimas9.length
    : amp_media;

  // Confirmação: Se volume existe (>0), usa ele. Senão, usa amplitude (volatilidade).
  let volume_confirmacao = false;
  if (volume_sma_20 > 0) {
    volume_confirmacao = volume_medio > volume_sma_20 && volume_sma_9 > volume_sma_20;
  } else {
    // Fallback por Volatilidade: A média do quadrante deve ser > média recente
    volume_confirmacao = amp_sma_20 > 0 ? (amp_media > amp_sma_20) : (amp_media > 0);
  }

  // ── Filtro: Dupla Exposição ──
  // Detecta se duas velas no quadrante atingiram o mesmo nível (suporte/resistência local)
  let dupla_exposicao_detectada = false;
  const TOLERANCIA = 0.00005; // tolerância para considerar mesmo nível
  
  for (let i = 0; i < velas.length; i++) {
    for (let j = i + 1; j < velas.length; j++) {
      const v1 = velas[i];
      const v2 = velas[j];
      const sameHigh = Math.abs(v1.maxima - v2.maxima) < (v1.maxima * TOLERANCIA);
      const sameLow = Math.abs(v1.minima - v2.minima) < (v1.minima * TOLERANCIA);
      if (sameHigh || sameLow) {
        dupla_exposicao_detectada = true;
        break;
      }
    }
    if (dupla_exposicao_detectada) break;
  }

  const total = velas.length || 1;
  let confianca = Math.round((Math.max(total_alta, total_baixa) / total) * 100);

  // Bonus de confiança por filtros
  if (volume_confirmacao) confianca = Math.min(100, confianca + 10);
  if (dupla_exposicao_detectada) confianca = Math.min(100, confianca + 15);

  // ── Geração de Explicação ──
  const motivos: string[] = [];
  
  if (volume_confirmacao) {
    motivos.push(`Volume (${volume_medio}) está acima da média SMA 20 (${volume_sma_20}), confirmando pressão na direção de ${direcao_operacao}.`);
  } else {
    motivos.push(`Volume (${volume_medio}) está abaixo da média SMA 20 (${volume_sma_20}), indicando fraqueza no movimento atual.`);
  }

  if (dupla_exposicao_detectada) {
    motivos.push(`Detectada Dupla Exposição: o preço testou e respeitou um nível de suporte/resistência local dentro do quadrante.`);
  }

  if (cor_predominante !== 'empate') {
    motivos.push(`Estratégia de Tendência: forte predominância de velas de ${cor_predominante} (${total_alta} vs ${total_baixa}).`);
  } else {
    motivos.push(`Estratégia de Reversão: sem predominância clara, operando contra a última vela (${ultima_vela_cor}).`);
  }

  const explicacao = motivos.join(' ');

  return {
    total_alta,
    total_baixa,
    cor_predominante,
    ultima_vela_cor,
    direcao_operacao,
    confianca,
    operar,
    volume_medio: volume_sma_20 > 0 ? parseFloat(volume_medio.toFixed(2)) : parseFloat(amp_media.toFixed(5)),
    volume_sma_20: volume_sma_20 > 0 ? parseFloat(volume_sma_20.toFixed(2)) : parseFloat(amp_sma_20.toFixed(5)),
    volume_confirmacao,
    dupla_exposicao_detectada,
    explicacao,
  };
}

// ── Cálculo de Valor por Estratégia ──

const P6_PERCENTAGENS = [1.24, 2.62, 5.57, 11.84, 25.14, 53.38];

export function calcularValorOperacao(params: {
  estrategia: Gerenciamento;
  valor_base: number;
  resultado_anterior: 'vitoria' | 'derrota' | null;
  valor_anterior: number;
  multiplicador_martingale: number;
  multiplicador_soros: number;
  payout: number;
  ciclo_martingale: number;
  max_martingale: number;
  banca_atual?: number;
}): { valor: number; novo_ciclo: number } {
  const {
    estrategia,
    valor_base,
    resultado_anterior,
    valor_anterior,
    multiplicador_martingale,
    payout,
    ciclo_martingale,
    max_martingale,
    banca_atual,
  } = params;

  // P6: lê o nível atual diretamente — o result handler é responsável por avançar o nível.
  // Não incrementa aqui para evitar double-increment (tick + result handler).
  if (estrategia === 'P6') {
    const capital = banca_atual ?? valor_base;
    const nivel = Math.min(ciclo_martingale, 5);
    return { valor: Math.max(0.01, parseFloat((capital * P6_PERCENTAGENS[nivel] / 100).toFixed(2))), novo_ciclo: ciclo_martingale };
  }

  // Primeira operação ou sem resultado anterior (outros gerenciamentos)
  if (resultado_anterior === null) {
    return { valor: valor_base, novo_ciclo: 0 };
  }

  switch (estrategia) {
    case 'Fixo':
      return { valor: valor_base, novo_ciclo: 0 };

    case 'Martingale':
      if (resultado_anterior === 'derrota') {
        if (ciclo_martingale >= max_martingale) {
          // Atingiu máximo de ciclos, reseta
          return { valor: valor_base, novo_ciclo: 0 };
        }
        // Dobra (ou multiplica) após derrota
        const novoValor = valor_anterior * multiplicador_martingale;
        return { valor: parseFloat(novoValor.toFixed(2)), novo_ciclo: ciclo_martingale + 1 };
      }
      // Vitória: reseta para valor base
      return { valor: valor_base, novo_ciclo: 0 };

    case 'Soros':
      if (resultado_anterior === 'vitoria') {
        if (ciclo_martingale >= 1) {
          // Soros é sempre 1 nível: após aplicar, volta para mão fixa
          return { valor: valor_base, novo_ciclo: 0 };
        }
        // Vitória na mão fixa → Soros: mão fixa + lucro da última vitória
        const novoValor = valor_base + (valor_base * payout / 100);
        return { valor: parseFloat(novoValor.toFixed(2)), novo_ciclo: 1 };
      }
      // Derrota: reseta para mão fixa
      return { valor: valor_base, novo_ciclo: 0 };

    default:
      return { valor: valor_base, novo_ciclo: 0 };
  }
}

// ── Timing ──

export function proximoHorarioExecucao(): {
  quadrante: number;
  segundosRestantes: number;
  minutoExecucao: number;
} {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();

  // Execução no segundo 58 do último minuto de cada quadrante
  // Minutos finais: 9, 19, 29, 39, 49, 59
  const minutosFinais = [9, 19, 29, 39, 49, 59];

  for (const minFim of minutosFinais) {
    if (minutos < minFim || (minutos === minFim && segundos <= 58)) {
      const segundosFaltam = (minFim - minutos) * 60 + (57 - segundos);

      // Quadrante atual (o que está em andamento e será analisado)
      const quadrante = Math.floor(minFim / 10) + 1;
      return { quadrante, segundosRestantes: Math.max(0, segundosFaltam), minutoExecucao: minFim };
    }
  }

  // Próxima hora (quadrante 1 da hora seguinte)
  const segundosFaltam = (69 - minutos) * 60 + (58 - segundos);
  return { quadrante: 1, segundosRestantes: Math.max(0, segundosFaltam), minutoExecucao: 9 };
}

export function ehMomentoDeExecutar(): boolean {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();

  // Executa nos últimos segundos do quadrante (segundo 58-59 do último minuto)
  // Minutos finais de cada quadrante: 9, 19, 29, 39, 49, 59
  const minutosFinais = [9, 19, 29, 39, 49, 59];
  return minutosFinais.includes(minutos) && segundos >= 57 && segundos <= 58;
}

export function formatarCountdown(segundos: number): string {
  if (segundos <= 0) return '00:00';
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}
