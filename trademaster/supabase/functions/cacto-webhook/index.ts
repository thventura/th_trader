// Supabase Edge Function: Webhook da Cacto
// Recebe notificação de pagamento e atualiza o tier do usuário para 'premium'
//
// Deploy: supabase functions deploy cacto-webhook
// Configurar secrets:
//   supabase secrets set CACTO_WEBHOOK_SECRET=<seu_token>
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua_key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validar token do webhook
    const webhookSecret = Deno.env.get('CACTO_WEBHOOK_SECRET');
    const receivedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization');

    if (webhookSecret && receivedSecret !== webhookSecret && receivedSecret !== `Bearer ${webhookSecret}`) {
      console.error('[cacto-webhook] Token inválido');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parsear body
    const body = await req.json();
    console.log('[cacto-webhook] Payload recebido:', JSON.stringify(body));

    // Extrair email do comprador (adaptar conforme formato real da Cacto)
    const email = body.email || body.customer?.email || body.buyer?.email;

    if (!email) {
      console.error('[cacto-webhook] Email não encontrado no payload');
      return new Response(JSON.stringify({ error: 'Email não encontrado no payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar status do pagamento (adaptar conforme formato real da Cacto)
    const status = body.status || body.payment_status || body.event;
    const isPago = ['approved', 'paid', 'completed', 'confirmed', 'purchase_approved'].includes(
      String(status).toLowerCase()
    );

    if (!isPago) {
      console.log(`[cacto-webhook] Pagamento não confirmado (status: ${status}). Ignorando.`);
      return new Response(JSON.stringify({ ok: true, message: 'Status ignorado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Conectar ao Supabase com service role (bypassa RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Buscar perfil pelo email
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, tier')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (fetchError || !profile) {
      console.error(`[cacto-webhook] Perfil não encontrado para email: ${email}`, fetchError);
      return new Response(JSON.stringify({ error: 'Perfil não encontrado', email }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar tier para premium
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ tier: 'premium', updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[cacto-webhook] Erro ao atualizar tier:', updateError);
      return new Response(JSON.stringify({ error: 'Erro ao atualizar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[cacto-webhook] Usuário ${email} atualizado para premium com sucesso!`);

    return new Response(JSON.stringify({ ok: true, email, tier: 'premium' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[cacto-webhook] Erro inesperado:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
