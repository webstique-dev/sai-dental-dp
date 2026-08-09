import { api } from './api'

export async function createPrescription(payload) {
  return api.post('/prescriptions', payload)
}

export async function getPrescription(id) {
  return api.get(`/prescriptions/${id}`)
}

export async function updatePrescription(id, payload) {
  return api.patch(`/prescriptions/${id}`, payload)
}

export async function issuePrescription(id) {
  return api.post(`/prescriptions/${id}/issue`)
}

export async function getPrescriptionPrint(id) {
  return api.get(`/prescriptions/${id}/print`)
}

export async function consultationPrescriptions(consultationId) {
  return api.get(`/consultations/${consultationId}/prescriptions`)
}

export async function patientPrescriptions(patientId) {
  return api.get(`/patients/${patientId}/prescriptions`)
}