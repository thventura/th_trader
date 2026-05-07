// Motor da Gestão P6
// Alvo fixo de 1% por sessão com até 6 níveis de proteção.
// TODOS os 6 níveis usam a mesma fórmula: (soma_anteriores + alvo) / payout.
// Os 6 valores são calculados UMA VEZ no início da sessão com a banca e payout travados.

export const ALVO_SESSAO_P6 = 0.01; // 1%
export const MAX_NIVEIS_P6 = 6;

/**
 * Calcula os 6 valores de entrada da sessão P6 de uma só vez.
 * Deve ser chamado ao iniciar sessão (WIN ou queima) com a banca travada e payout atual.
 *
 * @param banca         Saldo travado no início da sessão
 * @param payoutPercent Payout em percentual (ex: 88 para 88%)
 * @returns Array com os 6 valores [L0, L1, L2, L3, L4, L5]
 */
export function calcularP6Entradas(banca: number, payoutPercent: number): number[] {
  const alvo = banca * ALVO_SESSAO_P6;
  const payout = payoutPercent / 100;
  const entradas: number[] = [];

  for (let i = 0; i < MAX_NIVEIS_P6; i++) {
    const somaAnterior = entradas.reduce((acc, v) => acc + v, 0);
    entradas.push(parseFloat(((somaAnterior + alvo) / payout).toFixed(2)));
  }

  return entradas;
}

/**
 * Mantido para compatibilidade, mas calcularP6Entradas deve ser preferido.
 * Calcula o valor de entrada para um único nível usando perdas acumuladas.
 */
export function calcularEntradaP6(
  _nivel: number,
  bancaAtual: number,
  payoutDecimal: number,
  perdasAcumuladas: number,
): number {
  const alvo = bancaAtual * ALVO_SESSAO_P6;
  const entrada = (perdasAcumuladas + alvo) / payoutDecimal;
  return parseFloat(entrada.toFixed(2));
}
