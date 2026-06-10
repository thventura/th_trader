// Gestão P10 (GDD 2.1): recuperação progressiva + soros automático + lucro alvo
export const MAX_SESSOES_P10 = 10;

export function calcularEntradaP10(
  perdasAcumuladas: number,
  lucroAlvo: number,
  payoutPercent: number
): number {
  const payout = payoutPercent / 100;
  return parseFloat(((perdasAcumuladas + lucroAlvo) / payout).toFixed(2));
}

export function calcularSorosP10(entrada: number, payoutPercent: number): number {
  const payout = payoutPercent / 100;
  return parseFloat((entrada + entrada * payout).toFixed(2));
}
