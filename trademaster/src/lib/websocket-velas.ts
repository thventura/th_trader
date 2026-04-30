import type { Vela, EstadoWebSocket } from '../types';
import { getSdk, obterAtivosDisponiveis, obterVelasViaRelay } from './vorna';

// NXOS WebSocket — único endpoint
const WS_NXOS = 'wss://ws.nxos.dev';

// Mapeamento de symbols para NXOS
const SYMBOL_MAP: Record<string, string> = {
  // Forex
  'EUR/USD': 'eurusd',
  'GBP/USD': 'gbpusd',
  'USD/JPY': 'usdjpy',
  'AUD/USD': 'audusd',
  'USD/CAD': 'usdcad',
  'EUR/GBP': 'eurgbp',
  'GBP/JPY': 'gbpjpy',
  'GBP/CHF': 'gbpchf',
  'EUR/JPY': 'eurjpy',
  'USD/CHF': 'usdchf',
  'NZD/USD': 'nzdusd',
  'AUD/CAD': 'audcad',
  'EUR/CHF': 'eurchf',
  'EUR/CAD': 'eurcad',
  'CHF/JPY': 'chfjpy',
  'GBP/AUD': 'gbpaud',
  'CAD/JPY': 'cadjpy',
  'CAD/CHF': 'cadchf',
  'GBP/CAD': 'gbpcad',
  'AUD/JPY': 'audjpy',
  'EUR/NZD': 'eurnzd',
  'NZD/CAD': 'nzdcad',
  'NZD/CHF': 'nzdchf',
  'AUD/NZD': 'audnzd',
  'EUR/AUD': 'euraud',

  // Cripto
  'BTC/USD': 'btcusdt',
  'BTC/USDT': 'btcusdt',
  'ETH/USDT': 'ethusdt',
  'ETH/USD': 'ethusdt',
  'BNB/USDT': 'bnbusdt',
  'SOL/USDT': 'solusdt',
  'SOL/USD': 'solusdt',

  // Ações
  'Apple': 'apple',
  'Amazon': 'amazon',
  'McDonalds': 'mcdonalds',
  'Microsoft': 'microsoft',
  'Tesla': 'tesla',

  // Metais
  'Ouro': 'gold',
  'Prata': 'silver',
  'Cobre': 'copper',

  // Índices
  'Wall Street 30': 'ws30',
  'USTech 100': 'ustec',
  'US SPX 500': 'spx500'
};

