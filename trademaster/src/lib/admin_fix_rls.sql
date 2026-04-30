-- SQL DE CORREÇÃO DEFINITIVA: Restaura Admin e Sincronização
-- Execute este script no SQL Editor do seu Supabase.

-- 1. CRIAR FUNÇÃO DE SEGURANÇA (Evita erro de recursão infinita)
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

-- 2. LIMPAR POLÍTICAS CONFLITANTES
DROP POLICY IF EXISTS "Admins can manage all operations" ON operacoes;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can see/add their own data" ON operacoes;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own operations" ON operacoes;

-- 3. NOVAS POLÍTICAS PARA 'PROFILES' (Perfis)
-- Aluno: Vê e edita apenas o seu
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL USING (auth.uid() = id);

-- Admin: Vê e edita TUDO
CREATE POLICY "Admins can manage everything" ON profiles
FOR ALL USING (public.is_admin());

-- 4. NOVAS POLÍTICAS PARA 'OPERACOES' (Histórico)
-- Aluno: Vê e edita apenas o seu (Necessário para o Sync da Puma funcionar)
CREATE POLICY "Users can manage own operations" ON operacoes
FOR ALL USING (auth.uid() = user_id);

-- Admin: Vê e edita TUDO
CREATE POLICY "Admins can manage all operations" ON operacoes
FOR ALL USING (public.is_admin());

-- 5. GARANTIR QUE RLS ESTÁ ATIVO
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;

-- DICA: Se após rodar isso você ainda não se ver como Admin, verifique se o seu 
-- e-mail na tabela 'profiles' está realmente com a coluna 'role' = 'admin'.
