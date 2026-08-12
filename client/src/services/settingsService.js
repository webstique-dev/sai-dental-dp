import { api } from './api'

export async function getClinicSettings() {
  return api.get('/settings')
}

export async function updateClinicSettings(payload) {
  return api.patch('/settings', payload)
}

export async function exportDatabaseBackup() {
  return api.get('/admin/backup/export')
}

export async function listAuditLogs(params = {}) {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', params.limit)
  if (params.entity) query.set('entity', params.entity)
  const qs = query.toString()
  return api.get(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
}

export async function getExecutiveAnalytics(params = {}) {
  const query = new URLSearchParams()
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  if (params.doctorId) query.set('doctorId', params.doctorId)
  const qs = query.toString()
  return api.get(`/reports/analytics${qs ? `?${qs}` : ''}`)
}
