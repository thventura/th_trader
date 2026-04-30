/**
 * deploy.js — Sincroniza o VPS com o código local e reinicia o serviço.
 * Uso: node deploy.js
 * Ou:  npm run deploy
 *
 * O que faz automaticamente:
 *   1. Envia todos os motores de estratégia do trademaster para o VPS
 *   2. Envia os arquivos do serviço VPS (bot-engine, vorna-client, index)
 *   3. Reinicia o PM2 para aplicar as mudanças
 *   4. Confirma que o serviço voltou online
 */

const { Client } = require('./node_modules/ssh2');
const path = require('path');
const fs = require('fs');

// ── Configuração da conexão ────────────────────────────────────────────────
const VPS_HOST = '178.62.241.160';
const VPS_USER = 'root';
const VPS_PASSWORD = process.env.VPS_PASSWORD || 'hacker1Comebosta';

// ── Arquivos a sincronizar ─────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const TRADEMASTER_SRC = path.join(ROOT, 'trademaster', 'src');
const VPS_SRC = path.join(__dirname, 'src');

// Motores de estratégia: sempre sincronizados automaticamente
const MOTOR_FILES = fs.readdirSync(path.join(TRADEMASTER_SRC, 'lib'))
  .filter(f => f.startsWith('motor-') && f.endsWith('.ts'))
  .map(f => ({
    local: path.join(TRADEMASTER_SRC, 'lib', f),
    remote: `/root/trademaster/src/lib/${f}`,
    label: f,
  }));

const FILES_TO_SYNC = [
  // types (necessário pelos motores)
  { local: path.join(TRADEMASTER_SRC, 'types.ts'), remote: '/root/trademaster/src/types.ts', label: 'types.ts' },
  // serviço VPS
  { local: path.join(__dirname, 'package.json'), remote: '/root/vps-service/package.json', label: 'package.json' },
  { local: path.join(VPS_SRC, 'bot-engine.ts'), remote: '/root/vps-service/src/bot-engine.ts', label: 'bot-engine.ts' },
  { local: path.join(VPS_SRC, 'vorna-client.ts'), remote: '/root/vps-service/src/vorna-client.ts', label: 'vorna-client.ts' },
  { local: path.join(VPS_SRC, 'index.ts'), remote: '/root/vps-service/src/index.ts', label: 'index.ts' },
  // motores (detectados automaticamente — inclui novos motores sem precisar editar este arquivo)
  ...MOTOR_FILES,
];

// ── Utilitários ────────────────────────────────────────────────────────────
function sshExec(conn, cmd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('Timeout: ' + cmd)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(t); return reject(err); }
      stream.on('data', d => { out += d.toString(); });
      stream.stderr.on('data', d => { out += d.toString(); });
      stream.on('close', () => { clearTimeout(t); resolve(out.trim()); });
    });
  });
}

function sftpPut(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, {}, err => err ? reject(err) : resolve());
  });
}

function log(msg, tipo = 'info') {
  const icones = { info: '→', ok: '✓', erro: '✗', titulo: '═' };
  const icone = icones[tipo] || '·';
  console.log(`  ${icone} ${msg}`);
}

// ── Deploy principal ───────────────────────────────────────────────────────
async function deploy() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║       DEPLOY VPS — TradeMaster Bot    ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASSWORD, readyTimeout: 20000 });
  });

  log('Conectado ao VPS ' + VPS_HOST, 'ok');

  try {
    // Garantir que os diretórios existem no VPS
    await sshExec(conn, 'mkdir -p /root/trademaster/src/lib /root/vps-service/src');

    // Upload de todos os arquivos via SFTP
    const sftp = await new Promise((res, rej) => conn.sftp((err, s) => err ? rej(err) : res(s)));

    console.log(`\n  Sincronizando ${FILES_TO_SYNC.length} arquivos...\n`);
    for (const file of FILES_TO_SYNC) {
      if (!fs.existsSync(file.local)) {
        log(`Pulando (não encontrado): ${file.label}`, 'info');
        continue;
      }
      await sftpPut(sftp, file.local, file.remote);
      log(file.label, 'ok');
    }

    // Instalar dependências (inclui @supabase/supabase-js se adicionado)
    console.log('\n  Instalando dependências...\n');
    await sshExec(conn, 'cd /root/vps-service && npm install --omit=dev 2>&1', 60000);
    log('npm install concluído', 'ok');

    // Reiniciar o serviço no PM2
    console.log('\n  Reiniciando serviço...\n');
    await sshExec(conn, 'pm2 restart vorna-bot-service', 15000);
    log('PM2 reiniciado', 'ok');

    // Aguarda o serviço inicializar
    await new Promise(r => setTimeout(r, 3000));

    // Verificar que está online
    const health = await sshExec(conn, 'curl -s http://localhost:3001/health', 10000);
    if (health.includes('"ok":true')) {
      log('Serviço online: ' + health, 'ok');
    } else {
      log('AVISO: serviço pode estar demorando para iniciar. Verifique: pm2 logs vorna-bot-service', 'erro');
    }

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║          DEPLOY CONCLUÍDO ✓           ║');
    console.log('╚═══════════════════════════════════════╝\n');

  } catch (e) {
    log('ERRO: ' + e.message, 'erro');
    // Mostrar logs do PM2 para diagnóstico
    try {
      const logs = await sshExec(conn, 'pm2 logs vorna-bot-service --lines 15 --nostream 2>&1', 10000);
      console.log('\n  Logs do serviço:\n', logs);
    } catch {}
    process.exitCode = 1;
  }

  conn.end();
}

deploy();
