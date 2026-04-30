import type {
    Vela,
    VelaClassificadaLP,
    ConceitoLP,
    SinalLP,
    MarcacaoLP,
    AnaliseLogicaPreco,
    CicloMercado,
} from '../types';

// ── Constantes ──

const LIMIAR_DOJI = 0.07;        // corpo < 7% do range = doji (era 10%, apertado para reduzir falsos)
const LIMIAR_FORCA = 2.0;        // corpo > 2x média = vela de força
const LIMIAR_FORCA_CONT = 1.5;   // VFC: corpo > 1.5x média + pavios em ambos lados
const TOLERANCIA_NIVEL = 0.0003;  // tolerância para considerar "mesmo nível" (0.03%)
const MIN_VELAS = 10;            // mínimo de velas para análise
const MAX_MARCACOES = 30;        // limitar marcações ativas

// ── Classificação de Vela ──

export function classificarVelaLP(vela: Vela): VelaClassificadaLP {
    const corpo = Math.abs(vela.fechamento - vela.abertura);
    const range = vela.maxima - vela.minima;
    const pavioSuperior = vela.maxima - Math.max(vela.abertura, vela.fechamento);
    const pavioInferior = Math.min(vela.abertura, vela.fechamento) - vela.minima;
    const cor: 'alta' | 'baixa' = vela.fechamento >= vela.abertura ? 'alta' : 'baixa';

    const topCorpo = Math.max(vela.abertura, vela.fechamento);
    const botCorpo = Math.min(vela.abertura, vela.fechamento);
    const percentual50 = (topCorpo + botCorpo) / 2;

    let tipo: VelaClassificadaLP['tipo'] = 'normal';
    if (range > 0 && corpo / range < LIMIAR_DOJI) {
        tipo = 'doji';
    }

    return { vela, tipo, corpo, pavioSuperior, pavioInferior, range, cor, percentual50 };
}

function corpoMedio(classificadas: VelaClassificadaLP[], ultimas: number = 5): number {
    const slice = classificadas.slice(-ultimas);
    if (slice.length === 0) return 0;
    return slice.reduce((s, v) => s + v.corpo, 0) / slice.length;
}

function marcarForca(classificadas: VelaClassificadaLP[]): void {
    for (let i = 0; i < classificadas.length; i++) {
        const media = corpoMedio(classificadas.slice(0, i), 5);
        if (media > 0 && classificadas[i].corpo > LIMIAR_FORCA * media) {
            const v = classificadas[i];
            if (v.pavioSuperior > v.corpo * 0.3 && v.pavioInferior > v.corpo * 0.3) {
                classificadas[i] = { ...v, tipo: 'forca_continuacao' };
            } else {
                classificadas[i] = { ...v, tipo: 'forca' };
            }
        }

        // Final de Taxa: corpo pequeno após 2+ velas na mesma direção (encerra tendência)
        if (i >= 2 && classificadas[i].tipo === 'normal') {
            const v = classificadas[i];
            let consecutivas = 0;
            let somaCorpoAnteriores = 0;
            for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
                if (classificadas[j].cor === v.cor) {
                    consecutivas++;
                    somaCorpoAnteriores += classificadas[j].corpo;
                } else break;
            }
            if (consecutivas >= 2) {
                const mediaAnteriores = somaCorpoAnteriores / consecutivas;
                const pavioOposto = v.cor === 'alta' ? v.pavioSuperior : v.pavioInferior;
                // Corpo < 40% da média anterior + pavio oposto > corpo = final de taxa
                if (mediaAnteriores > 0 && v.corpo < mediaAnteriores * 0.4 && pavioOposto > v.corpo) {
                    classificadas[i] = { ...v, tipo: 'final_taxa' };
                }
            }
        }
    }
}

// ── Detecção de Ciclo de Mercado ──

function detectarCicloMercado(cls: VelaClassificadaLP[]): CicloMercado {
    if (cls.length < 10) return 'consolidado';

    const ultimas = cls.slice(-20);
    const total = ultimas.length;

    // Contagem de direção
    let alta = 0, baixa = 0, dojis = 0;
    for (const v of ultimas) {
        if (v.tipo === 'doji') dojis++;
        else if (v.cor === 'alta') alta++;
        else baixa++;
    }

    // Acumulado: maioria dojis ou corpos muito pequenos (65%, era 50%)
    if (dojis >= total * 0.65) return 'acumulado';

    // Range total das últimas velas
    const maxPreco = Math.max(...ultimas.map(v => v.vela.maxima));
    const minPreco = Math.min(...ultimas.map(v => v.vela.minima));
    const rangeTotal = maxPreco - minPreco;
    const mediaCorpo = ultimas.reduce((s, v) => s + v.corpo, 0) / total;

    // Consolidado: range apertado
    if (rangeTotal < mediaCorpo * 2.5) return 'consolidado';

    // Higher highs / Lower lows para tendência
    let higherHighs = 0, lowerLows = 0;
    for (let i = 3; i < ultimas.length; i++) {
        if (ultimas[i].vela.maxima > ultimas[i - 3].vela.maxima) higherHighs++;
        if (ultimas[i].vela.minima < ultimas[i - 3].vela.minima) lowerLows++;
    }

    const ehTendenciaAlta = alta >= total * 0.65 && higherHighs >= 5;
    const ehTendenciaBaixa = baixa >= total * 0.65 && lowerLows >= 5;

    // Verificar se as últimas 1-3 velas são correção (contra a tendência principal)
    const ultimas3 = cls.slice(-3);
    const correcaoAlta = ultimas3.filter(v => v.cor === 'baixa').length;
    const correcaoBaixa = ultimas3.filter(v => v.cor === 'alta').length;

    if (ehTendenciaAlta) {
        if (correcaoAlta >= 1 && correcaoAlta <= 3) return 'correcao_tendencia';
        return 'tendencial_alta';
    }
    if (ehTendenciaBaixa) {
        if (correcaoBaixa >= 1 && correcaoBaixa <= 3) return 'correcao_tendencia';
        return 'tendencial_baixa';
    }

    // Correção lateral: sem novas altas/baixas significativas
    if (higherHighs <= 1 && lowerLows <= 1) return 'correcao_lateral';

    return 'consolidado';
}

// ── Pressão de Pavios (Confluência) ──

