function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function buildCallbackUrl(req, path) {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (baseUrl) return `${baseUrl.replace(/\/$/, '')}${path}`;

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}${path}`;
}

module.exports = { normalizePhone, buildCallbackUrl };