function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function getDefaultDirectoryRoleMappings() {
  return {
    admins: 'admin',
    admin: 'admin',
    employees: 'employee',
    employee: 'employee',
    customers: 'customer',
    customer: 'customer'
  };
}

export function normalizeRoleMappings(mappings) {
  return Object.entries(mappings || {}).reduce((acc, [groupName, role]) => {
    const normalizedGroup = normalize(groupName);
    const normalizedRole = normalize(role);
    if (normalizedGroup && normalizedRole) {
      acc[normalizedGroup] = normalizedRole;
    }
    return acc;
  }, {});
}

export function getDirectoryGroups(user) {
  return [
    ...parseList(user?.directoryGroups),
    ...parseList(user?.directory_groups),
    ...parseList(user?.directoryDepartment),
    ...parseList(user?.directory_department)
  ].filter(Boolean);
}

export function resolveRoleFromDirectory(user, roleMappings) {
  const groups = getDirectoryGroups(user);
  const normalizedMappings = normalizeRoleMappings(roleMappings);

  for (const group of groups) {
    const mappedRole = normalizedMappings[normalize(group)];
    if (mappedRole) {
      return mappedRole;
    }
  }

  return normalize(user?.role) || 'customer';
}