function calcularPressaoPavios(cls: VelaClassificadaLP[]): { direcao: 'alta' | 'baixa' | null; intensidade: number } {
    const ultimas = cls.slice(-8);
    if (ultimas.length < 3) return { direcao: null, intensidade: 0 };

    let pressaoAlta = 0;  // pavios inferiores = rejeição de baixa = pressão de alta
    let pressaoBaixa = 0; // pavios superiores = rejeição de alta = pressão de baixa

    for (const v of ultimas) {
        if (v.range > 0) {
            pressaoAlta += v.pavioInferior / v.range;
            pressaoBaixa += v.pavioSuperior / v.range;
        }
    }

    const diff = pressaoAlta - pressaoBaixa;
    if (Math.abs(diff) < 0.5) return { direcao: null, intensidade: 0 };

    return {
        direcao: diff > 0 ? 'alta' : 'baixa',
        intensidade: Math.min(Math.abs(diff) / ultimas.length * 100, 20), // max +/- 20
    };
}

// ── Atualização de Rompimentos nas Marcações ──

function atualizarRompimentos(marcacoes: MarcacaoLP[], cls: VelaClassificadaLP[]): void {
    if (cls.length < 2) return;
    const ultima = cls[cls.length - 1];
    const penultima = cls[cls.length - 2];

    for (let i = 0; i < marcacoes.length; i++) {
        const m = marcacoes[i];
        if (!m.ativa) continue;

        // Verificar se o preço cruzou a marcação entre as duas últimas velas
        const precoAntes = penultima.vela.fechamento;
        const precoAgora = ultima.vela.fechamento;
        const cruzou = (precoAntes < m.preco && precoAgora > m.preco) ||
                        (precoAntes > m.preco && precoAgora < m.preco);

        if (cruzou) {
            marcacoes[i] = { ...m, rompimentos: m.rompimentos + 1 };
            if (marcacoes[i].rompimentos >= 3) {
                marcacoes[i] = { ...marcacoes[i], ativa: false };
            }
        }
    }
}

function nivelProximo(a: number, b: number, tolerancia?: number): boolean {
    const tol = tolerancia ?? TOLERANCIA_NIVEL;
    const base = Math.max(Math.abs(a), Math.abs(b), 0.0001);
    return Math.abs(a - b) / base < tol;
}

function topoVela(v: VelaClassificadaLP): number {
    return Math.max(v.vela.abertura, v.vela.fechamento);
}

function fundoVela(v: VelaClassificadaLP): number {
    return Math.min(v.vela.abertura, v.vela.fechamento);
}

// ── Detecção de Conceitos ──

