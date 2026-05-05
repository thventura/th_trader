-- =============================================================================
-- SECURITY FIX V2 — TradeMaster
-- Execute este script INTEIRO no SQL Editor do Supabase (substitui o v1).
-- Acesse: Dashboard → SQL Editor → New Query → Cole tudo → Run
-- =============================================================================

-- ─── 1. Função is_admin() ────────────────────────────────────────────────────
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

-- ─── 2. REMOVER *TODAS* AS POLÍTICAS EXISTENTES (abordagem dinâmica) ─────────
-- Isso garante que não sobre nenhuma política permissiva antiga ou desconhecida.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'operacoes', 'aula_progresso', 'comentarios', 'avisos')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ─── 3. HABILITAR E FORÇAR RLS ───────────────────────────────────────────────
-- FORCE ROW LEVEL SECURITY faz o RLS valer até para o dono da tabela (postgres).
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE operacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes      FORCE ROW LEVEL SECURITY;
ALTER TABLE aula_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE aula_progresso FORCE ROW LEVEL SECURITY;
ALTER TABLE comentarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios    FORCE ROW LEVEL SECURITY;
ALTER TABLE avisos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos         FORCE ROW LEVEL SECURITY;

-- ─── 4. REVOGAR ACESSO DIRETO DO ROLE ANON ──────────────────────────────────
-- O role 'anon' (requisições sem login) não deve enxergar dados sensíveis.
REVOKE ALL ON profiles       FROM anon;
REVOKE ALL ON operacoes      FROM anon;
REVOKE ALL ON aula_progresso FROM anon;
REVOKE ALL ON comentarios    FROM anon;
REVOKE ALL ON avisos         FROM anon;

-- ─── 5. POLÍTICAS — profiles (SELECT) ───────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- ─── 6. POLÍTICAS — profiles (INSERT) ───────────────────────────────────────
-- Permite inserção apenas do próprio perfil (signup normal e criarAlunoManual)
CREATE POLICY "profiles_insert" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- ─── 7. POLÍTICAS — profiles (UPDATE) ───────────────────────────────────────
-- Permite update do próprio perfil. Role/tier são protegidos por trigger abaixo.
CREATE POLICY "profiles_update" ON profiles
FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- ─── 8. POLÍTICAS — profiles (DELETE) ───────────────────────────────────────
-- Apenas admin pode deletar perfis
CREATE POLICY "profiles_delete" ON profiles
FOR DELETE USING (public.is_admin());

-- ─── 9. TRIGGER: impede escalada de privilégio ───────────────────────────────
-- Bloqueia qualquer tentativa de um não-admin alterar role ou tier
-- (via UPDATE de API direta, console do browser, etc.)
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.tier IS DISTINCT FROM OLD.tier) THEN
            IF NOT public.is_admin() THEN
                RAISE EXCEPTION 'Operação não autorizada: apenas admins podem alterar role ou tier';
            END IF;
        END IF;
    END IF;
    -- Em INSERT, bloqueia criação de perfis com role='admin' por não-admins
    IF TG_OP = 'INSERT' THEN
        IF NEW.role = 'admin' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Operação não autorizada: não é possível criar usuários admin via API';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_privilege_escalation ON profiles;
CREATE TRIGGER enforce_privilege_escalation
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ─── 10. POLÍTICAS — operacoes ───────────────────────────────────────────────
CREATE POLICY "operacoes_select" ON operacoes
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "operacoes_insert" ON operacoes
FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "operacoes_update" ON operacoes
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "operacoes_delete" ON operacoes
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ─── 11. POLÍTICAS — aula_progresso ─────────────────────────────────────────
CREATE POLICY "progresso_select" ON aula_progresso
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "progresso_insert" ON aula_progresso
FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "progresso_update" ON aula_progresso
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "progresso_delete" ON aula_progresso
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ─── 12. POLÍTICAS — comentarios ─────────────────────────────────────────────
-- Leitura: qualquer autenticado (é um feed de aulas)
CREATE POLICY "comentarios_select" ON comentarios
FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita: apenas o próprio dono ou admin
CREATE POLICY "comentarios_write" ON comentarios
FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ─── 13. POLÍTICAS — avisos ──────────────────────────────────────────────────
CREATE POLICY "avisos_select" ON avisos
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "avisos_write" ON avisos
FOR ALL USING (public.is_admin());

-- ─── 14. RPCs SEGURAS PARA O RANKING ─────────────────────────────────────────
-- Usam SECURITY DEFINER para acessar dados de todos sem expor campos sensíveis.
CREATE OR REPLACE FUNCTION public.get_ranking_profiles()
RETURNS TABLE (
    id               uuid,
    nome             text,
    foto_url         text,
    lucro_percentual numeric,
    win_rate         numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT
        id,
        nome,
        foto_url,
        CASE WHEN banca_inicial > 0
             THEN ROUND(((banca_atual - banca_inicial) / banca_inicial * 100)::numeric, 2)
             ELSE 0
        END AS lucro_percentual,
        win_rate
    FROM profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ranking_operacoes()
RETURNS TABLE (user_id uuid, resultado text, lucro numeric)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT user_id, resultado, lucro FROM operacoes;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_operacoes() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ranking_progresso()
RETURNS TABLE (user_id uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT user_id FROM aula_progresso WHERE concluida = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_progresso() TO authenticated;

-- =============================================================================
-- VERIFICAÇÃO FINAL: Execute cada bloco abaixo separadamente
--
-- 1. Confirmar RLS ativo em todas as tabelas:
-- SELECT tablename, rowsecurity, forcerlspolicy
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles','operacoes','aula_progresso','comentarios','avisos');
-- → Todas devem ter rowsecurity = true
--
-- 2. Ver políticas criadas (não deve haver políticas inesperadas):
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles','operacoes','aula_progresso','comentarios','avisos')
-- ORDER BY tablename, policyname;
--
-- 3. Testar como aluno: fazer login normal e rodar no SQL Editor com JWT do aluno:
-- SET request.jwt.claims = '{"sub":"UUID_DO_ALUNO","role":"authenticated"}';
-- SET ROLE authenticated;
-- SELECT * FROM profiles; -- deve retornar apenas o próprio perfil
-- RESET ROLE;
-- =============================================================================
