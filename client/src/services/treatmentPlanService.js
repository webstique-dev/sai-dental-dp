import { api } from './api'

export async function createTreatmentPlan(payload) {
  return api.post('/treatment-plans', payload)
}

export async function getTreatmentPlan(id) {
  return api.get(`/treatment-plans/${id}`)
}

export async function updateTreatmentPlan(id, payload) {
  return api.patch(`/treatment-plans/${id}`, payload)
}

export async function patientTreatmentPlans(patientId) {
  return api.get(`/patients/${patientId}/treatment-plans`)
}

export async function addPlanItem(planId, payload) {
  return api.post(`/treatment-plans/${planId}/items`, payload)
}

export async function updatePlanItem(planId, itemId, payload) {
  return api.patch(`/treatment-plans/${planId}/items/${itemId}`, payload)
}

export async function removePlanItem(planId, itemId) {
  return api.delete(`/treatment-plans/${planId}/items/${itemId}`)
}

export async function approvePlan(planId) {
  return api.post(`/treatment-plans/${planId}/approve`)
}

export async function declinePlan(planId, reason) {
  return api.post(`/treatment-plans/${planId}/decline`, { reason })
}