import { api } from './api'

export async function createFollowUp(payload) {
  return api.post('/follow-ups', payload)
}

export async function getFollowUp(id) {
  return api.get(`/follow-ups/${id}`)
}

export async function updateFollowUp(id, payload) {
  return api.patch(`/follow-ups/${id}`, payload)
}

export async function scheduleFollowUp(id, payload) {
  return api.post(`/follow-ups/${id}/schedule`, payload)
}

export async function completeFollowUp(id, payload) {
  return api.post(`/follow-ups/${id}/complete`, payload)
}

export async function cancelFollowUp(id, payload) {
  return api.post(`/follow-ups/${id}/cancel`, payload)
}

export async function consultationFollowUps(consultationId) {
  return api.get(`/consultations/${consultationId}/follow-ups`)
}

export async function patientFollowUps(patientId) {
  return api.get(`/patients/${patientId}/follow-ups`)
}

export async function upcomingFollowUps(params = {}) {
  const qs = new URLSearchParams()
  if (params.doctor) qs.set('doctor', params.doctor)
  if (params.limit) qs.set('limit', params.limit)
  const query = qs.toString()
  return api.get(`/follow-ups/upcoming${query ? `?${query}` : ''}`)
}