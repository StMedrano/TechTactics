import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { applyEffectiveRole, getPortalRole, getPortalRoles, toSessionUser } from '../utils/users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword } from '../utils/passwords.js';
import { ensureZohoBooksContactForUser } from '../services/zohoBooksService.js';

const router = Router();
const INTERNAL_ROLES = new Set(['admin', 'employee']);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRoleKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRoleLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeRoleDescription(value) {
  return String(value || '').trim();
}

function normalizePhoneValue(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : '';
}

function normalizeDirectoryGroups(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function buildName({ name, firstName, lastName }) {
  const explicit = normalizeRoleLabel(name);
  if (explicit) return explicit;
  return [normalizeRoleLabel(firstName), normalizeRoleLabel(lastName)].filter(Boolean).join(' ');
}

function isInternalStaff(user) {
  return INTERNAL_ROLES.has(String(user?.role || '').toLowerCase());
}

function normalizeLocation(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'object') {
    return null;
  }

  const latitude = Number(rawLocation.latitude);
  const longitude = Number(rawLocation.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const accuracy = Number(rawLocation.accuracy);
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: String(rawLocation.capturedAt || new Date().toISOString())
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateMileageMiles(previousPoint, nextPoint) {
  if (!previousPoint || !nextPoint) {
    return 0;
  }

  const earthRadiusMiles = 3958.7613;
  const dLat = toRadians(nextPoint.latitude - previousPoint.latitude);
  const dLon = toRadians(nextPoint.longitude - previousPoint.longitude);
  const lat1 = toRadians(previousPoint.latitude);
  const lat2 = toRadians(nextPoint.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMiles * arc;
}

function buildClockPayload(user, entry) {
  const hasActiveEntry = Boolean(entry?.isActive && !entry?.endedAt);
  return {
    isClockedIn: hasActiveEntry,
    activeEntry: hasActiveEntry ? entry : null,
    trackedMiles: Number(entry?.totalMiles || 0)
  };
}

function calculateDurationHours(startedAt, endedAt) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt || Date.now()).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
}

function formatTimeEntry(entry) {
  return {
    ...entry,
    durationHours: calculateDurationHours(entry.startedAt, entry.endedAt)
  };
}

function formatUserRecord(user, settings = {}) {
  const effectiveUser = applyEffectiveRole(user, settings);
  const assignedRole = normalizeRoleKey(user?.role || effectiveUser.assignedRole || effectiveUser.role);
  const assignedRoleDefinition = getPortalRole(assignedRole, settings);

  return {
    ...toSessionUser(effectiveUser),
    assignedRole,
    assignedRoleLabel: assignedRoleDefinition.label,
    effectiveRole: effectiveUser.role,
    effectiveRoleLabel: effectiveUser.roleLabel || getPortalRole(effectiveUser.assignedRole, settings).label,
    roles: [assignedRole],
    isActive: Boolean(user?.isActive),
    address: user?.address || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    directoryGroups: normalizeDirectoryGroups(user?.directoryGroups)
  };
}

async function getSettingsAndRoles(req) {
  const settings = await getStore().getSettings(req);
  const roles = getPortalRoles(settings);
  return { settings, roles };
}

function validateRoleExists(roleKey, settings) {
  const normalizedKey = normalizeRoleKey(roleKey);
  const role = getPortalRoles(settings).find((item) => item.key === normalizedKey);
  if (!role) {
    return null;
  }
  return role;
}

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const store = getStore();
  const [users, settings] = await Promise.all([store.getUsers(_req), store.getSettings(_req)]);
  res.json(users.map((user) => formatUserRecord(user, settings)));
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const { settings } = await getSettingsAndRoles(req);
  const assignedRole = normalizeRoleKey(req.body?.assignedRole || req.body?.role);
  const roleDefinition = validateRoleExists(assignedRole, settings);

  if (!roleDefinition) {
    return res.status(400).json({ message: 'A valid role is required.' });
  }

  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const firstName = normalizeRoleLabel(req.body?.firstName);
  const lastName = normalizeRoleLabel(req.body?.lastName);
  const name = buildName({
    name: req.body?.name,
    firstName,
    lastName
  });

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }

  const existingUser = await store.getUserByEmail(req, email);
  if (existingUser) {
    return res.status(409).json({ message: 'A user with that email already exists.' });
  }

  const createdUser = await store.createUser(req, {
    email,
    name,
    firstName,
    lastName,
    role: roleDefinition.key,
    phone: normalizePhoneValue(req.body?.phone),
    address: String(req.body?.address || '').trim(),
    isActive: req.body?.isActive !== false,
    passwordHash: hashPassword(password),
    directoryGroups: normalizeDirectoryGroups(req.body?.directoryGroups)
  });
  const hydratedUser =
    roleDefinition.baseRole === 'customer'
      ? await (async () => {
          const contactResult = await ensureZohoBooksContactForUser(req, createdUser).catch(() => null);
          if (!contactResult?.contactId) {
            return createdUser;
          }

          return store.updateUser(req, createdUser.id, {
            zoho_contact_id: contactResult.contactId
          });
        })()
      : createdUser;

  res.status(201).json(formatUserRecord(hydratedUser, settings));
}));

