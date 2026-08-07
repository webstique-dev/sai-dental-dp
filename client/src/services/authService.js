import { api } from './api'
import { tokenStore } from '../utils/token'

export async function login(credentials) {
  const data = await api.post('/auth/login', credentials)
  tokenStore.save(data)
  return data.user
}

export async function fetchMe() {
  return api.get('/auth/me')
}

export async function refreshSession() {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  const data = await api.post('/auth/refresh', { refreshToken })
  tokenStore.save(data)
  return data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    tokenStore.clear()
  }
}