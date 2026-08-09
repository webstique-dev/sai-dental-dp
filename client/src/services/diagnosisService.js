import { api } from './api'

export async function createDiagnosis(payload) {
  return api.post('/diagnoses', payload)
}

export async function getDiagnosis(id) {
  return api.get(`/diagnoses/${id}`)
}

export async function updateDiagnosis(id, payload) {
  return api.patch(`/diagnoses/${id}`, payload)
}

export async function consultationDiagnoses(consultationId) {
  return api.get(`/consultations/${consultationId}/diagnoses`)
}

export async function patientDiagnoses(patientId) {
  return api.get(`/patients/${patientId}/diagnoses`)
}
