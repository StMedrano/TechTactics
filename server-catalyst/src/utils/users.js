import {
  getDefaultDirectoryRoleMappings,
  getDirectoryGroups,
  resolveRoleFromDirectory
} from './directoryRoles.js';

const SYSTEM_PORTAL_ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    baseRole: 'admin',
    description: 'Full access to the admin portal, users, billing, and settings.',
    system: true
  },
  {
    key: 'employee',
    label: 'Employee',
    baseRole: 'employee',
    description: 'Access to time tracking, assigned jobs, and pay details.',
    system: true
  },
  {
    key: 'customer',
    label: 'Customer',
    baseRole: 'customer',
    description: 'Access to service requests, invoices, and customer profile tools.',
    system: true
  }
];

function normalizeRoleKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRoleLabel(value, fallbackKey) {
  return String(value || fallbackKey || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getRoleHome(role) {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return '/portal/admin';
    case 'employee':
      return '/portal/employee';
    default:
      return '/portal/customer';
  }
}

export function getPortalRoles(settings = {}) {
  const customRoles = Array.isArray(settings?.portal_roles) ? settings.portal_roles : [];
  const rolesByKey = new Map(
    SYSTEM_PORTAL_ROLES.map((role) => [
      role.key,
      { ...role }
    ])
  );

  for (const role of customRoles) {
    const key = normalizeRoleKey(role?.key);
    const baseRole = normalizeRoleKey(role?.baseRole);
    if (!key || rolesByKey.has(key)) continue;
    if (!SYSTEM_PORTAL_ROLES.some((item) => item.key === baseRole)) continue;

    rolesByKey.set(key, {
      key,
      label: normalizeRoleLabel(role?.label, key),
      baseRole,
      description: String(role?.description || '').trim(),
      system: false
    });
  }

  return Array.from(rolesByKey.values());
}

export function getPortalRole(roleKey, settings = {}) {
  const key = normalizeRoleKey(roleKey);
  return (
    getPortalRoles(settings).find((role) => role.key === key) ||
    SYSTEM_PORTAL_ROLES.find((role) => role.key === key) ||
    SYSTEM_PORTAL_ROLES.find((role) => role.key === 'customer')
  );
}

export function toSessionUser(user) {
  const assignedRole = user.assignedRole || user.role;
  return {
    id: user.id,
    role: user.role,
    assignedRole,
    roleLabel: user.roleLabel || getPortalRole(assignedRole).label,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    home: getRoleHome(user.role),
    directoryGroups: getDirectoryGroups(user)
  };
}

export function applyEffectiveRole(user, settings = {}) {
  const roleMappings = {
    ...getDefaultDirectoryRoleMappings(),
    ...(settings.directory_role_mappings || {})
  };

  const assignedRole = resolveRoleFromDirectory(user, roleMappings);
  const roleDefinition = getPortalRole(assignedRole, settings);
  return {
    ...user,
    role: roleDefinition.baseRole,
    assignedRole: roleDefinition.key,
    roleLabel: roleDefinition.label,
    home: getRoleHome(roleDefinition.baseRole)
  };
}
