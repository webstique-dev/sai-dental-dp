import { api } from './api'

export async function createConsultation(payload) {
  return api.post('/consultations', payload)
}

export async function getConsultation(id) {
  return api.get(`/consultations/${id}`)
}

export async function updateConsultation(id, payload) {
  return api.patch(`/consultations/${id}`, payload)
}

export async function completeConsultation(id) {
  return api.post(`/consultations/${id}/complete`)
}

export async function patientConsultations(patientId) {
  return api.get(`/patients/${patientId}/consultations`)
}