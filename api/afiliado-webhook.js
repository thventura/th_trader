/**
 * Afiliado Webhook
 *
 * Recebe postback da VornaBroker (partner portal) quando um usuário se cadastra
 * pelo link de afiliado do TradeMaster. Salva o user_id na tabela afiliados_aprovados
 * do Supabase para que o relay possa verificar no login.
 *
 * URL configurada no partner portal:
 *   https://[dominio].vercel.app/api/afiliado-webhook?user_id={user_id}&event={event}
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Aceita GET (postback simples) ou POST
  // Vorna envia como "trader_id"; aceita também "user_id" e "customer_id" por segurança
  const user_id = req.method === 'GET'
    ? (req.query.trader_id || req.query.user_id || req.query.customer_id)
    : (req.body?.trader_id || req.body?.user_id || req.body?.customer_id);
  const event = req.method === 'GET'
    ? (req.query.event || req.query.tipo || 'registro')
    : (req.body?.event || req.body?.tipo || 'registro');

  if (!user_id) {
    console.warn('[afiliado-webhook] Chamada sem user_id. Query:', JSON.stringify(req.query));
    return res.status(400).json({ error: 'user_id obrigatório' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[afiliado-webhook] Variáveis SUPABASE_URL / SUPABASE_SERVICE_KEY não configuradas');
    return res.status(503).json({ error: 'Configuração do servidor incompleta' });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/afiliados_aprovados`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        vorna_user_id: String(user_id),
        evento: event,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[afiliado-webhook] Supabase erro:', errText);
      return res.status(500).json({ error: 'Erro ao salvar afiliado' });
    }

    console.log(`[afiliado-webhook] Afiliado registrado: user_id=${user_id} evento=${event}`);
    return res.status(200).json({ ok: true, user_id: String(user_id) });
  } catch (err) {
    console.error('[afiliado-webhook] Exceção:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
