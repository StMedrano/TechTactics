import { randomUUID } from 'crypto';
import { getStore } from './storeFactory.js';

const SETTINGS_KEY = 'portal_notifications';
const MAX_NOTIFICATIONS = 700;

function normalizeUserId(value) {
  return String(value || '').trim();
}

function normalizeNotification(raw = {}) {
  return {
    id: String(raw.id || randomUUID()),
    userId: normalizeUserId(raw.userId),
    title: String(raw.title || 'Portal notification').trim(),
    body: String(raw.body || '').trim(),
    type: String(raw.type || 'info').trim(),
    link: String(raw.link || '').trim(),
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    readAt: String(raw.readAt || '').trim(),
    createdAt: String(raw.createdAt || new Date().toISOString())
  };
}

async function readAllNotifications(req) {
  const settings = await getStore().getSettings(req);
  const notifications = Array.isArray(settings?.[SETTINGS_KEY]) ? settings[SETTINGS_KEY] : [];
  return notifications.map(normalizeNotification).filter((notification) => notification.userId);
}

async function saveAllNotifications(req, notifications) {
  const normalized = (notifications || [])
    .map(normalizeNotification)
    .filter((notification) => notification.userId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, MAX_NOTIFICATIONS);

  await getStore().saveSettings(req, {
    [SETTINGS_KEY]: normalized
  });

  return normalized;
}

export async function createNotification(req, notification) {
  const normalized = normalizeNotification(notification);
  if (!normalized.userId) {
    return null;
  }

  const existing = await readAllNotifications(req).catch(() => []);
  const saved = await saveAllNotifications(req, [normalized, ...existing]);
  return saved.find((item) => item.id === normalized.id) || normalized;
}

export async function createNotificationsForUsers(req, users, payload) {
  const activeUsers = (users || [])
    .filter((user) => user?.isActive !== false)
    .filter((user, index, allUsers) =>
      allUsers.findIndex((candidate) => normalizeUserId(candidate?.id) === normalizeUserId(user?.id)) === index
    )
    .filter((user) => normalizeUserId(user?.id));

  if (!activeUsers.length) {
    return [];
  }

  const createdAt = new Date().toISOString();
  const newNotifications = activeUsers.map((user) =>
    normalizeNotification({
      ...payload,
      id: randomUUID(),
      userId: user.id,
      createdAt
    })
  );

  const existing = await readAllNotifications(req).catch(() => []);
  await saveAllNotifications(req, [...newNotifications, ...existing]);
  return newNotifications;
}

export async function listNotificationsForUser(req, user, { unreadOnly = false } = {}) {
  const userId = normalizeUserId(user?.id);
  if (!userId) {
    return {
      notifications: [],
      unreadCount: 0
    };
  }

  const notifications = (await readAllNotifications(req))
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const visibleNotifications = unreadOnly
    ? notifications.filter((notification) => !notification.readAt)
    : notifications;

  return {
    notifications: visibleNotifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length
  };
}

export async function markNotificationRead(req, user, notificationId) {
  const userId = normalizeUserId(user?.id);
  const targetId = String(notificationId || '').trim();
  if (!userId || !targetId) {
    return null;
  }

  const notifications = await readAllNotifications(req);
  const readAt = new Date().toISOString();
  let updatedNotification = null;
  const updated = notifications.map((notification) => {
    if (notification.id !== targetId || notification.userId !== userId) {
      return notification;
    }

    updatedNotification = {
      ...notification,
      readAt: notification.readAt || readAt
    };
    return updatedNotification;
  });

  if (!updatedNotification) {
    return null;
  }

  await saveAllNotifications(req, updated);
  return updatedNotification;
}

export async function markAllNotificationsRead(req, user) {
  const userId = normalizeUserId(user?.id);
  if (!userId) {
    return [];
  }

  const notifications = await readAllNotifications(req);
  const readAt = new Date().toISOString();
  const updated = notifications.map((notification) =>
    notification.userId === userId && !notification.readAt
      ? { ...notification, readAt }
      : notification
  );

  await saveAllNotifications(req, updated);
  return updated.filter((notification) => notification.userId === userId);
}
