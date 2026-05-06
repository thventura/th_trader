-- =============================================================================
-- SECURITY FIX V3 — TradeMaster
-- Protege as 6 tabelas que ainda estavam sem RLS.
-- Execute no Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- ─── resultado_prova — dado pessoal crítico ──────────────────────────────────
-- Notas, aprovação e respostas de cada aluno. Só o próprio ou admin pode ver.
ALTER TABLE resultado_prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultado_prova FORCE ROW LEVEL SECURITY;
REVOKE ALL ON resultado_prova FROM anon;

DROP POLICY IF EXISTS "resultado_select" ON resultado_prova;
DROP POLICY IF EXISTS "resultado_write"  ON resultado_prova;

CREATE POLICY "resultado_select" ON resultado_prova
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "resultado_write" ON resultado_prova
FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ─── push_subscriptions — dado pessoal ───────────────────────────────────────
-- Endpoints de notificação vinculados a user_id. Só o próprio ou admin.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions FROM anon;

DROP POLICY IF EXISTS "push_select" ON push_subscriptions;
DROP POLICY IF EXISTS "push_write"  ON push_subscriptions;

CREATE POLICY "push_select" ON push_subscriptions
FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "push_write" ON push_subscriptions
FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ─── config_prova — configuração do exame ────────────────────────────────────
-- Questões e gabarito. Alunos autenticados leem para realizar a prova;
-- apenas admin pode criar/alterar.
ALTER TABLE config_prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_prova FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_prova_read"  ON config_prova;
DROP POLICY IF EXISTS "config_prova_write" ON config_prova;

CREATE POLICY "config_prova_read" ON config_prova
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "config_prova_write" ON config_prova
FOR ALL USING (public.is_admin());

-- ─── configuracoes_manutencao — configuração do sistema ──────────────────────
-- Lida pelo App.tsx para saber se está em manutenção. Qualquer autenticado lê;
-- apenas admin escreve.
ALTER TABLE configuracoes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_manutencao FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manutencao_read"  ON configuracoes_manutencao;
DROP POLICY IF EXISTS "manutencao_write" ON configuracoes_manutencao;

CREATE POLICY "manutencao_read" ON configuracoes_manutencao
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "manutencao_write" ON configuracoes_manutencao
FOR ALL USING (public.is_admin());

-- ─── modulos — conteúdo educacional ─────────────────────────────────────────
-- Sem dado pessoal. Alunos autenticados leem; apenas admin escreve.
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modulos_read"  ON modulos;
DROP POLICY IF EXISTS "modulos_write" ON modulos;

CREATE POLICY "modulos_read" ON modulos
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "modulos_write" ON modulos
FOR ALL USING (public.is_admin());

-- ─── aulas — conteúdo educacional ───────────────────────────────────────────
-- Sem dado pessoal. Alunos autenticados leem; apenas admin escreve.
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aulas_read"  ON aulas;
DROP POLICY IF EXISTS "aulas_write" ON aulas;

CREATE POLICY "aulas_read" ON aulas
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "aulas_write" ON aulas
FOR ALL USING (public.is_admin());

-- =============================================================================
-- VERIFICAÇÃO OBRIGATÓRIA — execute após aplicar o script
-- =============================================================================

-- 1. Todas as tabelas do banco com status de RLS:
--    Qualquer linha com rls_ativo = false é uma brecha — me informe o nome.
--
-- SELECT relname AS tabela, relrowsecurity AS rls_ativo
-- FROM pg_class
-- WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--   AND relkind = 'r'
-- ORDER BY rls_ativo, relname;
--
-- 2. Confirmar políticas das novas tabelas:
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('resultado_prova','push_subscriptions','config_prova',
--                     'configuracoes_manutencao','modulos','aulas')
-- ORDER BY tablename, policyname;
-- =============================================================================