export function mapearSymbol(ativo: string): string {
  if (SYMBOL_MAP[ativo]) return SYMBOL_MAP[ativo];
  return ativo
    .replace(/\//g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function converterOHLCVNxos(
  t: number[], o: (number | string)[], h: (number | string)[], l: (number | string)[], c: (number | string)[], v: (number | string)[]
): Vela[] {
  return t.map((timestamp, i) => {
    const ab = Number(o[i]);
    const fc = Number(c[i]);
    return {
      timestamp,
      abertura: ab,
      maxima: Number(h[i]),
      minima: Number(l[i]),
      fechamento: fc,
      volume: Number(v[i]) || 0,
      cor: fc >= ab ? 'alta' as const : 'baixa' as const,
    };
  });
}

type VelaListener = (velas: Vela[]) => void;

// Abre uma conexão WebSocket e retorna quando estiver aberta
function abrirConexao(): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_NXOS);
      const timeout = setTimeout(() => { try { ws.close(); } catch {} resolve(null); }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve(ws);
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

// Envia SUBSCRIBE para um símbolo
function enviarSubscribe(ws: WebSocket, symbol: string, interval: string) {
  ws.send(JSON.stringify({
    method: 'SUBSCRIBE',
    params: { symbol, type: 'watchOHLCV', interval },
  }));
}

class ServicoVelas {
  // Conexão real-time (para watchOHLCV em Corretora/usePuma)
  private wsRealtime: WebSocket | null = null;
  private sdkQuoteSubscription: any = null;
  private currentCandle: Vela | null = null;
  private symbolAtual: string = '';
  private intervalAtual: string = '1';
  private erro: string | null = null;

  // Polling via relay (fallback quando SDK não conecta do browser)
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private pollingAtivo: boolean = false;

  // Cache de dados carregados (por ativo)
  private velasPorAtivo: Record<string, Vela[]> = {};

  // Listeners para updates real-time
  private listeners: Set<VelaListener> = new Set();

  // Abort controllers para carregamentos em andamento
  private loadingAborts: Map<string, AbortController> = new Map();

  // ==========================================
  // CONEXÃO REAL-TIME (para watchOHLCV)
  // ==========================================

  conectar(symbol: string, interval: string = '1'): void {
    const wsSymbol = mapearSymbol(symbol);
    const sdk = getSdk();

    // Mesma conexão já ativa — nada a fazer
    if (this.symbolAtual === wsSymbol && this.intervalAtual === interval) {
      if (sdk && this.sdkQuoteSubscription) return;
      if (!sdk && this.wsRealtime?.readyState === WebSocket.OPEN) return;
      if (!sdk && this.pollingAtivo) return;
    }

    this.symbolAtual = wsSymbol;
    this.intervalAtual = interval;
    this.erro = null;

    // Limpar conexões/assinaturas existentes
    this.desconectarAtivo();

    if (sdk) {
      this.iniciarRealtimeSDK(sdk, symbol, interval);
    } else {
      // Sem SDK no browser (SSID bound ao servidor) — tenta relay, depois NXOS
      this.iniciarRealtimeRelay(symbol, interval);
    }
  }

  private async iniciarRealtimeSDK(sdk: any, symbol: string, interval: string) {
    try {
      const blitz = await sdk.blitzOptions();
      const actives = blitz.getActives();
      const isOtcRequested = /\-OTC$/i.test(symbol) || symbol.toUpperCase().endsWith('(OTC)');
      const tickerBase = symbol.replace('/', '').replace(/-OTC$/i, '').replace(/\s*\(OTC\)$/i, '').toUpperCase();

      // Prefere exato (OTC vs não-OTC); fallback para qualquer match da base
      const active = actives.find((a: any) => {
        const aBase = a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase();
        const aIsOtc = /\-OTC$/i.test(a.ticker);
        return aBase === tickerBase && aIsOtc === isOtcRequested;
      }) ?? actives.find((a: any) =>
        a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase() === tickerBase
      );

      if (!active) {
        console.warn(`[SDK] Ativo ${symbol} não encontrado. Tickers Vorna disponíveis:`, actives.map((a: any) => a.ticker).join(', '));
        this.iniciarRealtimeRelay(symbol, interval);
        return;
      }

      const activeId = active.id;
      const intervalInSeconds = parseInt(interval) * 60;

      // 1. Carregar histórico inicial via SDK
      try {
        const candlesFacade = await sdk.candles();
        const history = await candlesFacade.getCandles(activeId, intervalInSeconds, { count: 300 });
        if (history && history.length > 0) {
          const velasFormatadas = history.map((c: any) => ({
            timestamp: c.from,
            abertura: c.open,
            maxima: c.max,
            minima: c.min,
            fechamento: c.close,
            volume: c.volume || 0,
            cor: c.close >= c.open ? 'alta' : 'baixa' as const,
          }));
          this.mergeVelas(mapearSymbol(symbol), velasFormatadas);
        }
      } catch (err) {
        console.error('[SDK] Erro ao carregar histórico:', err);
      }

      // 2. Assinar Quotes em tempo real
      const quotesFacade = await sdk.quotes();
      const currentQuote = await quotesFacade.getCurrentQuoteForActive(activeId);

      const onUpdate = (updatedQuote: any) => {
        const value = updatedQuote.value;
        const time = updatedQuote.time.getTime() / 1000;
        const candleStart = Math.floor(time / intervalInSeconds) * intervalInSeconds;

        if (!this.currentCandle || this.currentCandle.timestamp !== candleStart) {
          this.currentCandle = {
            timestamp: candleStart,
            abertura: value,
            maxima: value,
            minima: value,
            fechamento: value,
            volume: 0,
            cor: 'alta',
          };
        } else {
          this.currentCandle.fechamento = value;
          this.currentCandle.maxima = Math.max(this.currentCandle.maxima, value);
          this.currentCandle.minima = Math.min(this.currentCandle.minima, value);
          this.currentCandle.cor = value >= this.currentCandle.abertura ? 'alta' : 'baixa';
        }
        
        this.mergeVelas(mapearSymbol(symbol), [this.currentCandle]);
      };

      currentQuote.subscribeOnUpdate(onUpdate);
      this.sdkQuoteSubscription = { quote: currentQuote, callback: onUpdate };
      
      this.notificarEstado();
      console.log(`[SDK] Conectado e assinando quotes para ${symbol}`);
    } catch (err) {
      console.error('[SDK] Falha ao iniciar realtime:', err);
      this.iniciarRealtimeConnection(mapearSymbol(symbol), interval);
    }
  }

  private desconectarAtivo() {
    // Fechar WebSocket NXOS
    if (this.wsRealtime) {
      const old = this.wsRealtime;
      old.onclose = null;
      old.onerror = null;
      old.onmessage = null;
      this.wsRealtime = null;
      try { old.close(); } catch {}
    }

    // Cancelar assinatura SDK
    if (this.sdkQuoteSubscription) {
      try {
        this.sdkQuoteSubscription.quote.unsubscribeOnUpdate(this.sdkQuoteSubscription.callback);
      } catch {}
      this.sdkQuoteSubscription = null;
    }

    // Cancelar polling relay
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingAtivo = false;
    this.currentCandle = null;
  }

  // ── Relay real-time: carrega histórico via relay e faz polling de atualização ──

  private async iniciarRealtimeRelay(symbol: string, interval: string) {
    try {
      const ativos = await obterAtivosDisponiveis(); // já usa relay quando _sdk null
      const isOtcRequested = /\-OTC$/i.test(symbol) || symbol.toUpperCase().endsWith('(OTC)');
      const tickerBase = symbol.replace('/', '').replace(/-OTC$/i, '').replace(/\s*\(OTC\)$/i, '').toUpperCase();

      const active = ativos.find((a) => {
        const aBase = a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase();
        return aBase === tickerBase && a.isOtc === isOtcRequested;
      }) ?? ativos.find((a) =>
        a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase() === tickerBase
      );

      if (!active) {
        console.warn(`[Relay] Ativo ${symbol} não encontrado na Vorna. Tickers disponíveis:`, ativos.map(a => a.ticker).join(', '));
        this.iniciarRealtimeConnection(mapearSymbol(symbol), interval);
        return;
      }

      const size = parseInt(interval) * 60;
      const wsSymbol = mapearSymbol(symbol);

      // 1. Carregar histórico inicial (300 velas)
      const rawInit = await obterVelasViaRelay(active.id, size, undefined, 300);
      if (rawInit.length > 0) {
        const velasInit: Vela[] = rawInit.map((c) => {
          const ab = Number(c.open);
          const fc = Number(c.close);
          return {
            timestamp: Number(c.from),
            abertura: ab,
            maxima: Number(c.max),
            minima: Number(c.min),
            fechamento: fc,
            volume: Number(c.volume) || 0,
            cor: fc >= ab ? 'alta' as const : 'baixa' as const,
          };
        });
        this.mergeVelas(wsSymbol, velasInit);
        console.log(`[Relay] ${velasInit.length} velas iniciais carregadas para ${symbol}`);
      }

      // 2. Polling a cada 5s — garante dados mesmo se NXOS falhar
      this.pollingAtivo = true;
      this.notificarEstado();

      this.pollingInterval = setInterval(async () => {
        if (!this.pollingAtivo) return;
        try {
          const rawPoll = await obterVelasViaRelay(active.id, size, undefined, 5);
          if (rawPoll.length > 0) {
            const velasPoll: Vela[] = rawPoll.map((c) => {
              const ab = Number(c.open);
              const fc = Number(c.close);
              return {
                timestamp: Number(c.from),
                abertura: ab,
                maxima: Number(c.max),
                minima: Number(c.min),
                fechamento: fc,
                volume: Number(c.volume) || 0,
                cor: fc >= ab ? 'alta' as const : 'baixa' as const,
              };
            });
            this.mergeVelas(wsSymbol, velasPoll);
          }
        } catch { /* ignora erros de polling */ }
      }, 5000);

      // Para não-OTC: também tenta NXOS WebSocket para updates em tempo real
      // Se NXOS falhar, o polling acima continua fornecendo dados normalmente
      if (symbol in SYMBOL_MAP) {
        console.log(`[Relay] ${symbol} — polling 5s ativo + tentando NXOS real-time`);
        this.iniciarRealtimeConnection(wsSymbol, interval);
      } else {
        console.log(`[Relay] ${symbol} (OTC) — polling 5s`);
      }

    } catch (err) {
      console.warn(`[Relay] Falha no relay para ${symbol}, usando NXOS:`, err);
      this.iniciarRealtimeConnection(mapearSymbol(symbol), interval);
    }
  }

  private iniciarRealtimeConnection(symbol: string, interval: string) {
    try {
      const ws = new WebSocket(WS_NXOS);

      ws.onopen = () => {
        enviarSubscribe(ws, symbol, interval);
        
        // Enviar pedido de histórico inicial para ativar o stream do NXOS e preencher os gráficos Iniciais
        const timestamp = Math.floor(Date.now() / 1000);
        ws.send(JSON.stringify({
          method: 'GET_HISTORY',
          params: { symbol, interval, to: timestamp, countback: 300, firstDataRequest: true },
        }));

        this.notificarEstado();
      };

      ws.onmessage = (event) => {
        try {
          const dados = JSON.parse(event.data);
          let ativoResp = '';
          let novasVelas: Vela[] = [];

          if (dados.historyOHLCV && dados.historyOHLCV.s === 'ok') {
            ativoResp = mapearSymbol(dados.historyOHLCV.s_name || this.symbolAtual);
            novasVelas = converterOHLCVNxos(
              dados.historyOHLCV.t, dados.historyOHLCV.o, dados.historyOHLCV.h,
              dados.historyOHLCV.l, dados.historyOHLCV.c, dados.historyOHLCV.v
            );
          } else if (dados.watchOHLCV && dados.watchOHLCV.s === 'ok') {
            ativoResp = mapearSymbol(dados.watchOHLCV.s_name || this.symbolAtual);
            novasVelas = converterOHLCVNxos(
              dados.watchOHLCV.t, dados.watchOHLCV.o, dados.watchOHLCV.h,
              dados.watchOHLCV.l, dados.watchOHLCV.c, dados.watchOHLCV.v
            );
          }

          if (novasVelas.length > 0 && ativoResp) {
            this.mergeVelas(ativoResp, novasVelas);
          }
        } catch {}
      };

      ws.onerror = () => {
        this.erro = 'Erro na conexão WebSocket NXOS';
        this.notificarEstado();
      };

      ws.onclose = () => {
        // Reconectar apenas se ainda for o WebSocket ativo
        if (this.wsRealtime === ws && this.symbolAtual) {
          setTimeout(() => {
            if (this.wsRealtime === ws && this.symbolAtual) {
              this.iniciarRealtimeConnection(this.symbolAtual, this.intervalAtual);
            }
          }, 5000);
        }
        this.notificarEstado();
      };

      this.wsRealtime = ws;
    } catch {
      this.erro = 'Falha ao conectar ao NXOS WebSocket';
      this.notificarEstado();
    }
  }

  // ==========================================
  // CARREGAMENTO HISTÓRICO (conexão dedicada)
  // ==========================================

  async carregarHistoricoLongo(
    symbol: string,
    targetTimestampInicio: number,
    targetTimestampFim: number,
    onProgress?: (velaCount: number) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const wsSymbol = mapearSymbol(symbol);

    // Cancelar carregamento anterior deste símbolo
    const prevAbort = this.loadingAborts.get(wsSymbol);
    if (prevAbort) prevAbort.abort();

    const localAbort = new AbortController();
    this.loadingAborts.set(wsSymbol, localAbort);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => localAbort.abort(), { once: true });
    }

    // Limpar dados antigos deste ativo
    this.velasPorAtivo[wsSymbol] = [];

    console.log(`[WS] Carregando histórico: ${wsSymbol}, ${new Date(targetTimestampInicio * 1000).toISOString()} → ${new Date(targetTimestampFim * 1000).toISOString()}`);

    // ── Tentar SDK da Vorna primeiro ──────────────────────────────────────
    const sdk = getSdk();
    if (sdk) {
      try {
        const blitz = await sdk.blitzOptions();
        const actives = blitz.getActives();
        const isOtcRequested = /\-OTC$/i.test(symbol) || /\(OTC\)$/i.test(symbol);
        const tickerBuscado = symbol.replace('/', '').replace(/-OTC$/i, '').replace(/\s*\(OTC\)$/i, '').toUpperCase();
        const active = actives.find((a: any) => {
          const aBase = a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase();
          const aIsOtc = /\-OTC$/i.test(a.ticker);
          return aBase === tickerBuscado && aIsOtc === isOtcRequested;
        }) ?? actives.find((a: any) =>
          a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase() === tickerBuscado
        );

        if (active) {
          console.log(`[SDK] Carregando histórico via SDK para ${symbol} (id=${active.id})`);
          const candlesFacade = await sdk.candles();
          let currentTo = targetTimestampFim;
          let emptyRetries = 0;

          for (let batch = 0; batch < 300; batch++) {
            if (localAbort.signal.aborted) break;

            const candles: any[] = await candlesFacade.getCandles(active.id, 60, {
              to: currentTo,
              count: 1000,
            });

            if (!candles || candles.length === 0) {
              emptyRetries++;
              if (emptyRetries <= 3) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
              }
              break;
            }
            emptyRetries = 0;

            const velas: Vela[] = candles.map((c: any) => {
              const ab = Number(c.open);
              const fc = Number(c.close);
              return {
                timestamp: Number(c.from),
                abertura: ab,
                maxima: Number(c.max),
                minima: Number(c.min),
                fechamento: fc,
                volume: Number(c.volume) || 0,
                cor: fc >= ab ? 'alta' as const : 'baixa' as const,
              };
            });

            this.mergeVelas(wsSymbol, velas);
            const totalCarregadas = (this.velasPorAtivo[wsSymbol] || []).length;
            console.log(`[SDK] Batch ${batch} OK: +${velas.length} velas, total=${totalCarregadas}`);
            if (onProgress) onProgress(totalCarregadas);

            const maisAntiga = velas.reduce((min: number, v: Vela) => v.timestamp < min ? v.timestamp : min, Infinity);
            currentTo = maisAntiga - 60;

            if (currentTo <= targetTimestampInicio) {
              console.log(`[SDK] Cobertura completa para ${symbol}`);
              break;
            }
            if (totalCarregadas > 250000) break;

            await new Promise(r => setTimeout(r, 100));
          }

          const total = (this.velasPorAtivo[wsSymbol] || []).length;
          console.log(`[SDK] Histórico finalizado: ${symbol}, ${total} velas`);
          this.loadingAborts.delete(wsSymbol);
          return;
        }
      } catch (err) {
        console.warn(`[SDK] Falha ao carregar histórico para ${symbol}, tentando NXOS:`, err);
      }
    }
    // ── Fallback 2: Relay (SDK via servidor) ─────────────────────────────
    {
      try {
        const ativos = await obterAtivosDisponiveis();
        const isOtcRequested = /\-OTC$/i.test(symbol) || /\(OTC\)$/i.test(symbol);
        const tickerBuscado = symbol.replace('/', '').replace(/-OTC$/i, '').replace(/\s*\(OTC\)$/i, '').toUpperCase();
        const active = ativos.find((a) => {
          const aBase = a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase();
          return aBase === tickerBuscado && a.isOtc === isOtcRequested;
        }) ?? ativos.find((a) =>
          a.ticker.replace('/', '').replace(/-OTC$/i, '').toUpperCase() === tickerBuscado
        );

        if (active) {
          console.log(`[Relay] Carregando histórico via relay para ${symbol} (id=${active.id})`);
          let currentTo = targetTimestampFim;
          let emptyRetries = 0;

          for (let batch = 0; batch < 300; batch++) {
            if (localAbort.signal.aborted) break;

            const rawCandles = await obterVelasViaRelay(active.id, 60, currentTo, 1000);

            if (!rawCandles || rawCandles.length === 0) {
              emptyRetries++;
              if (emptyRetries <= 3) { await new Promise(r => setTimeout(r, 1000)); continue; }
              break;
            }
            emptyRetries = 0;

            const velas: Vela[] = rawCandles.map((c) => {
              const ab = Number(c.open);
              const fc = Number(c.close);
              return {
                timestamp: Number(c.from),
                abertura: ab,
                maxima: Number(c.max),
                minima: Number(c.min),
                fechamento: fc,
                volume: Number(c.volume) || 0,
                cor: fc >= ab ? 'alta' as const : 'baixa' as const,
              };
            });

            this.mergeVelas(wsSymbol, velas);
            const totalCarregadas = (this.velasPorAtivo[wsSymbol] || []).length;
            console.log(`[Relay] Batch ${batch} OK: +${velas.length} velas, total=${totalCarregadas}`);
            if (onProgress) onProgress(totalCarregadas);

            const maisAntiga = velas.reduce((min: number, v: Vela) => v.timestamp < min ? v.timestamp : min, Infinity);
            currentTo = maisAntiga - 60;

            if (currentTo <= targetTimestampInicio) { console.log(`[Relay] Cobertura completa para ${symbol}`); break; }
            if (totalCarregadas > 250000) break;

            await new Promise(r => setTimeout(r, 300));
          }

          const total = (this.velasPorAtivo[wsSymbol] || []).length;
          console.log(`[Relay] Histórico finalizado: ${symbol}, ${total} velas`);
          this.loadingAborts.delete(wsSymbol);
          return;
        }
      } catch (err) {
        console.warn(`[Relay] Falha ao carregar histórico para ${symbol}, tentando NXOS:`, err);
      }
    }
    // ── Fallback 3: NXOS ─────────────────────────────────────────────────

    // Abrir conexão DEDICADA para carregamento
    const ws = await abrirConexao();
    if (localAbort.signal.aborted) {
      if (ws) try { ws.close(); } catch {}
      this.loadingAborts.delete(wsSymbol);
      return;
    }
    if (!ws) {
      console.error(`[WS] Falha ao abrir conexão dedicada para ${wsSymbol}`);
      this.loadingAborts.delete(wsSymbol);
      return;
    }

    // Handler PERMANENTE — instalado UMA VEZ, nunca trocado
    // historyResolver é uma variável closure: apenas um pending por vez
    let historyResolver: ((velas: Vela[]) => void) | null = null;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const dados = JSON.parse(event.data);

        if (dados.historyOHLCV && historyResolver) {
          const resolver = historyResolver;
          historyResolver = null;

          if (dados.historyOHLCV.s === 'ok' && dados.historyOHLCV.t?.length > 0) {
            const velas = converterOHLCVNxos(
              dados.historyOHLCV.t, dados.historyOHLCV.o, dados.historyOHLCV.h,
              dados.historyOHLCV.l, dados.historyOHLCV.c, dados.historyOHLCV.v
            );
            console.log(`[WS] historyOHLCV recebido: ${velas.length} velas para ${wsSymbol}`);
            resolver(velas);
          } else {
            console.log(`[WS] historyOHLCV vazio/erro para ${wsSymbol}:`, dados.historyOHLCV?.s);
            resolver([]);
          }
          return;
        }

        // watchOHLCV e outras mensagens são consumidas normalmente (não descartadas)
      } catch (e) {
        console.error('[WS] Erro processando mensagem:', e);
      }
    };

    // Enviar SUBSCRIBE (necessário para GET_HISTORY funcionar no NXOS)
    enviarSubscribe(ws, wsSymbol, '1');

    // Aguardar SUBSCRIBE ser processado pelo servidor
    await new Promise(r => setTimeout(r, 500));

    try {
      // Sempre iniciar de NOW — a API NXOS ignora o parâmetro 'to' para datas passadas
      let currentTo = Math.floor(Date.now() / 1000);
      let emptyRetries = 0;

      for (let batch = 0; batch < 300; batch++) {
        if (localAbort.signal.aborted) {
          console.log(`[WS] Carregamento cancelado: ${wsSymbol} no batch ${batch}`);
          break;
        }

        if (ws.readyState !== WebSocket.OPEN) {
          console.warn(`[WS] Conexão fechada durante carregamento de ${wsSymbol} no batch ${batch}`);
          break;
        }

        console.log(`[WS] Batch ${batch}: ${wsSymbol}, to=${currentTo} (${new Date(currentTo * 1000).toISOString()})`);

        // Enviar GET_HISTORY e esperar resposta via historyResolver
        const velas = await new Promise<Vela[]>((resolve) => {
          const timeout = setTimeout(() => {
            historyResolver = null;
            console.warn(`[WS] Timeout batch ${batch} para ${wsSymbol}`);
            resolve([]);
          }, 15000);

          historyResolver = (v: Vela[]) => {
            clearTimeout(timeout);
            resolve(v);
          };

          ws.send(JSON.stringify({
            method: 'GET_HISTORY',
            params: {
              symbol: wsSymbol,
              interval: '1',
              to: currentTo,
              countback: 1000,
              firstDataRequest: batch === 0,
            },
          }));
        });

        if (localAbort.signal.aborted) break;

        if (velas.length === 0) {
          emptyRetries++;
          if (emptyRetries <= 3) {
            console.log(`[WS] Batch vazio, retry ${emptyRetries}/3 para ${wsSymbol}`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          console.log(`[WS] ${emptyRetries} batches vazios consecutivos para ${wsSymbol}, parando`);
          break;
        }
        emptyRetries = 0;

        // Merge velas no cache
        this.mergeVelas(wsSymbol, velas);
        const totalCarregadas = (this.velasPorAtivo[wsSymbol] || []).length;

        console.log(`[WS] Batch ${batch} OK: +${velas.length} velas, total=${totalCarregadas}`);

        if (onProgress) onProgress(totalCarregadas);

        // Mover cursor para trás baseado nas velas DESTE batch
        const maisAntiga = velas.reduce((min: number, v: Vela) => v.timestamp < min ? v.timestamp : min, Infinity);
        currentTo = maisAntiga - 60;

        // Verificar cobertura
        if (currentTo <= targetTimestampInicio) {
          console.log(`[WS] Cobertura completa para ${wsSymbol}: alcançou timestamp início`);
          break;
        }
        if (totalCarregadas > 250000) {
          console.log(`[WS] Limite de velas atingido para ${wsSymbol}: ${totalCarregadas}`);
          break;
        }

        // Pausa entre batches
        await new Promise(r => setTimeout(r, 200));
      }

      const total = (this.velasPorAtivo[wsSymbol] || []).length;
      console.log(`[WS] Carregamento finalizado: ${wsSymbol}, ${total} velas total`);
    } finally {
      historyResolver = null;
      try { ws.close(); } catch {}
      this.loadingAborts.delete(wsSymbol);
    }
  }

  cancelarCarregamento(symbol: string): void {
    const wsSymbol = mapearSymbol(symbol);
    const abort = this.loadingAborts.get(wsSymbol);
    if (abort) {
      abort.abort();
      this.loadingAborts.delete(wsSymbol);
    }
  }

  // ==========================================
  // GERENCIAMENTO DE DADOS
  // ==========================================

  private mergeVelas(ativo: string, novas: Vela[]) {
    if (!this.velasPorAtivo[ativo]) this.velasPorAtivo[ativo] = [];
    const existente = this.velasPorAtivo[ativo];

    const mapa = new Map<number, Vela>();
    existente.forEach(v => mapa.set(v.timestamp, v));
    novas.forEach(v => mapa.set(v.timestamp, v));

    this.velasPorAtivo[ativo] = Array.from(mapa.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-250000);

    this.notificarListeners(ativo);
  }

  obterVelasDeAtivo(ativo: string): Vela[] {
    const wsSymbol = mapearSymbol(ativo);
    return [...(this.velasPorAtivo[wsSymbol] || [])];
  }

  obterTodasVelas(): Vela[] {
    return [...(this.velasPorAtivo[this.symbolAtual] || [])];
  }

  obterVelasDoQuadrante(quadranteNumero: number, referencia?: Date): Vela[] {
    const inicioMinuto = (quadranteNumero - 1) * 10;
    const fimMinuto = inicioMinuto + 9;
    const agora = referencia || new Date();
    const horaAlvo = agora.getHours();

    const v = this.velasPorAtivo[this.symbolAtual] || [];
    return v.filter(vela => {
      const d = new Date(vela.timestamp * 1000);
      return d.getHours() === horaAlvo && d.getMinutes() >= inicioMinuto && d.getMinutes() <= fimMinuto;
    }).slice(-10);
  }

  obterVelasDoQuadrante5min(quadranteNumero: number, referencia?: Date): Vela[] {
    const inicioMinuto = (quadranteNumero - 1) * 5;
    const fimMinuto = inicioMinuto + 4;
    const agora = referencia || new Date();
    const horaAlvo = agora.getHours();

    const v = this.velasPorAtivo[this.symbolAtual] || [];
    return v.filter(vela => {
      const d = new Date(vela.timestamp * 1000);
      return d.getHours() === horaAlvo && d.getMinutes() >= inicioMinuto && d.getMinutes() <= fimMinuto;
    }).slice(-5);
  }

  obterVelaAtual(): Vela | null {
    const v = this.velasPorAtivo[this.symbolAtual] || [];
    return v.length > 0 ? v[v.length - 1] : null;
  }

  limparHistorico(symbol?: string): void {
    if (symbol) {
      delete this.velasPorAtivo[mapearSymbol(symbol)];
    } else {
      this.velasPorAtivo = {};
    }
    this.notificarListeners();
  }

  // ==========================================
  // LISTENERS E ESTADO
  // ==========================================

  adicionarListener(fn: VelaListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notificarListeners(ativoAlvo?: string): void {
    const alvo = ativoAlvo || this.symbolAtual;
    if (!alvo) return;

    const v = this.velasPorAtivo[alvo] || [];
    for (const listener of this.listeners) {
      listener([...v]);
    }
    window.dispatchEvent(new CustomEvent('trademaster:vela-atualizada', { detail: { ativo: alvo } }));
  }

  private notificarEstado(): void {
    window.dispatchEvent(new CustomEvent('trademaster:ws-estado'));
  }

  getEstado(): EstadoWebSocket {
    const sdkConectado = !!(getSdk() && this.sdkQuoteSubscription);
    const nxosConectado = this.wsRealtime?.readyState === WebSocket.OPEN;
    const baseConectado = sdkConectado || nxosConectado || this.pollingAtivo;

    // Se conectado mas a última vela tem mais de 90s, considera feed parado
    const ultimaVela = this.obterVelaAtual();
    const staleSec = ultimaVela ? (Date.now() / 1000 - ultimaVela.timestamp) : Infinity;
    const dadosFrescos = staleSec < 90;
    const conectado = baseConectado && dadosFrescos;

    return {
      conectado,
      symbol: this.symbolAtual,
      ultimaVela,
      erro: (!dadosFrescos && ultimaVela) ? `Velas paradas (${Math.round(staleSec)}s)` : this.erro,
    };
  }

  estaConectado(): boolean {
    const sdkConectado = !!(getSdk() && this.sdkQuoteSubscription);
    const nxosConectado = this.wsRealtime?.readyState === WebSocket.OPEN;
    return sdkConectado || nxosConectado || this.pollingAtivo;
  }

  desconectar(): void {
    // Cancelar todos os carregamentos
    for (const [, abort] of this.loadingAborts) abort.abort();
    this.loadingAborts.clear();

    // Fechar conexões e assinaturas
    this.desconectarAtivo();
  }
}

export const servicoVelas = new ServicoVelas();
