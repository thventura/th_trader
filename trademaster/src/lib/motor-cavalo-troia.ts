import type { Vela } from '../types';

// Cavalo de Troia — Velas M2 (2 min), janelas fixas de 20 min
// Janelas iniciam em :00, :20, :40 de cada hora
// Conta 11 velas M2 → entra na vela 12 seguindo a cor da vela 11
// Momentos de entrada: segundos 0-3 dos minutos :22, :42 e :02 (hora seguinte para janela :40)
// Expiração: 2 minutos (120 segundos)

export interface AnaliseCavaloTroia {
  operar: boolean;
  direcao_operacao: 'compra' | 'venda' | null;
  confianca: number;
  resumo: string;
  sinal_id: string;
  janela_atual: string;    // ex: "07:00", "07:20", "07:40"
  velas_contadas: number;
  vela_referencia: number; // 11 ou 10 (se vela 11 era doji)
}

// Minutos de entrada: exatamente 22 min após cada janela
// :00 → entra em :22 | :20 → entra em :42 | :40 → entra em +1h:02
const MINUTOS_ENTRADA = [2, 22, 42];

function ehDoji(abertura: number, fechamento: number, maxima: number, minima: number): boolean {
  const corpo = Math.abs(fechamento - abertura);
  const range = maxima - minima;
  if (range === 0) return true;
  return corpo / range < 0.1;
}

function obterJanelaESignalId(agora: Date): { janela: string; sinal_id: string } {
  const h = agora.getHours();
  const m = agora.getMinutes();

  if (m === 2) {
    // Janela :40 da hora anterior
    const hPrev = (h - 1 + 24) % 24;
    const janela = `${hPrev.toString().padStart(2, '0')}:40`;
    return { janela, sinal_id: `cavalotroia_${janela}` };
  }
  if (m === 22) {
    const janela = `${h.toString().padStart(2, '0')}:00`;
    return { janela, sinal_id: `cavalotroia_${janela}` };
  }
  // m === 42
  const janela = `${h.toString().padStart(2, '0')}:20`;
  return { janela, sinal_id: `cavalotroia_${janela}` };
}

export function ehMomentoDeExecutarCavaloTroia(): boolean {
  const agora = new Date();
  // Janela ampliada para 6s — protege contra background tab throttling
  // A chave ultimaJanelaCavaloTroiaRef previne duplo disparo dentro da mesma janela
  return MINUTOS_ENTRADA.includes(agora.getMinutes()) && agora.getSeconds() <= 6;
}

export function proximoHorarioExecucaoCavaloTroia(): { janela: string; segundosRestantes: number } {
  const agora = new Date();
  const h = agora.getHours();
  const m = agora.getMinutes();
  const s = agora.getSeconds();

  for (const alvo of MINUTOS_ENTRADA) {
    if (m < alvo || (m === alvo && s <= 3)) {
      const segs = (alvo - m) * 60 - s;
      // Janela correspondente
      let janela: string;
      if (alvo === 2) {
        const hPrev = (h - 1 + 24) % 24;
        janela = `${hPrev.toString().padStart(2, '0')}:40`;
      } else if (alvo === 22) {
        janela = `${h.toString().padStart(2, '0')}:00`;
      } else {
        janela = `${h.toString().padStart(2, '0')}:20`;
      }
      return { janela, segundosRestantes: Math.max(0, segs) };
    }
  }

  // Próxima execução: :02 da hora seguinte
  const hNext = (h + 1) % 24;
  const segs = (60 - m - 1) * 60 + (60 - s) + 2 * 60;
  const janela = `${((hNext - 1 + 24) % 24).toString().padStart(2, '0')}:40`;
  return { janela, segundosRestantes: Math.max(0, segs) };
}

// Recebe velas M1 ordenadas por timestamp (mais antigas primeiro).
// Chamado apenas no momento de execução (ehMomentoDeExecutarCavaloTroia() == true).
export function analisarCavaloTroia(velas: Vela[]): AnaliseCavaloTroia {
  const agora = new Date();
  const { janela, sinal_id } = obterJanelaESignalId(agora);

  const semSinal: AnaliseCavaloTroia = {
    operar: false,
    direcao_operacao: null,
    confianca: 0,
    resumo: '',
    sinal_id,
    janela_atual: janela,
    velas_contadas: 0,
    vela_referencia: 11,
  };

  if (!velas || velas.length < 4) {
    return { ...semSinal, resumo: 'Velas insuficientes para análise.' };
  }

  // Ordenar e filtrar apenas velas que já fecharam (pelo menos 60s atrás)
  const agoraTs = Math.floor(agora.getTime() / 1000);
  const minuteStart = agoraTs - (agoraTs % 60);
  const fechadas = [...velas]
    .filter(v => v.timestamp > 0 && v.timestamp < minuteStart)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (fechadas.length < 4) {
    return { ...semSinal, resumo: 'Velas fechadas insuficientes.', velas_contadas: fechadas.length };
  }

  const n = fechadas.length;

  // Vela M2 número 11 = duas últimas M1 fechadas antes do momento de entrada
  const v11a = fechadas[n - 2]; // minuto-2
  const v11b = fechadas[n - 1]; // minuto-1

  const ab11 = v11a.abertura;
  const fc11 = v11b.fechamento;
  const mx11 = Math.max(v11a.maxima, v11b.maxima);
  const mn11 = Math.min(v11a.minima, v11b.minima);
  const doji11 = ehDoji(ab11, fc11, mx11, mn11);

  if (!doji11) {
    const direcao: 'compra' | 'venda' = fc11 > ab11 ? 'compra' : 'venda';
    const cor = direcao === 'compra' ? 'VERDE' : 'VERMELHA';
    return {
      operar: true,
      direcao_operacao: direcao,
      confianca: 80,
      resumo: `Vela 11 ${cor} → ${direcao.toUpperCase()} (janela ${janela}).`,
      sinal_id,
      janela_atual: janela,
      velas_contadas: 11,
      vela_referencia: 11,
    };
  }

  // Vela 11 foi doji → usar vela 10
  if (n < 6) {
    return { ...semSinal, resumo: 'Vela 11 doji e vela 10 indisponível.', velas_contadas: n };
  }

  const v10a = fechadas[n - 4]; // minuto-4
  const v10b = fechadas[n - 3]; // minuto-3

  const ab10 = v10a.abertura;
  const fc10 = v10b.fechamento;
  const mx10 = Math.max(v10a.maxima, v10b.maxima);
  const mn10 = Math.min(v10a.minima, v10b.minima);
  const doji10 = ehDoji(ab10, fc10, mx10, mn10);

  if (doji10) {
    return { ...semSinal, resumo: 'Velas 11 e 10 ambas doji. Entrada cancelada.', velas_contadas: n };
  }

  const direcao: 'compra' | 'venda' = fc10 > ab10 ? 'compra' : 'venda';
  const cor = direcao === 'compra' ? 'VERDE' : 'VERMELHA';
  return {
    operar: true,
    direcao_operacao: direcao,
    confianca: 70,
    resumo: `Vela 11 doji → vela 10 ${cor} → ${direcao.toUpperCase()} (janela ${janela}).`,
    sinal_id,
    janela_atual: janela,
    velas_contadas: 11,
    vela_referencia: 10,
  };
}
