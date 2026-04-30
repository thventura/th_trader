const { createClient } = require('@supabase/supabase-js');

/**
 * Cakto Webhook Handler
 * Endpoint: /api/cakto
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { event, data, secret: bodySecret } = req.body;
  const urlToken = req.query.token;
  const CAKTO_SECRET = process.env.CAKTO_WEBHOOK_SECRET;

  // 1. Verificação de Segurança (Aceita secret no body ou token na URL)
  const receivedSecret = bodySecret || urlToken;
  
  if (CAKTO_SECRET && receivedSecret !== CAKTO_SECRET) {
    console.warn('[Cakto Webhook] Unauthorized attempt with invalid secret/token.');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Cakto Webhook] Missing Supabase environment variables.');
    return res.status(500).json({ message: 'Internal server error' });
  }

  // Usar a Service Role Key para ignorar RLS e atualizar o perfil
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const customerEmail = data.customer?.email;
  if (!customerEmail) {
    console.warn('[Cakto Webhook] No customer email in payload.');
    return res.status(400).json({ message: 'Bad request' });
  }

  console.log(`[Cakto Webhook] Event: ${event} | Customer: ${customerEmail}`);

  try {
    // 1. Verificar se o usuário já existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, aprovado_por_admin')
      .ilike('email', customerEmail.trim()) // Busca case-insensitive
      .maybeSingle();

    if (profileError) {
      console.error('[Cakto Webhook] Profile lookup error:', profileError.message);
      throw profileError;
    }

    switch (event) {
      case 'purchase_approved':
        if (profile) {
          // Caso clássico: Usuário já cadastrado, apenas aprova
          const { error: upError } = await supabase
            .from('profiles')
            .update({ 
               aprovado_por_admin: true, 
               updated_at: new Date().toISOString() 
            })
            .eq('id', profile.id);
          
          if (upError) console.error('[Cakto Webhook] Error approving profile:', upError.message);
          console.log(`[Cakto Webhook] Access GRANTED for EXISTING user: ${customerEmail}`);
        } else {
          // Novo comprador: Adiciona na Whitelist para aprovação automática no cadastro
          const { error: wlError } = await supabase.from('liberacoes_vendas').upsert({ 
            email: customerEmail.trim().toLowerCase(), 
            status: 'pendente', 
            event: event, 
            payload: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
          
          if (wlError) console.error('[Cakto Webhook] Error adding to whitelist:', wlError.message);
          console.log(`[Cakto Webhook] Add to WHITELIST: ${customerEmail}`);
        }
        break;

      case 'subscription_canceled':
      case 'subscription_cancelled':
      case 'refund':
      case 'chargeback':
        // Revogar acesso no perfil
        if (profile) {
          await supabase.from('profiles').update({ aprovado_por_admin: false, updated_at: new Date().toISOString() }).eq('id', profile.id);
        }
        // Remover da Whitelist (Garantir que não consiga se cadastrar aprovado depois)
        await supabase.from('liberacoes_vendas').delete().eq('email', customerEmail);
        console.log(`[Cakto Webhook] Access REVOKED for: ${customerEmail}`);
        break;

      case 'subscription_renewed':
        if (profile) {
          await supabase.from('profiles').update({ aprovado_por_admin: true, updated_at: new Date().toISOString() }).eq('id', profile.id);
        }
        console.log(`[Cakto Webhook] Subscription RENEWED for: ${customerEmail}`);
        break;

      default:
        console.log(`[Cakto Webhook] Unhandled event: ${event}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Cakto Webhook] Database error:', err.message);
    return res.status(500).json({ message: 'Error updating user profile' });
  }
};
