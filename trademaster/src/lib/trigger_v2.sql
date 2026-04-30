-- VERSÃO 2.0 - SUPORTE A MAIÚSCULAS/MINÚSCULAS E ESPAÇOS
CREATE OR REPLACE FUNCTION public.automatizar_aprovacao_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Tenta encontrar o e-mail na whitelist ignorando maiúsculas e espaços
    IF EXISTS (
        SELECT 1 FROM public.liberacoes_vendas 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) 
        AND status = 'pendente'
    ) THEN
        -- Aprova o usuário automaticamente
        NEW.aprovado_por_admin := true;
        
        -- Marca como concluído na lista
        UPDATE public.liberacoes_vendas 
        SET status = 'concluido', updated_at = NOW() 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email));
        
        -- Opcional: Log de sucesso (visto no painel do Supabase)
        RAISE LOG 'Cakto: Acesso liberado automaticamente para %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RE-APLICAR O GATILHO PARA INSERT E UPDATE (PARA GARANTIR)
DROP TRIGGER IF EXISTS tr_automatizar_aprovacao ON public.profiles;
CREATE TRIGGER tr_automatizar_aprovacao
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.automatizar_aprovacao_venda();
