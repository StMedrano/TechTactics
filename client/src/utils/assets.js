const baseUrl = import.meta.env.BASE_URL || '/'

export function assetPath(relativePath) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = String(relativePath || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}
