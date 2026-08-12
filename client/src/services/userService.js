import { api } from './api'

export async function listUsers(params = {}) {
  const query = new URLSearchParams()
  if (params.role) query.set('role', params.role)
  if (params.q) query.set('q', params.q)
  if (params.includeInactive) query.set('includeInactive', params.includeInactive)
  const qs = query.toString()
  return api.get(`/users${qs ? `?${qs}` : ''}`)
}

export async function getUser(id) {
  return api.get(`/users/${id}`)
}

export async function createUser(payload) {
  return api.post('/users', payload)
}

export async function updateUser(id, payload) {
  return api.patch(`/users/${id}`, payload)
}

export async function toggleUserActive(id) {
  return api.post(`/users/${id}/toggle-active`)
}

export async function resetUserPassword(id, newPassword) {
  return api.post(`/users/${id}/reset-password`, { newPassword })
}
