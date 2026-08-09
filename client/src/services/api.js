import { tokenStore } from '../utils/token'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

async function handleUnauthorized(path) {
  if (path.startsWith('/auth/login') || path.startsWith('/auth/refresh')) return
  tokenStore.clear()
  if (window.location.pathname !== '/login') {
    const current = window.location.pathname + window.location.search + window.location.hash
    window.location.assign(`/login?redirect=${encodeURIComponent(current)}`)
  }
}

async function request(path, options = {}) {
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
    if (res.status === 401 && authToken) {
      handleUnauthorized(path)
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