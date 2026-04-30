import React, { useState } from 'react'

// ── Mapeamento de moedas para flag emoji ───────────────────────────────────────

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: '🇪🇺',
  USD: '🇺🇸',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
  DKK: '🇩🇰',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  MXN: '🇲🇽',
  ZAR: '🇿🇦',
  TRY: '🇹🇷',
  BRL: '🇧🇷',
  CNY: '🇨🇳',
  INR: '🇮🇳',
  RUB: '🇷🇺',
}

// ── Mapeamento de cripto para imagem CoinGecko ─────────────────────────────────

const CRYPTO_IMAGES: Record<string, string> = {
  BTC:  'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ETH:  'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  BNB:  'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  SOL:  'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  ADA:  'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  XRP:  'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  DOT:  'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  LTC:  'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
  MATIC:'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
  UNI:  'https://assets.coingecko.com/coins/images/12504/large/uni.jpg',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
  XLM:  'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg',
  ALGO: 'https://assets.coingecko.com/coins/images/4380/large/download.png',
  FTM:  'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png',
  SAND: 'https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg',
  MANA: 'https://assets.coingecko.com/coins/images/878/large/decentraland-mana.png',
}

// ── Derivação do tipo e partes do ativo ───────────────────────────────────────

type AtivoInfo =
  | { tipo: 'forex';  base: string; quote: string }
  | { tipo: 'cripto'; symbol: string; imageUrl: string }
  | { tipo: 'desconhecido'; label: string }

export function parseAtivo(displayName: string): AtivoInfo {
  // Remove sufixo OTC se houver: "EUR/USD (OTC)" → "EUR/USD"
  const clean = displayName.replace(/\s*\(OTC\)/i, '').trim()

  // Forex: tem "/" e ambas as partes são moedas conhecidas
  if (clean.includes('/')) {
    const [base, quote] = clean.split('/')
    if (CURRENCY_FLAGS[base] || CURRENCY_FLAGS[quote]) {
      return { tipo: 'forex', base, quote }
    }
    // Cripto com barra (ex: BTC/USD, ETH/USDT)
    const cryptoBase = base?.toUpperCase()
    if (cryptoBase && CRYPTO_IMAGES[cryptoBase]) {
      return { tipo: 'cripto', symbol: cryptoBase, imageUrl: CRYPTO_IMAGES[cryptoBase] }
    }
  }

  // Cripto sem barra (ex: BTCUSDT)
  for (const [sym, url] of Object.entries(CRYPTO_IMAGES)) {
    if (clean.toUpperCase().startsWith(sym)) {
      return { tipo: 'cripto', symbol: sym, imageUrl: url }
    }
  }

  return { tipo: 'desconhecido', label: clean.slice(0, 3).toUpperCase() }
}

// ── Componente AtivoIcon ───────────────────────────────────────────────────────

interface AtivoIconProps {
  displayName: string
  size?: number
}

const AtivoIcon: React.FC<AtivoIconProps> = ({ displayName, size = 36 }) => {
  const info = parseAtivo(displayName)
  const [imgError, setImgError] = useState(false)

  if (info.tipo === 'forex') {
    const baseFlag  = CURRENCY_FLAGS[info.base]  ?? '🏳'
    const quoteFlag = CURRENCY_FLAGS[info.quote] ?? '🏳'
    return (
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/40"
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.38, lineHeight: 1, letterSpacing: '-0.05em' }}>
          {baseFlag}{quoteFlag}
        </span>
      </div>
    )
  }

  if (info.tipo === 'cripto' && !imgError) {
    return (
      <div
        className="relative shrink-0 rounded-xl overflow-hidden border border-slate-700/40 bg-slate-800/60"
        style={{ width: size, height: size }}
      >
        <img
          src={info.imageUrl}
          alt={info.symbol}
          className="w-full h-full object-contain p-[15%]"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: iniciais do ativo
  const label = info.tipo === 'desconhecido' ? info.label :
    info.tipo === 'cripto' ? info.symbol.slice(0, 3) : '???'

  return (
    <div
      className="relative shrink-0 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span className="font-bold text-slate-300" style={{ fontSize: size * 0.28 }}>
        {label}
      </span>
    </div>
  )
}

export default AtivoIcon