router.get('/employees', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const [users, settings] = await Promise.all([store.getUsers(req), store.getSettings(req)]);
  const staffedUsers = users
    .map((user) => applyEffectiveRole(user, settings))
    .filter((user) => user.role === 'admin' || user.role === 'employee');
  res.json(staffedUsers);
}));

router.get('/roles', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { settings, roles } = await getSettingsAndRoles(req);
  res.json({
    roles,
    directoryRoleMappings: settings.directory_role_mappings || {}
  });
}));

router.post('/roles', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const { settings, roles } = await getSettingsAndRoles(req);
  const key = normalizeRoleKey(req.body?.key);
  const baseRole = normalizeRoleKey(req.body?.baseRole);
  const label = normalizeRoleLabel(req.body?.label || key);
  const description = normalizeRoleDescription(req.body?.description);

  if (!key || !baseRole || !label) {
    return res.status(400).json({ message: 'Role key, label, and base role are required.' });
  }

  if (!roles.some((role) => role.key === baseRole && role.system)) {
    return res.status(400).json({ message: 'Base role must be admin, employee, or customer.' });
  }

  if (roles.some((role) => role.key === key)) {
    return res.status(409).json({ message: 'A role with that key already exists.' });
  }

  const savedSettings = await store.saveSettings(req, {
    portal_roles: [
      ...(Array.isArray(settings.portal_roles) ? settings.portal_roles : []),
      { key, label, baseRole, description }
    ]
  });

  res.status(201).json(getPortalRole(key, savedSettings));
}));

router.patch('/roles/:roleKey', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const roleKey = normalizeRoleKey(req.params.roleKey);
  const settings = await store.getSettings(req);
  const existingRoles = Array.isArray(settings.portal_roles) ? settings.portal_roles : [];
  const roleIndex = existingRoles.findIndex((role) => normalizeRoleKey(role?.key) === roleKey);

  if (roleIndex === -1) {
    return res.status(404).json({ message: 'Custom role not found.' });
  }

  const baseRole = normalizeRoleKey(req.body?.baseRole || existingRoles[roleIndex]?.baseRole);
  if (!['admin', 'employee', 'customer'].includes(baseRole)) {
    return res.status(400).json({ message: 'Base role must be admin, employee, or customer.' });
  }

  const updatedRole = {
    ...existingRoles[roleIndex],
    label: normalizeRoleLabel(req.body?.label || existingRoles[roleIndex]?.label || roleKey),
    description: normalizeRoleDescription(
      req.body?.description ?? existingRoles[roleIndex]?.description ?? ''
    ),
    baseRole
  };

  const nextRoles = [...existingRoles];
  nextRoles[roleIndex] = updatedRole;
  const savedSettings = await store.saveSettings(req, { portal_roles: nextRoles });
  res.json(getPortalRole(roleKey, savedSettings));
}));

