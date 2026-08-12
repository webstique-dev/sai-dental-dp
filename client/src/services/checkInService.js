import { api } from './api'

export async function checkInAppointment({ appointmentId, doctorId }) {
  return api.post('/check-in/appointment', { appointmentId, doctorId })
}

export async function checkInWalkIn({ patientId, doctorId, reason, time, type }) {
  return api.post('/check-in/walk-in', { patientId, doctorId, reason, time, type })
}

export async function getQueueList({ date, doctor, status } = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (doctor) params.set('doctor', doctor)
  if (status) params.set('status', status)
  const qs = params.toString()
  return api.get(`/check-in/queue${qs ? `?${qs}` : ''}`)
}

export async function updateQueueStatus(visitId, status) {
  return api.patch(`/check-in/queue/${visitId}/status`, { status })
}
