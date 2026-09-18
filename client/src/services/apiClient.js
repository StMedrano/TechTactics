import { appConfig } from '../config'

const TOKEN_KEY = 'tt-session-token'

function buildApiUrl(path) {
  const normalizedBase = appConfig.backendApiBaseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

function getClientAppUrl() {
  if (typeof window === 'undefined') return ''

  const origin = window.location.origin
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const appIndex = pathname.toLowerCase().indexOf('/app')

  if (appIndex >= 0) {
    return `${origin}${pathname.slice(0, appIndex + 4)}`
  }

  return origin
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Request failed.'
    throw new Error(message)
  }

  return payload
}

export async function apiRequest(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : ''
  const requestUrl = buildApiUrl(path)

  try {
    const response = await fetch(requestUrl, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getClientAppUrl() ? { 'X-Client-App-Url': getClientAppUrl() } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    })

    return parseResponse(response)
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Failed to fetch'
        ? `Failed to reach API: ${requestUrl}`
        : error?.message || `Request to ${requestUrl} failed.`
    throw new Error(message)
  }
}

export function setSessionToken(token) {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    return
  }
  localStorage.removeItem(TOKEN_KEY)
}