router.delete('/roles/:roleKey', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const roleKey = normalizeRoleKey(req.params.roleKey);
  const settings = await store.getSettings(req);
  const existingRoles = Array.isArray(settings.portal_roles) ? settings.portal_roles : [];

  if (!existingRoles.some((role) => normalizeRoleKey(role?.key) === roleKey)) {
    return res.status(404).json({ message: 'Custom role not found.' });
  }

  const users = await store.getUsers(req);
  if (users.some((user) => normalizeRoleKey(user?.role) === roleKey)) {
    return res.status(409).json({ message: 'Remove this role from users before deleting it.' });
  }

  if (
    Object.values(settings.directory_role_mappings || {}).some(
      (mappedRole) => normalizeRoleKey(mappedRole) === roleKey
    )
  ) {
    return res.status(409).json({ message: 'Remove this role from directory mappings before deleting it.' });
  }

  const nextRoles = existingRoles.filter((role) => normalizeRoleKey(role?.key) !== roleKey);
  await store.saveSettings(req, { portal_roles: nextRoles });
  res.status(204).end();
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const activeTimeEntry = isInternalStaff(req.user)
    ? await store.getActiveTimeEntry(req, req.user.id)
    : null;
  res.json({
    ...req.user,
    activeTimeEntry,
    trackedMiles: Number(activeTimeEntry?.totalMiles || 0)
  });
}));

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'first_name', 'last_name'];
  const updates = Object.entries(req.body || {}).reduce((acc, [key, value]) => {
    if (allowed.includes(key)) acc[key] = value;
    return acc;
  }, {});
  const user = await getStore().updateUser(req, req.user.id, updates);
  res.json(user);
}));

