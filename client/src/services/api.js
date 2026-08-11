import { tokenStore } from '../utils/token'

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '')
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`

let refreshPromise = null

async function tryRefreshToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) return false
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const data = await res.json()
        if (data.accessToken) {
          tokenStore.save(data)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function handleUnauthorized(path) {
  if (path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/register')) return
  tokenStore.clear()
  if (window.location.pathname !== '/login') {
    const current = window.location.pathname + window.location.search + window.location.hash
    window.location.assign(`/login?redirect=${encodeURIComponent(current)}`)
  }
}

async function request(path, options = {}, isRetry = false) {
  const { headers = {}, body, ...rest } = options
  const authToken = tokenStore.getAccessToken()

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    ...rest,
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, config)

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!res.ok) {
    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/register')
    if (res.status === 401 && !isAuthRoute && !isRetry) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        return request(path, options, true)
      } else {
        handleUnauthorized(path)
      }
    }
    const error = new Error(data?.message || `Request failed (${res.status})`)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export default api