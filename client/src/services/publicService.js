import { api } from './api'

export const publicService = {
  listServices: () => api.get('/public/services'),
  listDoctors: () => api.get('/public/doctors'),
  requestAppointment: (payload) => api.post('/public/appointments/request', payload),
}