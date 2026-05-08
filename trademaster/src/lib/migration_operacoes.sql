-- =============================================================================
-- MIGRATION: Tabela operacoes + colunas extras
-- Execute no Supabase: Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- 1. Criar tabela completa (idempotente — não falha se já existir)
CREATE TABLE IF NOT EXISTS operacoes (
    id          TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data        TEXT,
    hora        TEXT,
    corretora   TEXT,
    ativo       TEXT,
    mercado     TEXT,
    estrategia  TEXT,
    direcao     TEXT,
    resultado   TEXT,
    investido   NUMERIC NOT NULL DEFAULT 0,
    payout      NUMERIC NOT NULL DEFAULT 0,
    lucro       NUMERIC NOT NULL DEFAULT 0,
    timeframe   TEXT,
    confianca   NUMERIC NOT NULL DEFAULT 50,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Adicionar colunas que podem estar faltando (se tabela já existir sem elas)
ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS corretora  TEXT;
ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS mercado    TEXT;
ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS timeframe  TEXT;
ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS confianca  NUMERIC;

-- Preencher confianca com default onde for NULL (colunas recém adicionadas)
UPDATE operacoes SET confianca = 50 WHERE confianca IS NULL;

-- 3. Ativar Row Level Security
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
DROP POLICY IF EXISTS "Users can manage own operations" ON operacoes;
CREATE POLICY "Users can manage own operations" ON operacoes
    FOR ALL USING (auth.uid() = user_id);

-- 5. Índices para performance nas consultas principais
CREATE INDEX IF NOT EXISTS operacoes_user_id_idx    ON operacoes (user_id);
CREATE INDEX IF NOT EXISTS operacoes_created_at_idx ON operacoes (created_at DESC);