router.get('/me/clock', requireAuth, asyncHandler(async (req, res) => {
  if (!isInternalStaff(req.user)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const store = getStore();
  const [user, activeTimeEntry] = await Promise.all([
    store.getUserById(req, req.user.id),
    store.getActiveTimeEntry(req, req.user.id)
  ]);

  res.json(buildClockPayload(user || req.user, activeTimeEntry));
}));

router.post('/me/clock', requireAuth, asyncHandler(async (req, res) => {
  if (!isInternalStaff(req.user)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const store = getStore();
  const isClockedIn = Boolean(req.body?.isClockedIn);
  const location = normalizeLocation(req.body?.location);
  const userTimeEntries = await store.listTimeEntries(req, req.user.id).catch(() => []);
  const activeTimeEntries = userTimeEntries.filter((entry) => entry?.isActive && !entry?.endedAt);
  const activeTimeEntry = activeTimeEntries[0] || null;
  const now = new Date().toISOString();

  if (isClockedIn) {
    if (!location) {
      return res.status(400).json({ message: 'GPS location is required to clock in.' });
    }

    if (!activeTimeEntry) {
      await store.createTimeEntry(req, {
        employeeId: req.user.id,
        roleKey: req.user.role,
        startedAt: now,
        endedAt: '',
        isActive: true,
        totalMiles: 0,
        lastLatitude: location?.latitude,
        lastLongitude: location?.longitude,
        path: location ? [location] : [],
        createdAt: now,
        updatedAt: now
      });
    }

    const user = await store.updateUser(req, req.user.id, { is_clocked_in: true });
    const nextActiveEntry = await store.getActiveTimeEntry(req, req.user.id);
    return res.json(buildClockPayload(user, nextActiveEntry));
  }

  const currentPath = Array.isArray(activeTimeEntry?.path) ? activeTimeEntry.path : [];
  const previousPoint = currentPath[currentPath.length - 1];
  const additionalMiles = location && previousPoint ? calculateMileageMiles(previousPoint, location) : 0;
  const nextPath = location ? [...currentPath, location] : currentPath;

  await Promise.all(
    activeTimeEntries.map((entry, index) =>
      store.updateTimeEntry(req, entry.id, {
        employeeId: entry.employeeId || req.user.id,
        roleKey: entry.roleKey || req.user.role,
        startedAt: entry.startedAt || now,
        endedAt: now,
        isActive: false,
        totalMiles:
          Number(entry.totalMiles || 0) + (index === 0 ? additionalMiles : 0),
        lastLatitude: location?.latitude ?? entry.lastLatitude,
        lastLongitude: location?.longitude ?? entry.lastLongitude,
        path: index === 0 ? nextPath : Array.isArray(entry.path) ? entry.path : [],
        updatedAt: now
      })
    )
  );
  await store.updateUser(req, req.user.id, { is_clocked_in: false });

  const [updatedUser, nextActiveEntry] = await Promise.all([
    store.getUserById(req, req.user.id).catch(() => ({ ...req.user, isClockedIn: false })),
    store.getActiveTimeEntry(req, req.user.id).catch(() => null)
  ]);

  return res.json(buildClockPayload({ ...(updatedUser || req.user), isClockedIn: false }, nextActiveEntry));
}));

router.post('/me/clock/location', requireAuth, asyncHandler(async (req, res) => {
  if (!isInternalStaff(req.user)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const location = normalizeLocation(req.body?.location);
  if (!location) {
    return res.status(400).json({ message: 'A valid GPS location is required.' });
  }

  const store = getStore();
  const activeTimeEntry = await store.getActiveTimeEntry(req, req.user.id);
  if (!activeTimeEntry) {
    return res.status(409).json({ message: 'Clock in before tracking mileage.' });
  }

  const currentPath = Array.isArray(activeTimeEntry.path) ? activeTimeEntry.path : [];
  const previousPoint = currentPath[currentPath.length - 1];
  const nextMiles =
    Number(activeTimeEntry.totalMiles || 0) +
    (previousPoint ? calculateMileageMiles(previousPoint, location) : 0);
  const updatedEntry = await store.updateTimeEntry(req, activeTimeEntry.id, {
    employeeId: activeTimeEntry.employeeId || req.user.id,
    roleKey: activeTimeEntry.roleKey || req.user.role,
    startedAt: activeTimeEntry.startedAt,
    endedAt: activeTimeEntry.endedAt || '',
    isActive: true,
    totalMiles: nextMiles,
    lastLatitude: location.latitude,
    lastLongitude: location.longitude,
    path: [...currentPath, location],
    updatedAt: new Date().toISOString()
  });

  res.json(buildClockPayload({ ...req.user, isClockedIn: true }, updatedEntry));
}));

router.get('/me/time-entries', requireAuth, asyncHandler(async (req, res) => {
  if (!isInternalStaff(req.user)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const entries = await getStore().listTimeEntries(req, req.user.id);
  const formattedEntries = entries
    .map(formatTimeEntry)
    .sort((left, right) => String(right.startedAt || '').localeCompare(String(left.startedAt || '')));

  res.json({
    entries: formattedEntries,
    totalHours: Number(
      formattedEntries.reduce((sum, entry) => sum + Number(entry.durationHours || 0), 0).toFixed(2)
    )
  });
}));

router.patch('/:userId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const targetUser = await store.getUserById(req, req.params.userId);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const settings = await store.getSettings(req);
  const nextAssignedRole = normalizeRoleKey(req.body?.assignedRole || req.body?.role || targetUser.role);
  const roleDefinition = validateRoleExists(nextAssignedRole, settings);
  if (!roleDefinition) {
    return res.status(400).json({ message: 'A valid role is required.' });
  }

  const nextEmail = normalizeEmail(req.body?.email || targetUser.email);
  if (!nextEmail) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const conflictingUser = await store.getUserByEmail(req, nextEmail);
  if (conflictingUser && String(conflictingUser.id) !== String(targetUser.id)) {
    return res.status(409).json({ message: 'Another user already has that email.' });
  }

  const firstName = normalizeRoleLabel(req.body?.firstName ?? targetUser.firstName);
  const lastName = normalizeRoleLabel(req.body?.lastName ?? targetUser.lastName);
  const name = buildName({
    name: req.body?.name ?? targetUser.name,
    firstName,
    lastName
  });

  const updates = {
    email: nextEmail,
    name,
    role: roleDefinition.key,
    first_name: firstName,
    last_name: lastName,
    address: String(req.body?.address ?? targetUser.address ?? '').trim(),
    is_active: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : targetUser.isActive,
    directory_groups: JSON.stringify(
      normalizeDirectoryGroups(req.body?.directoryGroups ?? targetUser.directoryGroups)
    )
  };

  if (req.body?.phone !== undefined) {
    const normalizedPhone = normalizePhoneValue(req.body.phone);
    if (normalizedPhone !== '') {
      updates.phone = normalizedPhone;
    }
  }

  if (req.body?.password) {
    updates.password_hash = hashPassword(String(req.body.password));
  }

  const updatedUser = await store.updateUser(req, req.params.userId, updates);
  res.json(formatUserRecord(updatedUser, settings));
}));

router.delete('/:userId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (String(req.params.userId) === String(req.user.id)) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const deleted = await getStore().deleteUser(req, req.params.userId);
  if (!deleted) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.status(204).end();
}));

export default router;
