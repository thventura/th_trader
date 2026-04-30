// ─────────────────────────────────────────────────────────────────────────────
// ARQUIVO DE CUSTOMIZAÇÃO WHITE-LABEL
// Ao criar um fork para um novo cliente, edite APENAS este arquivo.
// Lembre de também atualizar EstrategiaAnalise em types.ts se adicionar/remover
// estratégias do array `strategies`.
// ─────────────────────────────────────────────────────────────────────────────

export const BRANDING = {
  // ── Identidade ──────────────────────────────────────────────────────────────
  appName: 'Virtus Trader',
  platformName: 'Virtus Trader',   // nome do robô/plataforma de automação

  // ── Cor primária ─────────────────────────────────────────────────────────────
  // Injetada como variável CSS --color-apex-trader-primary em main.tsx
  primaryColor: '#3b82f6',

  // ── Logos (URLs públicas) ────────────────────────────────────────────────────
  logoUrl: 'https://i.imgur.com/s8rY6qO.png',
  logoAlt: 'Virtus Trader',
  loginLogoUrl: 'https://i.imgur.com/s8rY6qO.png',
  loginBgMobileUrl: 'https://i.imgur.com/Ov80XMJ.png',
  loginBgDesktopUrl: 'https://i.imgur.com/wXgjFrV.png',

  // ── Estratégias ativas ────────────────────────────────────────────────────────
  // Deve bater com o tipo EstrategiaAnalise em types.ts
  strategies: [
    'Quadrantes',
    'Quadrantes5min',
    'FluxoVelas',
    'LogicaDoPreco',
    'ImpulsoCorrecaoEngolfo',
    'CavaloTroia',
  ] as const,

  // Nomes de exibição das estratégias (usados em dropdowns, cards, etc.)
  strategyLabels: {
    Quadrantes: 'Quadrantes (10min)',
    Quadrantes5min: 'Quadrantes (5min)',
    FluxoVelas: 'Fluxo de Velas',
    LogicaDoPreco: 'Lógica do Preço',
    ImpulsoCorrecaoEngolfo: 'Impulso-Correção-Engolfo',
    CavaloTroia: 'Cavalo de Troia (M2, 20min)',
  } as Record<string, string>,

  // ── Gerenciamentos disponíveis ───────────────────────────────────────────────
  managements: ['Fixo', 'Martingale', 'Soros'] as const,

  // ── VornaBroker ──────────────────────────────────────────────────────────────
  vornaPlatformId: 9,

  // ── PWA / SEO ────────────────────────────────────────────────────────────────
  // shortName: nome curto exibido na tela inicial do celular (PWA)
  shortName: 'Virtus',
  // ogImageUrl: imagem de preview ao compartilhar o link em redes sociais
  ogImageUrl: 'https://i.imgur.com/FeQCDkj.png',

  // ── FORK: arquivos estáticos que precisam de atualização manual ───────────────
  // Ao criar um fork para um cliente, atualize também:
  //   public/manifest.webmanifest → campos "name", "short_name", "theme_color"
  //   index.html → <link rel="icon"> se tiver favicon personalizado
} as const;

export type BrandingStrategies = typeof BRANDING.strategies[number];
