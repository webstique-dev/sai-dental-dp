import { api } from './api'

export async function listServices({ q, category, activeOnly } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  if (activeOnly) params.set('activeOnly', 'true')
  const qs = params.toString()
  return api.get(`/services${qs ? `?${qs}` : ''}`)
}

export async function getService(id) {
  return api.get(`/services/${id}`)
}

export async function createService(payload) {
  return api.post('/services', payload)
}

export async function updateService(id, payload) {
  return api.patch(`/services/${id}`, payload)
}

export async function deleteService(id) {
  return api.delete(`/services/${id}`)
}

export async function restoreService(id) {
  return api.post(`/services/${id}/restore`)
}