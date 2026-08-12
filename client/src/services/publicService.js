import { api } from './api'

export const publicService = {
  listServices: async () => {
    const res = await api.get('/public/services')
    return res.services || res
  },
  listDoctors: async () => {
    const res = await api.get('/public/doctors')
    return res.doctors || res
  },
  getDoctors: async () => {
    const res = await api.get('/public/doctors')
    return res.doctors || res
  },
  requestAppointment: (payload) => api.post('/public/appointments/request', payload),
}

export const listServices = publicService.listServices
export const listDoctors = publicService.listDoctors
export const getDoctors = publicService.getDoctors
export default publicService