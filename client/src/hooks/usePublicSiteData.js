import { useEffect, useState } from 'react'
import { publicService } from '../services/publicService'

// Loads the public services and doctors lists with loading/error handling.
// Falls back gracefully and never blocks page render for missing data.
export function usePublicSiteData() {
  const [services, setServices] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [svc, doc] = await Promise.allSettled([
          publicService.listServices(),
          publicService.listDoctors(),
        ])
        if (cancelled) return
        if (svc.status === 'fulfilled') setServices(Array.isArray(svc.value) ? svc.value : (svc.value?.services || []))
        if (doc.status === 'fulfilled') setDoctors(Array.isArray(doc.value) ? doc.value : (doc.value?.doctors || []))
        if (svc.status === 'rejected' && doc.status === 'rejected') {
          setError('We could not reach our booking system right now.')
        }
      } catch {
        if (!cancelled) setError('Unable to load clinic information.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { services, doctors, loading, error }
}