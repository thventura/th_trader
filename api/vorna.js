/**
 * VornaBroker API Proxy
 * Rota todas as chamadas /api/vorna/:path* para https://api.trade.vornabroker.com/:path*
 * Necessário em produção (Vercel) pois o proxy do Vite só funciona em dev.
 */
module.exports = async function handler(req, res) {
  const path = req.query._path || '';
  const targetUrl = `https://api.trade.vornabroker.com/${path}`;

  // Monta headers para imitar o cliente VornaBroker
  const forwardHeaders = {
    'Content-Type': 'application/json',
    'Origin': 'https://trade.vornabroker.com',
    'Referer': 'https://trade.vornabroker.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  // NÃO repassa cookies do browser — evita contaminação com sessões antigas (ex: puma_sess)
  if (req.headers['authorization']) {
    forwardHeaders['Authorization'] = req.headers['authorization'];
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    // Repassa headers relevantes da resposta
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // Permite que o frontend leia a resposta (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    res.status(response.status).send(text);
  } catch (err) {
    console.error('[VornaBroker Proxy] Erro:', err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
};
