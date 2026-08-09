import { api } from './api'

export async function createTreatmentRecord(payload) {
  return api.post('/treatment-records', payload)
}

export async function getTreatmentRecord(id) {
  return api.get(`/treatment-records/${id}`)
}

export async function updateTreatmentRecord(id, payload) {
  return api.patch(`/treatment-records/${id}`, payload)
}

export async function completeTreatmentRecord(id) {
  return api.post(`/treatment-records/${id}/complete`)
}

export async function cancelTreatmentRecord(id, payload) {
  return api.post(`/treatment-records/${id}/cancel`, payload)
}

export async function consultationTreatmentRecords(consultationId) {
  return api.get(`/consultations/${consultationId}/treatment-records`)
}

export async function patientTreatmentRecords(patientId) {
  return api.get(`/patients/${patientId}/treatment-records`)
}

export async function planTreatmentRecords(planId) {
  return api.get(`/treatment-plans/${planId}/treatment-records`)
}