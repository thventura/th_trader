import type { Vela, AnaliseImpulsoCorrecaoEngolfo } from '../types';
import { classificarVela } from './motor-fluxo-velas';

const MIN_VELAS_IMPULSO = 3;
const MAX_VELAS_IMPULSO = 10;
const MIN_VELAS_CORRECAO = 2;
const MAX_VELAS_CORRECAO = 5;
// Distância mínima ao pivô em unidade de preço (ajustado para forex ~4 pips)
const THRESHOLD_ESPACO_PIVO = 0.0004;

interface ResultadoImpulso {
  detectado: boolean;
  direcao: 'alta' | 'baixa' | null;
  quantidade: number;
  indexInicio: number;  // índice mais antigo (inicio do impulso)
  indexFim: number;     // índice mais recente (fim do impulso)
  fundoPivo: number;    // mínima (impulso de baixa) ou máxima (impulso de alta)
}

interface ResultadoCorrecao {
  detectada: boolean;
  quantidade: number;
  indexFim: number;
}

function detectarImpulso(velas: Vela[]): ResultadoImpulso {
  const falha: ResultadoImpulso = { detectado: false, direcao: null, quantidade: 0, indexInicio: -1, indexFim: -1, fundoPivo: 0 };

  if (velas.length < MIN_VELAS_IMPULSO + MIN_VELAS_CORRECAO + 1) return falha;

  // Deixamos as últimas (MIN_VELAS_CORRECAO + 1) velas para correção + engolfo
  // Então o impulso deve terminar antes dessas velas
  const limiteImpulsoFim = velas.length - MIN_VELAS_CORRECAO - 1;
  if (limiteImpulsoFim < MIN_VELAS_IMPULSO) return falha;

  // Procurar impulso terminando em cada posição possível (da mais recente à mais antiga)
  for (let fim = limiteImpulsoFim; fim >= MIN_VELAS_IMPULSO; fim--) {
    // Contar velas predominantemente numa direção terminando em `fim`
    let contAlta = 0;
    let contBaixa = 0;

    for (let i = fim; i >= Math.max(0, fim - MAX_VELAS_IMPULSO + 1); i--) {
      const cor = classificarVela(velas[i]);
      if (cor === 'alta') contAlta++;
      else if (cor === 'baixa') contBaixa++;
      // doji não conta mas não quebra o impulso

      const total = i === fim ? 1 : fim - i + 1;
      if (total < MIN_VELAS_IMPULSO) continue;
      if (total > MAX_VELAS_IMPULSO) break;

      const predominante = contAlta > contBaixa ? 'alta' : contBaixa > contAlta ? 'baixa' : null;
      if (!predominante) continue;

      // Exige pelo menos 60% das velas na direção dominante
      const razao = predominante === 'alta' ? contAlta / total : contBaixa / total;
      if (razao < 0.6) continue;

      const inicio = i;
      const quantidade = total;

      // Calcular fundo do pivô: extremo do impulso (mínima se baixa, máxima se alta)
      let fundoPivo: number;
      if (predominante === 'baixa') {
        fundoPivo = Math.min(...velas.slice(inicio, fim + 1).map(v => v.minima));
      } else {
        fundoPivo = Math.max(...velas.slice(inicio, fim + 1).map(v => v.maxima));
      }

      return { detectado: true, direcao: predominante, quantidade, indexInicio: inicio, indexFim: fim, fundoPivo };
    }
  }

  return falha;
}

function detectarCorrecao(
  velas: Vela[],
  indexImpulsoFim: number,
  direcaoImpulso: 'alta' | 'baixa',
): ResultadoCorrecao {
  const falha: ResultadoCorrecao = { detectada: false, quantidade: 0, indexFim: -1 };

  const inicio = indexImpulsoFim + 1;
  // A vela de engolfo deve ser a última (index velas.length - 1)
  // Então a correção vai de `inicio` até `velas.length - 2`
  const fimMax = velas.length - 2;

  if (fimMax < inicio) return falha;

  const direcaoCorrecao = direcaoImpulso === 'alta' ? 'baixa' : 'alta';
  let countCorrecao = 0;

  for (let i = inicio; i <= fimMax; i++) {
    const cor = classificarVela(velas[i]);
    if (cor === direcaoCorrecao || cor === 'doji') {
      countCorrecao++;
    } else {
      // Vela na direção do impulso interrompe a correção
      break;
    }
  }

  if (countCorrecao < MIN_VELAS_CORRECAO || countCorrecao > MAX_VELAS_CORRECAO) return falha;

  return { detectada: true, quantidade: countCorrecao, indexFim: inicio + countCorrecao - 1 };
}

function detectarEngolfo(
  velaAnterior: Vela,
  velaNova: Vela,
  direcaoEsperada: 'alta' | 'baixa',
): boolean {
  const corNova = classificarVela(velaNova);
  if (corNova !== direcaoEsperada) return false;

  const aberturaAnterior = velaAnterior.abertura;
  const fechamentoAnterior = velaAnterior.fechamento;
  const aberturaNova = velaNova.abertura;
  const fechamentoNova = velaNova.fechamento;

  const corpoAnterior = Math.abs(fechamentoAnterior - aberturaAnterior);
  const corpoNovo = Math.abs(fechamentoNova - aberturaNova);

  // Corpo da nova vela deve ser maior que 80% do anterior
  if (corpoNovo < corpoAnterior * 0.8) return false;

  if (direcaoEsperada === 'alta') {
    // Engolfo de alta: fecha acima e abre abaixo do candle anterior
    return fechamentoNova > fechamentoAnterior && aberturaNova < aberturaAnterior;
  } else {
    // Engolfo de baixa: fecha abaixo e abre acima do candle anterior
    return fechamentoNova < fechamentoAnterior && aberturaNova > aberturaAnterior;
  }
}

