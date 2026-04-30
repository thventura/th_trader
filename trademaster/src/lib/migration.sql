-- SQL para adicionar colunas faltantes no Supabase

-- 1. Adicionar coluna 'em_breve' na tabela 'modulos'
ALTER TABLE modulos ADD COLUMN IF NOT EXISTS em_breve BOOLEAN DEFAULT FALSE;

-- 2. Garantir que a tabela 'aula_progresso' existe para rastrear o progresso individual
CREATE TABLE IF NOT EXISTS aula_progresso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    aula_id UUID REFERENCES aulas(id) ON DELETE CASCADE,
    concluida BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, aula_id)
);

-- Ativar RLS se necessário
ALTER TABLE aula_progresso ENABLE ROW LEVEL SECURITY;

-- Políticas para aula_progresso
DROP POLICY IF EXISTS "Users can see their own progress" ON aula_progresso;
CREATE POLICY "Users can see their own progress" ON aula_progresso FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON aula_progresso;
CREATE POLICY "Users can update their own progress" ON aula_progresso FOR ALL USING (auth.uid() = user_id);