function detectarComando(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 4) return sinais;

    for (let i = 2; i < cls.length - 1; i++) {
        const anterior = cls[i - 1];
        const atual = cls[i];
        const proxima = cls[i + 1];

        // Comando: segunda vela do movimento (mesma cor que anterior, corpo forte)
        if (anterior.cor === atual.cor && atual.corpo > anterior.corpo * 0.7) {
            // Verificar se é segunda vela do movimento
            const ehSegunda = i >= 2 && cls[i - 2].cor !== anterior.cor;

            if (ehSegunda) {
                // Se próxima vela trava no nível do comando e depois rompe
                const nivelComando = atual.cor === 'alta' ? topoVela(atual) : fundoVela(atual);

                if (proxima.cor === atual.cor &&
                    nivelProximo(fundoVela(proxima), nivelComando, TOLERANCIA_NIVEL * 2)) {
                    sinais.push({
                        conceito: 'comando',
                        direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 65,
                        descricao: `Comando na segunda do movimento - ${atual.cor === 'alta' ? 'CALL' : 'PUT'}`,
                        velaReferencia: i,
                        timestamp: atual.vela.timestamp,
                    });
                }
            }
        }

        // Retração no pico do comando e travamento reverso
        if (i >= 3 && cls[i - 2].cor !== cls[i - 1].cor &&
            cls[i - 1].cor === cls[i].cor && proxima.cor !== atual.cor) {
            // Reversão após travamento no comando
            const nivelPico = atual.cor === 'alta' ? atual.vela.maxima : atual.vela.minima;
            if (nivelProximo(
                proxima.cor === 'alta' ? fundoVela(proxima) : topoVela(proxima),
                nivelPico, TOLERANCIA_NIVEL * 3
            )) {
                sinais.push({
                    conceito: 'comando',
                    direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 60,
                    descricao: `Retração no pico do comando - travar e reverter`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarDesinstalacao(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 3; i < cls.length - 1; i++) {
        const atual = cls[i];
        const anterior = cls[i - 1];
        const proxima = cls[i + 1];

        // Desinstalação mesma cor dentro de preço fechado
        if (atual.cor === anterior.cor) {
            const atualRange = [fundoVela(atual), topoVela(atual)];
            const anteriorRange = [fundoVela(anterior), topoVela(anterior)];

            // Vela atual dentro do range da anterior (preço fechado)
            if (atualRange[0] >= anteriorRange[0] - atual.range * 0.1 &&
                atualRange[1] <= anteriorRange[1] + atual.range * 0.1) {
                sinais.push({
                    conceito: 'desinstalacao',
                    direcao: atual.cor === 'alta' ? 'venda' : 'compra',
                    confianca: 55,
                    descricao: `Desinstalação mesma cor dentro de preço fechado`,
                    velaReferencia: i,
                    timestamp: atual.vela.timestamp,
                });
            }
        }

        // Cor contrária no 50% da vela de controle/força
        if (proxima.cor !== atual.cor && atual.tipo === 'forca') {
            const p50 = atual.percentual50;
            const proximoCorpo = proxima.cor === 'alta' ? fundoVela(proxima) : topoVela(proxima);
            if (nivelProximo(proximoCorpo, p50, TOLERANCIA_NIVEL * 3)) {
                sinais.push({
                    conceito: 'desinstalacao',
                    direcao: proxima.cor === 'alta' ? 'venda' : 'compra',
                    confianca: 60,
                    descricao: `Desinstalação: cor contrária no 50% da vela de força`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarExaustao(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 3; i < cls.length - 1; i++) {
        const atual = cls[i];
        const anterior = cls[i - 1];
        const anteAnterior = cls[i - 2];

        // Sair da dupla posição e expirar rompendo lote dentro de preço fechado
        if (anteAnterior.cor === anterior.cor && anterior.cor !== atual.cor) {
            // Dupla posição anterior + exaustão
            const nivelDupla = anterior.cor === 'alta' ? topoVela(anterior) : fundoVela(anterior);
            const nivelDuplaAnte = anteAnterior.cor === 'alta' ? topoVela(anteAnterior) : fundoVela(anteAnterior);

            if (nivelProximo(nivelDupla, nivelDuplaAnte, TOLERANCIA_NIVEL * 3)) {
                // Exaustão: vela atual rompe e depois retrai
                if (atual.corpo < anterior.corpo * 0.5) {
                    sinais.push({
                        conceito: 'exaustao',
                        direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 55,
                        descricao: `Exaustão após dupla posição - entrada ao passar do pavio`,
                        velaReferencia: i,
                        timestamp: atual.vela.timestamp,
                    });
                }
            }
        }
    }

    return sinais;
}

function detectarLotes(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 6) return sinais;

    for (let i = 4; i < cls.length - 1; i++) {
        const atual = cls[i];

        // Retorno e conexão em vela com alvo
        // Identificar DF (defesa) no nível
        // Procurar sequência de velas formando lote (mesma direção com alvos)
        let loteConsecutivo = 0;
        for (let j = i; j >= Math.max(0, i - 5); j--) {
            if (cls[j].cor === atual.cor) loteConsecutivo++;
            else break;
        }

        if (loteConsecutivo >= 3) {
            // Nova alta de continuação (NAC) com pavios de impulso
            let paviosImpulso = 0;
            for (let j = i - loteConsecutivo + 1; j <= i; j++) {
                if (j < 0) continue;
                const v = cls[j];
                if (atual.cor === 'alta' && v.pavioInferior > v.corpo * 0.3) paviosImpulso++;
                if (atual.cor === 'baixa' && v.pavioSuperior > v.corpo * 0.3) paviosImpulso++;
            }

            if (paviosImpulso >= 3) {
                sinais.push({
                    conceito: 'lote',
                    direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 60,
                    descricao: `Lote com ${paviosImpulso} pavios de impulso - continuação`,
                    velaReferencia: i,
                    timestamp: atual.vela.timestamp,
                });

                // Marcar nível do lote
                marcacoes.push({
                    preco: atual.cor === 'alta' ? fundoVela(atual) : topoVela(atual),
                    tipo: 'lote',
                    ativa: true,
                    criadaEm: atual.vela.timestamp,
                    rompimentos: 0,
                });
            }
        }

        // Retorno para última vela do lote quando VF presente
        if (atual.tipo === 'forca' && i >= 2) {
            const ultimaDoLote = cls[i - 1];
            if (ultimaDoLote.cor === atual.cor) {
                marcacoes.push({
                    preco: atual.cor === 'alta' ? fundoVela(ultimaDoLote) : topoVela(ultimaDoLote),
                    tipo: 'lote',
                    ativa: true,
                    criadaEm: atual.vela.timestamp,
                    rompimentos: 0,
                });
            }
        }
    }

    return sinais;
}

function detectarVelaForca(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 4) return sinais;

    for (let i = 1; i < cls.length - 1; i++) {
        const atual = cls[i];
        const proxima = cls[i + 1];

        if (atual.tipo !== 'forca' && atual.tipo !== 'forca_continuacao') continue;

        // Marcar abertura da VF
        marcacoes.push({
            preco: atual.vela.abertura,
            tipo: 'vela_forca',
            ativa: true,
            criadaEm: atual.vela.timestamp,
            rompimentos: 0,
        });

        // Travar na abertura da VF → romper → pegar pullback
        if (nivelProximo(
            proxima.cor === 'alta' ? fundoVela(proxima) : topoVela(proxima),
            atual.vela.abertura, TOLERANCIA_NIVEL * 3
        )) {
            sinais.push({
                conceito: 'vela_forca',
                direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                confianca: 70,
                descricao: `Travar na abertura da VF e romper - pullback`,
                velaReferencia: i + 1,
                timestamp: proxima.vela.timestamp,
            });
        }

        // VF rompe VF anterior = retrair em demandas
        if (i >= 2 && (cls[i - 1].tipo === 'forca' || cls[i - 1].tipo === 'forca_continuacao')) {
            if (atual.cor === cls[i - 1].cor) {
                sinais.push({
                    conceito: 'vela_forca',
                    direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 65,
                    descricao: `VF rompe VF - retrair em demandas, não retorna`,
                    velaReferencia: i,
                    timestamp: atual.vela.timestamp,
                });
            }
        }

        // VFC (Vela Força Continuação) com pavios em ambos lados
        if (atual.tipo === 'forca_continuacao') {
            sinais.push({
                conceito: 'vela_forca_continuacao',
                direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                confianca: 60,
                descricao: `VFC detectada - continuação com pavios bilaterais`,
                velaReferencia: i,
                timestamp: atual.vela.timestamp,
            });
        }

        // Romper VF com desinstalação cor contrária → pegar na marcação
        if (proxima.cor !== atual.cor) {
            const vfRange = atual.cor === 'alta'
                ? [atual.vela.abertura, topoVela(atual)]
                : [fundoVela(atual), atual.vela.abertura];

            // Próxima vela rompe a VF
            const rompeu = proxima.cor === 'alta'
                ? topoVela(proxima) > vfRange[1]
                : fundoVela(proxima) < vfRange[0];

            if (rompeu) {
                sinais.push({
                    conceito: 'vela_forca',
                    direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 55,
                    descricao: `Romper VF com desinstalação cor contrária`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarDuplaPosicao(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    // Procurar 2 toques no mesmo nível (suporte/resistência)
    for (let i = 2; i < cls.length - 1; i++) {
        for (let j = Math.max(0, i - 15); j < i; j++) {
            const nivelJ = cls[j].cor === 'alta' ? cls[j].vela.maxima : cls[j].vela.minima;
            const nivelI = cls[i].cor === 'alta' ? cls[i].vela.maxima : cls[i].vela.minima;

            if (nivelProximo(nivelJ, nivelI, TOLERANCIA_NIVEL * 2)) {
                const proxima = cls[i + 1];
                const ehResistencia = cls[j].vela.maxima > cls[j].vela.abertura;

                // Dupla posição → travar em comando → reverter
                if (proxima.cor !== cls[i].cor) {
                    sinais.push({
                        conceito: 'dupla_posicao',
                        direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 65,
                        descricao: `Dupla posição (${ehResistencia ? 'resistência' : 'suporte'}) - reversão`,
                        velaReferencia: i + 1,
                        timestamp: proxima.vela.timestamp,
                    });

                    marcacoes.push({
                        preco: nivelI,
                        tipo: 'defesa',
                        ativa: true,
                        criadaEm: cls[i].vela.timestamp,
                        rompimentos: 0,
                    });
                }

                // Dupla posição rompida + VF → travar com pavio → CALL
                if (proxima.cor === cls[i].cor && proxima.tipo === 'forca') {
                    sinais.push({
                        conceito: 'dupla_posicao',
                        direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 70,
                        descricao: `Dupla posição rompida com VF - continuação`,
                        velaReferencia: i + 1,
                        timestamp: proxima.vela.timestamp,
                    });
                }

                break; // só pegar a primeira dupla de cada vela
            }
        }
    }

    return sinais;
}

function detectarTriplaPosicao(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 6) return sinais;

    // 3 toques no mesmo nível
    for (let i = 4; i < cls.length - 1; i++) {
        let toques = 0;
        const nivelRef = cls[i].cor === 'alta' ? cls[i].vela.maxima : cls[i].vela.minima;

        for (let j = Math.max(0, i - 12); j <= i; j++) {
            const nivelJ = cls[j].cor === 'alta' ? cls[j].vela.maxima : cls[j].vela.minima;
            if (nivelProximo(nivelJ, nivelRef, TOLERANCIA_NIVEL * 2)) {
                toques++;
            }
        }

        if (toques >= 3) {
            const proxima = cls[i + 1];
            // Travar ou demonstrar fraqueza → joga preço
            sinais.push({
                conceito: 'tripla_posicao',
                direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                confianca: 70,
                descricao: `Tripla posição (${toques} toques) - alta probabilidade de reversão`,
                velaReferencia: i + 1,
                timestamp: proxima.vela.timestamp,
            });
        }
    }

    return sinais;
}

function detectarNovaAlta(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 3; i < cls.length - 1; i++) {
        const atual = cls[i];

        // Nova alta: máxima atual supera todas as anteriores recentes
        let ehNovaAlta = true;
        for (let j = Math.max(0, i - 6); j < i; j++) {
            if (cls[j].vela.maxima >= atual.vela.maxima) {
                ehNovaAlta = false;
                break;
            }
        }

        if (ehNovaAlta && atual.cor === 'alta') {
            const proxima = cls[i + 1];

            // Retrai acima do pavio, nova alta do comando
            marcacoes.push({
                preco: atual.vela.maxima,
                tipo: 'nova_posicao',
                ativa: true,
                criadaEm: atual.vela.timestamp,
                rompimentos: 0,
            });

            // Toca no corpo da nova alta
            if (nivelProximo(topoVela(proxima), topoVela(atual), TOLERANCIA_NIVEL * 3) ||
                nivelProximo(fundoVela(proxima), topoVela(atual), TOLERANCIA_NIVEL * 3)) {
                sinais.push({
                    conceito: 'nova_alta',
                    direcao: 'compra',
                    confianca: 60,
                    descricao: `Toque no corpo da nova alta - CALL`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }

            // Fica dentro do pavio de defesa
            if (proxima.vela.minima >= atual.vela.abertura) {
                sinais.push({
                    conceito: 'nova_alta',
                    direcao: 'compra',
                    confianca: 65,
                    descricao: `Nova alta com defesa no pavio - continuação CALL`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarNovaBaixa(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 3; i < cls.length - 1; i++) {
        const atual = cls[i];

        // Nova baixa: mínima atual abaixo de todas as anteriores recentes
        let ehNovaBaixa = true;
        for (let j = Math.max(0, i - 6); j < i; j++) {
            if (cls[j].vela.minima <= atual.vela.minima) {
                ehNovaBaixa = false;
                break;
            }
        }

        if (ehNovaBaixa && atual.cor === 'baixa') {
            const proxima = cls[i + 1];

            marcacoes.push({
                preco: atual.vela.minima,
                tipo: 'nova_posicao',
                ativa: true,
                criadaEm: atual.vela.timestamp,
                rompimentos: 0,
            });

            // Travar no pavio da nova baixa → reverte pra CALL
            if (proxima.cor === 'alta' &&
                nivelProximo(proxima.vela.minima, atual.vela.minima, TOLERANCIA_NIVEL * 3)) {
                sinais.push({
                    conceito: 'nova_baixa',
                    direcao: 'compra',
                    confianca: 60,
                    descricao: `Travar no pavio da nova baixa - reverter CALL`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }

            // Nova baixa rompe comando → pullback PUT
            if (proxima.cor === 'baixa') {
                sinais.push({
                    conceito: 'nova_baixa',
                    direcao: 'venda',
                    confianca: 55,
                    descricao: `Nova baixa rompe comando - pullback PUT`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarNovaPosicao(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 6) return sinais;

    for (let i = 4; i < cls.length - 1; i++) {
        const atual = cls[i];
        const anterior = cls[i - 1];
        const proxima = cls[i + 1];

        // Nova posição pós rompimento de lote
        // Detectar quando preço rompe um nível importante e cria nova posição
        const rompeuAlta = atual.cor === 'alta' && anterior.cor === 'baixa' &&
            topoVela(atual) > cls[i - 1].vela.maxima;
        const rompeuBaixa = atual.cor === 'baixa' && anterior.cor === 'alta' &&
            fundoVela(atual) < cls[i - 1].vela.minima;

        if (rompeuAlta || rompeuBaixa) {
            // 3 pontos da NP: abertura, 50%, fechamento
            const p1 = atual.vela.abertura;
            const p2 = atual.percentual50;
            const p3 = atual.vela.fechamento;

            marcacoes.push({
                preco: p2,
                tipo: 'nova_posicao',
                ativa: true,
                criadaEm: atual.vela.timestamp,
                rompimentos: 0,
            });

            // Pavio desinstala em um dos 3 pontos → retrai ou reverte ao tocar
            const pavioProxima = proxima.cor === 'alta' ? proxima.vela.minima : proxima.vela.maxima;
            if (nivelProximo(pavioProxima, p1, TOLERANCIA_NIVEL * 3) ||
                nivelProximo(pavioProxima, p2, TOLERANCIA_NIVEL * 3) ||
                nivelProximo(pavioProxima, p3, TOLERANCIA_NIVEL * 3)) {
                sinais.push({
                    conceito: 'nova_posicao',
                    direcao: rompeuAlta ? 'compra' : 'venda',
                    confianca: 65,
                    descricao: `Nova posição - toque nos pontos da NP`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }

        // NP formada por dupla posição → retrair dentro da limitação reverte
        if (i >= 5) {
            const dpNivel = anterior.cor === 'alta' ? anterior.vela.maxima : anterior.vela.minima;
            let temDupla = false;
            for (let k = Math.max(0, i - 6); k < i - 1; k++) {
                const nivelK = cls[k].cor === 'alta' ? cls[k].vela.maxima : cls[k].vela.minima;
                if (nivelProximo(nivelK, dpNivel, TOLERANCIA_NIVEL * 2)) {
                    temDupla = true;
                    break;
                }
            }
            if (temDupla && proxima.cor !== atual.cor) {
                sinais.push({
                    conceito: 'nova_posicao',
                    direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 60,
                    descricao: `NP por dupla posição - retrai dentro da limitação`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarPressao(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 6) return sinais;

    const ultimas = cls.slice(-8);

    // Pressão 1: dupla posição de compra = pressão de baixa
    let duplasCompra = 0;
    let duplasVenda = 0;
    for (let i = 1; i < ultimas.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nivelProximo(ultimas[j].vela.maxima, ultimas[i].vela.maxima, TOLERANCIA_NIVEL * 2)) {
                if (ultimas[i].cor === 'alta') duplasCompra++;
                else duplasVenda++;
            }
            if (nivelProximo(ultimas[j].vela.minima, ultimas[i].vela.minima, TOLERANCIA_NIVEL * 2)) {
                if (ultimas[i].cor === 'baixa') duplasVenda++;
                else duplasCompra++;
            }
        }
    }

    if (duplasCompra >= 2) {
        sinais.push({
            conceito: 'pressao',
            direcao: 'venda',
            confianca: 55,
            descricao: `Pressão: dupla posição de compra = pressão de baixa`,
            velaReferencia: cls.length - 1,
            timestamp: cls[cls.length - 1].vela.timestamp,
        });
    }
    if (duplasVenda >= 2) {
        sinais.push({
            conceito: 'pressao',
            direcao: 'compra',
            confianca: 55,
            descricao: `Pressão: dupla posição de venda = pressão de alta`,
            velaReferencia: cls.length - 1,
            timestamp: cls[cls.length - 1].vela.timestamp,
        });
    }

    // Pressão 2: pavios além do comando
    let paviosCompraAlem = 0;
    let paviosVendaAlem = 0;
    for (let i = 1; i < ultimas.length; i++) {
        if (ultimas[i].pavioSuperior > ultimas[i].corpo * 0.5) paviosVendaAlem++;
        if (ultimas[i].pavioInferior > ultimas[i].corpo * 0.5) paviosCompraAlem++;
    }

    if (paviosCompraAlem > paviosVendaAlem + 2) {
        sinais.push({
            conceito: 'pressao',
            direcao: 'compra',
            confianca: 50,
            descricao: `Pressão de pavios de compra além das demandas - CALL quando rompe`,
            velaReferencia: cls.length - 1,
            timestamp: cls[cls.length - 1].vela.timestamp,
        });
    }
    if (paviosVendaAlem > paviosCompraAlem + 2) {
        sinais.push({
            conceito: 'pressao',
            direcao: 'venda',
            confianca: 50,
            descricao: `Pressão de pavios de venda - PUT quando rompe`,
            velaReferencia: cls.length - 1,
            timestamp: cls[cls.length - 1].vela.timestamp,
        });
    }

    return sinais;
}

function detectarPressaoTendencial(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    const ultimas = cls.slice(-5);

    // Em tendência forte: retrair abaixo de 50% da vela anterior = continuação
    const penultima = ultimas[ultimas.length - 2];
    const ultima = ultimas[ultimas.length - 1];

    // Verificar tendência forte (3+ velas na mesma direção)
    let velasNaDirecao = 0;
    const direcao = ultimas[ultimas.length - 3]?.cor;
    if (direcao) {
        for (let i = ultimas.length - 3; i >= 0; i--) {
            if (ultimas[i].cor === direcao) velasNaDirecao++;
            else break;
        }
    }

    if (velasNaDirecao >= 3) {
        // Retrai abaixo de 50% da anterior = continuação
        if (ultima.cor !== penultima.cor) {
            const p50 = penultima.percentual50;
            const ultimaExtremo = ultima.cor === 'alta' ? fundoVela(ultima) : topoVela(ultima);
            const cruzou50 = penultima.cor === 'alta'
                ? ultimaExtremo < p50
                : ultimaExtremo > p50;

            if (!cruzou50) {
                // Não cruzou 50% = correção fraca = continuação
                sinais.push({
                    conceito: 'pressao_tendencial',
                    direcao: penultima.cor === 'alta' ? 'compra' : 'venda',
                    confianca: 65,
                    descricao: `Pressão tendencial: retração não passou 50% - continuação ${penultima.cor === 'alta' ? 'CALL' : 'PUT'}`,
                    velaReferencia: cls.length - 1,
                    timestamp: ultima.vela.timestamp,
                });
            }
        }
    }

    // Linhas paralelas (fechamentos alinhados)
    const fechamentos = ultimas.map(v => v.vela.fechamento);
    let descendente = true;
    let ascendente = true;
    for (let i = 1; i < fechamentos.length; i++) {
        if (fechamentos[i] >= fechamentos[i - 1]) descendente = false;
        if (fechamentos[i] <= fechamentos[i - 1]) ascendente = false;
    }

    if (descendente) {
        sinais.push({
            conceito: 'pressao_tendencial',
            direcao: 'compra',
            confianca: 55,
            descricao: `Linhas paralelas pra baixo - continuidade alta CALL`,
            velaReferencia: cls.length - 1,
            timestamp: ultima.vela.timestamp,
        });
    }
    if (ascendente) {
        sinais.push({
            conceito: 'pressao_tendencial',
            direcao: 'venda',
            confianca: 55,
            descricao: `Linhas paralelas pra cima - continuidade baixa PUT`,
            velaReferencia: cls.length - 1,
            timestamp: ultima.vela.timestamp,
        });
    }

    return sinais;
}

function detectarPrimeiroRegistro(cls: VelaClassificadaLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 3; i < cls.length - 1; i++) {
        const atual = cls[i];
        const proxima = cls[i + 1];

        // Primeiro registro: primeira vez que o preço toca um nível
        // Verificar se é um nível nunca antes tocado
        const nivelAtual = atual.cor === 'alta' ? atual.vela.maxima : atual.vela.minima;
        let primeiraVez = true;
        for (let j = 0; j < i; j++) {
            if (nivelProximo(cls[j].vela.maxima, nivelAtual, TOLERANCIA_NIVEL * 2) ||
                nivelProximo(cls[j].vela.minima, nivelAtual, TOLERANCIA_NIVEL * 2)) {
                primeiraVez = false;
                break;
            }
        }

        if (primeiraVez) {
            // Retrair no primeiro registro, ficar dentro da vela que rompe
            if (proxima.cor !== atual.cor) {
                const dentroRange = atual.cor === 'alta'
                    ? proxima.vela.minima >= atual.vela.abertura
                    : proxima.vela.maxima <= atual.vela.abertura;

                if (dentroRange) {
                    sinais.push({
                        conceito: 'primeiro_registro',
                        direcao: atual.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 60,
                        descricao: `Primeiro registro - retrai e fica dentro da vela de rompimento`,
                        velaReferencia: i + 1,
                        timestamp: proxima.vela.timestamp,
                    });
                }
            }
        }
    }

    return sinais;
}

function detectarProjecao(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 2; i < cls.length - 1; i++) {
        const atual = cls[i];
        const proxima = cls[i + 1];

        // Projeção: nível onde velas anteriores apontam como alvo
        // Expirar na primeira projeção cor contrária
        if (proxima.cor !== atual.cor) {
            const projecaoNivel = atual.cor === 'alta'
                ? topoVela(atual) + atual.corpo * 0.618
                : fundoVela(atual) - atual.corpo * 0.618;

            if (nivelProximo(
                proxima.cor === 'alta' ? topoVela(proxima) : fundoVela(proxima),
                projecaoNivel, TOLERANCIA_NIVEL * 4
            )) {
                sinais.push({
                    conceito: 'projecao',
                    direcao: proxima.cor === 'alta' ? 'venda' : 'compra',
                    confianca: 55,
                    descricao: `Projeção: expirar na primeira projeção cor contrária`,
                    velaReferencia: i + 1,
                    timestamp: proxima.vela.timestamp,
                });

                marcacoes.push({
                    preco: projecaoNivel,
                    tipo: 'projecao',
                    ativa: true,
                    criadaEm: atual.vela.timestamp,
                    rompimentos: 0,
                });
            }
        }

        // Segundo toque na marcação respeitada
        for (const m of marcacoes) {
            if (!m.ativa || m.tipo !== 'projecao') continue;
            if (nivelProximo(
                atual.cor === 'alta' ? topoVela(atual) : fundoVela(atual),
                m.preco, TOLERANCIA_NIVEL * 3
            )) {
                sinais.push({
                    conceito: 'projecao',
                    direcao: atual.cor === 'alta' ? 'venda' : 'compra',
                    confianca: 60,
                    descricao: `Segundo toque na projeção respeitada`,
                    velaReferencia: i,
                    timestamp: atual.vela.timestamp,
                });
            }
        }
    }

    return sinais;
}

function detectarLimiteETransferencia(cls: VelaClassificadaLP[], marcacoes: MarcacaoLP[]): SinalLP[] {
    const sinais: SinalLP[] = [];
    if (cls.length < 5) return sinais;

    for (let i = 2; i < cls.length - 1; i++) {
        const atual = cls[i];
        const proxima = cls[i + 1];

        // Limite: corpo trava no pavio da mesma cor (liquidação) dentro de preço fechado
        if (i >= 1) {
            const anterior = cls[i - 1];
            if (atual.cor === anterior.cor) {
                // Corpo trava no pavio da mesma cor
                const travouNoPavio = atual.cor === 'alta'
                    ? nivelProximo(topoVela(atual), anterior.vela.maxima, TOLERANCIA_NIVEL * 2)
                    : nivelProximo(fundoVela(atual), anterior.vela.minima, TOLERANCIA_NIVEL * 2);

                if (travouNoPavio) {
                    marcacoes.push({
                        preco: atual.cor === 'alta' ? anterior.vela.maxima : anterior.vela.minima,
                        tipo: 'limite',
                        ativa: true,
                        criadaEm: atual.vela.timestamp,
                        rompimentos: 0,
                    });

                    sinais.push({
                        conceito: 'limite',
                        direcao: atual.cor === 'alta' ? 'venda' : 'compra',
                        confianca: 55,
                        descricao: `Limite: corpo trava no pavio da mesma cor - liquidação`,
                        velaReferencia: i,
                        timestamp: atual.vela.timestamp,
                    });
                }
            }
        }

        // Transferência de domínio: romper e na volta travar
        if (proxima.cor !== atual.cor) {
            // Rompeu nível importante
            const nivelRompido = atual.cor === 'alta' ? topoVela(atual) : fundoVela(atual);

            // Na volta, trava (próxima não ultrapassa de volta)
            const travouNaVolta = proxima.cor === 'alta'
                ? fundoVela(proxima) >= fundoVela(atual)
                : topoVela(proxima) <= topoVela(atual);

            if (travouNaVolta && i >= 2) {
                // Verificar se houve rompimento real
                const anteAnterior = cls[i - 1];
                const houvePicoRecente = atual.cor === 'alta'
                    ? topoVela(atual) > anteAnterior.vela.maxima
                    : fundoVela(atual) < anteAnterior.vela.minima;

                if (houvePicoRecente) {
                    sinais.push({
                        conceito: 'transferencia_dominio',
                        direcao: proxima.cor === 'alta' ? 'compra' : 'venda',
                        confianca: 65,
                        descricao: `Transferência de domínio: romper e travar na volta`,
                        velaReferencia: i + 1,
                        timestamp: proxima.vela.timestamp,
                    });
                }
            }
        }

        // Domínio de venda com taxa de segurança acima do pavio
        if (atual.cor === 'baixa' && proxima.cor === 'alta') {
            // PUT na retração tende a reverter respeitando o limite
            for (const m of marcacoes) {
                if (!m.ativa || m.tipo !== 'limite') continue;
                if (nivelProximo(topoVela(proxima), m.preco, TOLERANCIA_NIVEL * 3)) {
                    sinais.push({
                        conceito: 'limite',
                        direcao: 'venda',
                        confianca: 60,
                        descricao: `Retração toca no limite - PUT respeitando o limite`,
                        velaReferencia: i + 1,
                        timestamp: proxima.vela.timestamp,
                    });
                }
            }
        }
    }

    return sinais;
}

// ── Análise de Domínio ──

function determinarDominio(cls: VelaClassificadaLP[]): 'compra' | 'venda' | 'indefinido' {
    if (cls.length < 5) return 'indefinido';

    const ultimas = cls.slice(-10);
    let corpoAlta = 0;
    let corpoBaixa = 0;
    for (const v of ultimas) {
        if (v.cor === 'alta') corpoAlta += v.corpo;
        else corpoBaixa += v.corpo;
    }

    const ratio = corpoAlta / (corpoBaixa || 0.0001);
    if (ratio > 1.5) return 'compra';
    if (ratio < 0.67) return 'venda';
    return 'indefinido';
}

// ── Motor Principal ──

export function analisarLogicaPreco(
    velas: Vela[],
    conceitosAtivos?: ConceitoLP[]
): AnaliseLogicaPreco {
    const vazio: AnaliseLogicaPreco = {
        sinais: [],
        marcacoes: [],
        conceitosAtivos: [],
        direcao_operacao: null,
        operar: false,
        confianca: 0,
        sinal_id: null,
        dominioAtual: 'indefinido',
        cicloAtual: 'consolidado',
        resumo: 'Dados insuficientes para análise',
    };

    if (velas.length < MIN_VELAS) return vazio;

    // 1. Classificar todas as velas
    const classificadas = velas.map(v => classificarVelaLP(v));
    marcarForca(classificadas);

    // 2. Detectar ciclo de mercado
    const cicloAtual = detectarCicloMercado(classificadas);

    // 3. Coletar marcações
    const marcacoes: MarcacaoLP[] = [];

    // 4. Executar cada detector
    const todosConceitos: ConceitoLP[] = [
        'comando', 'desinstalacao', 'exaustao', 'lote', 'vela_forca',
        'vela_forca_continuacao', 'dupla_posicao', 'tripla_posicao',
        'nova_alta', 'nova_baixa', 'nova_posicao', 'pressao',
        'pressao_tendencial', 'primeiro_registro', 'projecao',
        'limite', 'transferencia_dominio',
    ];

    const ativos = conceitosAtivos ?? todosConceitos;
    let todosSinais: SinalLP[] = [];

    const detectors: Record<string, () => SinalLP[]> = {
        comando: () => detectarComando(classificadas),
        desinstalacao: () => detectarDesinstalacao(classificadas),
        exaustao: () => detectarExaustao(classificadas),
        lote: () => detectarLotes(classificadas, marcacoes),
        vela_forca: () => detectarVelaForca(classificadas, marcacoes),
        vela_forca_continuacao: () => detectarVelaForca(classificadas, marcacoes),
        dupla_posicao: () => detectarDuplaPosicao(classificadas, marcacoes),
        tripla_posicao: () => detectarTriplaPosicao(classificadas),
        nova_alta: () => detectarNovaAlta(classificadas, marcacoes),
        nova_baixa: () => detectarNovaBaixa(classificadas, marcacoes),
        nova_posicao: () => detectarNovaPosicao(classificadas, marcacoes),
        pressao: () => detectarPressao(classificadas),
        pressao_tendencial: () => detectarPressaoTendencial(classificadas),
        primeiro_registro: () => detectarPrimeiroRegistro(classificadas),
        projecao: () => detectarProjecao(classificadas, marcacoes),
        limite: () => detectarLimiteETransferencia(classificadas, marcacoes),
        transferencia_dominio: () => detectarLimiteETransferencia(classificadas, marcacoes),
    };

    const conceitosDetectados = new Set<ConceitoLP>();

    for (const conceito of ativos) {
        const detector = detectors[conceito];
        if (!detector) continue;
        const sinais = detector();
        if (sinais.length > 0) {
            conceitosDetectados.add(conceito);
            todosSinais.push(...sinais);
        }
    }

    // 5. Atualizar rompimentos nas marcações (regra dos 3 rompimentos)
    atualizarRompimentos(marcacoes, classificadas);

    // 6. Filtrar apenas sinais recentes (últimas 3 velas)
    const ultimoTimestamp = velas[velas.length - 1].timestamp;
    const limiteTimestamp = velas.length >= 3
        ? velas[velas.length - 3].timestamp
        : velas[0].timestamp;

    todosSinais = todosSinais.filter(s => s.timestamp >= limiteTimestamp);

    // 7. Aplicar filtro de ciclo nos sinais (CRÍTICO para assertividade)
    for (let i = 0; i < todosSinais.length; i++) {
        const s = todosSinais[i];

        switch (cicloAtual) {
            case 'tendencial_alta':
                // Penalizar sinais de venda (contra tendência)
                if (s.direcao === 'venda') {
                    todosSinais[i] = { ...s, confianca: Math.round(s.confianca * 0.3) };
                }
                break;
            case 'tendencial_baixa':
                // Penalizar sinais de compra (contra tendência)
                if (s.direcao === 'compra') {
                    todosSinais[i] = { ...s, confianca: Math.round(s.confianca * 0.3) };
                }
                break;
            case 'correcao_tendencia':
                // MELHOR ciclo — bônus de confiança para todos
                todosSinais[i] = { ...s, confianca: Math.min(100, Math.round(s.confianca * 1.15)) };
                break;
            case 'correcao_lateral':
            case 'consolidado':
            case 'acumulado':
                // Penalizar sinais de continuação (sem reversão)
                // Conceitos de continuação: pressao_tendencial, lote
                if (s.conceito === 'pressao_tendencial' || s.conceito === 'lote') {
                    todosSinais[i] = { ...s, confianca: Math.round(s.confianca * 0.5) };
                }
                break;
        }
    }

    // 8. Calcular pressão de pavios como confluência
    const pressao = calcularPressaoPavios(classificadas);

    // 9. Ponderar confiança e determinar direção
    let votosCompra = 0;
    let votosVenda = 0;
    let pesoCompra = 0;
    let pesoVenda = 0;

    for (const sinal of todosSinais) {
        if (sinal.direcao === 'compra') {
            votosCompra++;
            pesoCompra += sinal.confianca;
        } else {
            votosVenda++;
            pesoVenda += sinal.confianca;
        }
    }

    let confiancaFinal = 0;
    let direcaoFinal: 'compra' | 'venda' | null = null;

    if (votosCompra > 0 || votosVenda > 0) {
        // Margem mínima de 30%: se compra e venda estão equilibrados, NÃO opera
        // "Se não conseguir identificar se é compra ou venda, deixa passar"
        const maiorPeso = Math.max(pesoCompra, pesoVenda);
        const margemMinima = maiorPeso * 0.4; // 40% — exige clareza direcional forte
        const diferecaPesos = Math.abs(pesoCompra - pesoVenda);

        if (diferecaPesos < margemMinima) {
            // Indeciso — pesos muito próximos, não há clareza
            direcaoFinal = null;
            confiancaFinal = 0;
        } else if (pesoCompra > pesoVenda) {
            direcaoFinal = 'compra';
            confiancaFinal = Math.round(pesoCompra / votosCompra);
        } else if (pesoVenda > pesoCompra) {
            direcaoFinal = 'venda';
            confiancaFinal = Math.round(pesoVenda / votosVenda);
        } else {
            confiancaFinal = 0;
        }

        // Bônus PROGRESSIVO por confluência de conceitos
        const conceitosNaDirecao = todosSinais.filter(s => s.direcao === direcaoFinal).length;
        if (conceitosNaDirecao === 2) confiancaFinal = Math.min(100, confiancaFinal + 15);
        else if (conceitosNaDirecao === 3) confiancaFinal = Math.min(100, confiancaFinal + 25);
        else if (conceitosNaDirecao >= 4) confiancaFinal = Math.min(100, confiancaFinal + 35);

        // Conceito único = sem confluência, LIMITAR confiança (evita falso positivo)
        if (conceitosNaDirecao < 2) {
            confiancaFinal = Math.min(confiancaFinal, 45);
        }

        // Penalidade por contradição (suavizada: -5 por voto, máx -15)
        const contraditorio = direcaoFinal === 'compra' ? votosVenda : votosCompra;
        if (contraditorio > 0) {
            confiancaFinal = Math.max(0, confiancaFinal - Math.min(15, contraditorio * 5));
        }

        // Aplicar pressão de pavios como confluência (+/- até 20%)
        if (pressao.direcao && direcaoFinal) {
            if (pressao.direcao === 'alta' && direcaoFinal === 'compra') {
                confiancaFinal = Math.min(100, confiancaFinal + Math.round(pressao.intensidade));
            } else if (pressao.direcao === 'baixa' && direcaoFinal === 'venda') {
                confiancaFinal = Math.min(100, confiancaFinal + Math.round(pressao.intensidade));
            } else if (pressao.direcao === 'alta' && direcaoFinal === 'venda') {
                confiancaFinal = Math.max(0, confiancaFinal - Math.round(pressao.intensidade));
            } else if (pressao.direcao === 'baixa' && direcaoFinal === 'compra') {
                confiancaFinal = Math.max(0, confiancaFinal - Math.round(pressao.intensidade));
            }
        }
    }

    const operar = confiancaFinal >= 55 && direcaoFinal !== null;

    // Limitar marcações (apenas ativas, máximo MAX_MARCACOES)
    const marcacoesAtivas = marcacoes.filter(m => m.ativa).slice(-MAX_MARCACOES);

    // Sinal ID para dedup — SEM direção para evitar que compra/venda oscilante gere IDs diferentes
    // Usa apenas conceitos + velaReferência = mesmo padrão = mesmo ID, independente da direção
    const sinal_id = operar
        ? `lp-${Array.from(conceitosDetectados).sort().join(',')}-${todosSinais[0]?.velaReferencia ?? 0}`
        : null;

    // Domínio atual
    const dominioAtual = determinarDominio(classificadas);

    // Resumo textual
    const conceitosArray = Array.from(conceitosDetectados);
    const cicloLabel: Record<CicloMercado, string> = {
        tendencial_alta: 'Tendencial Alta',
        tendencial_baixa: 'Tendencial Baixa',
        correcao_tendencia: 'Correção em Tendência',
        correcao_lateral: 'Correção Lateral',
        consolidado: 'Consolidado',
        acumulado: 'Acumulado',
    };

    let resumo = '';
    if (!operar) {
        resumo = todosSinais.length === 0
            ? `[${cicloLabel[cicloAtual]}] Nenhum conceito detectado no momento`
            : `[${cicloLabel[cicloAtual]}] ${conceitosArray.length} conceito(s) detectado(s), mas confiança insuficiente (${confiancaFinal}%)`;
    } else {
        const sinaisDir = todosSinais.filter(s => s.direcao === direcaoFinal);
        resumo = `[${cicloLabel[cicloAtual]}] ${direcaoFinal === 'compra' ? 'CALL' : 'PUT'} - ${confiancaFinal}% confiança | ` +
            `Conceitos: ${conceitosArray.join(', ')} | ` +
            `Domínio: ${dominioAtual} | ` +
            `${sinaisDir[0]?.descricao ?? ''}`;
    }

    return {
        sinais: todosSinais,
        marcacoes: marcacoesAtivas,
        conceitosAtivos: conceitosArray,
        direcao_operacao: operar ? direcaoFinal : null,
        operar,
        confianca: confiancaFinal,
        sinal_id,
        dominioAtual,
        cicloAtual,
        resumo,
    };
}