function validarEspacoAtePivo(
  precoAtual: number,
  fundoPivo: number,
  direcao: 'alta' | 'baixa',
): boolean {
  const distancia = Math.abs(precoAtual - fundoPivo);
  // Para impulso de baixa, o pivô é a mínima → preço atual deve estar acima
  // Para impulso de alta, o pivô é a máxima → preço atual deve estar abaixo
  if (direcao === 'baixa' && precoAtual <= fundoPivo) return false;
  if (direcao === 'alta' && precoAtual >= fundoPivo) return false;
  return distancia > THRESHOLD_ESPACO_PIVO;
}

export function analisarImpulsoCorrecaoEngolfo(velas: Vela[]): AnaliseImpulsoCorrecaoEngolfo {
  const neutro: AnaliseImpulsoCorrecaoEngolfo = {
    impulsoDetectado: false,
    direcaoImpulso: null,
    velasImpulso: 0,
    fundoPivo: 0,
    correcaoDetectada: false,
    velasCorrecao: 0,
    engolfoDetectado: false,
    direcao_operacao: null,
    temEspacoAtePivo: false,
    operar: false,
    confianca: 0,
    sinal_id: null,
    resumo: 'Aguardando padrão...',
  };

  if (velas.length < MIN_VELAS_IMPULSO + MIN_VELAS_CORRECAO + 1) return neutro;

  // 1. Detectar impulso
  const impulso = detectarImpulso(velas);
  if (!impulso.detectado || !impulso.direcao) {
    return { ...neutro, resumo: 'Sem impulso identificado.' };
  }

  // 2. Detectar correção após o impulso
  const correcao = detectarCorrecao(velas, impulso.indexFim, impulso.direcao);
  if (!correcao.detectada) {
    return {
      ...neutro,
      impulsoDetectado: true,
      direcaoImpulso: impulso.direcao,
      velasImpulso: impulso.quantidade,
      fundoPivo: impulso.fundoPivo,
      resumo: `Impulso de ${impulso.direcao} (${impulso.quantidade}v) — aguardando correção...`,
    };
  }

  // 3. Detectar engolfo: a última vela deve engolfar a penúltima
  const velaEngoloIndex = velas.length - 1;
  const velaAnteriorIndex = velaEngoloIndex - 1;
  const direcaoEngolfo = impulso.direcao; // engolfo deve ser na direção do impulso
  const engolfo = detectarEngolfo(velas[velaAnteriorIndex], velas[velaEngoloIndex], direcaoEngolfo);

  if (!engolfo) {
    return {
      ...neutro,
      impulsoDetectado: true,
      direcaoImpulso: impulso.direcao,
      velasImpulso: impulso.quantidade,
      fundoPivo: impulso.fundoPivo,
      correcaoDetectada: true,
      velasCorrecao: correcao.quantidade,
      resumo: `Impulso ${impulso.direcao} + Correção (${correcao.quantidade}v) — aguardando engolfo...`,
    };
  }

  // 4. Validar espaço até o pivô
  const precoAtual = velas[velaEngoloIndex].fechamento;
  const temEspaco = validarEspacoAtePivo(precoAtual, impulso.fundoPivo, impulso.direcao);

  // 5. Calcular confiança
  // Base 60%, +10% por cada vela extra de impulso acima de 3, +5% por correção limpa
  let confianca = 60;
  confianca += Math.min(impulso.quantidade - 3, 4) * 5; // até +20%
  if (correcao.quantidade >= 2 && correcao.quantidade <= 3) confianca += 5;
  if (temEspaco) confianca += 5;
  confianca = Math.min(confianca, 95);

  const direcao_operacao: 'compra' | 'venda' = impulso.direcao === 'alta' ? 'compra' : 'venda';
  const sinal_id = `ICE_${velas[velaEngoloIndex].timestamp}`;
  const operar = temEspaco;

  const resumo = operar
    ? `Sinal ${direcao_operacao.toUpperCase()}: impulso ${impulso.direcao} (${impulso.quantidade}v) → correção (${correcao.quantidade}v) → engolfo | Confiança ${confianca}%`
    : `Padrão formado mas sem espaço até o pivô (${impulso.fundoPivo.toFixed(5)})`;

  return {
    impulsoDetectado: true,
    direcaoImpulso: impulso.direcao,
    velasImpulso: impulso.quantidade,
    fundoPivo: impulso.fundoPivo,
    correcaoDetectada: true,
    velasCorrecao: correcao.quantidade,
    engolfoDetectado: true,
    direcao_operacao,
    temEspacoAtePivo: temEspaco,
    operar,
    confianca,
    sinal_id,
    resumo,
  };
}
