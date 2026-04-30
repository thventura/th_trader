# CLAUDE.md — TradeMaster

## Visão Geral

TradeMaster é uma plataforma de gestão e acompanhamento para traders. Permite registrar operações, monitorar banca, acompanhar mindset psicológico (com análise via Gemini AI), assistir aulas e gerenciar perfil. Possui painel administrativo com aprovação de usuários.

## Stack Tecnológica

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Frontend      | React 19 + TypeScript               |
| Build         | Vite 6                              |
| Estilização   | TailwindCSS 4 (plugin Vite)         |
| Roteamento    | React Router DOM 7                  |
| Backend/DB    | Supabase (auth + database)          |
| IA            | Google Gemini 2.5 Flash (`@google/genai`) |
| Gráficos      | Recharts 3                          |
| Animações     | Motion (Framer Motion) 12           |
| Ícones        | Lucide React                        |

## Estrutura de Pastas

```
protocolo 3p/
├── trademaster/
│   ├── src/
│   │   ├── App.tsx              # Roteamento principal + hook useAuth
│   │   ├── main.tsx             # Entry point React
│   │   ├── index.css            # Estilos globais (importa Tailwind)
│   │   ├── types.ts             # Interfaces TypeScript (Profile, Operacao, SessaoMindset, Aula, Modulo)
│   │   ├── components/
│   │   │   └── Layout.tsx       # Layout principal (sidebar + header)
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Cliente Supabase
│   │   │   ├── gemini.ts        # Integração Gemini AI (análise de mindset)
│   │   │   └── utils.ts         # Utilitários (cn, formatadores)
│   │   └── pages/
│   │       ├── Dashboard.tsx    # Painel principal com métricas
│   │       ├── Operacoes.tsx    # Registro e histórico de trades
│   │       ├── Mindset.tsx      # Check-in psicológico + recomendação IA
│   │       ├── Aulas.tsx        # Módulos de aprendizado
│   │       ├── Corretora.tsx    # Info sobre corretoras
│   │       ├── Perfil.tsx       # Configurações do perfil
│   │       ├── Admin.tsx        # Painel administrativo
│   │       ├── Login.tsx        # Tela de login/registro
│   │       └── WaitingApproval.tsx  # Tela de espera de aprovação
│   ├── .env.example             # Template de variáveis de ambiente
│   ├── index.html               # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── CLAUDE.md                    # ← Este arquivo (raiz do projeto)
└── .claude/                     # Configurações do Claude
```

## Comandos Essenciais

```bash
cd trademaster        # Entrar no diretório do app
npm install           # Instalar dependências
npm run dev           # Servidor dev na porta 3000
npm run build         # Build de produção
npm run lint          # Verificação TypeScript (tsc --noEmit)
npm run preview       # Preview do build
```

## Variáveis de Ambiente

Arquivo `.env.local` na pasta `trademaster/`:

```env
GEMINI_API_KEY=         # Chave da API Google Gemini
SUPABASE_URL=           # URL do projeto Supabase (usar prefixo VITE_ no código)
SUPABASE_ANON_KEY=      # Chave anônima do Supabase (usar prefixo VITE_ no código)
APP_URL=                # URL da aplicação
```

> **Nota:** No código, as variáveis Supabase são acessadas como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` via `import.meta.env`. A `GEMINI_API_KEY` é injetada via `process.env` pelo Vite config.

## Modelos de Dados (types.ts)

- **Profile** — Perfil do usuário (banca, stop, risco, role admin/user, aprovação)
- **Operacao** — Trade registrado (mercado forex/cripto, direção, resultado, payout)
- **SessaoMindset** — Check-in diário (sono, estresse, energia, emocional, recomendação IA)
- **Aula** — Conteúdo educacional com vídeo
- **Modulo** — Agrupamento de aulas

## Autenticação e Autorização

- **Auth atual:** Hook `useAuth` em `App.tsx` usando `localStorage` (mock)
- **Roles:** `admin` e `user`
- **Fluxo:** Login → Se não aprovado por admin → Tela de espera → Se aprovado → App completo
- **Admin:** Acesso ao painel `/admin` para gerenciar usuários

## Convenções de Código

- **Idioma:** Todo o código de interface e variáveis de domínio em **português**
- **Componentes:** Functional components com export default
- **Estilos:** Classes Tailwind diretamente no JSX, utilitário `cn()` para merge condicional
- **Tipos:** Interfaces centralizadas em `types.ts`
- **Path alias:** `@/` aponta para a raiz do projeto
- **Diretório de trabalho:** Todo o código do app fica em `trademaster/`

## Integração com Gemini AI

A função `analyzeMindset()` em `src/lib/gemini.ts` envia dados do check-in psicológico e últimas operações para o Gemini. Retorna um JSON com:
- `pronto: boolean` — Se o trader está apto a operar
- `recomendacao_ia: string` — Justificativa em português

## Diretrizes para Modificações

1. **Manter consistência visual:** Usar o design system existente (Tailwind, dark mode com `slate-950`)
2. **Novos tipos:** Adicionar em `trademaster/src/types.ts`
3. **Novas páginas:** Criar em `trademaster/src/pages/`, registrar rota em `App.tsx`, adicionar no menu em `Layout.tsx`
4. **Novos serviços:** Criar em `trademaster/src/lib/`
5. **Componentes reutilizáveis:** Criar em `trademaster/src/components/`
6. **Nunca commitar** `.env.local` ou chaves de API
