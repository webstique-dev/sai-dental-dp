import { api } from './api'

export async function getToothChart(patientId) {
  return api.get(`/patients/${patientId}/tooth-chart`)
}

export async function getTooth(patientId, toothNumber) {
  return api.get(`/patients/${patientId}/tooth-chart/${toothNumber}`)
}

export async function getToothHistory(patientId, toothNumber) {
  return api.get(`/patients/${patientId}/tooth-chart/${toothNumber}/history`)
}

export async function addFinding(patientId, toothNumber, payload) {
  return api.post(`/patients/${patientId}/tooth-chart/${toothNumber}/findings`, payload)
}

export async function addTreatment(patientId, toothNumber, payload) {
  return api.post(`/patients/${patientId}/tooth-chart/${toothNumber}/treatments`, payload)
}

export async function updateTooth(patientId, toothNumber, payload) {
  return api.patch(`/patients/${patientId}/tooth-chart/${toothNumber}`, payload)
}