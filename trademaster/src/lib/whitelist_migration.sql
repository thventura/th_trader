-- Tabela para armazenar pré-aprovações de vendas (Cakto)
CREATE TABLE IF NOT EXISTS liberacoes_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente' (aguardando cadastro), 'concluido' (cadastro vinculado)
    event TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE liberacoes_vendas ENABLE ROW LEVEL SECURITY;

-- Apenas o Service Role (Backend) pode ler/escrever nesta tabela
-- (Por padrão, sem políticas adicionais, apenas o service_role tem acesso full)
