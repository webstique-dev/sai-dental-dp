import { api } from './api'

export async function createInvestigation(payload) {
  return api.post('/investigations', payload)
}

export async function getInvestigation(id) {
  return api.get(`/investigations/${id}`)
}

export async function updateInvestigation(id, payload) {
  return api.patch(`/investigations/${id}`, payload)
}

export async function addInvestigationResult(id, payload) {
  return api.post(`/investigations/${id}/result`, payload)
}

export async function addInvestigationAttachment(id, payload) {
  return api.post(`/investigations/${id}/attachments`, payload)
}

export async function consultationInvestigations(consultationId) {
  return api.get(`/consultations/${consultationId}/investigations`)
}

export async function patientInvestigations(patientId) {
  return api.get(`/patients/${patientId}/investigations`)
}