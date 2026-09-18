import axios from 'axios';
import catalyst from 'zcatalyst-sdk-node';
import { env } from '../config/env.js';

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

function getDirectoryApiBaseUrl() {
  return String(env.directory.apiBaseUrl || 'https://directory.zoho.com').replace(/\/+$/, '');
}

function normalizeDirectoryGroups(rawGroups) {
  if (!rawGroups) return [];
  if (Array.isArray(rawGroups)) {
    return rawGroups
      .map((value) =>
        typeof value === 'string'
          ? value
          : value?.name || value?.group_name || value?.display_name || value?.displayName || value?.email
      )
      .map((value) => String(value || '').trim())
      .filter(Boolean);
  }
  if (typeof rawGroups === 'string') {
    return rawGroups
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function extractUserEmails(user = {}) {
  const direct = [
    user.email,
    user.email_id,
    user.emailId,
    user.mail,
    user.preferred_username
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  const nested = Array.isArray(user.emails)
    ? user.emails
        .flatMap((entry) => [
          entry?.email,
          entry?.mail,
          entry?.value,
          entry?.address
        ])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    : [];

  return [...new Set([...direct, ...nested])];
}

function buildZohoDirectoryRequestConfig(auth, overrides = {}) {
  return {
    ...overrides,
    headers: {
      ...(auth?.headers || {}),
      ...(overrides.headers || {})
    },
    params: {
      ...(auth?.parameters || {}),
      ...(overrides.params || {})
    }
  };
}

export function isZohoDirectoryEnabled() {
  return Boolean(
    env.directory.clientId &&
    env.directory.clientSecret &&
    env.directory.authUrl &&
    env.directory.tokenUrl &&
    env.directory.redirectUri
  );
}

export function isZohoDirectoryConnectionEnabled() {
  return env.appMode === 'catalyst' && Boolean(env.directory.connectionLinkName);
}

export async function getZohoDirectoryConnectionCredentials(req) {
  if (!isZohoDirectoryConnectionEnabled()) {
    return null;
  }

  try {
    const credentials = await getCatalystApp(req)
      .connections()
      .getConnectionCredentials(env.directory.connectionLinkName);

    return {
      headers: credentials?.headers || {},
      parameters: credentials?.parameters || {}
    };
  } catch {
    return null;
  }
}

export function isZohoDirectoryConnectionSyncEnabled() {
  return isZohoDirectoryConnectionEnabled() && Boolean(env.directory.orgId);
}

export function buildZohoDirectoryAuthorizeUrl(state = 'techtactics_directory') {
  const params = new URLSearchParams({
    client_id: env.directory.clientId,
    response_type: 'code',
    redirect_uri: env.directory.redirectUri,
    scope: env.directory.scope,
    access_type: 'online',
    prompt: 'consent',
    state
  });
  return `${env.directory.authUrl}?${params.toString()}`;
}

export async function exchangeZohoDirectoryCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.directory.clientId,
    client_secret: env.directory.clientSecret,
    redirect_uri: env.directory.redirectUri,
    code
  });

  const { data } = await axios.post(env.directory.tokenUrl, body);
  return data;
}

export async function fetchZohoDirectoryUserInfo(accessToken) {
  if (!env.directory.userInfoUrl) {
    return null;
  }

  const { data } = await axios.get(env.directory.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return data;
}

async function listZohoDirectoryUsers(req, { page = 1, perPage = 200 } = {}) {
  if (!isZohoDirectoryConnectionSyncEnabled()) {
    return [];
  }

  const credentials = await getZohoDirectoryConnectionCredentials(req);
  if (!credentials) {
    return [];
  }

  const { data } = await axios.get(
    `${getDirectoryApiBaseUrl()}/api/v1/orgs/${encodeURIComponent(env.directory.orgId)}/users`,
    buildZohoDirectoryRequestConfig(credentials, {
      params: {
        page,
        per_page: perPage,
        include: 'emails,user.departmentinfo'
      }
    })
  );

  return Array.isArray(data?.users) ? data.users : [];
}

async function listZohoDirectoryUserGroups(req, userId, { page = 1, perPage = 200 } = {}) {
  if (!isZohoDirectoryConnectionSyncEnabled()) {
    return [];
  }

  const credentials = await getZohoDirectoryConnectionCredentials(req);
  if (!credentials) {
    return [];
  }

  const { data } = await axios.get(
    `${getDirectoryApiBaseUrl()}/api/v1/orgs/${encodeURIComponent(env.directory.orgId)}/users/${encodeURIComponent(userId)}/groups`,
    buildZohoDirectoryRequestConfig(credentials, {
      params: {
        page,
        per_page: perPage
      }
    })
  );

  return Array.isArray(data?.groups) ? data.groups : [];
}

export async function lookupZohoDirectoryIdentityByEmail(req, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !isZohoDirectoryConnectionSyncEnabled()) {
    return null;
  }

  try {
    const users = await listZohoDirectoryUsers(req);
    const matchedUser = users.find((user) => extractUserEmails(user).includes(normalizedEmail));
    if (!matchedUser) {
      return null;
    }

    const userId =
      matchedUser.user_id ||
      matchedUser.userId ||
      matchedUser.zuid ||
      matchedUser.id ||
      matchedUser.ROWID;

    const groups = userId ? await listZohoDirectoryUserGroups(req, userId).catch(() => []) : [];
    const department =
      matchedUser?.departmentinfo?.name ||
      matchedUser?.departmentInfo?.name ||
      matchedUser?.department ||
      '';

    return {
      user: matchedUser,
      groups: normalizeDirectoryGroups(groups),
      department: String(department || '').trim()
    };
  } catch {
    return null;
  }
}
