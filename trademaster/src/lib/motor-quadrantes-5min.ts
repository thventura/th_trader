import type { Vela, AnaliseQuadrante5min } from '../types';

// 12 quadrantes de 5 minutos por hora
// Q1: 00-04, Q2: 05-09, Q3: 10-14, ..., Q12: 55-59
// Execução nos segundos 58-59 do ÚLTIMO minuto de cada quadrante
// Entrar antes da vela fechar elimina delay — a ordem já chega na abertura da próxima vela

const MINUTOS_FIM_5MIN = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59];

export function obterQuadranteAtual5min(minuto: number): number {
  return Math.floor(minuto / 5) + 1;
}

export function obterInicioMinuto5min(quadrante: number): number {
  return (quadrante - 1) * 5;
}

export function obterFimMinuto5min(quadrante: number): number {
  return (quadrante - 1) * 5 + 4;
}

export function analisarQuadrante5min(velas: Vela[]): AnaliseQuadrante5min {
  if (velas.length === 0) {
    return {
      ultima_vela_cor: 'alta',
      direcao_operacao: 'compra',
      total_alta: 0,
      total_baixa: 0,
      confianca: 0,
      operar: false,
      explicacao: 'Sem velas disponíveis no quadrante.',
    };
  }

  const total_alta = velas.filter(v => v.cor === 'alta').length;
  const total_baixa = velas.filter(v => v.cor === 'baixa').length;
  const ultimaVela = velas[velas.length - 1];
  const ultima_vela_cor = ultimaVela.cor;
  const direcao_operacao: 'compra' | 'venda' = ultima_vela_cor === 'alta' ? 'compra' : 'venda';

  const concordam = ultima_vela_cor === 'alta' ? total_alta : total_baixa;
  const total = velas.length;
  const confianca = Math.round((concordam / total) * 100);

  const ultimaVelaLabel = ultima_vela_cor === 'alta' ? 'VERDE' : 'VERMELHA';
  const explicacao = `Última vela ${ultimaVelaLabel} → ${direcao_operacao.toUpperCase()}. ${total_alta} alta(s) vs ${total_baixa} baixa(s) no quadrante (confiança ${confianca}%).`;

  return {
    ultima_vela_cor,
    direcao_operacao,
    total_alta,
    total_baixa,
    confianca,
    operar: true,
    explicacao,
  };
}

export function proximoHorarioExecucao5min(): {
  quadrante: number;
  segundosRestantes: number;
  minutoExecucao: number;
} {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();

  for (let i = 0; i < MINUTOS_FIM_5MIN.length; i++) {
    const minFim = MINUTOS_FIM_5MIN[i];
    if (minutos < minFim || (minutos === minFim && segundos < 58)) {
      const segundosFaltam = (minFim - minutos) * 60 + (58 - segundos);
      return { quadrante: i + 1, segundosRestantes: Math.max(0, segundosFaltam), minutoExecucao: minFim };
    }
  }

  // Passamos do último (59:58) → próxima execução é Q1 em 4:58 da hora seguinte
  const segundosFaltam = (60 - minutos - 1) * 60 + (60 - segundos) + 4 * 60 + 58;
  return { quadrante: 1, segundosRestantes: Math.max(0, segundosFaltam), minutoExecucao: 4 };
}

export function ehMomentoDeExecutar5min(): boolean {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();
  // Janela ampliada para 54s (6s de margem) — protege contra throttling de background tab
  // A chave ultimoExecutado5min previne duplo disparo dentro da mesma janela
  return MINUTOS_FIM_5MIN.includes(minutos) && segundos >= 54;
}

export function ehMomentoDeExecutarBinary5min(): boolean {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();
  // Janela ampliada para 54s (6s de margem) — protege contra throttling de background tab
  // A chave ultimoExecutado5min previne duplo disparo dentro da mesma janela
  return MINUTOS_FIM_5MIN.includes(minutos) && segundos >= 54;
}

export function ehMomentoDeGale5min(minutoAlvo: number): boolean {
  const agora = new Date();
  const minutos = agora.getMinutes();
  const segundos = agora.getSeconds();
  // Janela ampliada: dispara desde o segundo 54 do minuto anterior até 15s do minuto alvo
  // Protege contra background tab throttling que pode fazer o timer pular ticks
  if (minutos === (minutoAlvo - 1) && segundos >= 54) return true;
  if (minutos === 59 && minutoAlvo === 0 && segundos >= 54) return true;
  return minutos === minutoAlvo && segundos <= 15;
}

export function formatarCountdown5min(segundos: number): string {
  if (segundos <= 0) return '00:00';
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}
