import { api } from './api'

export async function listPayments(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  })
  const s = qs.toString()
  return api.get(`/payments${s ? `?${s}` : ''}`)
}

export async function getPaymentReceipt(id) {
  return api.get(`/payments/${id}/receipt`)
}

export async function patientPayments(patientId) {
  return api.get(`/patients/${patientId}/payments`)
}