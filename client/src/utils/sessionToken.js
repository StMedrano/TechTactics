function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(value || '').length / 4) * 4, '=')

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(normalized)
  }

  return Buffer.from(normalized, 'base64').toString('utf8')
}

function getRoleHome(role) {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return '/portal/admin'
    case 'employee':
      return '/portal/employee'
    default:
      return '/portal/customer'
  }
}

export function parseSessionToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length < 2) return null

  try {
    const claims = JSON.parse(decodeBase64Url(parts[1]))
    const expiresAt = Number(claims.exp || 0) * 1000
    if (expiresAt && Date.now() >= expiresAt) {
      return null
    }

    return {
      id: String(claims.id || ''),
      role: String(claims.role || 'customer'),
      email: String(claims.email || ''),
      name: String(claims.name || ''),
      phone: String(claims.phone || ''),
      home: getRoleHome(claims.role),
      directoryGroups: Array.isArray(claims.directoryGroups) ? claims.directoryGroups : [],
    }
  } catch {
    return null
  }
}
