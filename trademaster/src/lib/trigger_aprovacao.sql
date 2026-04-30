-- FUNÇÃO DE AUTOMAÇÃO DE APROVAÇÃO
-- Esta função verifica se o novo usuário está na whitelist da Cakto
CREATE OR REPLACE FUNCTION public.automatizar_aprovacao_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o e-mail do novo perfil existe na tabela de liberações
    IF EXISTS (
        SELECT 1 FROM public.liberacoes_vendas 
        WHERE email = NEW.email 
        AND status = 'pendente'
    ) THEN
        -- Aprova automaticamente
        NEW.aprovado_por_admin := true;
        
        -- Marca a liberação como concluída
        UPDATE public.liberacoes_vendas 
        SET status = 'concluido', updated_at = NOW()
        WHERE email = NEW.email;
        
        RAISE NOTICE 'Usuário % aprovado automaticamente via Whitelist Cakto', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER QUE DISPARA ANTES DE CRIAR O PERFIL
DROP TRIGGER IF EXISTS tr_automatizar_aprovacao ON public.profiles;
CREATE TRIGGER tr_automatizar_aprovacao
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.automatizar_aprovacao_venda();

-- GARANTIR QUE A TABELA DE LIBERAÇÕES SEJA ACESSÍVEL PELO TRIGGER (SECURITY DEFINER cuida disso)
