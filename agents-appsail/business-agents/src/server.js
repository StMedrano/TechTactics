import { createServer } from 'node:http';
import { URL } from 'node:url';
import { env } from './config/env.js';
import { agentSummary, intakeLead, runAgent, runAgents } from './services/agentEngine.js';

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        return resolve(JSON.parse(body));
      } catch {
        return reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!env.sharedSecret && env.appMode !== 'catalyst') return true;

  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const headerSecret = String(req.headers['x-agent-secret'] || '');
  return Boolean(env.sharedSecret && (bearer || headerSecret) === env.sharedSecret);
}

async function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  sendJson(res, 401, {
    message: 'Agent authorization required. Send Authorization: Bearer <AGENTS_SHARED_SECRET>.'
  });
  return false;
}

async function route(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'techtactics-business-agents',
      mode: env.appMode,
      utcTime: new Date().toISOString()
    });
  }

  if (req.method === 'GET' && path === '/api/agents') {
    return sendJson(res, 200, {
      agents: agentSummary(),
      safety: {
        defaultDryRun: env.defaultDryRun,
        maxTasksPerRun: env.maxTasksPerRun,
        approvalGated: true
      }
    });
  }

  if (req.method === 'POST' && path === '/api/agents/run') {
    if (!(await requireAuth(req, res))) return undefined;
    return sendJson(res, 200, await runAgents(req, await readBody(req)));
  }

  const agentRunMatch = path.match(/^\/api\/agents\/([^/]+)\/run$/);
  if (req.method === 'POST' && agentRunMatch) {
    if (!(await requireAuth(req, res))) return undefined;
    return sendJson(res, 200, await runAgent(req, agentRunMatch[1], await readBody(req)));
  }

  if (req.method === 'POST' && path === '/api/leads/intake') {
    if (!(await requireAuth(req, res))) return undefined;
    return sendJson(res, 200, await intakeLead(req, await readBody(req)));
  }

  const webhookLeadMatch = path.match(/^\/api\/webhooks\/([^/]+)\/leads$/);
  if (req.method === 'POST' && webhookLeadMatch) {
    if (!(await requireAuth(req, res))) return undefined;
    const body = await readBody(req);
    return sendJson(res, 200, await intakeLead(req, {
      ...body,
      source: webhookLeadMatch[1] || body.source || 'webhook'
    }));
  }

  if (req.method === 'POST' && path === '/api/schedules/daily') {
    if (!(await requireAuth(req, res))) return undefined;
    const body = await readBody(req);
    if (!env.autorunEnabled && !body.force) {
      return sendJson(res, 409, {
        message: 'Autorun is disabled. Set AGENTS_AUTORUN_ENABLED=true or send force=true.'
      });
    }

    return sendJson(res, 200, await runAgents(req, {
      agents: [
        'lead_intake',
        'lead_nurture',
        'review_reputation',
        'dispatch_optimizer',
        'quote_invoice_assistant',
        'business_insights'
      ],
      dryRun: body.dryRun ?? env.defaultDryRun
    }));
  }

  return sendJson(res, 404, { message: 'Not found.' });
}

const server = createServer((req, res) => {
  route(req, res).catch((error) => {
    const status = Number(error?.status || error?.statusCode || 500);
    sendJson(res, status >= 400 && status < 600 ? status : 500, {
      message: error?.message || 'Internal server error.'
    });
  });
});

server.listen(env.port, () => {
  console.log(`TechTactics Business Agents AppSail listening on port ${env.port}`);
});
