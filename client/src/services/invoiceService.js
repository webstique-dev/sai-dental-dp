import { api } from './api'

export async function listInvoices(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  })
  const s = qs.toString()
  return api.get(`/invoices${s ? `?${s}` : ''}`)
}

export async function getInvoice(id) {
  return api.get(`/invoices/${id}`)
}

export async function createInvoice(payload) {
  return api.post('/invoices', payload)
}

export async function updateInvoice(id, payload) {
  return api.patch(`/invoices/${id}`, payload)
}

export async function addInvoiceItem(id, payload) {
  return api.post(`/invoices/${id}/items`, payload)
}

export async function removeInvoiceItem(id, itemId) {
  return api.delete(`/invoices/${id}/items/${itemId}`)
}

export async function finalizeInvoice(id) {
  return api.post(`/invoices/${id}/finalize`)
}

export async function cancelInvoice(id, reason) {
  return api.post(`/invoices/${id}/cancel`, { reason })
}

export async function getInvoicePrint(id) {
  return api.get(`/invoices/${id}/print`)
}

export async function patientInvoices(patientId) {
  return api.get(`/patients/${patientId}/invoices`)
}

export async function visitInvoices(visitId) {
  return api.get(`/op-visits/${visitId}/invoices`)
}

export async function recordPayment(invoiceId, payload) {
  return api.post(`/invoices/${invoiceId}/payments`, payload)
}

export async function invoicePayments(invoiceId) {
  return api.get(`/invoices/${invoiceId}/payments`)
}

export async function recordRefund(invoiceId, payload) {
  return api.post(`/invoices/${invoiceId}/refund`, payload)
}