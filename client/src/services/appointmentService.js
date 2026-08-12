import { api } from './api'

export async function listAppointments({ date, doctor, status } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (doctor) params.set('doctor', doctor)
  if (status) params.set('status', status)
  const qs = params.toString()
  return api.get(`/appointments${qs ? `?${qs}` : ''}`)
}

export async function getAppointment(id) {
  return api.get(`/appointments/${id}`)
}

export async function createAppointment(payload) {
  return api.post('/appointments', payload)
}

export async function updateAppointment(id, payload) {
  return api.patch(`/appointments/${id}`, payload)
}

export async function cancelAppointment(id, reason) {
  return api.post(`/appointments/${id}/cancel`, { reason })
}

export async function deleteAppointment(id) {
  return api.delete(`/appointments/${id}`)
}

export async function restoreAppointment(id) {
  return api.post(`/appointments/${id}/restore`)
}
