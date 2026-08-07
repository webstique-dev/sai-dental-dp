import { api } from './api'

export async function getHealth() {
  return api.get('/health')
}
