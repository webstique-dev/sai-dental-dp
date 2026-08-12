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

export async function checkDuplicatePatient({ phone, firstName, lastName } = {}) {
  const params = new URLSearchParams()
  if (phone) params.set('phone', phone)
  if (firstName) params.set('firstName', firstName)
  if (lastName) params.set('lastName', lastName)
  const qs = params.toString()
  return api.get(`/patients/check-duplicate${qs ? `?${qs}` : ''}`)
}

export async function createPatient(payload) {
  return api.post('/patients', payload)
}

export async function updatePatient(id, payload) {
  return api.patch(`/patients/${id}`, payload)
}

export async function deletePatient(id) {
  return api.delete(`/patients/${id}`)
}

export async function restorePatient(id) {
  return api.post(`/patients/${id}/restore`)
}