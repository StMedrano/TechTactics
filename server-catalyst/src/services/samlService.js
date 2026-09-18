import { SAML, ValidateInResponseTo } from '@node-saml/node-saml';
import { env } from '../config/env.js';

function normalizePem(value) {
  const raw = String(value || '').trim();
  return raw ? raw.replace(/\\n/g, '\n') : '';
}

function getRequestBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

function getSamlCallbackUrl(req) {
  return env.directory.samlCallbackUrl || `${getRequestBaseUrl(req)}/api/auth/saml/callback`;
}

function getSamlIssuer(req) {
  return env.directory.samlIssuer || `${getRequestBaseUrl(req)}/api/auth/saml/metadata`;
}

function buildSamlConfig(req) {
  return {
    issuer: getSamlIssuer(req),
    callbackUrl: getSamlCallbackUrl(req),
    entryPoint: env.directory.samlEntryPoint,
    idpCert: normalizePem(env.directory.samlIdpCert),
    audience: env.directory.samlAudience || getSamlIssuer(req),
    identifierFormat:
      env.directory.samlIdentifierFormat ||
      'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    validateInResponseTo: ValidateInResponseTo.ifPresent,
    acceptedClockSkewMs: 5000,
    authnContext: [],
    disableRequestedAuthnContext: true,
    privateKey: normalizePem(env.directory.samlPrivateKey) || undefined,
    publicCert: normalizePem(env.directory.samlPublicCert) || undefined
  };
}

export function isZohoDirectorySamlEnabled() {
  return Boolean(env.directory.samlEntryPoint && env.directory.samlIdpCert);
}

export function createZohoDirectorySamlClient(req) {
  return new SAML(buildSamlConfig(req));
}

export async function buildZohoDirectorySamlLoginUrl(req, relayState) {
  return createZohoDirectorySamlClient(req).getAuthorizeUrlAsync(relayState, undefined, {});
}

export async function validateZohoDirectorySamlResponse(req) {
  return createZohoDirectorySamlClient(req).validatePostResponseAsync(req.body || {});
}

export function buildZohoDirectorySamlMetadata(req) {
  return createZohoDirectorySamlClient(req).generateServiceProviderMetadata(null, null);
}
