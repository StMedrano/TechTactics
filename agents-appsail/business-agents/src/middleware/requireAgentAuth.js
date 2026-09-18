import { env } from '../config/env.js';

export function requireAgentAuth(req, res, next) {
  if (!env.sharedSecret && env.appMode !== 'catalyst') {
    return next();
  }

  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const headerSecret = String(req.headers['x-agent-secret'] || '');
  const provided = bearer || headerSecret;

  if (env.sharedSecret && provided === env.sharedSecret) {
    return next();
  }

  return res.status(401).json({
    message: 'Agent authorization required. Send Authorization: Bearer <AGENTS_SHARED_SECRET>.'
  });
}
