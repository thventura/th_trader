-- =============================================================================
-- SCRIPT DE SEGURANÇA COMPLETO — TradeMaster
-- Execute este script INTEIRO no SQL Editor do seu Supabase.
-- Acesse: Dashboard → SQL Editor → New Query → Cole tudo → Run
-- =============================================================================

-- ─── 1. FUNÇÃO is_admin() ────────────────────────────────────────────────────
-- Evita recursão infinita ao checar RLS dentro de RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. LIMPAR POLÍTICAS ANTIGAS (evita conflitos) ───────────────────────────
-- profiles
DROP POLICY IF EXISTS "Admins can manage all operations" ON operacoes;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can see/add their own data" ON operacoes;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own operations" ON operacoes;
DROP POLICY IF EXISTS "Admins can manage everything" ON profiles;

-- aula_progresso
DROP POLICY IF EXISTS "Users own progress" ON aula_progresso;
DROP POLICY IF EXISTS "Admins manage all progress" ON aula_progresso;

-- comentarios
DROP POLICY IF EXISTS "Users own comments" ON comentarios;
DROP POLICY IF EXISTS "Admins manage all comments" ON comentarios;
DROP POLICY IF EXISTS "Authenticated users read comments" ON comentarios;

-- avisos
DROP POLICY IF EXISTS "Authenticated users read avisos" ON avisos;
DROP POLICY IF EXISTS "Admins manage avisos" ON avisos;

-- ─── 3. HABILITAR RLS EM TODAS AS TABELAS SENSÍVEIS ──────────────────────────
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aula_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos         ENABLE ROW LEVEL SECURITY;

-- ─── 4. POLÍTICAS — profiles ─────────────────────────────────────────────────
-- Aluno: lê e edita apenas o próprio perfil
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL USING (auth.uid() = id);

-- Admin: lê e edita tudo
CREATE POLICY "Admins can manage everything" ON profiles
FOR ALL USING (public.is_admin());

-- ─── 5. POLÍTICAS — operacoes ────────────────────────────────────────────────
-- Aluno: vê e edita apenas as próprias operações
CREATE POLICY "Users can manage own operations" ON operacoes
FOR ALL USING (auth.uid() = user_id);

-- Admin: vê e edita tudo
CREATE POLICY "Admins can manage all operations" ON operacoes
FOR ALL USING (public.is_admin());

-- ─── 6. POLÍTICAS — aula_progresso ──────────────────────────────────────────
-- Aluno: vê e edita apenas o próprio progresso
CREATE POLICY "Users own progress" ON aula_progresso
FOR ALL USING (auth.uid() = user_id);

-- Admin: vê e edita tudo
CREATE POLICY "Admins manage all progress" ON aula_progresso
FOR ALL USING (public.is_admin());

-- ─── 7. POLÍTICAS — comentarios ─────────────────────────────────────────────
-- Qualquer autenticado lê comentários (feed de aula é público entre alunos)
CREATE POLICY "Authenticated users read comments" ON comentarios
FOR SELECT USING (auth.role() = 'authenticated');

-- Aluno: insere e gerencia apenas os próprios comentários
CREATE POLICY "Users own comments" ON comentarios
FOR ALL USING (auth.uid() = user_id);

-- Admin: gerencia tudo
CREATE POLICY "Admins manage all comments" ON comentarios
FOR ALL USING (public.is_admin());

-- ─── 8. POLÍTICAS — avisos ───────────────────────────────────────────────────
-- Qualquer autenticado lê avisos
CREATE POLICY "Authenticated users read avisos" ON avisos
FOR SELECT USING (auth.role() = 'authenticated');

-- Admin: cria, edita e apaga avisos
CREATE POLICY "Admins manage avisos" ON avisos
FOR ALL USING (public.is_admin());

-- =============================================================================
-- RPCs SEGURAS PARA O RANKING GLOBAL
-- Estas funções usam SECURITY DEFINER para acessar dados de todos os alunos
-- de forma controlada, retornando APENAS os campos necessários para o ranking
-- (sem e-mail, WhatsApp, senhas, saldos em R$).
-- Os alunos acessam o ranking via essas funções, nunca diretamente nas tabelas.
-- =============================================================================

-- ─── 9. RPC: dados de perfil para o ranking ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ranking_profiles()
RETURNS TABLE (
    id          uuid,
    nome        text,
    foto_url    text,
    lucro_percentual numeric,
    win_rate    numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT
        id,
        nome,
        foto_url,
        CASE
            WHEN banca_inicial > 0
            THEN ROUND(((banca_atual - banca_inicial) / banca_inicial * 100)::numeric, 2)
            ELSE 0
        END AS lucro_percentual,
        win_rate
    FROM profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_profiles() TO authenticated;

-- ─── 10. RPC: operações para cálculo de win_rate e total_ops no ranking ───────
CREATE OR REPLACE FUNCTION public.get_ranking_operacoes()
RETURNS TABLE (
    user_id  uuid,
    resultado text,
    lucro    numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT user_id, resultado, lucro FROM operacoes;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_operacoes() TO authenticated;

-- ─── 11. RPC: progresso de aulas para cálculo de XP no ranking ───────────────
CREATE OR REPLACE FUNCTION public.get_ranking_progresso()
RETURNS TABLE (
    user_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT user_id FROM aula_progresso WHERE concluida = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_progresso() TO authenticated;

-- =============================================================================
-- VERIFICAÇÃO: Execute a query abaixo após aplicar o script para confirmar
-- que o RLS está ativo em todas as tabelas:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles','operacoes','aula_progresso','comentarios','avisos');
--
-- Todas as linhas devem mostrar rowsecurity = true
-- =============================================================================
