const twilio = require('twilio');

function validateTwilioRequest(req, res, next) {
  if (process.env.SKIP_TWILIO_VALIDATION === 'true') {
    return next();
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return res.status(500).send('TWILIO_AUTH_TOKEN is not configured.');
  }

  const signature = req.headers['x-twilio-signature'];
  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.headers.host;
  const url = publicBaseUrl ? `${publicBaseUrl}${req.originalUrl}` : `${protocol}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!isValid) {
    return res.status(403).send('Invalid Twilio signature.');
  }

  return next();
}

module.exports = { validateTwilioRequest };
