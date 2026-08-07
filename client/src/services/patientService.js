import { api } from './api'

export async function listPatients({ search, limit, skip } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (limit) params.set('limit', limit)
  if (skip) params.set('skip', skip)
  const qs = params.toString()
  return api.get(`/patients${qs ? `?${qs}` : ''}`)
}

export async function getPatient(id) {
  return api.get(`/patients/${id}`)
}

export async function createPatient(payload) {
  return api.post('/patients', payload)
}