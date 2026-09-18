import { Router } from 'express';
import { randomBytes } from 'crypto';
import { getStore } from '../services/storeFactory.js';
import { signSession } from '../utils/session.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { applyEffectiveRole, toSessionUser } from '../utils/users.js';
import {
  buildZohoSsoAuthorizeUrl,
  ensureZohoBooksContactForUser,
  exchangeSsoCodeForToken
} from '../services/zohoBooksService.js';
import {
  buildZohoDirectoryAuthorizeUrl,
  exchangeZohoDirectoryCodeForToken,
  fetchZohoDirectoryUserInfo,
  isZohoDirectoryEnabled,
  lookupZohoDirectoryIdentityByEmail
} from '../services/directorySsoService.js';
import {
  buildZohoDirectorySamlLoginUrl,
  buildZohoDirectorySamlMetadata,
  isZohoDirectorySamlEnabled,
  validateZohoDirectorySamlResponse
} from '../services/samlService.js';
import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';

const router = Router();

function decodeZohoIdToken(idToken) {
  const decoded = jwt.decode(idToken);
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Zoho did not return a valid ID token.');
  }
  return decoded;
}

function normalizeClientAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const pathname = url.pathname && url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '';
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function parseSsoState(state) {
  if (!state) return null;
  try {
    return JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function buildSsoState(returnTo, clientAppUrl) {
  return Buffer.from(JSON.stringify({ returnTo, clientAppUrl }), 'utf8').toString('base64url');
}

function resolveClientRedirect(parsedState) {
  const resolvedClientAppUrl =
    normalizeClientAppUrl(parsedState?.clientAppUrl || parsedState?.clientOrigin) || env.clientAppUrl;

  return (path = '/login', params = {}) => {
    const hashPath = path.startsWith('/') ? path : `/${path}`;
    const query = new URLSearchParams(params).toString();
    return `${resolvedClientAppUrl}/#${hashPath}${query ? `?${query}` : ''}`;
  };
}

function normalizeGroupClaims(rawGroups) {
  if (!rawGroups) return [];
  if (Array.isArray(rawGroups)) {
    return rawGroups.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof rawGroups === 'string') {
    return rawGroups
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function getSsoGroupClaims(claims = {}) {
  return normalizeGroupClaims(
    claims.groups ||
      claims.group ||
      claims.memberOf ||
      claims.memberof ||
      claims.Groups ||
      claims['http://schemas.xmlsoap.org/claims/Group'] ||
      claims['urn:oid:2.5.4.31']
  );
}

async function resolveDirectoryContext(req, primaryEmail, extra = {}) {
  const initialGroups = normalizeGroupClaims(extra.directoryGroups);
  const identity = await lookupZohoDirectoryIdentityByEmail(req, primaryEmail).catch(() => null);
  const mergedGroups = [...new Set([...initialGroups, ...(identity?.groups || [])])];
  const directoryDepartment =
    String(extra.directoryDepartment || identity?.department || '').trim();

  return {
    directoryGroups: mergedGroups,
    directoryDepartment,
    directoryUser: identity?.user || null
  };
}

function buildProvisionedName(primaryEmail, extra = {}) {
  const explicitName = String(
    extra.name ||
      extra.fullName ||
      [extra.firstName, extra.lastName].filter(Boolean).join(' ')
  ).trim();

  if (explicitName) {
    return explicitName;
  }

  return String(primaryEmail || 'TechTactics User')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function splitName(name = '') {
  const segments = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: segments[0] || '',
    lastName: segments.slice(1).join(' ')
  };
}

async function provisionSsoUser(req, store, settings, primaryEmail, extra = {}) {
  const directoryGroups = normalizeGroupClaims(extra.directoryGroups);
  const name = buildProvisionedName(primaryEmail, extra);
  const { firstName, lastName } = splitName(name);
  const candidateUser = applyEffectiveRole(
    {
      email: primaryEmail,
      name,
      role: 'customer',
      directoryGroups,
      directoryDepartment: extra.directoryDepartment || ''
    },
    settings
  );

  if (!['admin', 'employee'].includes(candidateUser.role)) {
    return null;
  }

  return store.createUser(req, {
    email: primaryEmail,
    name,
    firstName,
    lastName,
    role: candidateUser.assignedRole || candidateUser.role,
    phone: extra.phone || '',
    address: extra.address || '',
    isActive: true,
    passwordHash: hashPassword(randomBytes(24).toString('hex')),
    directoryGroups
  });
}

async function finishSsoLogin(req, res, primaryEmail, parsedState, extra = {}) {
  const buildClientRedirect = resolveClientRedirect(parsedState);

  if (!primaryEmail) {
    return res.redirect(
      buildClientRedirect('/login', { sso_error: 'SSO provider did not return an email address.' })
    );
  }

  const store = getStore();
  let user = await store.getUserByEmail(req, primaryEmail);
  const settings = await store.getSettings(req);
  const directoryContext = await resolveDirectoryContext(req, primaryEmail, extra);

  if (!user) {
    user = await provisionSsoUser(req, store, settings, primaryEmail, {
      ...extra,
      ...directoryContext
    });
  }

  if (!user || !user.isActive) {
    return res.redirect(
      buildClientRedirect('/login', { sso_error: 'No active app user matches your SSO account.' })
    );
  }

  const effectiveUser = applyEffectiveRole(
    {
      ...user,
      ...(directoryContext.directoryGroups?.length
        ? { directoryGroups: directoryContext.directoryGroups }
        : {}),
      ...(directoryContext.directoryDepartment
        ? { directoryDepartment: directoryContext.directoryDepartment }
        : {})
    },
    settings
  );
  const token = signSession(effectiveUser);

  res.cookie('tt_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true
  });

  const redirectPath = parsedState?.returnTo || '/login';
  return res.redirect(buildClientRedirect(redirectPath.replace(/^#/, ''), { sso_token: token }));
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const store = getStore();
    const user = await store.getUserByEmail(req, email);
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const settings = await store.getSettings(req);
    const effectiveUser = applyEffectiveRole(user, settings);
    const token = signSession(effectiveUser);
    res.cookie('tt_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    res.json({ token, user: toSessionUser(effectiveUser) });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body || {};

    if (!name || !email || !password || !address) {
      return res.status(400).json({ message: 'Name, email, password, and address are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const store = getStore();
    const existingUser = await store.getUserByEmail(req, normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const [firstName, ...lastNameParts] = String(name).trim().split(/\\s+/);
    const newUser = await store.createUser(req, {
      email: normalizedEmail,
      name: String(name).trim(),
      firstName: firstName || '',
      lastName: lastNameParts.join(' '),
      role: 'customer',
      phone: phone || '',
      address: String(address).trim(),
      isActive: true,
      passwordHash: hashPassword(password),
      directoryGroups: []
    });

    const contactResult = await ensureZohoBooksContactForUser(req, newUser).catch(() => null);
    const hydratedUser =
      contactResult?.contactId
        ? await store.updateUser(req, newUser.id, { zoho_contact_id: contactResult.contactId })
        : newUser;

    const token = signSession(hydratedUser);
    res.cookie('tt_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    res.status(201).json({ token, user: toSessionUser(hydratedUser) });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Registration failed.' });
  }
});

router.get('/session', requireAuth, async (req, res) => {
  res.json({ user: toSessionUser(req.user) });
});

router.get('/zoho/start', (req, res) => {
  const returnTo = req.query.returnTo || '/login';
  const clientAppUrl = normalizeClientAppUrl(req.query.clientOrigin) || env.clientAppUrl;
  const state = buildSsoState(returnTo, clientAppUrl);
  res.redirect(buildZohoSsoAuthorizeUrl(state));
});

router.get('/zoho/callback', async (req, res) => {
  const { code, state, error, 'accounts-server': accountsServer } = req.query;
  const parsedState = parseSsoState(state);
  const buildClientRedirect = resolveClientRedirect(parsedState);

  if (error) {
    return res.redirect(buildClientRedirect('/login', { sso_error: String(error) }));
  }

  try {
    const tokenResult = await exchangeSsoCodeForToken(code, accountsServer);
    const claims = decodeZohoIdToken(tokenResult.id_token);
    const primaryEmail = claims.email || '';
    return finishSsoLogin(req, res, primaryEmail, parsedState, {
      directoryGroups: getSsoGroupClaims(claims),
      name: claims.name,
      firstName: claims.given_name,
      lastName: claims.family_name
    });
  } catch (err) {
    res.redirect(buildClientRedirect('/login', { sso_error: err.message || 'Zoho SSO failed.' }));
  }
});

router.get('/directory/start', (req, res) => {
  const returnTo = req.query.returnTo || '/login';
  const clientAppUrl = normalizeClientAppUrl(req.query.clientOrigin) || env.clientAppUrl;
  const state = buildSsoState(returnTo, clientAppUrl);

  if (!isZohoDirectoryEnabled()) {
    const buildClientRedirect = resolveClientRedirect(parseSsoState(state));
    return res.redirect(
      buildClientRedirect('/login', {
        sso_error: 'Zoho Directory SSO is not configured in AppSail yet.'
      })
    );
  }

  res.redirect(buildZohoDirectoryAuthorizeUrl(state));
});

router.get('/directory/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const parsedState = parseSsoState(state);
  const buildClientRedirect = resolveClientRedirect(parsedState);

  if (error) {
    return res.redirect(buildClientRedirect('/login', { sso_error: String(error) }));
  }

  try {
    const tokenResult = await exchangeZohoDirectoryCodeForToken(code);
    const claims = tokenResult.id_token ? decodeZohoIdToken(tokenResult.id_token) : {};
    const userInfo = claims.email
      ? null
      : await fetchZohoDirectoryUserInfo(tokenResult.access_token).catch(() => null);
    const primaryEmail =
      claims.email ||
      claims.upn ||
      userInfo?.email ||
      userInfo?.mail ||
      userInfo?.preferred_username ||
      '';

    return finishSsoLogin(req, res, primaryEmail, parsedState, {
      directoryGroups: getSsoGroupClaims(userInfo || claims),
      name: userInfo?.name || claims.name,
      firstName: userInfo?.given_name || claims.given_name,
      lastName: userInfo?.family_name || claims.family_name,
      phone: userInfo?.phone_number || userInfo?.mobile || ''
    });
  } catch (err) {
    return res.redirect(
      buildClientRedirect('/login', { sso_error: err.message || 'Zoho Directory SSO failed.' })
    );
  }
});

router.get('/saml/start', async (req, res) => {
  const returnTo = req.query.returnTo || '/login';
  const clientAppUrl = normalizeClientAppUrl(req.query.clientOrigin) || env.clientAppUrl;
  const state = buildSsoState(returnTo, clientAppUrl);

  if (!isZohoDirectorySamlEnabled()) {
    const buildClientRedirect = resolveClientRedirect(parseSsoState(state));
    return res.redirect(
      buildClientRedirect('/login', {
        sso_error: 'Zoho Directory SAML is not configured in AppSail yet.'
      })
    );
  }

  try {
    const loginUrl = await buildZohoDirectorySamlLoginUrl(req, state);
    return res.redirect(loginUrl);
  } catch (error) {
    const buildClientRedirect = resolveClientRedirect(parseSsoState(state));
    return res.redirect(
      buildClientRedirect('/login', {
        sso_error: error.message || 'Unable to start Zoho Directory SAML login.'
      })
    );
  }
});

router.post('/saml/callback', async (req, res) => {
  const relayState = req.body?.RelayState || '';
  const parsedState = parseSsoState(relayState);
  const buildClientRedirect = resolveClientRedirect(parsedState);

  try {
    const { profile } = await validateZohoDirectorySamlResponse(req);
    const primaryEmail =
      profile?.email ||
      profile?.mail ||
      profile?.['urn:oid:0.9.2342.19200300.100.1.3'] ||
      profile?.nameID ||
      '';

    return finishSsoLogin(req, res, primaryEmail, parsedState, {
      directoryGroups: getSsoGroupClaims(profile || {}),
      name:
        profile?.displayName ||
        profile?.cn ||
        [profile?.givenName, profile?.sn].filter(Boolean).join(' '),
      firstName: profile?.givenName,
      lastName: profile?.sn
    });
  } catch (error) {
    return res.redirect(
      buildClientRedirect('/login', {
        sso_error: error.message || 'Zoho Directory SAML failed.'
      })
    );
  }
});

router.get('/saml/metadata', (req, res) => {
  if (!isZohoDirectorySamlEnabled()) {
    return res.status(400).json({ message: 'Zoho Directory SAML is not configured yet.' });
  }

  try {
    const metadata = buildZohoDirectorySamlMetadata(req);
    res.type('application/xml').send(metadata);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to generate SAML metadata.' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('tt_session');
  res.status(204).end();
});

export default router;
