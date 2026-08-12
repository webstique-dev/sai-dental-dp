import { api } from './api'

export async function getReceptionistSummary({ date } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  const qs = params.toString()
  return api.get(`/reports/receptionist-summary${qs ? `?${qs}` : ''}`)
}

export async function getPharmacySummary({ date } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  const qs = params.toString()
  return api.get(`/reports/pharmacy${qs ? `?${qs}` : ''}`)
}

// ---- Analytics report series (shared by dashboard + reports page) ----

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function getDashboardAnalytics({ period } = {}) {
  return api.get(`/reports/dashboard${buildQuery({ period })}`)
}

export async function getSalesReport(params = {}) {
  return api.get(`/reports/sales${buildQuery(params)}`)
}

export async function getPurchaseReport(params = {}) {
  return api.get(`/reports/purchases${buildQuery(params)}`)
}

export async function getInventoryReport() {
  return api.get('/reports/inventory')
}

export async function getProfitReport(params = {}) {
  return api.get(`/reports/profit${buildQuery(params)}`)
}

export async function getProductReport(params = {}) {
  return api.get(`/reports/products${buildQuery(params)}`)
}

export async function getCustomerReport(params = {}) {
  return api.get(`/reports/customers${buildQuery(params)}`)
}

export async function getSupplierReport(params = {}) {
  return api.get(`/reports/suppliers${buildQuery(params)}`)
}

export async function getClinicalReport(params = {}) {
  return api.get(`/reports/clinical${buildQuery(params)}`)
}

export async function getAnalyticsSeries(params = {}) {
  return api.get(`/reports/series${buildQuery(params)}`)
}

export async function getRecentActivity(params = {}) {
  return api.get(`/reports/activity${buildQuery(params)}`)
}
