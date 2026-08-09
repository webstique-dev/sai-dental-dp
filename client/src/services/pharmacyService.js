import { api } from './api'

export async function listMedicines(params = {}) {
  return api.get('/medicines', { params })
}

export async function getMedicine(id) {
  return api.get(`/medicines/${id}`)
}

export async function createMedicine(payload) {
  return api.post('/medicines', payload)
}

export async function updateMedicine(id, payload) {
  return api.patch(`/medicines/${id}`, payload)
}

export async function stockIn(id, payload) {
  return api.post(`/medicines/${id}/stock-in`, payload)
}

export async function stockOut(id, payload) {
  return api.post(`/medicines/${id}/stock-out`, payload)
}

export async function medicineTransactions(medicineId) {
  return api.get(`/medicines/${medicineId}/transactions`)
}

export async function getPharmacySummary() {
  return api.get('/pharmacy/summary')
}

export async function getPendingPrescriptions() {
  return api.get('/pharmacy/pending')
}

export async function getDispenseView(id) {
  return api.get(`/pharmacy/prescriptions/${id}`)
}

export async function dispensePrescription(id, payload) {
  return api.post(`/pharmacy/prescriptions/${id}/dispense`, payload)
}