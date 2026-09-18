import webPush from 'web-push';
import { env } from '../config/env.js';
import { getStore } from './storeFactory.js';

const SETTINGS_KEY = 'portal_push_subscriptions';
const MAX_SUBSCRIPTIONS = 500;
let vapidConfigured = false;

function normalizeUserId(value) {
  return String(value || '').trim();
}

function normalizeEndpoint(value) {
  return String(value || '').trim();
}

function normalizeSubscription(raw = {}) {
  const subscription = raw.subscription && typeof raw.subscription === 'object'
    ? raw.subscription
    : raw;

  return {
    id: String(raw.id || subscription.endpoint || ''),
    userId: normalizeUserId(raw.userId),
    role: String(raw.role || '').trim().toLowerCase(),
    endpoint: normalizeEndpoint(subscription.endpoint),
    expirationTime: subscription.expirationTime || null,
    keys: {
      p256dh: String(subscription.keys?.p256dh || '').trim(),
      auth: String(subscription.keys?.auth || '').trim()
    },
    userAgent: String(raw.userAgent || '').trim(),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString())
  };
}

function toWebPushSubscription(subscription) {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime || null,
    keys: {
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || ''
    }
  };
}

function configureVapid() {
  if (vapidConfigured || !isDevicePushEnabled()) {
    return;
  }

  webPush.setVapidDetails(
    env.push.vapidSubject,
    env.push.vapidPublicKey,
    env.push.vapidPrivateKey
  );
  vapidConfigured = true;
}

function isExpiredOrGone(error) {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  return statusCode === 404 || statusCode === 410;
}

async function readAllSubscriptions(req) {
  const settings = await getStore().getSettings(req);
  const subscriptions = Array.isArray(settings?.[SETTINGS_KEY]) ? settings[SETTINGS_KEY] : [];
  return subscriptions.map(normalizeSubscription).filter((subscription) => subscription.endpoint);
}

async function saveAllSubscriptions(req, subscriptions) {
  const normalized = (subscriptions || [])
    .map(normalizeSubscription)
    .filter((subscription) => subscription.endpoint && subscription.keys.p256dh && subscription.keys.auth)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, MAX_SUBSCRIPTIONS);

  await getStore().saveSettings(req, {
    [SETTINGS_KEY]: normalized
  });

  return normalized;
}

export function isDevicePushEnabled() {
  return Boolean(
    env.push.enabled &&
      env.push.vapidPublicKey &&
      env.push.vapidPrivateKey &&
      env.push.vapidSubject
  );
}

export function getDevicePushConfig() {
  return {
    enabled: isDevicePushEnabled(),
    publicKey: env.push.vapidPublicKey
  };
}

export async function saveDevicePushSubscription(req, user, rawSubscription) {
  const userId = normalizeUserId(user?.id);
  const subscription = normalizeSubscription({
    subscription: rawSubscription,
    userId,
    role: user?.role || '',
    userAgent: req.headers['user-agent'] || ''
  });

  if (!userId || !subscription.endpoint || !subscription.keys.p256dh || !subscription.keys.auth) {
    const error = new Error('A valid device push subscription is required.');
    error.status = 400;
    throw error;
  }

  const existing = await readAllSubscriptions(req).catch(() => []);
  const now = new Date().toISOString();
  const withoutCurrentEndpoint = existing.filter((item) => item.endpoint !== subscription.endpoint);
  const saved = await saveAllSubscriptions(req, [
    {
      ...subscription,
      createdAt: existing.find((item) => item.endpoint === subscription.endpoint)?.createdAt || now,
      updatedAt: now
    },
    ...withoutCurrentEndpoint
  ]);

  return saved.find((item) => item.endpoint === subscription.endpoint) || subscription;
}

export async function deleteDevicePushSubscription(req, user, endpoint) {
  const userId = normalizeUserId(user?.id);
  const targetEndpoint = normalizeEndpoint(endpoint);
  if (!userId || !targetEndpoint) {
    return false;
  }

  const existing = await readAllSubscriptions(req).catch(() => []);
  const next = existing.filter(
    (subscription) => subscription.endpoint !== targetEndpoint || subscription.userId !== userId
  );

  if (next.length === existing.length) {
    return false;
  }

  await saveAllSubscriptions(req, next);
  return true;
}

export async function sendDevicePushToUsers(req, users, payload = {}) {
  if (!isDevicePushEnabled()) {
    return {
      sent: false,
      reason: 'device_push_not_configured',
      results: []
    };
  }

  configureVapid();

  const userIds = new Set(
    (users || [])
      .filter((user) => user?.isActive !== false)
      .map((user) => normalizeUserId(user?.id))
      .filter(Boolean)
  );

  if (!userIds.size) {
    return {
      sent: false,
      reason: 'no_push_recipients',
      results: []
    };
  }

  const allSubscriptions = await readAllSubscriptions(req).catch(() => []);
  const subscriptions = allSubscriptions.filter((subscription) => userIds.has(subscription.userId));
  if (!subscriptions.length) {
    return {
      sent: false,
      reason: 'no_saved_subscriptions',
      results: []
    };
  }

  const body = JSON.stringify({
    title: payload.title || 'TechTactics Portal',
    body: payload.body || 'You have a new portal update.',
    url: payload.url || '',
    tag: payload.tag || 'techtactics-portal',
    badgeCount: Number(payload.badgeCount || 0),
    data: payload.data || {}
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webPush.sendNotification(toWebPushSubscription(subscription), body, {
        TTL: 60 * 60 * 24,
        urgency: payload.urgency || 'normal'
      })
    )
  );

  const staleEndpoints = results
    .map((result, index) => ({ result, subscription: subscriptions[index] }))
    .filter(({ result }) => result.status === 'rejected' && isExpiredOrGone(result.reason))
    .map(({ subscription }) => subscription.endpoint);

  if (staleEndpoints.length) {
    await saveAllSubscriptions(
      req,
      allSubscriptions.filter((subscription) => !staleEndpoints.includes(subscription.endpoint))
    ).catch(() => null);
  }

  return {
    sent: results.some((result) => result.status === 'fulfilled'),
    results
  };
}
